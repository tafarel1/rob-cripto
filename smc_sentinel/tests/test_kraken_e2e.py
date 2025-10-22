import asyncio
import time
import os
import base64
import pytest
import httpx

from smc_sentinel.clients.kraken import KrakenClient
from smc_sentinel.clients.base import ExchangeCredentials
from smc_sentinel.trading.factories import PollerFactory, FeeCalculatorFactory
from smc_sentinel.trading.services.trading_service import TradingService
from smc_sentinel.trading.abstractions.pollers import OrderFillPoller
from smc_sentinel.monitoring.realtime.metrics_collector import TradingMetricsCollector


class FakeResponse:
    def __init__(self, data, status_code=200, text="OK"):
        self._data = data
        self.status_code = status_code
        self.text = text

    def json(self):
        return self._data

    def raise_for_status(self):
        if self.status_code >= 400:
            raise httpx.HTTPStatusError(self.text, request=None, response=None)


class FakeKrakenSession:
    """Sessão fake que simula endpoints da Kraken sandbox.

    Controlada via flags/overrides por atributo para cenários diferentes.
    """

    def __init__(self):
        self.fail_connect = False
        self.invalid_order = False
        self.cancel_order = False
        self.partial = False
        self.depth_data = {
            "result": {
                "XBTUSD": {
                    "bids": [["50000.0", "1.0"], ["49999.0", "0.5"]],
                    "asks": [["50010.0", "1.2"], ["50011.0", "0.4"]],
                }
            }
        }
        # Candle: [time, open, high, low, close, vwap, volume, count]
        self.ohlcv_data = {
            "result": {
                "XBTUSD": [
                    [1609459200, "50000.0", "50100.0", "49900.0", "50050.0", "50050.0", "100.0", 42],
                    [1609459260, "50050.0", "50200.0", "50000.0", "50100.0", "50100.0", "120.0", 50],
                ]
            }
        }
        self.add_order_result = {"result": {"txid": ["ABC123"]}}
        # QueryOrders base, ajustada por flags
        self.query_order_closed = {
            "result": {
                "ABC123": {
                    "status": "CLOSED",
                    "price": "50080.0",
                    "vol_exec": "0.0001",
                    "fee": "0.005",  # 0.005 USD
                    "txid": ["T1"],
                }
            }
        }
        self.query_order_partial = {
            "result": {
                "ABC123": {
                    "status": "PARTIALLY_FILLED",
                    "price": "50080.0",
                    "vol_exec": "0.00005",
                    "fee": "0.0025",
                    "txid": ["T1"],
                }
            }
        }
        self.query_order_canceled = {
            "result": {
                "ABC123": {
                    "status": "CANCELED",
                    "price": "0.0",
                    "vol_exec": "0.0",
                    "fee": "0.0",
                    "txid": [],
                }
            }
        }

    def get(self, path, params=None):
        if self.fail_connect:
            raise httpx.ConnectError("getaddrinfo failed")
        if str(path).endswith("/OHLC"):
            return FakeResponse(self.ohlcv_data)
        if str(path).endswith("/Depth"):
            return FakeResponse(self.depth_data)
        return FakeResponse({}, 404, "not_found")

    def post(self, path, headers=None, content=None):
        if self.fail_connect:
            raise httpx.ConnectError("getaddrinfo failed")
        if str(path).endswith("/AddOrder"):
            if self.invalid_order:
                return FakeResponse({"error": ["EGeneral:Invalid arguments"]}, status_code=400, text="bad_request")
            return FakeResponse(self.add_order_result)
        if str(path).endswith("/QueryOrders"):
            if self.cancel_order:
                return FakeResponse(self.query_order_canceled)
            if self.partial:
                return FakeResponse(self.query_order_partial)
            return FakeResponse(self.query_order_closed)
        return FakeResponse({}, 404, "not_found")


@pytest.mark.asyncio
async def test_kraken_e2e_success_flow_ohlcv_order_fill_fee_pnl_metrics(monkeypatch):
    # Preparar cliente com sessão fake e credenciais válidas
    client = KrakenClient(credentials=ExchangeCredentials(api_key="KEY", api_secret=base64.b64encode(b"secret").decode("utf-8")))
    fake = FakeKrakenSession()
    client.session = fake

    # OHLCV (público)
    candles = await asyncio.to_thread(client.fetch_ohlcv, "XBTUSD", "1m", None, None, 2)
    assert isinstance(candles, list) and len(candles) == 2
    assert candles[0]["close"] == pytest.approx(50050.0)

    # Orderbook (público) para escolher preço
    ob = await asyncio.to_thread(client.fetch_order_book, "XBTUSD", 10)
    resdict = next(iter(ob.get("result", {}).values()), {})
    asks = resdict.get("asks", [])
    best_ask = float(asks[0][0]) if asks else 50000.0
    price = best_ask * 1.01

    # Métricas
    metrics = TradingMetricsCollector()
    start_ts = metrics.record_place_order_attempt("kraken")

    # Place order (privado)
    order = await asyncio.to_thread(client.place_order, symbol="XBTUSD", side="buy", type_="limit", quantity=0.0001, price=price)
    latency_s = float(time.time() - start_ts)
    metrics.record_place_order_result("kraken", latency_s, success=True)
    assert order.get("order_id") == "ABC123"

    # Polling + fee via serviço
    service = TradingService(PollerFactory, FeeCalculatorFactory)
    svc = await service.execute_symbol_trading(client, symbol="XBTUSD", side="buy", order_result=order, max_wait_s=2)
    fill = svc.get("fill")
    fee_base = float(svc.get("fee_base", 0.0)) if fill else 0.0
    assert fill and fill.get("status") == "FILLED"
    avg_price = float(fill.get("avg_price", 0.0))
    fee_quote = float(fill.get("fee_quote", 0.0))
    assert fee_base == pytest.approx(fee_quote / avg_price)

    # PnL (externo ao serviço)
    mark_price = avg_price * 1.02
    qty = float(fill.get("qty"))
    pnl = (mark_price - avg_price) * qty
    assert pnl > 0.0

    # Métricas de qualidade (fee accuracy)
    metrics.record_fee_accuracy("kraken", fee_base, fee_quote, avg_price)
    snap = metrics.snapshot(PollerFactory, FeeCalculatorFactory)
    kr = snap["by_exchange"].get("kraken", {})
    assert kr.get("place_order", {}).get("attempts") == 1
    assert kr.get("place_order", {}).get("success") == 1
    assert kr.get("fee_accuracy", {}).get("samples") == 1


@pytest.mark.asyncio
async def test_kraken_e2e_errors_network_and_invalid_order(monkeypatch):
    client = KrakenClient(credentials=ExchangeCredentials(api_key="KEY", api_secret=base64.b64encode(b"secret").decode("utf-8")))
    fake = FakeKrakenSession()

    # Network issue em público
    fake.fail_connect = True
    client.session = fake
    with pytest.raises(httpx.ConnectError):
        await asyncio.to_thread(client.fetch_order_book, "XBTUSD", 10)

    # Reset e invalid order
    fake.fail_connect = False
    fake.invalid_order = True
    client.session = fake
    with pytest.raises(httpx.HTTPStatusError):
        await asyncio.to_thread(client.place_order, symbol="XBTUSD", side="buy", type_="limit", quantity=0.0001, price=50000.0)


class PartialKrakenPoller(OrderFillPoller):
    async def poll_fill(self, symbol: str, side: str, order_result, max_wait_s: int = 5):
        # Simula partial fill em caminho rápido
        return {
            "status": "PARTIALLY_FILLED",
            "qty": 0.00005,
            "avg_price": 50080.0,
            "side": side,
            "fee_quote": 0.0025,
            "order_id": order_result.get("order_id"),
        }


@pytest.mark.asyncio
async def test_kraken_e2e_edge_partial_fill_and_cancellation(monkeypatch):
    client = KrakenClient(credentials=ExchangeCredentials(api_key="KEY", api_secret=base64.b64encode(b"secret").decode("utf-8")))
    fake = FakeKrakenSession()
    client.session = fake

    # Partial fill: registrar poller temporário
    original_registry = PollerFactory._registry.copy()
    try:
        PollerFactory.register("kraken", PartialKrakenPoller)
        service = TradingService(PollerFactory, FeeCalculatorFactory)
        order = {"order_id": "ABC123"}
        res = await service.execute_symbol_trading(client, "XBTUSD", "buy", order, max_wait_s=1)
        fill = res.get("fill")
        assert fill and fill.get("status") == "PARTIALLY_FILLED"
        fee_base = float(res.get("fee_base", 0.0))
        assert fee_base == pytest.approx(0.0025 / 50080.0)
        # PnL exemplo
        pnl = (50500.0 - 50080.0) * float(fill.get("qty"))
        assert pnl > 0.0
    finally:
        PollerFactory._registry = original_registry

    # Cancellation: usar poller real com sessão que retorna cancel
    fake.cancel_order = True
    client.session = fake
    # Para cancellation, precisamos que TradingService chame Poller real
    service = TradingService(PollerFactory, FeeCalculatorFactory)
    order2 = {"order_id": "ABC123"}
    res2 = await service.execute_symbol_trading(client, "XBTUSD", "buy", order2, max_wait_s=1)
    assert res2.get("fill") is None
    assert float(res2.get("fee_base", 1)) == 0.0


@pytest.mark.asyncio
async def test_kraken_e2e_performance_under_load_market_data(monkeypatch):
    # Configurar limites via env para teste rápido
    monkeypatch.setenv("KRAKEN_RL_MD_CAP", "1")
    monkeypatch.setenv("KRAKEN_RL_MD_FR", "10.0")  # 10 req/s
    monkeypatch.setenv("KRAKEN_RL_GLOBAL_CAP", "1")
    monkeypatch.setenv("KRAKEN_RL_GLOBAL_FR", "10.0")

    client = KrakenClient()
    fake = FakeKrakenSession()
    client.session = fake

    async def task_fetch():
        return await asyncio.to_thread(client.fetch_order_book, "XBTUSD", 10)

    N = 20
    start = time.time()
    results = await asyncio.gather(*[task_fetch() for _ in range(N)])
    duration = time.time() - start

    # Todos retornaram com result
    assert all(isinstance(next(iter(r.get("result", {}).values()), {}), dict) for r in results)
    # Com 10 req/s e 20 requisições, duração mínima ~2s (com tolerância)
    assert duration >= 1.5
    # Não deve exceder muito (respostas fakes são rápidas)
    assert duration <= 4.0