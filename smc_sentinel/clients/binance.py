from __future__ import annotations

import json
import time
import asyncio
from typing import Any, Optional

import httpx
import websockets
from loguru import logger

from .base import BaseExchangeClient, ExchangeCredentials
from ..infra.rate_limiter import RateLimiter
from ..infra.errors import NetworkError, RateLimitError, AuthError
from ..infra.retry import retry_with_backoff, compute_backoff


BINANCE_SPOT_BASE = "https://api.binance.com"
BINANCE_WS = "wss://stream.binance.com:9443/ws"


_TIMEFRAME_MAP = {
    "1m": "1m", "3m": "3m", "5m": "5m", "15m": "15m", "30m": "30m",
    "1h": "1h", "2h": "2h", "4h": "4h", "6h": "6h", "8h": "8h", "12h": "12h",
    "1d": "1d", "3d": "3d", "1w": "1w", "1M": "1M",
}

# Limites: global 1200 req/min -> 20 tokens/s; capacidade para burst de 1200
_DEFAULT_LIMITS = (
    ("binance:global", 1200, 20.0),
    ("binance:klines", 100, 2.0),   # conservador por stream de dados
    ("binance:depth", 100, 2.0),
    ("binance:order", 30, 1.0),
)


class BinanceClient(BaseExchangeClient):
    name = "binance"
    base_url = BINANCE_SPOT_BASE

    def __init__(self, credentials: Optional[ExchangeCredentials] = None, timeout: float = 10.0, rate_limiter: Optional[RateLimiter] = None):
        super().__init__(credentials, timeout)
        self.session = httpx.Client(timeout=timeout, base_url=self.base_url)
        self.async_session = httpx.AsyncClient(timeout=timeout, base_url=self.base_url)
        self.rl = rate_limiter or RateLimiter()
        for key, cap, fr in _DEFAULT_LIMITS:
            if key not in self.rl.buckets:
                self.rl.register(key, capacity=cap, fill_rate=fr)

    def _handle_response_errors(self, r: httpx.Response) -> None:
        if r.status_code == 401 or r.status_code == 403:
            raise AuthError(r.text)
        if r.status_code in (418, 429):
            raise RateLimitError(r.text)
        if 500 <= r.status_code < 600:
            raise NetworkError(r.text)
        r.raise_for_status()

    @retry_with_backoff()
    def fetch_ohlcv(self, symbol: str, timeframe: str, start_ms: Optional[int] = None, end_ms: Optional[int] = None, limit: int = 500) -> list[dict[str, Any]]:
        interval = _TIMEFRAME_MAP.get(timeframe)
        if not interval:
            raise ValueError(f"Timeframe inválido: {timeframe}")
        # rate limit: global + endpoint de klines (peso 1)
        self.rl.blocking_acquire("binance:global", cost=1.0, timeout=5.0)
        self.rl.blocking_acquire("binance:klines", cost=1.0, timeout=5.0)
        params = {"symbol": symbol.upper(), "interval": interval, "limit": limit}
        if start_ms:
            params["startTime"] = int(start_ms)
        if end_ms:
            params["endTime"] = int(end_ms)
        r = self.session.get("/api/v3/klines", params=params)
        self._handle_response_errors(r)
        data = r.json()
        return [self.normalize_binance_ohlcv(k) for k in data]

    @retry_with_backoff()
    def fetch_order_book(self, symbol: str, limit: int = 100) -> dict[str, Any]:
        self.rl.blocking_acquire("binance:global", cost=1.0, timeout=5.0)
        self.rl.blocking_acquire("binance:depth", cost=1.0, timeout=5.0)
        r = self.session.get("/api/v3/depth", params={"symbol": symbol.upper(), "limit": limit})
        self._handle_response_errors(r)
        return r.json()

    @retry_with_backoff()
    def place_order(self, symbol: str, side: str, type_: str, quantity: float, price: Optional[float] = None, **kwargs) -> dict[str, Any]:
        if not self.credentials:
            raise RuntimeError("Credenciais necessárias para enviar ordens")
        self.rl.blocking_acquire("binance:global", cost=1.0, timeout=5.0)
        self.rl.blocking_acquire("binance:order", cost=1.0, timeout=5.0)
        timestamp = self.timestamp_ms()
        params = {
            "symbol": symbol.upper(),
            "side": side.upper(),
            "type": type_.upper(),
            "quantity": str(quantity),
            "recvWindow": "5000",
            "timestamp": str(timestamp),
        }
        if price is not None:
            params["price"] = str(price)
        params.update(kwargs)
        query_string = "&".join(f"{k}={v}" for k, v in sorted(params.items()))
        signature = self.binance_signature(query_string, self.credentials.api_secret)
        headers = {"X-MBX-APIKEY": self.credentials.api_key}
        r = self.session.post("/api/v3/order", params={**params, "signature": signature}, headers=headers)
        self._handle_response_errors(r)
        return r.json()

    async def aclose(self):
        try:
            await self.async_session.aclose()
        except Exception:
            pass

    async def stream_klines(self, symbol: str, timeframe: str):
        interval = _TIMEFRAME_MAP.get(timeframe)
        if not interval:
            raise ValueError(f"Timeframe inválido: {timeframe}")
        stream = f"{symbol.lower()}@kline_{interval}"
        url = f"{BINANCE_WS}/{stream}"
        attempt = 0
        while True:
            try:
                logger.info(f"[WS][Binance] Conectando {url}")
                async with websockets.connect(url, ping_interval=20, ping_timeout=20) as ws:
                    attempt = 0  # reset após conexão bem-sucedida
                    async for msg in ws:
                        data = json.loads(msg)
                        yield data
            except (websockets.exceptions.ConnectionClosedError, websockets.exceptions.ConnectionClosedOK, OSError) as e:
                attempt += 1
                delay = compute_backoff(attempt, base=1.0, max_wait=30.0, jitter=0.2)
                logger.warning(f"[WS][Binance] desconectado: {e}. Reconnecting in {delay:.2f}s")
                await asyncio.sleep(delay)