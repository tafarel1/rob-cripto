from __future__ import annotations

"""
Template de implementação para nova exchange (ex.: Kraken, Bybit).

Objetivo:
- Fornecer um ponto de partida alinhado ao BaseExchangeClient
- Demonstrar registro de rate limits e assinatura/autenticação
- Explicar métodos mínimos necessários para integração de trading

Como usar:
1) Copie este arquivo para "smc_sentinel/clients/kraken.py" ou "smc_sentinel/clients/bybit.py"
2) Ajuste `name`, `base_url`, endpoints e autenticação
3) Implemente os métodos de dados e ordens conforme a API oficial
4) Registre Poller e FeeCalculator nas factories (ver templates em trading/implementations/templates)

Princípios SOLID aplicados:
- SRP: este cliente só trata comunicação HTTP/WebSocket e autenticação
- OCP: novas exchanges entram sem alterar o núcleo
- LSP: comporta-se como BaseExchangeClient
- ISP: métodos específicos usados por serviços são pequenos e focados
- DIP: serviços recebem o cliente via abstrações/factories
"""

import time
from typing import Any, Dict, Optional

import httpx

from ..base import BaseExchangeClient, ExchangeCredentials
from ...infra.rate_limiter import RateLimiter
from ...infra.errors import NetworkError, RateLimitError, AuthError


class TemplateExchangeClient(BaseExchangeClient):
    """Cliente base para nova exchange.

    Ajuste os atributos e implemente autenticação e endpoints.
    """

    name = "template"  # ex.: "kraken" ou "bybit"
    base_url = "https://api.template.exchange"  # substitua pela URL real

    def __init__(self, credentials: Optional[ExchangeCredentials] = None, timeout: float = 10.0, rate_limiter: Optional[RateLimiter] = None):
        super().__init__(credentials, timeout)
        self.session = httpx.Client(timeout=timeout, base_url=self.base_url)
        self.async_session = httpx.AsyncClient(timeout=timeout, base_url=self.base_url)
        self.timeout_s = timeout
        self.rl = rate_limiter or RateLimiter()
        # Registre buckets de rate limit de forma conservadora e nomeada
        default_limits = (
            (f"{self.name}:global", 100, 10.0),
            (f"{self.name}:market_data", 60, 5.0),
            (f"{self.name}:order", 30, 2.0),
        )
        for key, cap, fr in default_limits:
            if key not in self.rl.buckets:
                self.rl.register(key, capacity=cap, fill_rate=fr)

    # ===== Autenticação e assinatura =====

    def sign(self, method: str, path: str, params: Optional[Dict[str, Any]] = None, body: Optional[Dict[str, Any]] = None) -> Dict[str, str]:
        """Constrói headers (token/assinatura) conforme a exchange.
        Substitua por implementação real (HMAC, passphrase, timestamp, etc.).
        """
        if not self.credentials:
            return {}
        # Exemplo genérico; troque por assinatura real da API
        return {
            "X-API-KEY": self.credentials.api_key,
            "X-TS": str(int(time.time() * 1000)),
        }

    def _handle_response_errors(self, resp: httpx.Response) -> None:
        """Traduz erros HTTP em exceções de infraestrutura padronizadas."""
        if resp.status_code == 429:
            raise RateLimitError("rate_limit_exceeded")
        if resp.status_code in (401, 403):
            raise AuthError("auth_failed")
        if resp.status_code >= 500:
            raise NetworkError("server_error")

    # ===== Dados de mercado =====

    def get_orderbook_depth(self, symbol: str, level: int = 10) -> Dict[str, Any]:
        """Retorna ordem de compra/venda agregada. Ajuste endpoint real."""
        self.rl.consume(f"{self.name}:market_data", tokens=1)
        resp = self.session.get(f"/depth", params={"symbol": symbol, "limit": level}, timeout=self.timeout_s)
        self._handle_response_errors(resp)
        try:
            return resp.json() or {}
        except Exception:
            return {}

    # ===== Ordens =====

    def place_order(self, symbol: str, side: str, size: float, price: Optional[float] = None, order_type: str = "LIMIT") -> Dict[str, Any]:
        """Envia uma ordem. Ajuste endpoint e payload conforme a API."""
        self.rl.consume(f"{self.name}:order", tokens=1)
        payload = {
            "symbol": symbol,
            "side": side,
            "size": size,
            "type": order_type,
            "price": price,
            "timestamp": int(time.time() * 1000),
        }
        headers = self.sign("POST", "/order", body=payload)
        resp = self.session.post("/order", json=payload, headers=headers, timeout=self.timeout_s)
        self._handle_response_errors(resp)
        try:
            data = resp.json() or {}
            # Padronize campos usados por pollers/fees
            return {
                "status": data.get("status", "accepted"),
                "order_id": data.get("order_id"),
                "symbol": symbol,
                "side": side,
                "size": size,
                "price": price,
                "raw": data,
            }
        except Exception:
            return {"status": "error", "reason": "invalid_response"}

    def get_trades_for_order(self, symbol: str, order_id: str | int) -> Dict[str, Any]:
        """Recupera trades e/ou taxas associadas a uma ordem (para FeeCalculator)."""
        self.rl.consume(f"{self.name}:order", tokens=1)
        headers = self.sign("GET", "/order/trades", params={"symbol": symbol, "orderId": order_id})
        resp = self.session.get("/order/trades", params={"symbol": symbol, "orderId": order_id}, headers=headers, timeout=self.timeout_s)
        self._handle_response_errors(resp)
        try:
            return resp.json() or {}
        except Exception:
            return {}