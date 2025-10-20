import asyncio
import pytest

from smc_sentinel.infra.collector import DataCollector
from smc_sentinel.clients.base import BaseExchangeClient


class FakeBinance:
    name = "binance"

    async def stream_klines(self, symbol: str, timeframe: str):
        # Fornece 3 mensagens por iteração
        for t in range(3):
            yield {
                "k": {
                    "t": 1609459200000 + t * 60000,
                    "T": 1609459260000 + t * 60000,
                    "o": "100.0",
                    "h": "110.0",
                    "l": "90.0",
                    "c": "105.0",
                    "v": "1.23",
                }
            }

    def normalize_binance_ohlcv(self, k):
        return BaseExchangeClient.normalize_binance_ohlcv(k)

    def fetch_order_book(self, symbol: str, level: int = 10):
        return {"bids": [["100", "1"]], "asks": [["101", "1"]]}


@pytest.mark.asyncio
async def test_collector_stream_and_snapshot():
    c = DataCollector(max_queue_size=100)
    client = FakeBinance()

    c.add_ohlcv_stream(client, "btcusdt", "1m")
    c.add_orderbook_snapshot(client, "btcusdt", level=5, period=0.05)

    # Consumir alguns eventos
    q = c.get_queue()
    e1 = await asyncio.wait_for(q.get(), timeout=1.0)
    e2 = await asyncio.wait_for(q.get(), timeout=1.0)

    assert e1["type"] in ("ohlcv", "orderbook", "ohlcv_raw")
    assert e2["type"] in ("ohlcv", "orderbook", "ohlcv_raw")

    await c.shutdown()