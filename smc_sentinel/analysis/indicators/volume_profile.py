from typing import Tuple
import numpy as np
import pandas as pd


def compute_volume_profile(df: pd.DataFrame, bins: int = 24) -> Tuple[np.ndarray, np.ndarray]:
    """
    Compute a simple volume profile across the price range using histogram bins.
    Returns (hist, bin_edges).
    """
    if df.empty:
        return np.array([]), np.array([])
    prices = (df['high'] + df['low']) / 2.0
    hist, bin_edges = np.histogram(prices, bins=bins, weights=df['volume'])
    return hist, bin_edges