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


COINBASE_BASE = "https://api.exchange.coinbase.com"
COINBASE_WS = "wss://ws-feed.exchange.coinbase.com"


_GRANULARITY = {
    "1m": 60,
    "5m": 300,
    "15m": 900,
    "1h": 3600,
    "6h": 21600,
    "1d": 86400,
}

# Limites aproximados: 10 req/s com burst 20
_DEFAULT_LIMITS = (
    ("coinbase:global", 20, 10.0),
    ("coinbase:candles", 20, 5.0),
    ("coinbase:book", 20, 5.0),
    ("coinbase:order", 10, 3.0),
)


class CoinbaseClient(BaseExchangeClient):
    name = "coinbase"
    base_url = COINBASE_BASE

    def __init__(self, credentials: Optional[ExchangeCredentials] = None, timeout: float = 10.0, rate_limiter: Optional[RateLimiter] = None):
        super().__init__(credentials, timeout)
        self.session = httpx.Client(timeout=timeout, base_url=self.base_url)
        self.async_session = httpx.AsyncClient(timeout=timeout, base_url=self.base_url)
        self.rl = rate_limiter or RateLimiter()
        for key, cap, fr in _DEFAULT_LIMITS:
            if key not in self.rl.buckets:
                self.rl.register(key, capacity=cap, fill_rate=fr)

    def _handle_response_errors(self, r: httpx.Response) -> None:
        if r.status_code in (401, 403):
            raise AuthError(r.text)
        if r.status_code == 429:
            raise RateLimitError(r.text)
        if 500 <= r.status_code < 600:
            raise NetworkError(r.text)
        r.raise_for_status()

    @retry_with_backoff()
    def fetch_ohlcv(self, product_id: str, timeframe: str, start_ms: Optional[int] = None, end_ms: Optional[int] = None, limit: int = 300) -> list[dict[str, Any]]:
        gran = _GRANULARITY.get(timeframe)
        if not gran:
            raise ValueError(f"Timeframe inválido: {timeframe}")
        self.rl.blocking_acquire("coinbase:global", cost=1.0, timeout=5.0)
        self.rl.blocking_acquire("coinbase:candles", cost=1.0, timeout=5.0)
        params = {"granularity": gran}
        if start_ms:
            params["start"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(start_ms / 1000))
        if end_ms:
            params["end"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(end_ms / 1000))
        r = self.session.get(f"/products/{product_id}/candles", params=params)
        self._handle_response_errors(r)
        data = r.json()
        candles = sorted(data, key=lambda c: c[0])
        return [self.normalize_coinbase_ohlcv(c) for c in candles][-limit:]

    @retry_with_backoff()
    def fetch_order_book(self, product_id: str, level: int = 2) -> dict[str, Any]:
        self.rl.blocking_acquire("coinbase:global", cost=1.0, timeout=5.0)
        self.rl.blocking_acquire("coinbase:book", cost=1.0, timeout=5.0)
        r = self.session.get(f"/products/{product_id}/book", params={"level": level})
        self._handle_response_errors(r)
        return r.json()

    @retry_with_backoff()
    def place_order(self, product_id: str, side: str, type_: str, size: float, price: Optional[float] = None, **kwargs) -> dict[str, Any]:
        if not self.credentials:
            raise RuntimeError("Credenciais necessárias para enviar ordens")
        self.rl.blocking_acquire("coinbase:global", cost=1.0, timeout=5.0)
        self.rl.blocking_acquire("coinbase:order", cost=1.0, timeout=5.0)
        body = {
            "product_id": product_id,
            "side": side.lower(),
            "type": type_.lower(),
            "size": str(size),
        }
        if price is not None:
            body["price"] = str(price)
        body.update(kwargs)
        payload = json.dumps(body)
        timestamp = str(time.time())
        sig = self.coinbase_signature(timestamp, "POST", "/orders", payload, self.credentials.api_secret)
        headers = {
            "CB-ACCESS-KEY": self.credentials.api_key,
            "CB-ACCESS-SIGN": sig,
            "CB-ACCESS-TIMESTAMP": timestamp,
            "CB-ACCESS-PASSPHRASE": self.credentials.passphrase or "",
            "Content-Type": "application/json",
        }
        r = self.session.post("/orders", headers=headers, content=payload)
        self._handle_response_errors(r)
        return r.json()

    async def aclose(self):
        try:
            await self.async_session.aclose()
        except Exception:
            pass

    async def stream_level2(self, product_ids: list[str]):
        sub_msg = {
            "type": "subscribe",
            "channels": [{"name": "level2", "product_ids": product_ids}],
        }
        attempt = 0
        while True:
            try:
                logger.info("[WS][Coinbase] Conectando {}".format(COINBASE_WS))
                async with websockets.connect(COINBASE_WS, ping_interval=20, ping_timeout=20) as ws:
                    await ws.send(json.dumps(sub_msg))
                    attempt = 0
                    async for msg in ws:
                        data = json.loads(msg)
                        yield data
            except (websockets.exceptions.ConnectionClosedError, websockets.exceptions.ConnectionClosedOK, OSError) as e:
                attempt += 1
                delay = compute_backoff(attempt, base=1.0, max_wait=30.0, jitter=0.2)
                logger.warning(f"[WS][Coinbase] desconectado: {e}. Reconnecting in {delay:.2f}s")
                await asyncio.sleep(delay)