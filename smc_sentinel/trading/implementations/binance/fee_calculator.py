from __future__ import annotations

import asyncio
import time
from typing import Any, Dict, Union

from smc_sentinel.trading.abstractions.fee_calculators import FeeCalculator
from smc_sentinel.clients.binance import BinanceClient


async def _binance_fee_base_by_trades(
    client: BinanceClient,
    symbol: str,
    order_id: Union[int, str],
    avg_price: float,
) -> float:
    """Calcula taxa em moeda base usando histórico de trades da Binance."""
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

    # Soma as commissions em moeda base; quando commissionAsset é quote e não base,
    # converte utilizando avg_price como aproximação.
    total_fee_base = 0.0
    for t in trades or []:
        commission = float(t.get("commission", 0.0))
        asset = t.get("commissionAsset")
        if asset is None:
            continue
        # Heurística simples: se asset é base (ex.: BTC em BTCUSDT), usa diretamente;
        # se for quote (ex.: USDT), converte dividindo pelo preço médio.
        base_asset = symbol.replace("USDT", "").replace("USD", "")  # simplificação
        if asset.upper() == base_asset.upper():
            total_fee_base += commission
        else:
            if avg_price > 0:
                total_fee_base += commission / avg_price
    return total_fee_base


class BinanceFeeCalculator(FeeCalculator):
    async def compute_fee_base(
        self,
        symbol: str,
        order_identifier: Union[int, str],
        avg_price: float,
        fill: Dict[str, Any],
    ) -> float:
        return await _binance_fee_base_by_trades(self.client, symbol, order_identifier, avg_price)