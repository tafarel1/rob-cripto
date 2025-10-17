from smc_sentinel.infra.rate_limiter import RateLimiter


def test_blocking_acquire_timeout_and_success():
    rl = RateLimiter()
    # Cenário 1: timeout por falta de tokens
    rl.register("t1", capacity=0, fill_rate=0.0)
    ok = rl.blocking_acquire("t1", cost=1.0, timeout=0.1)
    assert ok is False

    # Cenário 2: sucesso após breve espera por refill
    rl.register("t2", capacity=0, fill_rate=50.0)  # 50 tokens/s
    ok2 = rl.blocking_acquire("t2", cost=1.0, timeout=0.5)
    assert ok2 is True