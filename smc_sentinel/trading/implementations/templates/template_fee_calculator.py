from __future__ import annotations

"""
Template de FeeCalculator para nova exchange.

Responsável por retornar a taxa em moeda base (ex.: BTC) associada
à ordem/fill. Adapte a lógica conforme a API da exchange.
"""

from typing import Any, Dict, Union

from ...abstractions.fee_calculators import FeeCalculator


class TemplateFeeCalculator(FeeCalculator):
    async def compute_fee_base(
        self,
        symbol: str,
        order_identifier: Union[int, str],
        avg_price: float,
        fill: Dict[str, Any],
    ) -> float:
        """Exemplo mínimo: usa dados do fill ou consulta de trades para obter taxa.

        Adapte para converter taxa quote->base quando necessário.
        """
        # Caso o fill já traga a taxa em moeda base
        fee_base = fill.get("fee_base")
        if fee_base is not None:
            try:
                return float(fee_base)
            except Exception:
                return 0.0

        # Caso a taxa venha em moeda quote, converter via avg_price
        fee_quote = fill.get("fee_quote")
        if fee_quote is not None:
            try:
                fq = float(fee_quote)
                if avg_price > 0:
                    return fq / avg_price
            except Exception:
                return 0.0

        # Fallback: zero, ou implemente busca via self.client.get_trades_for_order
        return 0.0