from dataclasses import dataclass
from typing import Dict


@dataclass
class PortfolioState:
    balance: float
    allocated: float = 0.0


class PortfolioManager:
    """Manage capital allocation across strategies and positions."""

    def __init__(self, initial_balance: float, config: Dict):
        self.state = PortfolioState(balance=initial_balance)
        self.config = config

    def available_capital(self) -> float:
        return max(self.state.balance - self.state.allocated, 0.0)

    def allocate(self, amount: float) -> bool:
        if amount <= self.available_capital():
            self.state.allocated += amount
            return True
        return False

    def realize_pnl(self, pnl: float) -> None:
        self.state.balance += pnl
        self.state.allocated = max(self.state.allocated - max(pnl, 0.0), 0.0)