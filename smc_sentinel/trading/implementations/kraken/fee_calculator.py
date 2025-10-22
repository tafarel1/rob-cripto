from __future__ import annotations

from typing import Any, Dict, Union

from smc_sentinel.trading.abstractions.fee_calculators import FeeCalculator


class KrakenFeeCalculator(FeeCalculator):
    async def compute_fee_base(
        self,
        symbol: str,
        order_identifier: Union[int, str],
        avg_price: float,
        fill: Dict[str, Any],
    ) -> float:
        # Se o fill trouxer taxa em base, retorna diretamente
        fb = fill.get("fee_base")
        if fb is not None:
            try:
                return float(fb)
            except Exception:
                return 0.0

        # Se a taxa vier em quote, converte via avg_price
        fq = fill.get("fee_quote")
        if fq is not None:
            try:
                fqf = float(fq)
                if avg_price > 0:
                    return fqf / avg_price
            except Exception:
                return 0.0

        # Fallback: busca trades da ordem e agregue (implementar conforme necessidade)
        return 0.0