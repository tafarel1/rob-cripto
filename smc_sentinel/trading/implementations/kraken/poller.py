from __future__ import annotations

import asyncio
import time
from typing import Any, Dict, Optional

from smc_sentinel.trading.abstractions.pollers import OrderFillPoller
from smc_sentinel.clients.kraken import KrakenClient


async def _poll_kraken_fill(
    client: KrakenClient,
    symbol: str,
    order_id: str,
    side: str,
    max_wait_s: int = 5,
) -> Optional[Dict[str, Any]]:
    start = time.time()
    try:
        while True:
            if time.time() - start > max_wait_s:
                return None

            # Consulta detalhes da ordem; Kraken retorna status e executa trades
            data = await asyncio.to_thread(client.get_trades_for_order, symbol, order_id)
            # Normalização mínima conforme resposta
            result = data.get("result") or {}
            order_info = next(iter(result.values()), {})
            descr = order_info.get("descr", {})
            status = order_info.get("status")
            txid_list = order_info.get("txid") or []

            if status and status.upper() in ("CLOSED", "FILLED"):
                # Heurística: se há preço/volume, consideramos fill
                price = float(order_info.get("price", order_info.get("price", 0.0)) or 0.0)
                vol_exec = float(order_info.get("vol_exec", 0.0) or 0.0)
                return {
                    "status": "FILLED",
                    "qty": vol_exec,
                    "avg_price": price,
                    "side": str(side),
                    "filled_qty": vol_exec,
                    "price": price,
                    "fee_quote": float(order_info.get("fee", 0.0) or 0.0),
                    "order_id": order_id,
                    "txids": txid_list,
                    "raw": order_info,
                }

            await asyncio.sleep(0.5)
    except Exception:
        return None


class KrakenOrderFillPoller(OrderFillPoller):
    async def poll_fill(
        self,
        symbol: str,
        side: str,
        order_result: Dict[str, Any],
        max_wait_s: int = 5,
    ) -> Optional[Dict[str, Any]]:
        order_id = order_result.get("order_id") or order_result.get("id") or ""
        return await _poll_kraken_fill(self.client, symbol, str(order_id), side, max_wait_s)