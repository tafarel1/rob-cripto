from __future__ import annotations

import asyncio
import time
from typing import Any, Dict, Optional, Union

from smc_sentinel.trading.abstractions.pollers import OrderFillPoller
from smc_sentinel.clients.binance import BinanceClient


async def _poll_binance_fill(
    client: BinanceClient,
    symbol: str,
    order_id: Union[int, str],
    side: str,
    max_wait_s: int = 5,
) -> Optional[Dict[str, Any]]:
    """Polling de fill na Binance pelos dados da ordem.

    Retorna dict do fill quando encontrado, ou None em timeout/cancelamento.
    """
    start = time.time()
    try:
        while True:
            if time.time() - start > max_wait_s:
                return None

            # Consulta os trades da ordem
            params = {"symbol": symbol, "orderId": order_id, "timestamp": int(time.time() * 1000)}
            headers = client.binance_signature("GET", "/api/v3/myTrades", params)

            resp = await asyncio.to_thread(
                client.session.get,
                client.base_url + "/api/v3/myTrades",
                params=params,
                headers=headers,
                timeout=client.timeout_s,
            )
            client._handle_response_errors(resp)
            trades = resp.json()

            if trades:
                # Considera último trade como o fill atual
                last = trades[-1]
                return {
                    "status": "FILLED",
                    "qty": float(last.get("qty", 0.0)),
                    "avg_price": float(last.get("price", 0.0)),
                    "side": str(side),
                    # campos adicionais para compatibilidade/extensão
                    "filled_qty": float(last.get("qty", 0.0)),
                    "price": float(last.get("price", 0.0)),
                    "fee": float(last.get("commission", 0.0)),
                    "fee_asset": last.get("commissionAsset"),
                    "raw": last,
                }

            await asyncio.sleep(0.5)
    except Exception:
        return None


class BinanceOrderFillPoller(OrderFillPoller):
    async def poll_fill(
        self,
        symbol: str,
        side: str,
        order_result: Dict[str, Any],
        max_wait_s: int = 5,
    ) -> Optional[Dict[str, Any]]:
        order_id = order_result.get("orderId") or order_result.get("id")
        return await _poll_binance_fill(self.client, symbol, order_id, side, max_wait_s)