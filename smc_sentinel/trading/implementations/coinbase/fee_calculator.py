from __future__ import annotations

from typing import Any, Dict, Union

from smc_sentinel.trading.abstractions.fee_calculators import FeeCalculator
from smc_sentinel.clients.coinbase import CoinbaseClient


class CoinbaseFeeCalculator(FeeCalculator):
    async def compute_fee_base(
        self,
        symbol: str,
        order_identifier: Union[int, str],
        avg_price: float,
        fill: Dict[str, Any],
    ) -> float:
        # Coinbase retorna a taxa em moeda quote; converte para base dividindo pelo preço médio
        fee_quote = float(fill.get("fee_quote", 0.0))
        if avg_price > 0:
            return fee_quote / avg_price
        return 0.0