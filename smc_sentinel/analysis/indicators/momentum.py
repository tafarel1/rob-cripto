import pandas as pd


def simple_momentum_score(close: pd.Series, lookback: int = 10) -> float:
    """Return a normalized momentum score using rate of change over lookback."""
    if len(close) < lookback + 1:
        return 0.0
    roc = (close.iloc[-1] - close.iloc[-lookback]) / max(close.iloc[-lookback], 1e-9)
    return float(roc)