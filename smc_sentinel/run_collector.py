from __future__ import annotations

import asyncio
import signal
import sys
import contextlib
from typing import Optional

from loguru import logger

from .infra.config import Settings
from .infra.collector import DataCollector
from .infra.sinks import ConsoleSink, JSONLinesSink, EventSink
from .clients.binance import BinanceClient
from .clients.coinbase import CoinbaseClient


async def _consume(queue: asyncio.Queue, sink: EventSink, metrics: dict, mlock: asyncio.Lock):
    while True:
        event = await queue.get()
        try:
            await sink.write(event)
            etype = event.get("type", "unknown") if isinstance(event, dict) else "unknown"
            async with mlock:
                metrics["events_total"] = metrics.get("events_total", 0) + 1
                by_type = metrics.setdefault("events_by_type", {})
                by_type[etype] = by_type.get(etype, 0) + 1
        except Exception as e:
            logger.error(f"Falha ao escrever evento: {e}")
            async with mlock:
                metrics["write_errors"] = metrics.get("write_errors", 0) + 1
        finally:
            queue.task_done()


async def _report_metrics(queue: asyncio.Queue, metrics: dict, mlock: asyncio.Lock, interval: float):
    while True:
        await asyncio.sleep(interval)
        qsize = queue.qsize()
        async with mlock:
            total = metrics.get("events_total", 0)
            errors = metrics.get("write_errors", 0)
            by_type = dict(metrics.get("events_by_type", {}))
            # reset incremental counters
            metrics["events_total"] = 0
            metrics["write_errors"] = 0
            metrics["events_by_type"] = {}
        logger.info(f"[metrics] qsize={qsize} events_total={total} write_errors={errors} by_type={by_type}")


async def main() -> None:
    settings = Settings.from_env()

    # Logger
    logger.remove()
    logger.add(sys.stderr, level=settings.log_level.upper())

    # Sink
    if settings.sink.lower() == "jsonl":
        sink: EventSink = JSONLinesSink(settings.jsonl_path, rotate_daily=settings.jsonl_rotate_daily)
        logger.info(f"Sink: JSON Lines -> {settings.jsonl_path} (rotate_daily={settings.jsonl_rotate_daily})")
    else:
        sink = ConsoleSink()
        logger.info("Sink: Console")

    # Clients
    binance = BinanceClient()
    coinbase = CoinbaseClient()

    # Collector
    collector = DataCollector(max_queue_size=50000)

    # Binance streams + snapshots
    for sym in settings.binance_symbols or []:
        collector.add_ohlcv_stream(binance, sym, settings.binance_timeframe)
        collector.add_orderbook_snapshot(
            binance, sym, level=settings.orderbook_level, period=settings.orderbook_period
        )

    # Coinbase OHLCV via polling e L2 via WS
    for product in settings.coinbase_products or []:
        collector.add_ohlcv_stream(coinbase, product, settings.coinbase_timeframe)
    if settings.coinbase_products:
        try:
            collector.add_orderbook_stream(coinbase, settings.coinbase_products)
        except ValueError:
            logger.warning("Client Coinbase não suporta stream level2; ignorando stream de orderbook.")

    # Consumer + Metrics
    q = collector.get_queue()
    metrics: dict = {"events_total": 0, "write_errors": 0, "events_by_type": {}}
    mlock = asyncio.Lock()
    consumer_task = asyncio.create_task(_consume(q, sink, metrics, mlock))
    reporter_task = asyncio.create_task(_report_metrics(q, metrics, mlock, settings.stats_interval))

    # Sinal de parada
    stop_event = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (getattr(signal, "SIGINT", None), getattr(signal, "SIGTERM", None)):
        if sig is None:
            continue
        try:
            loop.add_signal_handler(sig, stop_event.set)
        except NotImplementedError:
            # Windows pode não suportar signal handlers no event loop
            pass

    logger.info("Coleta iniciada. Pressione Ctrl+C para encerrar.")

    try:
        await stop_event.wait()
    except (KeyboardInterrupt, SystemExit):
        logger.info("Encerrando por interrupção...")
    finally:
        await collector.shutdown()
        consumer_task.cancel()
        reporter_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await consumer_task
        with contextlib.suppress(asyncio.CancelledError):
            await reporter_task
        # Fecha clientes
        try:
            await binance.aclose()
        except Exception:
            pass
        try:
            await coinbase.aclose()
        except Exception:
            pass
        try:
            await sink.aclose()
        except Exception:
            pass
        logger.info("Coleta finalizada.")


if __name__ == "__main__":
    asyncio.run(main())