from __future__ import annotations

from typing import Any, Dict, List, Optional

from smc_sentinel.trading.factories import PollerFactory, FeeCalculatorFactory


class TradingService:
    """Camada de orquestração focada em SRP/DIP.

    Responsável por coordenar polling de fills e cálculo de taxas
    via fábricas injetadas, sem conhecer detalhes das implementações.
    """

    def __init__(self, poller_factory: PollerFactory, fee_calculator_factory: FeeCalculatorFactory):
        self._poller_factory = poller_factory
        self._fee_calc_factory = fee_calculator_factory

    async def execute_symbol_trading(
        self,
        client: Any,
        symbol: str,
        side: str,
        order_result: Dict[str, Any],
        max_wait_s: int = 5,
    ) -> Dict[str, Any]:
        """Executa o ciclo de trading para um símbolo: poll fill + fee.

        Retorna dict com 'fill' e 'fee_base'. Se não houver fill, fee_base=0.
        """
        poller = self._poller_factory.create(client)
        fee_calc = self._fee_calc_factory.create(client)

        fill = await poller.poll_fill(symbol, side, order_result, max_wait_s=max_wait_s)
        if not fill:
            return {"fill": None, "fee_base": 0.0}

        avg_price = float(fill.get("avg_price", 0.0) or 0.0)
        order_identifier = order_result.get("orderId") or order_result.get("order_id") or order_result.get("id") or ""
        fee_base = await fee_calc.compute_fee_base(symbol, order_identifier, avg_price, fill)
        return {"fill": fill, "fee_base": float(fee_base or 0.0)}

    async def execute_multi_symbol_trading(
        self,
        client: Any,
        items: List[Dict[str, Any]],
        max_wait_s: int = 5,
    ) -> List[Dict[str, Any]]:
        """Executa ciclo de trading para múltiplos símbolos.

        items: lista de dicts com {symbol, side, order_result}.
        """
        results: List[Dict[str, Any]] = []
        for it in items:
            symbol = str(it.get("symbol"))
            side = str(it.get("side"))
            order_result = dict(it.get("order_result") or {})
            res = await self.execute_symbol_trading(client, symbol, side, order_result, max_wait_s=max_wait_s)
            results.append({"symbol": symbol, "side": side, **res})
        return results