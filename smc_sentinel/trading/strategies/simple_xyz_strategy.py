from __future__ import annotations

import asyncio
import time
from typing import Any, Dict, Optional

try:
    from smc_sentinel.infra.structured_logger import StructuredLogger
except Exception:
    StructuredLogger = None  # type: ignore


class SimpleXYZStrategy:
    """Estratégia simples para simulação/controlado.

    - execute_trade() simula custo de CPU e I/O
    - Usa time.perf_counter() para medir latência
    - Opcionalmente registra eventos via StructuredLogger
    """

    def __init__(self, logger: Optional[StructuredLogger] = None):
        self.logger = logger

    async def execute_trade(self, complexity: int = 10000, io_delay_ms: int = 10) -> Dict[str, Any]:
        start = time.perf_counter()

        # Simula custo de CPU leve
        acc = 0
        for i in range(max(0, int(complexity))):
            acc += (i % 7)

        # Simula I/O assíncrono
        delay_s = max(0, int(io_delay_ms)) / 1000.0
        if delay_s:
            await asyncio.sleep(delay_s)

        latency_s = time.perf_counter() - start
        result: Dict[str, Any] = {
            "ok": True,
            "acc": acc,
            "latency_s": latency_s,
            "complexity": int(complexity),
            "io_delay_ms": int(io_delay_ms),
        }

        if self.logger:
            try:
                self.logger.log_event("simple_xyz_execute_trade", {"latency_s": latency_s, "complexity": int(complexity)})
            except Exception:
                pass

        return result

