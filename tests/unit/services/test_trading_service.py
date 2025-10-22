import pytest

from typing import Any, Dict, List

from smc_sentinel.trading.services import TradingService


class DummyClient:
    def __init__(self, name: str):
        self.name = name


class MockPoller:
    def __init__(self, fill: Dict[str, Any] | None = None, should_raise: bool = False):
        self.fill = fill
        self.should_raise = should_raise
        self.calls: List[Dict[str, Any]] = []

    async def poll_fill(self, symbol: str, side: str, order_result: Dict[str, Any], max_wait_s: int = 5):
        self.calls.append({"symbol": symbol, "side": side, "order_result": order_result, "max_wait_s": max_wait_s})
        if self.should_raise:
            raise RuntimeError("poller error")
        return self.fill


class SequencedPoller:
    def __init__(self, sequence: List[Dict[str, Any] | None]):
        self.sequence = list(sequence)
        self.index = 0
        self.calls: List[Dict[str, Any]] = []

    async def poll_fill(self, symbol: str, side: str, order_result: Dict[str, Any], max_wait_s: int = 5):
        self.calls.append({"symbol": symbol, "side": side, "order_result": order_result, "max_wait_s": max_wait_s})
        if self.index < len(self.sequence):
            res = self.sequence[self.index]
            self.index += 1
            return res
        return None


class MultiPoller:
    def __init__(self, mapping: Dict[str, Dict[str, Any] | None]):
        self.mapping = dict(mapping)
        self.calls: List[Dict[str, Any]] = []

    async def poll_fill(self, symbol: str, side: str, order_result: Dict[str, Any], max_wait_s: int = 5):
        self.calls.append({"symbol": symbol, "side": side, "order_result": order_result, "max_wait_s": max_wait_s})
        return self.mapping.get(symbol)


class MockFeeCalculator:
    def __init__(self, mode: str = "quote_to_base"):
        self.mode = mode
        self.calls: List[Dict[str, Any]] = []

    async def compute_fee_base(self, symbol: str, order_identifier: int | str, avg_price: float, fill: Dict[str, Any]) -> float:
        self.calls.append({"symbol": symbol, "order_identifier": order_identifier, "avg_price": avg_price, "fill": fill})
        if self.mode == "quote_to_base":
            fee_quote = float(fill.get("fee_quote", 0.0) or 0.0)
            return (fee_quote / avg_price) if avg_price > 0 else 0.0
        if self.mode == "constant":
            return 0.001
        return 0.0


class CounterFactory:
    def __init__(self, instance: Any):
        self.instance = instance
        self.create_calls = 0

    def create(self, client: Any):
        self.create_calls += 1
        return self.instance


@pytest.mark.asyncio
async def test_execute_symbol_trading_success():
    # fill success
    fill = {"status": "FILLED", "avg_price": 100.0, "qty": 2.0, "side": "buy", "fee_quote": 1.0}
    poller = MockPoller(fill=fill)
    fee_calc = MockFeeCalculator(mode="quote_to_base")

    pf = CounterFactory(poller)
    ff = CounterFactory(fee_calc)
    service = TradingService(pf, ff)

    client = DummyClient("coinbase")
    res = await service.execute_symbol_trading(client, "BTC-USD", "buy", {"id": "abc"}, max_wait_s=1)
    assert isinstance(res, dict)
    assert res.get("fill") == fill
    assert res.get("fee_base") == pytest.approx(1.0 / 100.0)
    assert pf.create_calls == 1
    assert ff.create_calls == 1
    # fee calculator recebeu avg_price e fill
    assert len(fee_calc.calls) == 1
    assert fee_calc.calls[0]["avg_price"] == 100.0


@pytest.mark.asyncio
async def test_execute_symbol_trading_canceled():
    # fill cancelado: fee deve ser 0 se não houver fee_quote
    fill = {"status": "CANCELED", "avg_price": 100.0, "qty": 0.0, "side": "sell"}
    poller = MockPoller(fill=fill)
    fee_calc = MockFeeCalculator(mode="quote_to_base")

    service = TradingService(CounterFactory(poller), CounterFactory(fee_calc))
    client = DummyClient("binance")
    res = await service.execute_symbol_trading(client, "ETHUSDT", "sell", {"orderId": 123}, max_wait_s=1)

    assert res.get("fill") == fill
    assert float(res.get("fee_base", 1)) == pytest.approx(0.0)


@pytest.mark.asyncio
async def test_execute_symbol_trading_partial_fill_and_pnl():
    # parcial: validar que os campos permitem calcular PnL externamente
    fill = {"status": "PARTIALLY_FILLED", "avg_price": 50.0, "qty": 1.5, "side": "buy", "fee_quote": 0.5}
    poller = MockPoller(fill=fill)
    fee_calc = MockFeeCalculator(mode="quote_to_base")

    service = TradingService(CounterFactory(poller), CounterFactory(fee_calc))
    client = DummyClient("coinbase")
    res = await service.execute_symbol_trading(client, "ADA-USD", "buy", {"id": "xyz"}, max_wait_s=1)

    assert res.get("fill") == fill
    fee_base = float(res.get("fee_base", 0.0))
    assert fee_base == pytest.approx(0.5 / 50.0)

    # Exemplo simples de PnL usando os dados do fill (fora do serviço)
    mark_price = 55.0
    qty = float(fill.get("qty"))
    avg_price = float(fill.get("avg_price"))
    pnl = (mark_price - avg_price) * qty  # LONG
    assert pnl > 0.0


@pytest.mark.asyncio
async def test_execute_symbol_trading_error_propagation():
    poller = MockPoller(should_raise=True)
    fee_calc = MockFeeCalculator(mode="constant")

    service = TradingService(CounterFactory(poller), CounterFactory(fee_calc))
    client = DummyClient("binance")

    with pytest.raises(RuntimeError):
        await service.execute_symbol_trading(client, "BTCUSDT", "buy", {"orderId": 1}, max_wait_s=1)


@pytest.mark.asyncio
async def test_execute_symbol_trading_retry_sequence():
    seq = [None, {"status": "FILLED", "avg_price": 200.0, "qty": 0.1, "side": "sell", "fee_quote": 1.0}]
    poller = SequencedPoller(seq)
    fee_calc = MockFeeCalculator(mode="quote_to_base")

    service = TradingService(CounterFactory(poller), CounterFactory(fee_calc))
    client = DummyClient("coinbase")

    # Primeira tentativa sem fill
    res1 = await service.execute_symbol_trading(client, "BTC-USD", "sell", {"id": "r1"}, max_wait_s=1)
    assert res1.get("fill") is None
    assert float(res1.get("fee_base", 1)) == 0.0

    # Segunda tentativa obtém fill
    res2 = await service.execute_symbol_trading(client, "BTC-USD", "sell", {"id": "r2"}, max_wait_s=1)
    assert isinstance(res2.get("fill"), dict)
    assert res2.get("fee_base") == pytest.approx(1.0 / 200.0)


@pytest.mark.asyncio
async def test_execute_multi_symbol_trading_mixed_results():
    mapping = {
        "BTC-USD": {"status": "FILLED", "avg_price": 30000.0, "qty": 0.002, "side": "buy", "fee_quote": 3.0},
        "ETH-USD": None,
        "ADA-USD": {"status": "CANCELED", "avg_price": 0.0, "qty": 0.0, "side": "sell"},
    }
    poller = MultiPoller(mapping)
    fee_calc = MockFeeCalculator(mode="quote_to_base")

    service = TradingService(CounterFactory(poller), CounterFactory(fee_calc))
    client = DummyClient("coinbase")

    items = [
        {"symbol": "BTC-USD", "side": "buy", "order_result": {"id": "b1"}},
        {"symbol": "ETH-USD", "side": "sell", "order_result": {"id": "e1"}},
        {"symbol": "ADA-USD", "side": "sell", "order_result": {"id": "a1"}},
    ]
    results = await service.execute_multi_symbol_trading(client, items, max_wait_s=1)

    assert isinstance(results, list) and len(results) == 3
    btc = results[0]
    eth = results[1]
    ada = results[2]

    assert btc.get("symbol") == "BTC-USD"
    assert isinstance(btc.get("fill"), dict)
    assert btc.get("fee_base") == pytest.approx(3.0 / 30000.0)

    assert eth.get("fill") is None
    assert float(eth.get("fee_base", 1)) == 0.0

    assert ada.get("fill").get("status") == "CANCELED"
    assert float(ada.get("fee_base", 1)) == 0.0


@pytest.mark.asyncio
async def test_execute_multi_symbol_trading_error_bubbles():
    class RaisingPoller:
        async def poll_fill(self, symbol: str, side: str, order_result: Dict[str, Any], max_wait_s: int = 5):
            raise RuntimeError(f"poll error for {symbol}")

    poller = RaisingPoller()
    fee_calc = MockFeeCalculator(mode="constant")

    service = TradingService(CounterFactory(poller), CounterFactory(fee_calc))
    client = DummyClient("binance")

    items = [{"symbol": "BTCUSDT", "side": "buy", "order_result": {"orderId": 1}}]

    with pytest.raises(RuntimeError):
        await service.execute_multi_symbol_trading(client, items, max_wait_s=1)