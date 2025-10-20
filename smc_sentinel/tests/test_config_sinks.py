import os
import json
import asyncio

import pytest

from smc_sentinel.infra.config import Settings
from smc_sentinel.infra.sinks import JSONLinesSink


def test_settings_env_override(monkeypatch):
    monkeypatch.setenv("SMC_LOG_LEVEL", "DEBUG")
    monkeypatch.setenv("SMC_SINK", "jsonl")
    monkeypatch.setenv("SMC_JSONL_PATH", "data/out.jsonl")
    monkeypatch.setenv("SMC_SYMBOLS_BINANCE", "BTCUSDT,ETHUSDT")
    monkeypatch.setenv("SMC_TIMEFRAME_BINANCE", "5m")
    monkeypatch.setenv("SMC_SYMBOLS_COINBASE", "BTC-USD")
    monkeypatch.setenv("SMC_TIMEFRAME_COINBASE", "1m")
    monkeypatch.setenv("SMC_ORDERBOOK_LEVEL", "15")
    monkeypatch.setenv("SMC_ORDERBOOK_PERIOD", "10.0")

    s = Settings.from_env()

    assert s.log_level == "DEBUG"
    assert s.sink == "jsonl"
    assert s.jsonl_path == "data/out.jsonl"
    assert s.binance_symbols == ["BTCUSDT", "ETHUSDT"]
    assert s.binance_timeframe == "5m"
    assert s.coinbase_products == ["BTC-USD"]
    assert s.coinbase_timeframe == "1m"
    assert s.orderbook_level == 15
    assert s.orderbook_period == 10.0


@pytest.mark.asyncio
async def test_jsonl_sink_writes(tmp_path):
    path = tmp_path / "events.jsonl"
    sink = JSONLinesSink(str(path))

    await sink.write({"type": "ohlcv", "data": 1})
    await sink.write({"type": "orderbook", "data": 2})
    await sink.aclose()

    lines = path.read_text(encoding="utf-8").strip().splitlines()
    assert len(lines) == 2
    assert json.loads(lines[0])["type"] == "ohlcv"
    assert json.loads(lines[1])["data"] == 2