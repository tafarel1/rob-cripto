from __future__ import annotations

from typing import Any, Dict, Type

from smc_sentinel.trading.abstractions.pollers import OrderFillPoller
from smc_sentinel.trading.abstractions.fee_calculators import FeeCalculator
from smc_sentinel.trading.implementations.binance import (
    BinanceOrderFillPoller,
    BinanceFeeCalculator,
)
from smc_sentinel.trading.implementations.coinbase import (
    CoinbaseOrderFillPoller,
    CoinbaseFeeCalculator,
)
from smc_sentinel.trading.implementations.kraken import (
    KrakenOrderFillPoller,
    KrakenFeeCalculator,
)


class NullOrderFillPoller(OrderFillPoller):
    async def poll_fill(self, symbol: str, side: str, order_result: Dict[str, Any], max_wait_s: int = 5):
        return None


class NullFeeCalculator(FeeCalculator):
    async def compute_fee_base(self, symbol: str, order_identifier, avg_price: float, fill: Dict[str, Any]) -> float:
        return 0.0


class PollerFactory:
    """Factory aberta para extensão (OCP) para Pollers."""

    _registry: Dict[str, Type[OrderFillPoller]] = {
        "binance": BinanceOrderFillPoller,
        "coinbase": CoinbaseOrderFillPoller,
        "kraken": KrakenOrderFillPoller,
    }

    @classmethod
    def register(cls, name: str, poller_class: Type[OrderFillPoller]):
        cls._registry[name.lower()] = poller_class

    @classmethod
    def create(cls, client: Any) -> OrderFillPoller:
        name = getattr(client, "name", "").lower()
        poller_cls = cls._registry.get(name, NullOrderFillPoller)
        return poller_cls(client)


class FeeCalculatorFactory:
    """Factory aberta para extensão (OCP) para Fee Calculators."""

    _registry: Dict[str, Type[FeeCalculator]] = {
        "binance": BinanceFeeCalculator,
        "coinbase": CoinbaseFeeCalculator,
        "kraken": KrakenFeeCalculator,
    }

    @classmethod
    def register(cls, name: str, calc_class: Type[FeeCalculator]):
        cls._registry[name.lower()] = calc_class

    @classmethod
    def create(cls, client: Any) -> FeeCalculator:
        name = getattr(client, "name", "").lower()
        calc_cls = cls._registry.get(name, NullFeeCalculator)
        return calc_cls(client)