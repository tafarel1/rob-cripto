from typing import Dict, List
import pandas as pd

from ..core.market_structure import AdvancedMarketStructure
from ..core.order_blocks import SmartOrderBlockDetector


class SignalGenerator:
    """
    Generate trading signals using market structure and order blocks.
    """

    def __init__(self, data: Dict[str, pd.DataFrame], config: Dict):
        self.data = data
        self.config = config
        self.ms = AdvancedMarketStructure(data)
        self.ob = SmartOrderBlockDetector(data, config)

    def generate(self, timeframe: str) -> List[Dict]:
        df = self.data.get(timeframe, pd.DataFrame())
        if df.empty:
            return []
        signals: List[Dict] = []

        # BOS check with HTF confirmation if available
        htf = self.data.get(self.config.get('higher_tf', '1h'), df)
        if self.ms.detect_bos(df, htf):
            signals.append({"type": "BOS", "bias": "long", "timeframe": timeframe})

        # OB candidates sorted by quality
        blocks = self.ob.find_quality_order_blocks(timeframe=timeframe)
        for b in blocks[:3]:  # limit to top blocks
            signals.append({"type": "OB", "bias": b['type'], "quality": b['quality'], "timeframe": timeframe})

        return signals