from typing import Dict, List
import pandas as pd

from ...analysis.signals.signal_generator import SignalGenerator


class SMCScalpStrategy:
    """Scalping strategy (1–5m) using SMC signals."""

    def __init__(self, data: Dict[str, pd.DataFrame], config: Dict):
        self.data = data
        self.config = config
        self.sg = SignalGenerator(data, config)

    def generate_orders(self, timeframe: str = '5m') -> List[Dict]:
        signals = self.sg.generate(timeframe)
        orders: List[Dict] = []
        for s in signals:
            if s['type'] == 'BOS' and s.get('bias') == 'long':
                orders.append({"symbol": self.config.get('symbol', 'BTCUSDT'), "side": "buy", "size": self.config.get('size', 0.01)})
        return orders