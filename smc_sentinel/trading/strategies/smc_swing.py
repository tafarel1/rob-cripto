from typing import Dict, List
import pandas as pd

from ...analysis.signals.signal_generator import SignalGenerator


class SMCSwingStrategy:
    """Swing strategy (1h–4h) using SMC signals."""

    def __init__(self, data: Dict[str, pd.DataFrame], config: Dict):
        self.data = data
        self.config = config
        self.sg = SignalGenerator(data, config)

    def generate_orders(self, timeframe: str = '1h') -> List[Dict]:
        signals = self.sg.generate(timeframe)
        orders: List[Dict] = []
        for s in signals:
            if s['type'] == 'OB' and s.get('bias') == 'bullish':
                orders.append({"symbol": self.config.get('symbol', 'BTCUSDT'), "side": "buy", "size": self.config.get('size', 0.02)})
            elif s['type'] == 'OB' and s.get('bias') == 'bearish':
                orders.append({"symbol": self.config.get('symbol', 'BTCUSDT'), "side": "sell", "size": self.config.get('size', 0.02)})
        return orders