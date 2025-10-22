from __future__ import annotations

import os
import time
import hashlib
from dataclasses import dataclass, field
from typing import Dict, Optional, Any

from .structured_logger import StructuredLogger


@dataclass
class ComponentToggle:
    mode: str = "auto"  # legacy | new | auto
    rollout_pct: int = 0  # 0..100
    max_consec_failures: int = 5
    rollback_timeout_s: int = 300
    # Estado runtime
    attempts: int = 0
    success: int = 0
    failure: int = 0
    consecutive_failures: int = 0
    rollback_until: float = 0.0
    last_error: Optional[str] = None

    def is_rollback_active(self) -> bool:
        return time.time() < float(self.rollback_until or 0.0)


class FeatureToggleManager:
    """Gerenciador de feature flags com rollback automático por componente.

    - Suporta modos: legacy, new, auto (canário por percentual)
    - Rollback automático em falhas consecutivas
    - Logging estruturado das decisões e rollbacks
    - Snapshot para dashboard/monitoramento
    """

    def __init__(self, components: Dict[str, ComponentToggle], logger: Optional[StructuredLogger] = None):
        self.components = components or {}
        self.logger = logger

    @staticmethod
    def _stable_percent(key: str) -> int:
        # Percentual estável com base no hash do key
        h = hashlib.sha256(key.encode("utf-8")).hexdigest()
        # Usa 4 bytes para maior distribuição
        val = int(h[:8], 16) % 100
        return val

    @classmethod
    def from_env_and_settings(cls, ts: Any, logger: Optional[StructuredLogger] = None) -> "FeatureToggleManager":
        def get(name: str, default: Any) -> Any:
            # Prioriza ENV, depois atributo do settings
            v = os.getenv(name)
            if v is None:
                v = getattr(ts, name, default)
            # Normaliza tipos simples
            if isinstance(default, bool):
                return str(v).strip().lower() in ("1", "true", "yes", "y", "on")
            if isinstance(default, int):
                try:
                    return int(v)
                except Exception:
                    return default
            return v if v is not None else default

        comps: Dict[str, ComponentToggle] = {
            "executor": ComponentToggle(
                mode=str(get("FF_EXECUTION_MODE", "auto") or "auto").lower(),
                rollout_pct=int(get("FF_EXECUTION_ROLLOUT_PCT", 0)),
                max_consec_failures=int(get("FF_EXECUTION_MAX_CONSEC_FAIL", 5)),
                rollback_timeout_s=int(get("FF_EXECUTION_ROLLBACK_TIMEOUT_S", 300)),
            ),
            "poller": ComponentToggle(
                mode=str(get("FF_POLLER_MODE", "auto") or "auto").lower(),
                rollout_pct=int(get("FF_POLLER_ROLLOUT_PCT", 0)),
                max_consec_failures=int(get("FF_POLLER_MAX_CONSEC_FAIL", 5)),
                rollback_timeout_s=int(get("FF_POLLER_ROLLBACK_TIMEOUT_S", 300)),
            ),
            "fees": ComponentToggle(
                mode=str(get("FF_FEES_MODE", "auto") or "auto").lower(),
                rollout_pct=int(get("FF_FEES_ROLLOUT_PCT", 0)),
                max_consec_failures=int(get("FF_FEES_MAX_CONSEC_FAIL", 5)),
                rollback_timeout_s=int(get("FF_FEES_ROLLBACK_TIMEOUT_S", 300)),
            ),
        }
        return cls(comps, logger=logger)

    def choose_path(self, component: str, key: str) -> str:
        c = self.components.get(component)
        if not c:
            return "legacy"
        now = time.time()
        decision = "legacy"
        rb_active = c.is_rollback_active()
        if rb_active:
            decision = "legacy"
        else:
            if c.mode == "legacy":
                decision = "legacy"
            elif c.mode == "new":
                decision = "new"
            else:  # auto/canary
                percent = self._stable_percent(key)
                decision = "new" if percent < max(0, min(100, int(c.rollout_pct))) else "legacy"
        # log decision
        if self.logger:
            self.logger.log_event(
                "ff_decision",
                {
                    "component": component,
                    "key": key,
                    "decision": decision,
                    "mode": c.mode,
                    "rollout_pct": c.rollout_pct,
                    "rollback_active": rb_active,
                },
            )
        # contabilizar tentativa
        c.attempts += 1
        return decision

    def report_success(self, component: str) -> None:
        c = self.components.get(component)
        if not c:
            return
        c.success += 1
        c.consecutive_failures = 0

    def report_failure(self, component: str, reason: str, path_used: str) -> None:
        c = self.components.get(component)
        if not c:
            return
        c.failure += 1
        c.consecutive_failures += 1
        c.last_error = reason
        # Rollback apenas se caminho era "new"
        if str(path_used).lower() == "new" and c.consecutive_failures >= int(c.max_consec_failures):
            c.rollback_until = time.time() + float(c.rollback_timeout_s)
            if self.logger:
                self.logger.log_event(
                    "ff_rollback",
                    {
                        "component": component,
                        "reason": reason,
                        "max_consec_failures": c.max_consec_failures,
                        "rollback_timeout_s": c.rollback_timeout_s,
                    },
                )

    def status_snapshot(self) -> Dict[str, Any]:
        out: Dict[str, Any] = {"components": {}}
        for name, c in self.components.items():
            out["components"][name] = {
                "mode": c.mode,
                "rollout_pct": c.rollout_pct,
                "attempts": c.attempts,
                "success": c.success,
                "failure": c.failure,
                "consecutive_failures": c.consecutive_failures,
                "rollback_active": c.is_rollback_active(),
                "rollback_until": c.rollback_until,
                "last_error": c.last_error,
            }
        out["ts"] = time.time()
        return out