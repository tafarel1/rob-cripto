from __future__ import annotations

import asyncio
import time
from typing import Any

from loguru import logger

from .retry import compute_backoff


def _timeframe_to_seconds(tf: str) -> int:
    unit = tf[-1]
    try:
        n = int(tf[:-1])
    except Exception:
        raise ValueError(f"Timeframe inválido: {tf}")
    if unit == "m":
        return n * 60
    if unit == "h":
        return n * 3600
    if unit in ("d", "D"):
        return n * 86400
    raise ValueError(f"Timeframe inválido: {tf}")


class DataCollector:
    def __init__(self, max_queue_size: int = 10000):
        self.queue: asyncio.Queue = asyncio.Queue(maxsize=max_queue_size)
        self._tasks: list[asyncio.Task] = []
        self._closed = False

    def get_queue(self) -> asyncio.Queue:
        return self.queue

    def add_ohlcv_stream(self, client: Any, symbol: str, timeframe: str) -> None:
        if hasattr(client, "stream_klines"):
            self._tasks.append(asyncio.create_task(self._task_stream_klines(client, symbol, timeframe)))
        else:
            period = _timeframe_to_seconds(timeframe)
            self._tasks.append(asyncio.create_task(self._task_poll_ohlcv(client, symbol, timeframe, period)))

    def add_orderbook_snapshot(self, client: Any, symbol: str, level: int = 10, period: float = 30.0) -> None:
        self._tasks.append(asyncio.create_task(self._task_poll_orderbook(client, symbol, level, period)))

    def add_orderbook_stream(self, client: Any, product_ids: list[str]) -> None:
        if not hasattr(client, "stream_level2"):
            raise ValueError("Client não suporta stream de orderbook level2")
        self._tasks.append(asyncio.create_task(self._task_stream_orderbook_l2(client, product_ids)))

    async def _task_stream_orderbook_l2(self, client: Any, product_ids: list[str]) -> None:
        attempt = 0
        while not self._closed:
            try:
                async for msg in client.stream_level2(product_ids):
                    event = {
                        "type": "orderbook_l2",
                        "exchange": getattr(client, "name", "unknown"),
                        "products": product_ids,
                        "data": msg,
                        "ts": int(time.time() * 1000),
                    }
                    await self.queue.put(event)
                attempt = 0
            except asyncio.CancelledError:
                break
            except Exception as e:
                attempt += 1
                delay = compute_backoff(attempt, base=1.0, max_wait=30.0, jitter=0.2)
                logger.warning(f"[Collector][orderbook-l2] erro {product_ids}: {e}. Retry in {delay:.2f}s")
                await asyncio.sleep(delay)

    async def _task_stream_klines(self, client: Any, symbol: str, timeframe: str) -> None:
        attempt = 0
        while not self._closed:
            try:
                async for msg in client.stream_klines(symbol, timeframe):
                    # Binance WS: mensagem tem campo 'k' com o kline
                    if isinstance(msg, dict) and "k" in msg:
                        k = msg["k"]
                        # [open ms, open, high, low, close, volume, close ms]
                        ohlcv = [k.get("t"), k.get("o"), k.get("h"), k.get("l"), k.get("c"), k.get("v"), k.get("T")]
                        data = client.normalize_binance_ohlcv(ohlcv)
                        event = {
                            "type": "ohlcv",
                            "exchange": getattr(client, "name", "unknown"),
                            "symbol": symbol,
                            "timeframe": timeframe,
                            "data": data,
                            "ts": int(time.time() * 1000),
                        }
                        await self.queue.put(event)
                    else:
                        await self.queue.put({
                            "type": "ohlcv_raw",
                            "exchange": getattr(client, "name", "unknown"),
                            "symbol": symbol,
                            "timeframe": timeframe,
                            "data": msg,
                            "ts": int(time.time() * 1000),
                        })
                attempt = 0
            except asyncio.CancelledError:
                break
            except Exception as e:
                attempt += 1
                delay = compute_backoff(attempt, base=1.0, max_wait=30.0, jitter=0.2)
                logger.warning(f"[Collector][ohlcv] erro stream {symbol} {timeframe}: {e}. Retry in {delay:.2f}s")
                await asyncio.sleep(delay)

    async def _task_poll_ohlcv(self, client: Any, symbol: str, timeframe: str, period: float) -> None:
        attempt = 0
        while not self._closed:
            try:
                data = client.fetch_ohlcv(symbol, timeframe, limit=1)
                event = {
                    "type": "ohlcv",
                    "exchange": getattr(client, "name", "unknown"),
                    "symbol": symbol,
                    "timeframe": timeframe,
                    "data": data[-1] if data else None,
                    "ts": int(time.time() * 1000),
                }
                await self.queue.put(event)
                attempt = 0
                await asyncio.sleep(period)
            except asyncio.CancelledError:
                break
            except Exception as e:
                attempt += 1
                delay = compute_backoff(attempt, base=1.0, max_wait=30.0, jitter=0.2)
                logger.warning(f"[Collector][ohlcv-poll] erro {symbol} {timeframe}: {e}. Retry in {delay:.2f}s")
                await asyncio.sleep(delay)

    async def _task_poll_orderbook(self, client: Any, symbol: str, level: int, period: float) -> None:
        attempt = 0
        while not self._closed:
            try:
                ob = client.fetch_order_book(symbol, level)
                event = {
                    "type": "orderbook",
                    "exchange": getattr(client, "name", "unknown"),
                    "symbol": symbol,
                    "level": level,
                    "data": ob,
                    "ts": int(time.time() * 1000),
                }
                await self.queue.put(event)
                attempt = 0
                await asyncio.sleep(period)
            except asyncio.CancelledError:
                break
            except Exception as e:
                attempt += 1
                delay = compute_backoff(attempt, base=1.0, max_wait=30.0, jitter=0.2)
                logger.warning(f"[Collector][orderbook] erro {symbol} lvl{level}: {e}. Retry in {delay:.2f}s")
                await asyncio.sleep(delay)

    async def shutdown(self) -> None:
        self._closed = True
        for t in self._tasks:
            t.cancel()
        results = await asyncio.gather(*self._tasks, return_exceptions=True)
        for r in results:
            if isinstance(r, Exception) and not isinstance(r, asyncio.CancelledError):
                logger.debug(f"Task terminou com exceção: {r}")
        self._tasks.clear()