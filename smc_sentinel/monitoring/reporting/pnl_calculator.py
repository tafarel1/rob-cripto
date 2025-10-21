from typing import List, Dict


def compute_realized_pnl(trades: List[Dict]) -> float:
    """Sum realized PnL from a list of trade dicts."""
    return sum(float(t.get('pnl', 0.0)) for t in trades)