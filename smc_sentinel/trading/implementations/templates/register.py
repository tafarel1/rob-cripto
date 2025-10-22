from __future__ import annotations

"""
Convenience helpers para registrar uma nova exchange nas factories.

Uso:

from smc_sentinel.trading.implementations.templates.template_poller import TemplateOrderFillPoller
from smc_sentinel.trading.implementations.templates.template_fee_calculator import TemplateFeeCalculator
from smc_sentinel.trading.factories import PollerFactory, FeeCalculatorFactory

# Ex.: registrar Kraken
register_exchange("kraken", TemplateOrderFillPoller, TemplateFeeCalculator)

# Ex.: registrar Bybit
register_exchange("bybit", TemplateOrderFillPoller, TemplateFeeCalculator)

"""

from typing import Type

from ...abstractions.pollers import OrderFillPoller
from ...abstractions.fee_calculators import FeeCalculator
from ...factories import PollerFactory, FeeCalculatorFactory


def register_exchange(exchange_name: str, poller_cls: Type[OrderFillPoller], fee_calc_cls: Type[FeeCalculator]) -> None:
    PollerFactory.register(exchange_name, poller_cls)
    FeeCalculatorFactory.register(exchange_name, fee_calc_cls)