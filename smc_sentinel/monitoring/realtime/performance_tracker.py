from typing import List, Dict


class PerformanceTracker:
    """Track realized PnL, win rate, and trade metrics."""

    def __init__(self):
        self.trades: List[Dict] = []

    def record_trade(self, pnl: float, win: bool) -> None:
        self.trades.append({"pnl": pnl, "win": bool(win)})

    def realized_pnl(self) -> float:
        return sum(t["pnl"] for t in self.trades)

    def win_rate(self) -> float:
        if not self.trades:
            return 0.0
        wins = sum(1 for t in self.trades if t["win"]) or 0
        return wins / len(self.trades)


class AdvancedPerformanceTracker:
    """Tracker de Performance Avançado com métricas em tempo real.

    Espera trade_result contendo ao menos:
    - pnl (float)
    - timestamp (epoch segundos) opcional
    - duration_seconds (float) opcional
    - return_pct (float) opcional
    """

    def __init__(self, config):
        self.config = config or {}
        self.metrics = {
            'daily_pnl': 0.0,
            'monthly_pnl': 0.0,
            'win_rate': 0.0,
            'profit_factor': 0.0,
            'sharpe_ratio': 0.0,
            'max_drawdown': 0.0,
            'avg_trade_duration': 0.0,
            'consecutive_wins': 0,
            'consecutive_losses': 0,
        }
        # Estado interno
        self.total_trades = 0
        self.win_trades = 0
        self.loss_trades = 0
        self.gross_profit = 0.0
        self.gross_loss = 0.0
        self.equity = 0.0
        self.peak_equity = 0.0
        self.returns_history = []  # lista de return_pct por trade
        self.duration_sum = 0.0
        self.last_daily_date = None
        self.last_month_key = None

    def update_live_metrics(self, trade_result):
        """Atualiza métricas em tempo real."""
        from datetime import datetime
        pnl = float(trade_result.get('pnl', 0.0))
        ts = trade_result.get('timestamp')
        dt = datetime.utcfromtimestamp(ts) if isinstance(ts, (int, float)) else datetime.utcnow()

        # Reset diário/mensal quando muda a data/mês
        day_key = (dt.year, dt.month, dt.day)
        if self.last_daily_date and self.last_daily_date != day_key:
            self.metrics['daily_pnl'] = 0.0
        self.last_daily_date = day_key

        month_key = (dt.year, dt.month)
        if self.last_month_key and self.last_month_key != month_key:
            self.metrics['monthly_pnl'] = 0.0
        self.last_month_key = month_key

        # Atualiza PnL
        self.metrics['daily_pnl'] += pnl
        self.metrics['monthly_pnl'] += pnl

        # Atualiza consecutivos e contagem
        self.total_trades += 1
        if pnl > 0:
            self.win_trades += 1
            self.metrics['consecutive_wins'] += 1
            self.metrics['consecutive_losses'] = 0
            self.gross_profit += pnl
        else:
            self.loss_trades += 1
            self.metrics['consecutive_losses'] += 1
            self.metrics['consecutive_wins'] = 0
            self.gross_loss += abs(pnl)

        # Atualiza duração média
        dur = float(trade_result.get('duration_seconds', 0.0))
        self.duration_sum += dur
        self.metrics['avg_trade_duration'] = (self.duration_sum / self.total_trades) if self.total_trades > 0 else 0.0

        # Atualiza equity e drawdown
        self.equity += pnl
        self.peak_equity = max(self.peak_equity, self.equity)
        self.update_drawdown()

        # Win rate, profit factor
        self.calculate_win_rate()
        self.calculate_profit_factor()

        # Sharpe ratio (usar return_pct se disponível, senão normalizar por balanço/config)
        rpct = trade_result.get('return_pct')
        if rpct is None:
            balance = float(self.config.get('initial_balance', 1.0)) or 1.0
            rpct = pnl / balance
        self.returns_history.append(float(rpct))
        self.calculate_sharpe_ratio()

    def calculate_win_rate(self):
        if self.total_trades > 0:
            self.metrics['win_rate'] = self.win_trades / float(self.total_trades)
        else:
            self.metrics['win_rate'] = 0.0

    def calculate_profit_factor(self):
        if self.gross_loss > 0:
            self.metrics['profit_factor'] = self.gross_profit / self.gross_loss
        elif self.gross_profit > 0 and self.gross_loss == 0:
            # Nenhuma perda até agora
            self.metrics['profit_factor'] = float('inf')
        else:
            self.metrics['profit_factor'] = 0.0

    def update_drawdown(self):
        if self.peak_equity <= 0:
            self.metrics['max_drawdown'] = max(self.metrics['max_drawdown'], 0.0)
            return
        current_dd = (self.peak_equity - self.equity) / self.peak_equity
        self.metrics['max_drawdown'] = max(self.metrics['max_drawdown'], current_dd)

    def calculate_sharpe_ratio(self):
        # Sharpe simples sobre retornos por trade
        n = len(self.returns_history)
        if n < 2:
            self.metrics['sharpe_ratio'] = 0.0
            return
        avg = sum(self.returns_history) / n
        var = sum((r - avg) ** 2 for r in self.returns_history) / (n - 1)
        std = var ** 0.5
        if std <= 0:
            self.metrics['sharpe_ratio'] = 0.0
            return
        # Ajuste sqrt(N) para consolidar por trades
        self.metrics['sharpe_ratio'] = (avg / std) * (n ** 0.5)

    def generate_performance_alerts(self):
        """Gera alertas baseados em performance."""
        alerts = []
        max_daily_loss = float(self.config.get('max_daily_loss', 0.03))
        if self.metrics['daily_pnl'] < -max_daily_loss:
            alerts.append('DAILY_LOSS_LIMIT_REACHED')
        if self.metrics['consecutive_losses'] >= int(self.config.get('loss_streak_alert', 5)):
            alerts.append('CONSECUTIVE_LOSSES_HIGH')
        if self.metrics['win_rate'] < float(self.config.get('min_win_rate', 0.4)) and self.total_trades >= int(self.config.get('min_trades_for_winrate', 10)):
            alerts.append('WIN_RATE_BELOW_THRESHOLD')
        return alerts