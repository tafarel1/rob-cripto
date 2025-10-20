import time
from smc_sentinel.clients.base import BaseExchangeClient


def test_binance_signature_example():
    # exemplo estável: query e secret fixos
    secret = "mysecret"
    qs = "symbol=BTCUSDT&side=BUY&type=MARKET&timestamp=1640995200000"
    sig = BaseExchangeClient.binance_signature(qs, secret)
    assert isinstance(sig, str) and len(sig) == 64


def test_coinbase_signature_shape():
    ts = "1548563840"
    method = "GET"
    path = "/accounts"
    body = ""
    secret = "mysecret"
    sig = BaseExchangeClient.coinbase_signature(ts, method, path, body, secret)
    # Base64, termina com '=' ou não, comprimento variável
    assert isinstance(sig, str) and len(sig) >= 40


def test_normalize_ohlcv():
    b = [1609459200000, "100", "110", "90", "105", "123.45", 1609459260000]
    res_b = BaseExchangeClient.normalize_binance_ohlcv(b)
    assert res_b["open"] == 100.0 and res_b["volume"] == 123.45

    c = [1609459200, 90, 110, 100, 105, 123.45]
    res_c = BaseExchangeClient.normalize_coinbase_ohlcv(c)
    assert res_c["timestamp"] == 1609459200 * 1000 and res_c["open"] == 100.0


def test_timestamp_ms_monotonic():
    t1 = BaseExchangeClient.timestamp_ms()
    time.sleep(0.002)
    t2 = BaseExchangeClient.timestamp_ms()
    assert t2 > t1