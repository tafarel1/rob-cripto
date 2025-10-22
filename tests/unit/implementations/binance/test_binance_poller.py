import asyncio
import pytest

from typing import Any, Dict

from smc_sentinel.trading.implementations.binance import BinanceOrderFillPoller


class MockResponse:
    def __init__(self, data: Any, status_code: int = 200):
        self._data = data
        self.status_code = status_code

    def json(self):
        return self._data


class MockSession:
    def __init__(self, responses):
        self._responses = responses
        self._call = 0

    def get(self, url, params=None, headers=None, timeout=None):
        idx = min(self._call, len(self._responses) - 1)
        self._call += 1
        return MockResponse(self._responses[idx])


class MockBinanceClient:
    def __init__(self, responses):
        self.name = "binance"
        self.session = MockSession(responses)
        self.base_url = "https://api.test"
        self.timeout_s = 5

    def binance_signature(self, method: str, path: str, params: Dict[str, Any]):
        return {}

    def _handle_response_errors(self, resp: MockResponse):
        if resp.status_code >= 400:
            raise Exception("HTTP error")


@pytest.mark.asyncio
async def test_poll_fill_success(monkeypatch):
    # mock sleep para não atrasar testes
    async def _sleep(_):
        return None
    monkeypatch.setattr(asyncio, "sleep", _sleep)

    trades = [
        {"qty": "0.001", "price": "50000", "commission": "0.000001", "commissionAsset": "BTC"}
    ]
    client = MockBinanceClient([trades])
    poller = BinanceOrderFillPoller(client)

    order_res = {"orderId": 123}
    fill = await poller.poll_fill("BTCUSDT", "buy", order_res, max_wait_s=1)

    assert isinstance(fill, dict)
    assert fill.get("status") == "FILLED"
    assert float(fill.get("qty", 0)) == pytest.approx(0.001)
    assert float(fill.get("avg_price", 0)) == pytest.approx(50000)


@pytest.mark.asyncio
async def test_poll_fill_partial(monkeypatch):
    async def _sleep(_):
        return None
    monkeypatch.setattr(asyncio, "sleep", _sleep)

    # múltiplos trades representando parcial; poller retorna último trade
    trades = [
        {"qty": "0.0005", "price": "49900", "commission": "0.0", "commissionAsset": "BTC"},
        {"qty": "0.0003", "price": "50100", "commission": "0.0", "commissionAsset": "BTC"},
    ]
    client = MockBinanceClient([trades])
    poller = BinanceOrderFillPoller(client)
    order_res = {"orderId": 456}
    fill = await poller.poll_fill("BTCUSDT", "buy", order_res, max_wait_s=1)

    assert isinstance(fill, dict)
    assert fill.get("status") == "FILLED"
    assert float(fill.get("qty", 0)) > 0


@pytest.mark.asyncio
async def test_poll_fill_timeout(monkeypatch):
    async def _sleep(_):
        return None
    monkeypatch.setattr(asyncio, "sleep", _sleep)

    # sem trades, com timeout curto
    client = MockBinanceClient([[]])
    poller = BinanceOrderFillPoller(client)
    order_res = {"orderId": 789}
    fill = await poller.poll_fill("BTCUSDT", "sell", order_res, max_wait_s=0)

    assert fill is None


@pytest.mark.asyncio
async def test_poll_fill_error(monkeypatch):
    async def _sleep(_):
        return None
    monkeypatch.setattr(asyncio, "sleep", _sleep)

    class ErrSession(MockSession):
        def get(self, url, params=None, headers=None, timeout=None):
            return MockResponse({}, status_code=500)

    client = MockBinanceClient([{}])
    client.session = ErrSession([{}])
    poller = BinanceOrderFillPoller(client)
    order_res = {"orderId": 999}
    fill = await poller.poll_fill("BTCUSDT", "sell", order_res, max_wait_s=1)

    assert fill is None