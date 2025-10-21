from typing import Dict, Optional


class OrderExecutor:
    """Submit and manage orders to an exchange handler."""

    def __init__(self, exchange_handler: "ExchangeHandler"):
        self.exchange = exchange_handler

    def submit(self, symbol: str, side: str, size: float, price: Optional[float] = None, stop_price: Optional[float] = None) -> Dict:
        order = {
            "symbol": symbol,
            "side": side,
            "size": size,
            "price": price,
            "stop_price": stop_price,
        }
        return self.exchange.place_order(order)


import asyncio
from typing import Any, Dict, List, Optional

from .slippage_control import apply_slippage_limit

# Tentativa de importar RiskEngine/RealTimeRiskEngine; se não existir, seguimos com fallback
try:
    from ..core.risk_engine import RiskEngine, RealTimeRiskEngine  # type: ignore
except Exception:  # pragma: no cover
    RiskEngine = None  # type: ignore
    RealTimeRiskEngine = None  # type: ignore


class SmartOrderExecutor:
    """Executor avançado de ordens com gestão de slippage e proteção.

    Este executor implementa:
    - Otimização de níveis de entrada visando liquidez
    - Colocação de ordens com limite de slippage
    - Configuração de ordens de proteção (stop e take-profit)
    - Integração opcional com RealTimeRiskEngine para checks pré-trade
    """

    def __init__(self, exchange_client: Any, config: Dict[str, Any]):
        self.client = exchange_client
        self.config = config
        self.pending_orders: List[Dict[str, Any]] = []
        self.filled_orders: List[Dict[str, Any]] = []

    async def execute_smc_trade(self, signal: Dict[str, Any], portfolio: Any) -> Dict[str, Any]:
        """Executa trade baseado em sinal SMC com gestão avançada.

        Fluxo:
        1. (Opcional) Checks de risco em tempo real
        2. Calcular tamanho da posição
        3. Definir níveis de entrada com tolerância de liquidez
        4. Executar ordem com controle de slippage
        5. Configurar ordens de proteção (stop e take-profit)
        """
        # 1. Checks de risco em tempo real
        if RealTimeRiskEngine is not None:
            try:
                rte = RealTimeRiskEngine(self.config, portfolio)
                ok, checks = await rte.pre_trade_analysis(signal)
                if not ok:
                    return {
                        "status": "rejected",
                        "reason": "pre_trade_risk_checks_failed",
                        "checks": checks,
                    }
            except Exception:
                # Se motor de risco falhar, continuamos com execução básica
                pass

        # 2. Calcular tamanho da posição
        position_size = self.calculate_position_size(signal, portfolio)

        # 3. Definir níveis de entrada com tolerância
        entry_levels = self.optimize_entry_levels(signal, position_size)

        # 4. Executar ordem com controle de slippage
        last_result: Dict[str, Any] = {"status": "error", "reason": "no_order_attempt"}
        for level in entry_levels:
            order_result = await self.place_optimized_order(signal, level, position_size)
            self.pending_orders.append(order_result)
            last_result = order_result
            if order_result.get("status") in ("filled", "partially_filled"):
                self.filled_orders.append(order_result)
                break

        # 5. Configurar ordens de proteção somente se houver uma ordem válida
        if last_result.get("status") not in ("error", "rejected"):
            try:
                await self.place_protection_orders(signal, last_result)
            except Exception:
                # Se proteção falhar, retornamos o resultado de execução mesmo assim
                pass

        return last_result

    def _get_balance(self, portfolio: Any) -> float:
        # Tenta usar PortfolioManager se disponível
        try:
            if hasattr(portfolio, "available_capital") and callable(portfolio.available_capital):
                return float(portfolio.available_capital())
            if hasattr(portfolio, "state") and hasattr(portfolio.state, "balance"):
                return float(portfolio.state.balance)
        except Exception:
            pass
        return float(self.config.get("balance", 0.0))

    def calculate_position_size(self, signal: Dict[str, Any], portfolio: Any) -> float:
        """Calcula tamanho da posição usando risco e distância de stop.

        Fallback: se RiskEngine não estiver disponível, aplica heurística simples
        usando risco % do balanço e uma distância de stop baseada em ATR estimado.
        """
        entry = float(signal.get("entry_price", 0.0))
        balance = self._get_balance(portfolio)
        risk_pct = float(self.config.get("risk_pct", 0.01))
        atr = float(signal.get("atr", max(entry * 0.002, 1e-9)))  # ~0.2% do preço

        if RiskEngine is not None:
            try:
                risk = RiskEngine(self.config)
                stop_distance = float(risk.compute_stop(entry_price=entry, atr=atr))
                return float(risk.position_size(balance=balance, risk_pct=risk_pct, stop_distance=stop_distance))
            except Exception:
                pass

        # Heurística simples se RiskEngine não estiver disponível
        stop_distance = atr * float(self.config.get("stop_atr_mult", 1.5))
        if stop_distance <= 0:
            return 0.0
        return float((balance * risk_pct) / stop_distance)

    def optimize_entry_levels(self, signal: Dict[str, Any], size: float) -> List[float]:
        """Otimiza níveis de entrada baseado em liquidez (heurística)."""
        symbol = signal["symbol"]
        current_price = None
        try:
            if hasattr(self.client, "get_current_price") and callable(self.client.get_current_price):
                current_price = self.client.get_current_price(symbol)
        except Exception:
            current_price = None

        if current_price is None:
            current_price = float(signal.get("entry_price", 0.0))

        direction = signal.get("direction", "LONG")
        if direction == "LONG":
            levels = [
                current_price * 0.998,  # Entrada agressiva
                float(signal.get("entry_price", current_price)),  # Entrada ideal
                current_price * 1.002,  # Entrada conservadora
            ]
        else:
            levels = [
                current_price * 1.002,  # Entrada agressiva
                float(signal.get("entry_price", current_price)),  # Entrada ideal
                current_price * 0.998,  # Entrada conservadora
            ]
        return levels

    async def place_optimized_order(self, signal: Dict[str, Any], level_price: float, size: float) -> Dict[str, Any]:
        """Coloca ordem limitada ao slippage máximo configurado."""
        symbol = signal["symbol"]
        direction = signal.get("direction", "LONG")
        # Obter preço atual de forma assíncrona, com fallback
        current_price = await self._get_current_price_async(symbol, fallback=float(signal.get("entry_price", level_price)))
        max_slippage_pct = float(self.config.get("max_slippage_pct", 0.001))  # 0.1% padrão
        target_price = float(apply_slippage_limit(requested_price=level_price, max_slippage_pct=max_slippage_pct, reference_price=current_price))

        side = "buy" if direction == "LONG" else "sell"
        order_payload: Dict[str, Any] = {
            "symbol": symbol,
            "side": side,
            "size": float(size),
            "price": target_price,
            "type": "limit",
        }

        result = await self._client_place_order(order_payload)
        return result

    async def place_protection_orders(self, signal: Dict[str, Any], last_order_result: Dict[str, Any]) -> None:
        """Configura ordens de proteção (stop-loss e take-profit)."""
        symbol = signal["symbol"]
        direction = signal.get("direction", "LONG")
        entry = float(signal.get("entry_price", 0.0))
        tp_rr = float(self.config.get("tp_rr", 2.0))

        # Tenta obter stop dinâmico via RealTimeRiskEngine
        stop_price: Optional[float] = None
        if RealTimeRiskEngine is not None:
            try:
                rte = RealTimeRiskEngine(self.config, None)
                current_volatility = await rte.get_volatility(symbol)
                stop_price = float(rte.calculate_dynamic_stop_loss(signal, current_volatility))
            except Exception:
                stop_price = None

        # Fallback: usa RiskEngine básico
        if stop_price is None:
            try:
                if RiskEngine is not None:
                    risk = RiskEngine(self.config)
                    atr = float(signal.get("atr", max(entry * 0.002, 1e-9)))
                    stop_distance = float(risk.compute_stop(entry_price=entry, atr=atr))
                    stop_price = entry - stop_distance if direction == "LONG" else entry + stop_distance
            except Exception:
                stop_price = None

        # Se ainda não conseguir calcular, usa heurística simples
        if stop_price is None:
            # 0.3% de distância como fallback
            dist = entry * 0.003
            stop_price = entry - dist if direction == "LONG" else entry + dist

        rr_distance = abs(entry - stop_price) * tp_rr
        tp_price = entry + rr_distance if direction == "LONG" else entry - rr_distance

        size = float(
            last_order_result.get("order", {}).get("size", signal.get("size", self.config.get("size", 0.0)))
        )

        stop_payload: Dict[str, Any] = {
            "symbol": symbol,
            "side": "sell" if direction == "LONG" else "buy",
            "size": size,
            "price": float(stop_price),
            "type": "stop_loss",
        }
        tp_payload: Dict[str, Any] = {
            "symbol": symbol,
            "side": "sell" if direction == "LONG" else "buy",
            "size": size,
            "price": float(tp_price),
            "type": "take_profit",
        }

        await self._client_place_order(stop_payload)
        await self._client_place_order(tp_payload)

    async def _client_place_order(self, order_payload: Dict[str, Any]) -> Dict[str, Any]:
        """Chama o cliente de forma assíncrona com compatibilidade para assinaturas tipadas."""
        client = self.client
        try:
            # Cliente assíncrono nativo
            if hasattr(client, "place_order_async") and callable(client.place_order_async):
                res = client.place_order_async(order_payload)
                if asyncio.iscoroutine(res):
                    return await res
                return res  # não-coroutine

            # Cliente síncrono/assíncrono padrão
            if hasattr(client, "place_order") and callable(client.place_order):
                # Método assíncrono
                if asyncio.iscoroutinefunction(client.place_order):
                    if isinstance(order_payload, dict):
                        return await client.place_order(**order_payload)
                    return await client.place_order(order_payload)

                # Método síncrono: detectar assinatura tipada vs dict
                if isinstance(order_payload, dict):
                    symbol = order_payload.get("symbol")
                    side = order_payload.get("side")
                    type_ = order_payload.get("type", "market")
                    size = order_payload.get("size") or order_payload.get("quantity") or order_payload.get("amount")
                    price = order_payload.get("price")
                    # Fallback defensivo
                    if symbol and side and type_ and size is not None:
                        return await asyncio.to_thread(
                            client.place_order,
                            symbol,
                            str(side).upper(),
                            str(type_).upper(),
                            float(size),
                            price,
                        )
                    # Sem campos mínimos, tentar passar o payload direto
                    return await asyncio.to_thread(client.place_order, order_payload)
                else:
                    return await asyncio.to_thread(client.place_order, order_payload)
        except Exception as e:
            return {"status": "error", "reason": str(e), "order": order_payload}

        # Caso não exista método
        return {"status": "error", "reason": "no_place_order_method", "order": order_payload}

    async def _get_current_price_async(self, symbol: str, fallback: Optional[float] = None) -> float:
        client = self.client
        try:
            if hasattr(client, "get_current_price") and callable(client.get_current_price):
                if asyncio.iscoroutinefunction(client.get_current_price):
                    return float(await client.get_current_price(symbol))
                return float(await asyncio.to_thread(client.get_current_price, symbol))
        except Exception:
            pass
        return float(fallback or 0.0)