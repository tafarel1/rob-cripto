from __future__ import annotations

import time
import asyncio
from typing import Dict


class TokenBucket:
    def __init__(self, capacity: float, fill_rate: float):
        """
        capacity: número máximo de tokens
        fill_rate: tokens por segundo
        """
        self.capacity = float(capacity)
        self.fill_rate = float(fill_rate)
        self.tokens = float(capacity)
        self.last_refill = time.monotonic()

    def _refill(self) -> None:
        now = time.monotonic()
        elapsed = now - self.last_refill
        if elapsed > 0:
            self.tokens = min(self.capacity, self.tokens + elapsed * self.fill_rate)
            self.last_refill = now

    def try_consume(self, cost: float = 1.0) -> bool:
        self._refill()
        if self.tokens >= cost:
            self.tokens -= cost
            return True
        return False

    async def acquire(self, cost: float = 1.0, timeout: float | None = None) -> bool:
        start = time.monotonic()
        while True:
            if self.try_consume(cost):
                return True
            if timeout is not None and (time.monotonic() - start) >= timeout:
                return False
            # calcular tempo mínimo para próximo token
            needed = max(0.0, cost - self.tokens)
            delay = needed / self.fill_rate if self.fill_rate > 0 else 0.05
            await asyncio.sleep(min(max(delay, 0.01), 0.5))


class RateLimiter:
    def __init__(self):
        self.buckets: Dict[str, TokenBucket] = {}

    def register(self, key: str, capacity: float, fill_rate: float) -> None:
        self.buckets[key] = TokenBucket(capacity, fill_rate)

    def try_consume(self, key: str, cost: float = 1.0) -> bool:
        bucket = self.buckets.get(key)
        if not bucket:
            return True  # não registrado, permitir
        return bucket.try_consume(cost)

    async def acquire(self, key: str, cost: float = 1.0, timeout: float | None = None) -> bool:
        bucket = self.buckets.get(key)
        if not bucket:
            return True
        return await bucket.acquire(cost, timeout)

    def blocking_acquire(self, key: str, cost: float = 1.0, timeout: float | None = None) -> bool:
        start = time.monotonic()
        bucket = self.buckets.get(key)
        if not bucket:
            return True
        while True:
            if bucket.try_consume(cost):
                return True
            if timeout is not None and (time.monotonic() - start) >= timeout:
                return False
            needed = max(0.0, cost - bucket.tokens)
            delay = needed / bucket.fill_rate if bucket.fill_rate > 0 else 0.05
            time.sleep(min(max(delay, 0.01), 0.5))