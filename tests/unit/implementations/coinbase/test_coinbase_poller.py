import asyncio
import pytest

from typing import Any, Dict

from smc_sentinel.trading.implementations.coinbase import CoinbaseOrderFillPoller


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

    def get(self, url, headers=None, timeout=None):
        idx = min(self._call, len(self._responses) - 1)
        self._call += 1
        return MockResponse(self._responses[idx])


class MockCoinbaseClient:
    def __init__(self, responses):
        self.name = "coinbase"
        self.session = MockSession(responses)
        self.base_url = "https://api.test"
        self.timeout_s = 5

    def coinbase_signature(self, method: str, path: str, body: str):
        return {}

    def _handle_response_errors(self, resp: MockResponse):
        if resp.status_code >= 400:
            raise Exception("HTTP error")


@pytest.mark.asyncio
async def test_poll_fill_success(monkeypatch):
    async def _sleep(_):
        return None
    monkeypatch.setattr(asyncio, "sleep", _sleep)

    fills = {"fills": [{"size": "0.002", "price": "25000", "fee": "5"}]}
    client = MockCoinbaseClient([fills])
    poller = CoinbaseOrderFillPoller(client)
    order_res = {"id": "abc123"}

    fill = await poller.poll_fill("BTC-USD", "buy", order_res, max_wait_s=1)

    assert isinstance(fill, dict)
    assert fill.get("status") == "FILLED"
    assert float(fill.get("qty", 0)) == pytest.approx(0.002)
    assert float(fill.get("avg_price", 0)) == pytest.approx(25000)
    assert float(fill.get("fee_quote", 0)) == pytest.approx(5)


@pytest.mark.asyncio
async def test_poll_fill_timeout(monkeypatch):
    async def _sleep(_):
        return None
    monkeypatch.setattr(asyncio, "sleep", _sleep)

    client = MockCoinbaseClient([{"fills": []}])
    poller = CoinbaseOrderFillPoller(client)
    order_res = {"id": "xyz987"}

    fill = await poller.poll_fill("BTC-USD", "sell", order_res, max_wait_s=0)
    assert fill is None


@pytest.mark.asyncio
async def test_poll_fill_error(monkeypatch):
    async def _sleep(_):
        return None
    monkeypatch.setattr(asyncio, "sleep", _sleep)

    class ErrSession(MockSession):
        def get(self, url, headers=None, timeout=None):
            return MockResponse({}, status_code=500)

    client = MockCoinbaseClient([{}])
    client.session = ErrSession([{}])
    poller = CoinbaseOrderFillPoller(client)
    order_res = {"id": "err"}
    fill = await poller.poll_fill("BTC-USD", "sell", order_res, max_wait_s=1)

    assert fill is None