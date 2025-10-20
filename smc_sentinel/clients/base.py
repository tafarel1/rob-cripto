from __future__ import annotations

import base64
import hmac
import hashlib
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Optional

import httpx


@dataclass
class ExchangeCredentials:
    api_key: str
    api_secret: str
    passphrase: Optional[str] = None  # Coinbase usa passphrase


class BaseExchangeClient(ABC):
    name: str
    base_url: str

    def __init__(self, credentials: Optional[ExchangeCredentials] = None, timeout: float = 10.0):
        self.credentials = credentials
        self.session = httpx.Client(timeout=timeout)

    def close(self) -> None:
        try:
            self.session.close()
        except Exception:
            pass

    @staticmethod
    def timestamp_ms() -> int:
        return int(time.time() * 1000)

    # --- HMAC utils ---
    @staticmethod
    def binance_signature(query_string: str, secret: str) -> str:
        mac = hmac.new(secret.encode("utf-8"), query_string.encode("utf-8"), hashlib.sha256)
        return mac.hexdigest()

    @staticmethod
    def coinbase_signature(timestamp: str, method: str, request_path: str, body: str, secret: str) -> str:
        message = (timestamp + method.upper() + request_path + (body or "")).encode("utf-8")
        mac = hmac.new(secret.encode("utf-8"), message, hashlib.sha256)
        return base64.b64encode(mac.digest()).decode("utf-8")

    # --- Normalização OHLCV ---
    @staticmethod
    def normalize_binance_ohlcv(kline: list[Any]) -> dict[str, Any]:
        # kline: [ openTime, open, high, low, close, volume, closeTime, ... ]
        return {
            "timestamp": int(kline[0]),
            "open": float(kline[1]),
            "high": float(kline[2]),
            "low": float(kline[3]),
            "close": float(kline[4]),
            "volume": float(kline[5]),
        }

    @staticmethod
    def normalize_coinbase_ohlcv(candle: list[Any]) -> dict[str, Any]:
        # candle: [ time, low, high, open, close, volume ]
        return {
            "timestamp": int(candle[0]) * 1000,  # coinbase retorna epoch em segundos
            "open": float(candle[3]),
            "high": float(candle[2]),
            "low": float(candle[1]),
            "close": float(candle[4]),
            "volume": float(candle[5]),
        }

    # --- Interface comum ---
    @abstractmethod
    def fetch_ohlcv(self, symbol: str, timeframe: str, start_ms: Optional[int] = None, end_ms: Optional[int] = None, limit: int = 500) -> list[dict[str, Any]]:
        raise NotImplementedError

    @abstractmethod
    def fetch_order_book(self, symbol: str, limit: int = 100) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def place_order(self, symbol: str, side: str, type_: str, quantity: float, price: Optional[float] = None, **kwargs) -> dict[str, Any]:
        raise NotImplementedError