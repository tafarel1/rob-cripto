import asyncio
import pytest

from smc_sentinel.trading.implementations.binance import BinanceFeeCalculator
from smc_sentinel.trading.implementations.coinbase import CoinbaseFeeCalculator


class MockResponse:
    def __init__(self, data, status_code=200):
        self._data = data
        self.status_code = status_code

    def json(self):
        return self._data


class MockSession:
    def __init__(self, data):
        self._data = data

    def get(self, url, params=None, headers=None, timeout=None):
        return MockResponse(self._data)


class MockBinanceClient:
    def __init__(self, trades):
        self.name = "binance"
        self.session = MockSession(trades)
        self.base_url = "https://api.test"
        self.timeout_s = 5

    def binance_signature(self, method, path, params):
        return {}

    def _handle_response_errors(self, resp: MockResponse):
        if resp.status_code >= 400:
            raise Exception("HTTP error")


class MockCoinbaseClient:
    def __init__(self):
        self.name = "coinbase"


@pytest.mark.asyncio
async def test_binance_fee_calculator_base_asset():
    trades = [
        {"qty": "0.001", "price": "50000", "commission": "0.000002", "commissionAsset": "BTC"},
        {"qty": "0.001", "price": "50010", "commission": "0.000003", "commissionAsset": "BTC"},
    ]
    client = MockBinanceClient(trades)
    calc = BinanceFeeCalculator(client)
    fee_base = await calc.compute_fee_base("BTCUSDT", 123, 50000.0, {"avg_price": 50000.0})
    assert fee_base == pytest.approx(0.000005)


@pytest.mark.asyncio
async def test_binance_fee_calculator_quote_asset_convert():
    trades = [
        {"qty": "0.001", "price": "50000", "commission": "5.0", "commissionAsset": "USDT"},
    ]
    client = MockBinanceClient(trades)
    calc = BinanceFeeCalculator(client)
    fee_base = await calc.compute_fee_base("BTCUSDT", 123, 50000.0, {"avg_price": 50000.0})
    # 5 USDT / 50000 USDT/BTC = 0.0001 BTC
    assert fee_base == pytest.approx(0.0001)


@pytest.mark.asyncio
async def test_coinbase_fee_calculator_quote_to_base():
    client = MockCoinbaseClient()
    calc = CoinbaseFeeCalculator(client)
    fee_base = await calc.compute_fee_base("BTC-USD", "abc", 25000.0, {"fee_quote": 5.0})
    assert fee_base == pytest.approx(5.0 / 25000.0)