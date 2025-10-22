#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Benchmark de place_order + polling/fee para Binance, Coinbase e Kraken.

- Mede latência de envio de ordem (place_order)
- Realiza polling do fill e calcula taxa base via FeeCalculatorFactory
- Calcula precisão de taxa (erro absoluto percentual entre fee_base e fee_quote/avg_price)

Saída: runtime/benchmark_results.json com resultados por exchange.
Use com cuidado: envia ordens reais se credenciais estiverem configuradas.
"""
import os
import sys
import json
import time
import asyncio
from pathlib import Path
from typing import Any, Dict, Optional

# Garantir import do pacote local
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if REPO_ROOT not in sys.path:
    sys.path.append(REPO_ROOT)

from smc_sentinel.clients.binance import BinanceClient  # type: ignore
from smc_sentinel.clients.coinbase import CoinbaseClient  # type: ignore
from smc_sentinel.clients.kraken import KrakenClient  # type: ignore
from smc_sentinel.clients.base import ExchangeCredentials  # type: ignore
from smc_sentinel.trading.factories import PollerFactory, FeeCalculatorFactory  # type: ignore
from smc_sentinel.trading.services import TradingService  # type: ignore
from smc_sentinel.monitoring.realtime.metrics_collector import TradingMetricsCollector  # type: ignore

PROJECT_ROOT = Path(REPO_ROOT)
RUNTIME_DIR = PROJECT_ROOT / "runtime"
RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
OUT_PATH = RUNTIME_DIR / "benchmark_results.json"


def _has_binance_creds() -> bool:
    return bool(os.getenv("BINANCE_API_KEY") and os.getenv("BINANCE_API_SECRET"))


def _has_coinbase_creds() -> bool:
    return bool(os.getenv("COINBASE_API_KEY") and os.getenv("COINBASE_API_SECRET") and os.getenv("COINBASE_PASSPHRASE"))


def _has_kraken_creds() -> bool:
    return bool(os.getenv("KRAKEN_API_KEY") and os.getenv("KRAKEN_API_SECRET"))


async def _bench_binance(metrics: TradingMetricsCollector, max_wait_s: int = 10) -> Dict[str, Any]:
    out: Dict[str, Any] = {"exchange": "binance"}
    if not _has_binance_creds():
        out.update({
            "place_order": "skipped: missing BINANCE_API_KEY/BINANCE_API_SECRET",
            "polling_fill": "skipped",
            "fee_base": "skipped",
            "fee_accuracy_abs_pct": "skipped",
        })
        return out
    creds = ExchangeCredentials(api_key=os.getenv("BINANCE_API_KEY", ""), api_secret=os.getenv("BINANCE_API_SECRET", ""))
    client = BinanceClient(credentials=creds)

    # Descobrir preço agressivo
    try:
        ob = client.fetch_order_book("BTCUSDT", limit=10)
        bids = ob.get("bids") or []
        asks = ob.get("asks") or []
        best_ask = float(asks[0][0]) if asks else None
    except Exception:
        best_ask = None
    price = (best_ask * 1.01) if (best_ask and best_ask > 0) else 50000.0

    # Place order medindo latência
    start_ts = metrics.record_place_order_attempt("binance")
    try:
        order = client.place_order(symbol="BTCUSDT", side="BUY", type_="LIMIT", quantity=0.001, price=price)
        latency_s = float(time.time() - start_ts)
        metrics.record_place_order_result("binance", latency_s, success=True)
        out["place_order"] = order
    except Exception as e:
        latency_s = float(time.time() - start_ts)
        metrics.record_place_order_result("binance", latency_s, success=False, reason=getattr(e, "__class__", type(e)).__name__)
        out["place_order"] = f"error: {e}"
        out["polling_fill"] = None
        out["fee_base"] = 0.0
        out["fee_accuracy_abs_pct"] = None
        return out

    # Polling + fee
    service = TradingService(PollerFactory, FeeCalculatorFactory)
    try:
        svc = await service.execute_symbol_trading(client, symbol="BTCUSDT", side="buy", order_result=out["place_order"], max_wait_s=max_wait_s)
        fill = svc.get("fill")
        fee_base = float(svc.get("fee_base", 0.0)) if fill else 0.0
        out["polling_fill"] = fill
        out["fee_base"] = fee_base
        fee_quote = float(fill.get("fee_quote", 0.0)) if fill else 0.0
        avg_price = float(fill.get("avg_price", 0.0)) if fill else 0.0
        fee_abs_err = None
        if fill and avg_price > 0:
            estimated_base = fee_quote / avg_price
            denom = max(abs(estimated_base), 1e-9)
            fee_abs_err = abs(fee_base - estimated_base) / denom
        out["fee_accuracy_abs_pct"] = fee_abs_err
    except Exception as e:
        out["polling_fill"] = f"error: {e}"
        out["fee_base"] = 0.0
        out["fee_accuracy_abs_pct"] = None
    return out


async def _bench_coinbase(metrics: TradingMetricsCollector, max_wait_s: int = 10) -> Dict[str, Any]:
    out: Dict[str, Any] = {"exchange": "coinbase"}
    if not _has_coinbase_creds():
        out.update({
            "place_order": "skipped: missing COINBASE_API_KEY/SECRET/PASSPHRASE",
            "polling_fill": "skipped",
            "fee_base": "skipped",
            "fee_accuracy_abs_pct": "skipped",
        })
        return out
    creds = ExchangeCredentials(api_key=os.getenv("COINBASE_API_KEY", ""), api_secret=os.getenv("COINBASE_API_SECRET", ""), passphrase=os.getenv("COINBASE_PASSPHRASE", ""))
    client = CoinbaseClient(credentials=creds)

    # Best ask via orderbook
    try:
        ob = await asyncio.to_thread(client.fetch_order_book, "BTC-USD", 10)
        asks = ob.get("asks") or []
        best_ask = float(asks[0][0]) if asks else None
    except Exception:
        best_ask = None
    price = (best_ask * 1.01) if (best_ask and best_ask > 0) else 50000.0

    start_ts = metrics.record_place_order_attempt("coinbase")
    try:
        order = await asyncio.to_thread(client.place_order, product_id="BTC-USD", side="BUY", order_type="LIMIT", size=0.001, price=price)
        latency_s = float(time.time() - start_ts)
        metrics.record_place_order_result("coinbase", latency_s, success=True)
        out["place_order"] = order
    except Exception as e:
        latency_s = float(time.time() - start_ts)
        metrics.record_place_order_result("coinbase", latency_s, success=False, reason=getattr(e, "__class__", type(e)).__name__)
        out["place_order"] = f"error: {e}"
        out["polling_fill"] = None
        out["fee_base"] = 0.0
        out["fee_accuracy_abs_pct"] = None
        return out

    # Polling + fee
    service = TradingService(PollerFactory, FeeCalculatorFactory)
    try:
        svc = await service.execute_symbol_trading(client, symbol="BTC-USD", side="buy", order_result=out["place_order"], max_wait_s=max_wait_s)
        fill = svc.get("fill")
        fee_base = float(svc.get("fee_base", 0.0)) if fill else 0.0
        out["polling_fill"] = fill
        out["fee_base"] = fee_base
        fee_quote = float(fill.get("fee_quote", 0.0)) if fill else 0.0
        avg_price = float(fill.get("avg_price", 0.0)) if fill else 0.0
        fee_abs_err = None
        if fill and avg_price > 0:
            estimated_base = fee_quote / avg_price
            denom = max(abs(estimated_base), 1e-9)
            fee_abs_err = abs(fee_base - estimated_base) / denom
        out["fee_accuracy_abs_pct"] = fee_abs_err
    except Exception as e:
        out["polling_fill"] = f"error: {e}"
        out["fee_base"] = 0.0
        out["fee_accuracy_abs_pct"] = None
    return out


async def _bench_kraken(metrics: TradingMetricsCollector, max_wait_s: int = 10) -> Dict[str, Any]:
    out: Dict[str, Any] = {"exchange": "kraken"}
    if not _has_kraken_creds():
        out.update({
            "place_order": "skipped: missing KRAKEN_API_KEY/KRAKEN_API_SECRET",
            "polling_fill": "skipped",
            "fee_base": "skipped",
            "fee_accuracy_abs_pct": "skipped",
        })
        return out
    creds = ExchangeCredentials(api_key=os.getenv("KRAKEN_API_KEY", ""), api_secret=os.getenv("KRAKEN_API_SECRET", ""))
    client = KrakenClient(credentials=creds)

    # Best ask
    try:
        ob = client.fetch_order_book("XBTUSD", limit=10)
        resdict = next(iter(ob.get("result", {}).values()), {})
        asks = resdict.get("asks", [])
        best_ask = float(asks[0][0]) if asks else None
    except Exception:
        best_ask = None
    price = (best_ask * 1.01) if (best_ask and best_ask > 0) else 50000.0

    start_ts = metrics.record_place_order_attempt("kraken")
    try:
        order = client.place_order(symbol="XBTUSD", side="buy", type_="limit", quantity=0.0001, price=price)
        latency_s = float(time.time() - start_ts)
        metrics.record_place_order_result("kraken", latency_s, success=True)
        out["place_order"] = order
    except Exception as e:
        latency_s = float(time.time() - start_ts)
        metrics.record_place_order_result("kraken", latency_s, success=False, reason=getattr(e, "__class__", type(e)).__name__)
        out["place_order"] = f"error: {e}"
        out["polling_fill"] = None
        out["fee_base"] = 0.0
        out["fee_accuracy_abs_pct"] = None
        return out

    service = TradingService(PollerFactory, FeeCalculatorFactory)
    try:
        svc = await service.execute_symbol_trading(client, symbol="XBTUSD", side="buy", order_result=out["place_order"], max_wait_s=max_wait_s)
        fill = svc.get("fill")
        fee_base = float(svc.get("fee_base", 0.0)) if fill else 0.0
        out["polling_fill"] = fill
        out["fee_base"] = fee_base
        fee_quote = float(fill.get("fee_quote", 0.0)) if fill else 0.0
        avg_price = float(fill.get("avg_price", 0.0)) if fill else 0.0
        fee_abs_err = None
        if fill and avg_price > 0:
            estimated_base = fee_quote / avg_price
            denom = max(abs(estimated_base), 1e-9)
            fee_abs_err = abs(fee_base - estimated_base) / denom
        out["fee_accuracy_abs_pct"] = fee_abs_err
    except Exception as e:
        out["polling_fill"] = f"error: {e}"
        out["fee_base"] = 0.0
        out["fee_accuracy_abs_pct"] = None
    return out


async def main() -> None:
    metrics = TradingMetricsCollector()
    results: Dict[str, Any] = {"by_exchange": {}}
    # Ordem: binance, coinbase, kraken
    results["by_exchange"]["binance"] = await _bench_binance(metrics, max_wait_s=int(os.getenv("SMC_BENCH_MAX_WAIT", "10")))
    results["by_exchange"]["coinbase"] = await _bench_coinbase(metrics, max_wait_s=int(os.getenv("SMC_BENCH_MAX_WAIT", "10")))
    results["by_exchange"]["kraken"] = await _bench_kraken(metrics, max_wait_s=int(os.getenv("SMC_BENCH_MAX_WAIT", "10")))

    # Inclui snapshot das métricas para referência
    results["metrics_snapshot"] = metrics.snapshot(PollerFactory, FeeCalculatorFactory)

    try:
        OUT_PATH.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Benchmark salvo em {OUT_PATH}")
    except Exception as e:
        print(f"Falha ao salvar benchmark: {e}")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Interrompido pelo usuário")