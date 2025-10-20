from __future__ import annotations

import os
from dataclasses import dataclass
from typing import List

from dotenv import load_dotenv


@dataclass
class Settings:
    # Geral
    log_level: str = "INFO"
    sink: str = "console"  # console | jsonl
    jsonl_path: str = "data/events.jsonl"
    jsonl_rotate_daily: bool = False
    stats_interval: float = 30.0

    # Binance
    binance_api_key: str | None = None
    binance_api_secret: str | None = None
    binance_symbols: List[str] = None
    binance_timeframe: str = "1m"

    # Coinbase
    coinbase_api_key: str | None = None
    coinbase_api_secret: str | None = None
    coinbase_passphrase: str | None = None
    coinbase_products: List[str] = None
    coinbase_timeframe: str = "1m"

    # Orderbook snapshots
    orderbook_level: int = 10
    orderbook_period: float = 20.0

    @classmethod
    def from_env(cls) -> "Settings":
        load_dotenv()  # carrega .env se existir
        def split_csv(value: str | None) -> list[str] | None:
            if not value:
                return None
            parts = [p.strip() for p in value.split(",") if p.strip()]
            return parts or None

        def to_bool(v: str | None, default: bool = False) -> bool:
            if v is None:
                return default
            return v.strip().lower() in ("1", "true", "yes", "y", "on")

        return cls(
            log_level=os.getenv("SMC_LOG_LEVEL", "INFO"),
            sink=os.getenv("SMC_SINK", "console"),
            jsonl_path=os.getenv("SMC_JSONL_PATH", "data/events.jsonl"),
            jsonl_rotate_daily=to_bool(os.getenv("SMC_JSONL_ROTATE_DAILY"), False),
            stats_interval=float(os.getenv("SMC_STATS_INTERVAL", "30.0")),
            binance_api_key=os.getenv("BINANCE_API_KEY"),
            binance_api_secret=os.getenv("BINANCE_API_SECRET"),
            binance_symbols=split_csv(os.getenv("SMC_SYMBOLS_BINANCE")) or ["BTCUSDT"],
            binance_timeframe=os.getenv("SMC_TIMEFRAME_BINANCE", "1m"),
            coinbase_api_key=os.getenv("COINBASE_API_KEY"),
            coinbase_api_secret=os.getenv("COINBASE_API_SECRET"),
            coinbase_passphrase=os.getenv("COINBASE_PASSPHRASE"),
            coinbase_products=split_csv(os.getenv("SMC_SYMBOLS_COINBASE")) or ["BTC-USD"],
            coinbase_timeframe=os.getenv("SMC_TIMEFRAME_COINBASE", "1m"),
            orderbook_level=int(os.getenv("SMC_ORDERBOOK_LEVEL", "10")),
            orderbook_period=float(os.getenv("SMC_ORDERBOOK_PERIOD", "20.0")),
        )