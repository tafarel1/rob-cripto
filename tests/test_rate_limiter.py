import asyncio
import time
import pytest

from smc_sentinel.infra.rate_limiter import TokenBucket, RateLimiter


@pytest.mark.asyncio
async def test_token_bucket_refill_and_acquire():
    bucket = TokenBucket(capacity=2, fill_rate=10)  # 10 tokens/s
    assert bucket.try_consume(2)
    # deve falhar agora
    assert not bucket.try_consume(1)
    # aguardar ~0.2s para repor 2 tokens
    await asyncio.sleep(0.25)
    assert bucket.try_consume(1)


def test_rate_limiter_register_and_try():
    rl = RateLimiter()
    rl.register("binance", capacity=5, fill_rate=5)
    ok = rl.try_consume("binance", 5)
    assert ok
    assert not rl.try_consume("binance", 1)  # tokens esgotados