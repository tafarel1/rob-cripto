from dataclasses import dataclass
from typing import Optional


@dataclass
class Position:
    symbol: str
    side: str  # 'long' or 'short'
    entry_price: float
    size: float
    stop_price: Optional[float] = None


class PositionManager:
    """Track and update open positions."""

    def __init__(self):
        self.positions = {}

    def open(self, symbol: str, side: str, entry_price: float, size: float, stop_price: Optional[float] = None) -> None:
        self.positions[symbol] = Position(symbol, side, entry_price, size, stop_price)

    def close(self, symbol: str) -> Optional[Position]:
        return self.positions.pop(symbol, None)

    def update_stop(self, symbol: str, stop_price: float) -> None:
        if symbol in self.positions:
            self.positions[symbol].stop_price = stop_price