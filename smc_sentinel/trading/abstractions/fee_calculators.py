from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict, Union


class FeeCalculator(ABC):
    """Interface específica para cálculo de taxas (ISP + DIP)."""

    def __init__(self, client: Any) -> None:
        self.client = client

    @abstractmethod
    async def compute_fee_base(
        self,
        symbol: str,
        order_identifier: Union[int, str],
        avg_price: float,
        fill: Dict[str, Any],
    ) -> float:
        """Retorna a taxa em moeda base (ex.: BTC) da ordem."""
        ...