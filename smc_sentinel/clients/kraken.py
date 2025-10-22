from __future__ import annotations

import base64
import hashlib
import hmac
import time
import os
from typing import Any, Optional

import httpx

from .base import BaseExchangeClient, ExchangeCredentials
from ..infra.rate_limiter import RateLimiter
from ..infra.errors import NetworkError, RateLimitError, AuthError
from ..infra.retry import retry_with_backoff


KRAKEN_BASE_SANDBOX = "https://api.sandbox.kraken.com"
# Adiciona base de produção para alternância
KRAKEN_BASE_PROD = "https://api.kraken.com"

_DEFAULT_LIMITS = (
    ("kraken:global", 30, 3.0),
    ("kraken:market_data", 20, 2.0),
    ("kraken:order", 15, 5.0),
    ("kraken:order_status", 15, 5.0),
)


class KrakenClient(BaseExchangeClient):
    name = "kraken"
    base_url = KRAKEN_BASE_SANDBOX

    # Adiciona parâmetro opcional para controlar sandbox/prod diretamente
    def __init__(self, credentials: Optional[ExchangeCredentials] = None, timeout: float = 10.0, rate_limiter: Optional[RateLimiter] = None, use_sandbox: Optional[bool] = None):
        super().__init__(credentials, timeout)
        # Determina base_url a partir do parâmetro, env ou fallback
        env_flag = os.getenv("KRAKEN_USE_SANDBOX", "true").lower() in ("1", "true", "yes", "on")
        base_override = os.getenv("KRAKEN_BASE_URL")
        if use_sandbox is not None:
            selected_base = KRAKEN_BASE_SANDBOX if use_sandbox else KRAKEN_BASE_PROD
        else:
            selected_base = base_override if base_override else (KRAKEN_BASE_SANDBOX if env_flag else KRAKEN_BASE_PROD)
        self.base_url = selected_base

        self.session = httpx.Client(timeout=timeout, base_url=self.base_url)
        self.async_session = httpx.AsyncClient(timeout=timeout, base_url=self.base_url)
        self.rl = rate_limiter or RateLimiter()
        self.timeout_s = timeout

        def _env_float(name: str, default: float) -> float:
            try:
                raw = os.getenv(name)
                return float(raw) if raw is not None else float(default)
            except Exception:
                return float(default)

        limits = (
            ("kraken:global", _env_float("KRAKEN_RL_GLOBAL_CAP", 30), _env_float("KRAKEN_RL_GLOBAL_FR", 3.0)),
            ("kraken:market_data", _env_float("KRAKEN_RL_MD_CAP", 20), _env_float("KRAKEN_RL_MD_FR", 2.0)),
            ("kraken:order", _env_float("KRAKEN_RL_ORDER_CAP", 15), _env_float("KRAKEN_RL_ORDER_FR", 5.0)),
            ("kraken:order_status", _env_float("KRAKEN_RL_ORDER_STATUS_CAP", 15), _env_float("KRAKEN_RL_ORDER_STATUS_FR", 5.0)),
        )
        for key, cap, fr in limits:
            if key not in self.rl.buckets:
                self.rl.register(key, capacity=float(cap), fill_rate=float(fr))

    def _handle_response_errors(self, r: httpx.Response) -> None:
        if r.status_code in (401, 403):
            raise AuthError(r.text)
        if r.status_code == 429:
            raise RateLimitError(r.text)
        if 500 <= r.status_code < 600:
            raise NetworkError(r.text)
        r.raise_for_status()

    # --- Assinatura Kraken (privado) ---
    def _kraken_sign(self, path: str, nonce: str, body: str) -> str:
        # API-Sign = HMAC_SHA512( base64(secret), (path + SHA256(nonce+postdata)) )
        secret = self.credentials.api_secret if self.credentials else ""
        if not secret:
            return ""
        sha256 = hashlib.sha256((nonce + body).encode("utf-8")).digest()
        message = path.encode("utf-8") + sha256
        mac = hmac.new(base64.b64decode(secret), message, hashlib.sha512)
        return base64.b64encode(mac.digest()).decode("utf-8")

    # --- Interface comum ---
    @retry_with_backoff(attempts=4, min_wait=0.5, max_wait=8.0, multiplier=1.0)
    def fetch_ohlcv(self, symbol: str, timeframe: str, start_ms: Optional[int] = None, end_ms: Optional[int] = None, limit: int = 500) -> list[dict[str, Any]]:
        ok_g = self.rl.blocking_acquire("kraken:global", cost=1.0, timeout=2.0)
        ok_md = self.rl.blocking_acquire("kraken:market_data", cost=1.0, timeout=2.0)
        if not (ok_g and ok_md):
            raise RateLimitError("local gate timeout")
        interval_map = {"1m": 1, "5m": 5, "15m": 15, "1h": 60, "6h": 360, "1d": 1440}
        interval = interval_map.get(timeframe, 1)
        params = {"pair": symbol, "interval": interval}
        if start_ms:
            params["since"] = int(start_ms // 1000)
        r = self.session.get("/0/public/OHLC", params=params)
        self._handle_response_errors(r)
        data = r.json()
        # Normalização mínima; estrutura exata pode variar
        candles = next(iter(data.get("result", {}).values()), [])
        out: list[dict[str, Any]] = []
        for c in candles[:limit]:
            # c: [time, open, high, low, close, vwap, volume, count]
            out.append({
                "timestamp": int(c[0]) * 1000,
                "open": float(c[1]),
                "high": float(c[2]),
                "low": float(c[3]),
                "close": float(c[4]),
                "volume": float(c[6]),
            })
        return out

    @retry_with_backoff(attempts=4, min_wait=0.5, max_wait=8.0, multiplier=1.0)
    def fetch_order_book(self, symbol: str, limit: int = 100) -> dict[str, Any]:
        ok_g = self.rl.blocking_acquire("kraken:global", cost=1.0, timeout=2.0)
        ok_md = self.rl.blocking_acquire("kraken:market_data", cost=1.0, timeout=2.0)
        if not (ok_g and ok_md):
            raise RateLimitError("local gate timeout")
        r = self.session.get("/0/public/Depth", params={"pair": symbol, "count": limit})
        self._handle_response_errors(r)
        return r.json()

    @retry_with_backoff(attempts=4, min_wait=0.5, max_wait=8.0, multiplier=1.0)
    def place_order(self, symbol: str, side: str, type_: str, quantity: float, price: Optional[float] = None, **kwargs) -> dict[str, Any]:
        ok_g = self.rl.blocking_acquire("kraken:global", cost=1.0, timeout=3.0)
        ok_ord = self.rl.blocking_acquire("kraken:order", cost=1.0, timeout=3.0)
        if not (ok_g and ok_ord):
            raise RateLimitError("local gate timeout")
        if not self.credentials:
            raise RuntimeError("Credenciais necessárias para enviar ordens")
        nonce = str(int(time.time() * 1000))
        body_dict = {
            "nonce": nonce,
            "pair": symbol,
            "type": side.lower(),
            "ordertype": type_.lower(),
            "volume": str(quantity),
        }
        if price is not None:
            body_dict["price"] = str(price)
        body_dict.update(kwargs)
        # Kraken exige body como application/x-www-form-urlencoded
        body = "&".join(f"{k}={v}" for k, v in body_dict.items())
        path = "/0/private/AddOrder"
        headers = {
            "API-Key": self.credentials.api_key,
            "API-Sign": self._kraken_sign(path, nonce, body),
            "Content-Type": "application/x-www-form-urlencoded",
        }
        r = self.session.post(path, headers=headers, content=body)
        self._handle_response_errors(r)
        # Normaliza resposta para incluir order_id
        try:
            data = r.json() or {}
            res = data.get("result", {})
            txids = res.get("txid") or []
            order_id = txids[0] if txids else None
            return {
                "status": "accepted",
                "order_id": order_id,
                "symbol": symbol,
                "side": side,
                "type": type_,
                "volume": quantity,
                "price": price,
                "raw": data,
            }
        except Exception:
            return {"status": "error", "reason": "invalid_response"}

    # Conveniência para Pollers/Fees
    @retry_with_backoff(attempts=4, min_wait=0.5, max_wait=8.0, multiplier=1.0)
    def get_trades_for_order(self, symbol: str, order_id: str | int) -> dict[str, Any]:
        ok_status = self.rl.blocking_acquire("kraken:order_status", cost=1.0, timeout=3.0)
        if not ok_status:
            raise RateLimitError("local gate timeout")
        if not self.credentials:
            return {}
        nonce = str(int(time.time() * 1000))
        path = "/0/private/QueryOrders"
        body_dict = {"nonce": nonce, "txid": str(order_id)}
        body = "&".join(f"{k}={v}" for k, v in body_dict.items())
        headers = {
            "API-Key": self.credentials.api_key,
            "API-Sign": self._kraken_sign(path, nonce, body),
            "Content-Type": "application/x-www-form-urlencoded",
        }
        r = self.session.post(path, headers=headers, content=body)
        self._handle_response_errors(r)
        try:
            return r.json() or {}
        except Exception:
            return {}

    # Método seguro para validar credenciais sem enviar ordens
    @retry_with_backoff(attempts=4, min_wait=0.5, max_wait=8.0, multiplier=1.0)
    def get_account_balance(self) -> dict[str, Any]:
        ok_status = self.rl.blocking_acquire("kraken:order_status", cost=1.0, timeout=3.0)
        if not ok_status:
            raise RateLimitError("local gate timeout")
        if not self.credentials:
            return {}
        nonce = str(int(time.time() * 1000))
        path = "/0/private/Balance"
        body_dict = {"nonce": nonce}
        body = "&".join(f"{k}={v}" for k, v in body_dict.items())
        headers = {
            "API-Key": self.credentials.api_key,
            "API-Sign": self._kraken_sign(path, nonce, body),
            "Content-Type": "application/x-www-form-urlencoded",
        }
        r = self.session.post(path, headers=headers, content=body)
        self._handle_response_errors(r)
        try:
            return r.json() or {}
        except Exception:
            return {}