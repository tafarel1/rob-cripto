import time
import pytest

from smc_sentinel.trading.strategies.simple_xyz_strategy import SimpleXYZStrategy


@pytest.mark.asyncio
async def test_execute_trade_returns_result_and_is_fast():
    strat = SimpleXYZStrategy(logger=None)
    t0 = time.perf_counter()
    res = await strat.execute_trade(complexity=1000, io_delay_ms=5)
    elapsed = time.perf_counter() - t0

    assert isinstance(res, dict)
    assert res.get("ok") is True
    assert res.get("acc", 0) >= 0
    # Deve ser rápido o suficiente para testes unitários
    assert elapsed < 0.5

