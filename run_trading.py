from __future__ import annotations

import asyncio
import os
import sys
import json
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

from loguru import logger

from smc_sentinel.config.settings import TradingSettings
from smc_sentinel.clients.base import ExchangeCredentials
from smc_sentinel.clients.binance import BinanceClient
from smc_sentinel.clients.coinbase import CoinbaseClient
from smc_sentinel.trading.strategies.multi_timeframe import MultiTimeframeSMCStrategy
from smc_sentinel.trading.execution.order_executor import SmartOrderExecutor
from smc_sentinel.monitoring.realtime.performance_tracker import AdvancedPerformanceTracker
from smc_sentinel.infra.structured_logger import StructuredLogger


class ExchangeDataFeed:
    """Feed de dados usando cliente de exchange para OHLCV."""

    def __init__(self, client: Any):
        self.client = client

    def get_data(self, symbol: str, timeframe: str) -> Dict[str, Any]:
        try:
            data = self.client.fetch_ohlcv(symbol, timeframe, limit=100)
            # Normalizado por BaseExchangeClient.normalize_binance_ohlcv
            bars = [
                {
                    "timestamp": int(d.get("timestamp", 0)),
                    "open": float(d.get("open", 0.0)),
                    "high": float(d.get("high", 0.0)),
                    "low": float(d.get("low", 0.0)),
                    "close": float(d.get("close", 0.0)),
                    "volume": float(d.get("volume", 0.0)),
                }
                for d in data
            ]
            return {"bars": bars}
        except Exception:
            return {"bars": []}


class SimplePortfolio:
    """Portfolio mínimo com saldo disponível."""

    def __init__(self, balance: float):
        self.state = type("State", (), {"balance": float(balance)})

    def available_capital(self) -> float:
        return float(self.state.balance)


class PositionBook:
    """Livro de posições simples para cálculo de PnL realizado."""

    def __init__(self):
        self.positions: Dict[str, Dict[str, float]] = {}

    def update_on_fill(self, symbol: str, side: str, qty: float, price: float, fee_base: float = 0.0) -> float:
        pos = self.positions.get(symbol, {"qty": 0.0, "avg_price": 0.0})
        realized_pnl = 0.0
        if side.lower() == "buy":
            new_qty = pos["qty"] + qty
            if new_qty > 0:
                pos["avg_price"] = ((pos["qty"] * pos["avg_price"]) + (qty * price)) / new_qty
            pos["qty"] = new_qty
        else:  # sell
            sell_qty = min(qty, pos["qty"]) if pos["qty"] > 0 else 0.0
            if sell_qty > 0:
                realized_pnl = sell_qty * (price - pos["avg_price"])  # base currency PnL
                pos["qty"] -= sell_qty
            # Se posição negativa/short não suportada, ignorar excesso
        self.positions[symbol] = pos
        # Subtrai taxa em moeda base
        return float(realized_pnl) - float(fee_base)


def ensure_runtime_dir() -> Path:
    p = Path(__file__).parent / "runtime"
    p.mkdir(parents=True, exist_ok=True)
    return p


def write_json(path: Path, obj: Any) -> None:
    try:
        path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception as e:
        logger.warning(f"Falha ao escrever {path}: {e}")


async def _poll_binance_fill(client: BinanceClient, symbol: str, order_id: int | str, max_wait_s: int = 5) -> Optional[Dict[str, Any]]:
    """Consulta ordem na Binance até obter execução (simplificado)."""
    if not client.credentials:
        return None
    start = time.time()
    while time.time() - start < max_wait_s:
        try:
            client.rl.blocking_acquire("binance:global", cost=1.0, timeout=3.0)
            client.rl.blocking_acquire("binance:order", cost=1.0, timeout=3.0)
        except Exception:
            pass
        try:
            ts_ms = str(client.timestamp_ms())
            params = {
                "symbol": str(symbol).upper(),
                "orderId": str(order_id),
                "timestamp": ts_ms,
                "recvWindow": "5000",
            }
            qs = "&".join(f"{k}={v}" for k, v in sorted(params.items()))
            sig = client.binance_signature(qs, client.credentials.api_secret)
            headers = {"X-MBX-APIKEY": client.credentials.api_key}
            r = await asyncio.to_thread(client.session.get, "/api/v3/order", params={**params, "signature": sig}, headers=headers)
            client._handle_response_errors(r)
            data = r.json()
            # status: NEW, PARTIALLY_FILLED, FILLED, CANCELED, etc.
            executed_qty = float(data.get("executedQty", 0.0) or 0.0)
            cum_quote_qty = float(data.get("cummulativeQuoteQty", 0.0) or 0.0)
            side = str(data.get("side", "BUY")).lower()
            status = str(data.get("status", "NEW")).upper()
            if executed_qty > 0:
                avg_price = (cum_quote_qty / executed_qty) if executed_qty > 0 else 0.0
                return {
                    "status": status,
                    "side": side,
                    "qty": executed_qty,
                    "avg_price": avg_price,
                    "raw": data,
                }
        except Exception:
            await asyncio.sleep(0.5)
            continue
        await asyncio.sleep(0.5)
    return None


async def _poll_order_fill(client: Any, symbol: str, side: str, order_result: Dict[str, Any], max_wait_s: int = 5) -> Optional[Dict[str, Any]]:
    name = getattr(client, "name", "").lower()
    if name == "binance":
        oid = order_result.get("orderId") or order_result.get("order_id")
        if oid is None:
            return None
        return await _poll_binance_fill(client, symbol, oid, max_wait_s=max_wait_s)
    if name == "coinbase":
        oid = order_result.get("id") or order_result.get("order_id")
        if oid is None:
            return None
        return await _poll_coinbase_fill(client, oid, max_wait_s=max_wait_s)
    # Outros clientes: por ora, retornamos None (pode ser expandido)
    return None


async def _poll_coinbase_fill(client: Any, order_id: int | str, max_wait_s: int = 5) -> Optional[Dict[str, Any]]:
    """Polling de fills para Coinbase via GET /orders/{id}. Retorna qty, avg_price e fee_quote."""
    if not getattr(client, "credentials", None):
        return None
    start = time.time()
    while time.time() - start < max_wait_s:
        try:
            ts = str(time.time())
            request_path = f"/orders/{order_id}"
            sig = client.coinbase_signature(ts, "GET", request_path, "", client.credentials.api_secret)
            headers = {
                "CB-ACCESS-KEY": client.credentials.api_key,
                "CB-ACCESS-SIGN": sig,
                "CB-ACCESS-TIMESTAMP": ts,
                "CB-ACCESS-PASSPHRASE": getattr(client.credentials, "passphrase", "") or "",
            }
            r = await asyncio.to_thread(client.session.get, request_path, headers=headers)
            client._handle_response_errors(r)
            data = r.json()
            filled_size = float(data.get("filled_size", 0.0) or 0.0)
            executed_value = float(data.get("executed_value", 0.0) or 0.0)
            fill_fees = float(data.get("fill_fees", 0.0) or 0.0)
            side = str(data.get("side", "buy")).lower()
            status = str(data.get("status", "new")).upper()
            if filled_size > 0:
                avg_price = (executed_value / filled_size) if filled_size > 0 else 0.0
                return {
                    "status": status,
                    "side": side,
                    "qty": filled_size,
                    "avg_price": avg_price,
                    "fee_quote": fill_fees,
                    "raw": data,
                }
        except Exception:
            await asyncio.sleep(0.5)
            continue
        await asyncio.sleep(0.5)
    return None


# Corrigir: função utilitária não deve ser assíncrona
def _split_binance_symbol(symbol: str) -> tuple[str, str]:
    s = symbol.upper()
    for q in ("USDT", "BUSD", "USDC", "USD", "EUR", "BRL"):
        if s.endswith(q):
            return (s[:-len(q)], q)
    # fallback: assume 3-letter quote
    return (s[:-3], s[-3:])

# Converter símbolo (Binance-like) para product_id da Coinbase (e.g., BTCUSDT -> BTC-USD)
def _to_coinbase_product_id(symbol: str) -> str:
    s = str(symbol).upper()
    if "-" in s:
        return s
    base, quote = _split_binance_symbol(s)
    if quote == "USDT":
        quote = "USD"
    return f"{base}-{quote}"


async def _binance_fee_base_by_trades(client: BinanceClient, symbol: str, order_id: int | str, avg_price: float) -> float:
    """Consulta myTrades para obter comissão e converter para moeda base quando possível."""
    if not client.credentials:
        return 0.0
    try:
        ts_ms = str(client.timestamp_ms())
        params = {
            "symbol": symbol.upper(),
            "orderId": str(order_id),
            "timestamp": ts_ms,
            "recvWindow": "5000",
        }
        qs = "&".join(f"{k}={v}" for k, v in sorted(params.items()))
        sig = client.binance_signature(qs, client.credentials.api_secret)
        headers = {"X-MBX-APIKEY": client.credentials.api_key}
        r = await asyncio.to_thread(client.session.get, "/api/v3/myTrades", params={**params, "signature": sig}, headers=headers)
        client._handle_response_errors(r)
        trades = r.json() or []
        base, quote = _split_binance_symbol(symbol)
        fee_base = 0.0
        for t in trades:
            commission = float(t.get("commission", 0.0) or 0.0)
            asset = str(t.get("commissionAsset", "")).upper()
            if commission <= 0:
                continue
            if asset == base:
                fee_base += commission
            elif asset == quote:
                fee_base += commission / float(avg_price or 1.0)
            else:
                # Comissão em outro ativo (e.g., BNB) – ignoramos por ora
                continue
        return float(fee_base)
    except Exception:
        return 0.0


async def main() -> None:
    ts = TradingSettings()
    rp = str(getattr(ts, "RISK_PROFILE", "conservative") or "conservative").lower()

    # Credenciais Coinbase (via env e, se existirem, via TradingSettings)
    api_key = os.getenv("COINBASE_API_KEY") or getattr(ts, "COINBASE_API_KEY", None)
    api_secret = os.getenv("COINBASE_API_SECRET") or getattr(ts, "COINBASE_API_SECRET", None)
    passphrase = os.getenv("COINBASE_PASSPHRASE") or getattr(ts, "COINBASE_PASSPHRASE", None)

    if not api_key or not api_secret or not passphrase:
        logger.warning("Credenciais Coinbase ausentes (COINBASE_API_KEY/COINBASE_API_SECRET/COINBASE_PASSPHRASE)")

    credentials = ExchangeCredentials(api_key=api_key or "", api_secret=api_secret or "", passphrase=passphrase or "")
    client = CoinbaseClient(credentials=credentials)
    feed = ExchangeDataFeed(client)

    # Parametrizar tempo máximo de polling de fill
    try:
        order_fill_max_wait_s = int(os.getenv("ORDER_FILL_MAX_WAIT_S") or getattr(ts, "ORDER_FILL_MAX_WAIT_S", 5))
    except Exception:
        order_fill_max_wait_s = 5
    if order_fill_max_wait_s <= 0:
        order_fill_max_wait_s = 5

    # Config de estratégia: símbolos condicionados a ENV FORCE_TEST_SYMBOLS
    force_test = str(os.getenv("FORCE_TEST_SYMBOLS") or "").strip().lower() in ("1", "true", "yes", "on")
    if force_test:
        raw_symbols = ["BTC-USD"]
    else:
        conf_symbols = getattr(ts, "TRADING_SYMBOLS", None)
        if not conf_symbols:
            logger.warning("TRADING_SYMBOLS não definidos; usando fallback ['BTC-USD']")
            conf_symbols = ["BTC-USD"]
        raw_symbols = [str(s) for s in conf_symbols]
    symbols = [_to_coinbase_product_id(s) for s in raw_symbols]
    tf_hierarchy = [getattr(ts, "PRIMARY_TIMEFRAME", "15m")] + list(getattr(ts, "CONFIRMATION_TIMEFRAMES", ["1h", "4h"]))
    strat_cfg = {"trading_symbols": symbols, "timeframe_hierarchy": tf_hierarchy}
    strategy = MultiTimeframeSMCStrategy(config=strat_cfg, data_feeds=feed)

    # Config do executor
    rp_cfg = risk_profile_config(rp)
    exec_cfg = {
        "max_slippage_pct": float(rp_cfg.get("max_slippage_pct", 0.001)),
        "size": float(getattr(ts, "MAX_POSITION_SIZE", 0.1)),
        "balance": 10000.0,
        "exchange_client": client,
    }
    executor = SmartOrderExecutor(client, exec_cfg)

    # Tracker de performance
    tracker = AdvancedPerformanceTracker(
        {
            "initial_balance": 10000.0,
            "max_daily_loss": float(getattr(ts, "MAX_DAILY_DRAWDOWN", 0.02)),
            "loss_streak_alert": 5,
            "min_win_rate": 0.4,
            "min_trades_for_winrate": 10,
        }
    )

    # Arquivos de runtime
    runtime = ensure_runtime_dir()
    perf_path = runtime / "performance.json"
    alerts_path = runtime / "alerts.json"
    # Logger estruturado (usa runtime)
    s_logger = StructuredLogger(runtime)
    s_logger.log_event("startup", {"test_symbols": force_test})

    # Portfolio e posições
    portfolio = SimplePortfolio(balance=10000.0)
    pos_book = PositionBook()

    # Loop principal
    logger.remove()
    logger.add(sys.stderr, level="INFO")
    logger.info(f"Trading loop iniciado. Perfil de risco: {rp} | Símbolos: {symbols} | MaxWaitFill: {order_fill_max_wait_s}s")
    logger.info(f"TestSymbols: {'true' if force_test else 'false'}")

    interval = max(int(getattr(ts, "SMC_STATS_INTERVAL", 300) / 6), 5)
    while True:
        try:
            signals: List[Dict[str, Any]] = await strategy.generate_trade_signals()
        except Exception as e:
            logger.warning(f"Falha ao gerar sinais: {e}")
            signals = []

        for sig in signals:
            try:
                res = await executor.execute_smc_trade(sig, portfolio)
                s_logger.log_trade(sig, res)
                s_logger.log_event("order_submitted", {"exchange": getattr(client, "name", ""), "symbol": sig.get("symbol"), "direction": sig.get("direction"), "raw": res})

                # Tentar coletar fill para PnL
                symbol = str(sig.get("symbol", ""))
                side = "buy" if str(sig.get("direction", "LONG")).upper() == "LONG" else "sell"
                # Identificador de ordem compatível com Binance e Coinbase
                order_identifier = res.get("orderId") or res.get("order_id") or res.get("id") or ""
                fill = await _poll_order_fill(client, symbol, side, res, max_wait_s=order_fill_max_wait_s)
                if fill:
                    avg_price = float(fill.get("avg_price", 0.0))
                    qty = float(fill.get("qty", 0.0))
                    # Taxas
                    fee_base = 0.0
                    if getattr(client, "name", "").lower() == "binance":
                        fee_base = await _binance_fee_base_by_trades(client, symbol, order_identifier, avg_price)
                    elif getattr(client, "name", "").lower() == "coinbase":
                        fee_quote = float(fill.get("fee_quote", 0.0) or 0.0)
                        fee_base = (fee_quote / float(avg_price or 1.0)) if fee_quote > 0 and avg_price > 0 else 0.0

                    realized_pnl = pos_book.update_on_fill(symbol, fill.get("side", side), qty, avg_price, fee_base=fee_base)
                    if realized_pnl != 0.0:
                        portfolio.state.balance = float(portfolio.state.balance) + float(realized_pnl)
                    s_logger.log_fill(symbol, fill.get("side", side), qty, avg_price, getattr(client, "name", ""), order_identifier, fill.get("status", ""), extra={"realized_pnl": realized_pnl, "fee_base": fee_base})

                    tracker.update_live_metrics(
                        {
                            "pnl": float(realized_pnl),
                            "timestamp": time.time(),
                            "duration_seconds": 0.0,
                            "return_pct": float(realized_pnl) / float(tracker.config.get("initial_balance", 1.0) or 1.0),
                        }
                    )
                else:
                    # Sem fill no prazo: emitir log estruturado
                    s_logger.log_event(
                        "order_fill_timeout",
                        {
                            "exchange": getattr(client, "name", ""),
                            "symbol": symbol,
                            "side": side,
                            "order_id": order_identifier,
                            "timeout_s": order_fill_max_wait_s,
                        },
                    )
            except Exception as e:
                logger.error(f"Erro na execução do trade: {e}")
                s_logger.log_event("order_fill_error", {"exchange": getattr(client, "name", ""), "symbol": sig.get("symbol"), "side": side, "error": str(e)})

        # Persistir métricas e alertas
        write_json(perf_path, tracker.metrics)
        write_json(alerts_path, {"alerts": tracker.generate_performance_alerts(), "startup": {"test_symbols": force_test}})

        await asyncio.sleep(interval)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Encerrando trading loop.")