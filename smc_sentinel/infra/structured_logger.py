from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any, Dict, Optional

from loguru import logger


class StructuredLogger:
    """Logger estruturado que escreve eventos em JSON Lines.

    - Cria diretório base se não existir
    - Oferece métodos para logar eventos e trades
    - Usa arquivos padronizados: events.jsonl e trades.jsonl
    """

    def __init__(self, base_dir: Path | str):
        self.base_dir = Path(base_dir)
        try:
            self.base_dir.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            logger.warning(f"Falha ao criar diretório de logs {self.base_dir}: {e}")

    def _append_jsonl(self, filename: str, obj: Any) -> None:
        path = self.base_dir / filename
        try:
            with path.open("a", encoding="utf-8") as f:
                f.write(json.dumps(obj, ensure_ascii=False) + "\n")
        except Exception as e:
            logger.warning(f"Falha ao escrever log em {path}: {e}")

    def log_event(self, event_type: str, payload: Dict[str, Any], ts: Optional[float] = None) -> None:
        record = {
            "type": event_type,
            "payload": payload,
            "ts": float(ts if ts is not None else time.time()),
        }
        self._append_jsonl("events.jsonl", record)

    def log_trade(self, signal: Dict[str, Any], result: Dict[str, Any], ts: Optional[float] = None) -> None:
        record = {
            "signal": signal,
            "result": result,
            "ts": float(ts if ts is not None else time.time()),
        }
        self._append_jsonl("trades.jsonl", record)

    def log_fill(self, symbol: str, side: str, qty: float, avg_price: float, exchange: str, order_id: str | int, status: str, extra: Optional[Dict[str, Any]] = None, ts: Optional[float] = None) -> None:
        payload = {
            "exchange": exchange,
            "symbol": symbol,
            "side": side,
            "qty": float(qty),
            "avg_price": float(avg_price),
            "order_id": order_id,
            "status": status,
        }
        if extra:
            payload.update(extra)
        self.log_event("order_fill", payload, ts=ts)