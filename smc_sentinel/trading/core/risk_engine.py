from typing import Dict
import asyncio
from typing import Any, Dict, Tuple


class RiskEngine:
    """Apply dynamic stops and risk constraints to orders/positions."""

    def __init__(self, config: Dict):
        self.config = config

    def compute_stop(self, entry_price: float, atr: float) -> float:
        """Return a dynamic stop distance using ATR multiplier."""
        m = float(self.config.get('stop_atr_mult', 1.5))
        return atr * m

    def position_size(self, balance: float, risk_pct: float, stop_distance: float) -> float:
        risk_amount = balance * risk_pct
        if stop_distance <= 0:
            return 0.0
        return risk_amount / stop_distance


class RealTimeRiskEngine:
    """Motor de risco em tempo real com checks assíncronos e stop dinâmico.

    Limites de exposição padrão:
    - max_daily_loss: perda máxima diária (fração do balanço)
    - max_position_size: fração máxima do balanço por posição
    - max_correlation: correlação máxima aceitável com posições existentes
    - volatility_limit: volatilidade máxima do mercado
    """

    def __init__(self, config: Dict[str, Any], portfolio: Any):
        self.config = config
        self.portfolio = portfolio
        self.exposure_limits = {
            "max_daily_loss": float(config.get("max_daily_loss", 0.03)),
            "max_position_size": float(config.get("max_position_size", 0.1)),
            "max_correlation": float(config.get("max_correlation", 0.7)),
            "volatility_limit": float(config.get("volatility_limit", 0.15)),
        }

    def _get_balance(self) -> float:
        try:
            if self.portfolio and hasattr(self.portfolio, "available_capital") and callable(self.portfolio.available_capital):
                return float(self.portfolio.available_capital())
            if self.portfolio and hasattr(self.portfolio, "state") and hasattr(self.portfolio.state, "balance"):
                return float(self.portfolio.state.balance)
        except Exception:
            pass
        return float(self.config.get("balance", 0.0))

    async def pre_trade_analysis(self, trade_signal: Dict[str, Any]) -> Tuple[bool, Dict[str, bool]]:
        """Análise de risco completa pré-trade.

        Retorna (ok, dict de checks) onde ok é True se todos os checks passarem.
        """
        symbol = trade_signal.get("symbol")
        vol = await self.get_volatility(symbol)
        risk_checks = {
            "daily_loss": await self.check_daily_loss_limit(),
            "position_size": self.check_position_size(trade_signal),
            "market_volatility": vol <= self.exposure_limits["volatility_limit"],
            "correlation": await self.check_portfolio_correlation(trade_signal),
            "liquidity": await self.check_market_liquidity(symbol),
            "time_of_day": self.check_trading_hours(),
        }
        return all(risk_checks.values()), risk_checks

    async def check_daily_loss_limit(self) -> bool:
        """Verifica se a perda diária está dentro do limite.

        Fallback simples: retorna True se não houver dados disponíveis.
        """
        try:
            # Se portfolio tiver perda diária, compara contra limite
            if self.portfolio and hasattr(self.portfolio, "daily_loss_pct"):
                return float(getattr(self.portfolio, "daily_loss_pct")) <= self.exposure_limits["max_daily_loss"]
        except Exception:
            pass
        return True

    def check_position_size(self, trade_signal: Dict[str, Any]) -> bool:
        """Verifica se o tamanho da posição é compatível com o limite de exposição."""
        balance = self._get_balance()
        entry = float(trade_signal.get("entry_price", 0.0))
        # Usa tamanho do sinal ou fallback de config
        size_units = float(trade_signal.get("size", self.config.get("size", 0.0)))
        position_value = entry * size_units
        if balance <= 0:
            return False
        fraction = position_value / balance
        return fraction <= self.exposure_limits["max_position_size"]

    async def get_volatility(self, symbol: Any) -> float:
        """Obtém volatilidade atual do mercado.

        Fallback: valor padrão vindo do config ou 0.01.
        """
        # Se existir cliente com método get_volatility, usa-o
        try:
            client = self.config.get("exchange_client")
            if client and hasattr(client, "get_volatility") and callable(client.get_volatility):
                if asyncio.iscoroutinefunction(client.get_volatility):
                    return float(await client.get_volatility(symbol))
                return float(await asyncio.to_thread(client.get_volatility, symbol))
        except Exception:
            pass
        return float(self.config.get("default_volatility", 0.01))

    async def check_volatility(self, symbol: Any) -> bool:
        vol = await self.get_volatility(symbol)
        return vol <= self.exposure_limits["volatility_limit"]

    async def check_portfolio_correlation(self, trade_signal: Dict[str, Any]) -> bool:
        """Verifica correlação com posições existentes (fallback simples)."""
        try:
            if self.portfolio and hasattr(self.portfolio, "positions"):
                # Fallback: assume correlação aceitável
                return True
        except Exception:
            pass
        return True

    async def check_market_liquidity(self, symbol: Any) -> bool:
        """Verifica liquidez de mercado (fallback simples)."""
        try:
            client = self.config.get("exchange_client")
            if client and hasattr(client, "get_orderbook_depth") and callable(client.get_orderbook_depth):
                depth = await asyncio.to_thread(client.get_orderbook_depth, symbol)
                return bool(depth)
        except Exception:
            pass
        return True

    def check_trading_hours(self) -> bool:
        """Verifica se horário é adequado para negociação (fallback simples: sempre True)."""
        return True

    def calculate_dynamic_stop_loss(self, signal: Dict[str, Any], current_volatility: float) -> float:
        """Calcula stop loss dinâmico baseado em SMC e volatilidade."""
        direction = signal.get("direction", "LONG")
        entry = float(signal.get("entry_price", 0.0))
        if direction == "LONG":
            smc_stop = float(self.find_smc_support_level(signal))
            volatility_stop = entry * (1 - current_volatility * 1.5)
            return min(smc_stop, volatility_stop)
        else:
            smc_stop = float(self.find_smc_resistance_level(signal))
            volatility_stop = entry * (1 + current_volatility * 1.5)
            return max(smc_stop, volatility_stop)

    def find_smc_support_level(self, signal: Dict[str, Any]) -> float:
        """Procura nível de suporte SMC (fallback heurístico)."""
        entry = float(signal.get("entry_price", 0.0))
        return float(signal.get("smc_support", entry * 0.99))

    def find_smc_resistance_level(self, signal: Dict[str, Any]) -> float:
        """Procura nível de resistência SMC (fallback heurístico)."""
        entry = float(signal.get("entry_price", 0.0))
        return float(signal.get("smc_resistance", entry * 1.01))