from typing import Dict, List
import pandas as pd


class LiquidityZones:
    """Detect simple liquidity zones like equal highs/lows and gaps."""

    def __init__(self, data: Dict[str, pd.DataFrame]):
        self.data = data

    def find_equal_highs(self, df: pd.DataFrame, tolerance: float = 1e-3) -> List[int]:
        idxs: List[int] = []
        highs = df['high']
        for i in range(2, len(highs)):
            if abs(highs.iloc[i] - highs.iloc[i - 1]) <= tolerance:
                idxs.append(i)
        return idxs

    def find_equal_lows(self, df: pd.DataFrame, tolerance: float = 1e-3) -> List[int]:
        idxs: List[int] = []
        lows = df['low']
        for i in range(2, len(lows)):
            if abs(lows.iloc[i] - lows.iloc[i - 1]) <= tolerance:
                idxs.append(i)
        return idxs

    def detect_gap(self, df: pd.DataFrame, min_gap_pct: float = 0.002) -> List[int]:
        idxs: List[int] = []
        for i in range(1, len(df)):
            gap_up = (df['open'].iloc[i] - df['close'].iloc[i - 1]) / max(df['close'].iloc[i - 1], 1e-9)
            gap_down = (df['close'].iloc[i - 1] - df['open'].iloc[i]) / max(df['close'].iloc[i - 1], 1e-9)
            if gap_up > min_gap_pct or gap_down > min_gap_pct:
                idxs.append(i)
        return idxs