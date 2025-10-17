from __future__ import annotations

from typing import Iterable, Tuple, Type
from loguru import logger
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential, before_sleep_log

from .errors import NetworkError, RateLimitError


DEFAULT_RETRY_EXC: Tuple[Type[BaseException], ...] = (NetworkError, RateLimitError)


def retry_with_backoff(
    exceptions: Iterable[Type[BaseException]] = DEFAULT_RETRY_EXC,
    attempts: int = 3,
    min_wait: float = 1.0,
    max_wait: float = 10.0,
    multiplier: float = 1.0,
):
    return retry(
        retry=retry_if_exception_type(tuple(exceptions)),
        stop=stop_after_attempt(attempts),
        wait=wait_exponential(multiplier=multiplier, min=min_wait, max=max_wait),
        reraise=True,
        before_sleep=before_sleep_log(logger, level="WARNING"),
    )


def compute_backoff(attempt: int, base: float = 1.0, max_wait: float = 30.0, jitter: float = 0.1) -> float:
    import random
    raw = min(max_wait, base * (2 ** max(0, attempt)))
    return max(0.1, raw * (1.0 + random.uniform(-jitter, jitter)))