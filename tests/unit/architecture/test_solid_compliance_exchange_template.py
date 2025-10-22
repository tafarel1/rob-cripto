from pathlib import Path

from smc_sentinel.trading.abstractions.pollers import OrderFillPoller
from smc_sentinel.trading.abstractions.fee_calculators import FeeCalculator
from smc_sentinel.trading.implementations.templates.template_poller import TemplateOrderFillPoller
from smc_sentinel.trading.implementations.templates.template_fee_calculator import TemplateFeeCalculator


def test_class_hierarchy_respects_abstractions():
    assert issubclass(TemplateOrderFillPoller, OrderFillPoller)
    assert issubclass(TemplateFeeCalculator, FeeCalculator)


def test_templates_are_not_coupled_to_specific_exchanges():
    root = Path(__file__).resolve().parents[3]
    poller_file = root / "smc_sentinel" / "trading" / "implementations" / "templates" / "template_poller.py"
    fee_file = root / "smc_sentinel" / "trading" / "implementations" / "templates" / "template_fee_calculator.py"

    for p in (poller_file, fee_file):
        content = p.read_text(encoding="utf-8")
        assert "binance" not in content.lower()
        assert "coinbase" not in content.lower()


def test_factories_enable_easy_registration():
    # Import tardio para evitar poluir outros testes
    from smc_sentinel.trading.factories import PollerFactory, FeeCalculatorFactory

    PollerFactory.register("bybit", TemplateOrderFillPoller)
    FeeCalculatorFactory.register("bybit", TemplateFeeCalculator)

    class DummyClient:
        name = "bybit"

    client = DummyClient()
    assert isinstance(PollerFactory.create(client), TemplateOrderFillPoller)
    assert isinstance(FeeCalculatorFactory.create(client), TemplateFeeCalculator)