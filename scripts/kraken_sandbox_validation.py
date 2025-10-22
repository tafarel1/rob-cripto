#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Validação completa da integração Kraken sandbox.

Etapas:
- Conexão com sandbox e leitura de orderbook (pública)
- Place order (privado, requer KRAKEN_API_KEY/KRAKEN_API_SECRET)
- Polling de fill via PollerFactory
- Cálculo de taxa via FeeCalculatorFactory

Saída: resumo dos resultados com chaves:
- sandbox_connection: ok|error
- place_order: dict|"skipped"
- polling_fill: dict|"skipped"
- fee_base: float|"skipped"
"""
import os
import sys
import asyncio
from typing import Any, Dict

# Garantir import do pacote local sem depender de PYTHONPATH externo
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if REPO_ROOT not in sys.path:
    sys.path.append(REPO_ROOT)

from smc_sentinel.clients.kraken import KrakenClient  # type: ignore
from smc_sentinel.clients.base import ExchangeCredentials  # type: ignore
from smc_sentinel.trading.factories import PollerFactory, FeeCalculatorFactory  # type: ignore
from smc_sentinel.trading.services.trading_service import TradingService  # type: ignore


async def validate() -> Dict[str, Any]:
    results: Dict[str, Any] = {}

    api_key = os.getenv('KRAKEN_API_KEY')
    api_secret = os.getenv('KRAKEN_API_SECRET')
    has_creds = bool(api_key and api_secret)

    creds = ExchangeCredentials(api_key=api_key or '', api_secret=api_secret or '') if has_creds else None
    client = KrakenClient(credentials=creds)

    # 1) Conexão pública
    try:
        ob = client.fetch_order_book('XBTUSD', limit=5)
        ok = bool(ob and isinstance(ob, dict) and 'result' in ob)
        results['sandbox_connection'] = 'ok' if ok else 'error: resposta inesperada'
        results['orderbook_snapshot'] = ob
    except Exception as e:
        results['sandbox_connection'] = f'error: {e}'
        results['orderbook_snapshot'] = None

    # 2) Place order + 3) Polling fill + 4) Fee
    if has_creds:
        try:
            # Determinar preço limite agressivo com base no melhor ask
            ask_price = None
            try:
                ob = client.fetch_order_book('XBTUSD', limit=10)
                resdict = next(iter(ob.get('result', {}).values()), {})
                asks = resdict.get('asks', [])
                if asks:
                    ask_price = float(asks[0][0])
            except Exception:
                pass
            price = (ask_price * 1.01) if (ask_price and ask_price > 0) else 50000.0

            order_result = client.place_order(
                symbol='XBTUSD',
                side='buy',
                type_='limit',
                quantity=0.0001,
                price=price,
            )
            results['place_order'] = order_result

            service = TradingService(PollerFactory, FeeCalculatorFactory)
            ef = await service.execute_symbol_trading(
                client,
                symbol='XBTUSD',
                side='buy',
                order_result=order_result,
                max_wait_s=10,
            )
            results['polling_fill'] = ef.get('fill')
            results['fee_base'] = ef.get('fee_base')
        except Exception as e:
            results['place_order'] = f'error: {e}'
            results['polling_fill'] = None
            results['fee_base'] = 0.0
    else:
        results['place_order'] = 'skipped: missing KRAKEN_API_KEY/KRAKEN_API_SECRET'
        results['polling_fill'] = 'skipped: missing credentials'
        results['fee_base'] = 'skipped: missing credentials'

    return results


def main() -> None:
    out = asyncio.run(validate())
    # Resumo amigável
    print('=== Kraken Sandbox Validation ===')
    print(f"sandbox_connection: {out.get('sandbox_connection')}")
    print(f"place_order: {out.get('place_order')}")
    print(f"polling_fill: {out.get('polling_fill')}")
    print(f"fee_base: {out.get('fee_base')}")


if __name__ == '__main__':
    main()