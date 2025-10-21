import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import pytest
import asyncio

from smc_sentinel.trading.execution.order_executor import SmartOrderExecutor


class SyncClient:
    def __init__(self):
        self.calls = []

    def place_order(self, symbol: str, side: str, type_: str, quantity: float, price: float | None = None):
        self.calls.append((symbol, side, type_, quantity, price))
        return {"orderId": 12345, "status": "NEW"}


class AsyncNamedClient:
    async def place_order(self, symbol: str, side: str, type: str, size: float, price: float | None = None):
        # Simula cliente assíncrono que espera parâmetros nomeados
        await asyncio.sleep(0)  # yield ao loop
        return {
            "id": "order-abc",
            "symbol": symbol,
            "side": side,
            "type": type,
            "size": size,
            "price": price,
        }


@pytest.mark.asyncio
async def test_positional_signature_sync_client():
    """Cliente síncrono com assinatura tipada positional (symbol, side, type_, quantity, price)."""
    client = SyncClient()
    executor = SmartOrderExecutor(client, config={})

    payload = {
        "symbol": "BTCUSDT",
        "side": "BUY",
        "type": "LIMIT",
        "size": 0.01,
        "price": 45000.0,
    }

    result = await executor._client_place_order(payload)

    assert result["orderId"] == 12345
    assert client.calls and client.calls[0] == ("BTCUSDT", "BUY", "LIMIT", 0.01, 45000.0)


@pytest.mark.asyncio
async def test_named_signature_async_client():
    """Cliente assíncrono com parâmetros nomeados (symbol, side, type, size, price)."""
    client = AsyncNamedClient()
    executor = SmartOrderExecutor(client, config={})

    payload = {
        "symbol": "ETHUSDT",
        "side": "SELL",
        "type": "MARKET",
        "size": 0.5,
    }

    result = await executor._client_place_order(payload)

    assert result["id"] == "order-abc"
    assert result["symbol"] == "ETHUSDT"
    assert result["side"] == "SELL"
    assert result["type"] == "MARKET"
    assert result["size"] == 0.5