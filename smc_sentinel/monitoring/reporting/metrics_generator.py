from typing import List, Dict


def generate_metrics(trades: List[Dict]) -> Dict[str, float]:
    """
    Gera métricas agregadas de trades.
    Cada trade é um dict, idealmente com chaves: 'pnl' (float) e 'win' (bool opcional).
    """
    n = len(trades)
    realized_pnl = sum(float(t.get('pnl', 0.0)) for t in trades)
    wins = [float(t.get('pnl', 0.0)) for t in trades if (t.get('win') is True) or (float(t.get('pnl', 0.0)) > 0.0)]
    losses = [abs(float(t.get('pnl', 0.0))) for t in trades if (t.get('win') is False) or (float(t.get('pnl', 0.0)) < 0.0)]

    win_count = len(wins)
    loss_count = len(losses)
    win_rate = (win_count / n) if n else 0.0

    avg_win = (sum(wins) / win_count) if win_count else 0.0
    avg_loss = (sum(losses) / loss_count) if loss_count else 0.0

    profit_factor = (sum(wins) / sum(losses)) if loss_count and sum(losses) > 0 else float('inf') if win_count else 0.0
    expectancy = (win_rate * avg_win) - ((1 - win_rate) * avg_loss)

    return {
        'trades_count': float(n),
        'realized_pnl': float(realized_pnl),
        'win_rate': float(win_rate),
        'avg_win': float(avg_win),
        'avg_loss': float(avg_loss),
        'profit_factor': float(profit_factor),
        'expectancy': float(expectancy),
    }