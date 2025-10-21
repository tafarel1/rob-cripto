from typing import Dict


class ExchangeHandler:
    """Interface for interacting with exchanges (placeholder)."""

    def __init__(self, config: Dict):
        self.config = config

    def place_order(self, order: Dict) -> Dict:
        # Placeholder: integrate with clients/binance.py or coinbase.py later
        return {"status": "accepted", "order": order}