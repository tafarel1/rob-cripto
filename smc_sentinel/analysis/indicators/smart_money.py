from typing import Dict
import pandas as pd


def smart_money_signal(df: pd.DataFrame) -> Dict[str, float]:
    """
    Combine simple heuristics for SMC-style confirmation.
    Returns dict with scores for volume_spike, displacement, and imbalance.
    """
    if df.empty:
        return {"volume_spike": 0.0, "displacement": 0.0, "imbalance": 0.0}
    vol_spike = df['volume'].iloc[-1] / max(df['volume'].rolling(20).mean().iloc[-1], 1e-9)
    displacement = abs(df['close'].iloc[-1] - df['open'].iloc[-1]) / max(df['high'].iloc[-1] - df['low'].iloc[-1], 1e-9)
    imbalance = (df['high'].iloc[-1] - df['close'].iloc[-1]) - (df['open'].iloc[-1] - df['low'].iloc[-1])
    return {
        "volume_spike": float(vol_spike),
        "displacement": float(displacement),
        "imbalance": float(imbalance),
    }