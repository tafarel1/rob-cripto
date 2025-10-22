from __future__ import annotations

"""
Template de Poller de Fill para nova exchange.

Implemente lógica de polling conforme API:
- Consultar status da ordem e detectar fill (parcial/total)
- Respeitar rate limits e backoff em caso de 429/5xx
- Normalizar campos usados pelo TradingService
"""

import asyncio
import time
from typing import Any, Dict, Optional

from ...abstractions.pollers import OrderFillPoller


class TemplateOrderFillPoller(OrderFillPoller):
    async def poll_fill(self, symbol: str, side: str, order_result: Dict[str, Any], max_wait_s: int = 5) -> Optional[Dict[str, Any]]:
        """Polling básico de exemplo.

        Substitua por consultas reais (ex.: GET /order/status).
        Retorne None em timeout; retorne dict com dados do fill em sucesso.
        """
        start = time.time()
        order_id = order_result.get("order_id")
        if not order_id or not hasattr(self.client, "get_trades_for_order"):
            return None

        # Exemplo: polling simples com 5 tentativas até max_wait_s
        attempts = 0
        while time.time() - start < max_wait_s:
            attempts += 1
            try:
                # Troque por endpoint de status; aqui usamos trades como proxy de fill
                data = await asyncio.to_thread(self.client.get_trades_for_order, symbol, order_id)
                trades = data.get("trades") or []
                if trades:
                    # Normalizar estrutura de fill
                    avg_price = float(order_result.get("price") or 0.0)
                    size = float(order_result.get("size") or 0.0)
                    return {
                        "status": "filled",
                        "order_id": order_id,
                        "symbol": symbol,
                        "side": side,
                        "filled_size": size,
                        "avg_price": avg_price,
                        "trades": trades,
                        "attempts": attempts,
                    }
            except Exception:
                await asyncio.sleep(0.2)
            await asyncio.sleep(0.2)
        return None