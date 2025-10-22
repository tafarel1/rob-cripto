import time
import pytest

from smc_sentinel.trading.factories import PollerFactory, FeeCalculatorFactory
from smc_sentinel.trading.implementations.templates.template_poller import TemplateOrderFillPoller
from smc_sentinel.trading.implementations.templates.template_fee_calculator import TemplateFeeCalculator


class DummyClient:
    name = "kraken"

    def get_trades_for_order(self, symbol: str, order_id):
        # Simula trades presentes, permitindo retorno imediato do poller
        return {"trades": [{"id": 1, "fee_quote": 0.5}]}


@pytest.mark.asyncio
async def test_factories_registration_and_polling_fast():
    # Registro simples
    PollerFactory.register("kraken", TemplateOrderFillPoller)
    FeeCalculatorFactory.register("kraken", TemplateFeeCalculator)

    client = DummyClient()

    # Criação via factories
    poller = PollerFactory.create(client)
    fee_calc = FeeCalculatorFactory.create(client)

    assert isinstance(poller, TemplateOrderFillPoller)
    assert isinstance(fee_calc, TemplateFeeCalculator)

    # Polling deve ser rápido com trades disponíveis
    start = time.time()
    fill = await poller.poll_fill(
        symbol="BTCUSD",
        side="buy",
        order_result={"order_id": "ABC123", "price": 50000.0, "size": 0.01},
        max_wait_s=2,
    )
    duration = time.time() - start

    assert fill is not None
    assert fill.get("status") == "filled"
    assert duration < 0.25  # garante overhead baixo no caminho feliz


@pytest.mark.asyncio
async def test_fee_calculator_minimal_paths():
    fee_calc = TemplateFeeCalculator(DummyClient())

    # Quando fee_base está presente, retorna diretamente
    fb = await fee_calc.compute_fee_base("BTCUSD", "ABC123", 50000.0, {"fee_base": 0.0001})
    assert abs(fb - 0.0001) < 1e-9

    # Quando fee_quote precisa converter
    fq = await fee_calc.compute_fee_base("BTCUSD", "ABC123", 50000.0, {"fee_quote": 5.0})
    assert abs(fq - (5.0 / 50000.0)) < 1e-9

    # Fallback sem dados
    fz = await fee_calc.compute_fee_base("BTCUSD", "ABC123", 50000.0, {})
    assert fz == 0.0