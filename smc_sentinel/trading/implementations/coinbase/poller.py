from __future__ import annotations

import asyncio
import time
from typing import Any, Dict, Optional

from smc_sentinel.trading.abstractions.pollers import OrderFillPoller
from smc_sentinel.clients.coinbase import CoinbaseClient


async def _poll_coinbase_fill(
    client: CoinbaseClient,
    product_id: str,
    order_id: str,
    side: str,
    max_wait_s: int = 5,
) -> Optional[Dict[str, Any]]:
    """Polling de fill na Coinbase consultando fills da ordem."""
    start = time.time()
    try:
        while True:
            if time.time() - start > max_wait_s:
                return None

            # API: GET /orders/{order_id}/fills
            headers = client.coinbase_signature("GET", f"/api/v3/orders/{order_id}/fills", "")
            resp = await asyncio.to_thread(
                client.session.get,
                client.base_url + f"/api/v3/orders/{order_id}/fills",
                headers=headers,
                timeout=client.timeout_s,
            )
            client._handle_response_errors(resp)
            data = resp.json()
            fills = data.get("fills") or []

            if fills:
                last = fills[-1]
                # Normaliza campos relevantes
                qty = float(last.get("size", 0.0))
                price = float(last.get("price", 0.0))
                fee_quote = float(last.get("fee", 0.0))
                return {
                    "status": "FILLED",
                    "qty": qty,
                    "avg_price": price,
                    "side": str(side),
                    # campos adicionais para compatibilidade/extensão
                    "filled_qty": qty,
                    "price": price,
                    "fee_quote": fee_quote,
                    "raw": last,
                }

            await asyncio.sleep(0.5)
    except Exception:
        return None


class CoinbaseOrderFillPoller(OrderFillPoller):
    async def poll_fill(
        self,
        symbol: str,
        side: str,
        order_result: Dict[str, Any],
        max_wait_s: int = 5,
    ) -> Optional[Dict[str, Any]]:
        order_id = order_result.get("order_id") or order_result.get("id")
        # Para Coinbase, espera-se product_id (ex.: BTC-USD)
        product_id = symbol
        return await _poll_coinbase_fill(self.client, product_id, str(order_id), side, max_wait_s)