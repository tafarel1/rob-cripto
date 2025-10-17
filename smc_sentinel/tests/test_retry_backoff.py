import time

from smc_sentinel.infra.retry import retry_with_backoff, compute_backoff
from smc_sentinel.infra.errors import NetworkError


def test_retry_decorator_attempts_succeeds_on_third_try():
    calls = {"n": 0}

    @retry_with_backoff(exceptions=(NetworkError,), attempts=3, min_wait=0.01, max_wait=0.02, multiplier=0.01)
    def flaky():
        calls["n"] += 1
        if calls["n"] < 3:
            raise NetworkError("temporary")
        return "ok"

    result = flaky()
    assert result == "ok"
    assert calls["n"] == 3


def test_compute_backoff_growth_no_jitter():
    # jitter=0 para determinismo
    vals = [compute_backoff(i, base=1.0, max_wait=10.0, jitter=0.0) for i in range(5)]
    assert vals[1] > vals[0]
    assert vals[2] > vals[1]
    assert vals[-1] <= 10.0