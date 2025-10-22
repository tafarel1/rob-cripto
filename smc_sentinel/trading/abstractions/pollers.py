from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional


class OrderFillPoller(ABC):
    """Interface específica para polling de fills (ISP + DIP)."""

    def __init__(self, client: Any) -> None:
        self.client = client

    @abstractmethod
    async def poll_fill(
        self,
        symbol: str,
        side: str,
        order_result: Dict[str, Any],
        max_wait_s: int = 5,
    ) -> Optional[Dict[str, Any]]:
        """Retorna o fill da ordem ou None em timeout/cancelamento."""
        ...