from dataclasses import dataclass, asdict
from typing import Dict, Any
from typing import Optional, List

try:
    from pydantic import BaseSettings
except Exception:  # Fallback mínimo se pydantic não estiver disponível
    class BaseSettings:  # type: ignore
        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)
        def dict(self):
            return self.__dict__


@dataclass
class Settings:
    symbol: str = 'BTCUSDT'
    higher_tf: str = '1h'
    size: float = 0.01
    stop_atr_mult: float = 1.5
    risk_pct: float = 0.01
    max_signals_per_tick: int = 10
    min_ob_quality: float = 0.6
    max_slippage_pct: float = 0.001

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def load_settings(**overrides: Any) -> Dict[str, Any]:
    """Carrega configurações com valores padrão e permite overrides por kwargs."""
    s = Settings()
    for k, v in overrides.items():
        if hasattr(s, k):
            setattr(s, k, v)
    return s.to_dict()


class TradingSettings(BaseSettings):
    # Configurações existentes do SMC_Sentinel
    SMC_STATS_INTERVAL: int = 300
    BINANCE_API_KEY: Optional[str] = None
    BINANCE_SECRET_KEY: Optional[str] = None

    # Novas configurações de trading
    TRADING_ENABLED: bool = False
    RISK_PROFILE: str = "conservative"  # conservative/moderate/aggressive
    TARGET_MONTHLY_RETURN: float = 0.10
    MAX_DAILY_DRAWDOWN: float = 0.02

    # Estratégia
    ENABLED_STRATEGIES: List[str] = ["multi_timeframe", "liquidity_grab"]
    TRADING_SYMBOLS: List[str] = ["BTCUSDT", "ETHUSDT", "ADAUSDT"]

    # Timeframes
    PRIMARY_TIMEFRAME: str = "15m"
    CONFIRMATION_TIMEFRAMES: List[str] = ["1h", "4h"]

    # Execução
    MAX_POSITION_SIZE: float = 0.1
    DEFAULT_LEVERAGE: int = 3
    ENABLE_PYRAMIDING: bool = True

    class Config:
        env_file = ".env"

    def to_dict(self) -> dict:
        # Compatível com Pydantic ou fallback
        if hasattr(super(), 'dict'):
            try:
                return super().dict()
            except Exception:
                pass
        return {
            'SMC_STATS_INTERVAL': self.SMC_STATS_INTERVAL,
            'BINANCE_API_KEY': self.BINANCE_API_KEY,
            'BINANCE_SECRET_KEY': self.BINANCE_SECRET_KEY,
            'TRADING_ENABLED': self.TRADING_ENABLED,
            'RISK_PROFILE': self.RISK_PROFILE,
            'TARGET_MONTHLY_RETURN': self.TARGET_MONTHLY_RETURN,
            'MAX_DAILY_DRAWDOWN': self.MAX_DAILY_DRAWDOWN,
            'ENABLED_STRATEGIES': self.ENABLED_STRATEGIES,
            'TRADING_SYMBOLS': self.TRADING_SYMBOLS,
            'PRIMARY_TIMEFRAME': self.PRIMARY_TIMEFRAME,
            'CONFIRMATION_TIMEFRAMES': self.CONFIRMATION_TIMEFRAMES,
            'MAX_POSITION_SIZE': self.MAX_POSITION_SIZE,
            'DEFAULT_LEVERAGE': self.DEFAULT_LEVERAGE,
            'ENABLE_PYRAMIDING': self.ENABLE_PYRAMIDING,
        }