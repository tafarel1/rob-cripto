#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Validação de produção para Kraken sem enviar ordens.

Verifica:
- Conexão pública (orderbook XBTUSD)
- Credenciais via endpoint privado Balance
- Base URL selecionada (sandbox/prod)

Saída: runtime/kraken_prod_validation.json
"""
import os
import sys
import json
from pathlib import Path
from typing import Any, Dict

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if REPO_ROOT not in sys.path:
    sys.path.append(REPO_ROOT)

from smc_sentinel.clients.kraken import KrakenClient  # type: ignore
from smc_sentinel.clients.base import ExchangeCredentials  # type: ignore

RUNTIME_DIR = Path(REPO_ROOT) / "runtime"
RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
OUT_PATH = RUNTIME_DIR / "kraken_prod_validation.json"


def main() -> None:
    # Detecta modo sandbox/prod
    env_flag = os.getenv("KRAKEN_USE_SANDBOX", "true").lower() in ("1", "true", "yes", "on")
    use_sandbox = env_flag

    api_key = os.getenv('KRAKEN_API_KEY')
    api_secret = os.getenv('KRAKEN_API_SECRET')
    creds = ExchangeCredentials(api_key=api_key or '', api_secret=api_secret or '') if (api_key and api_secret) else None

    client = KrakenClient(credentials=creds, use_sandbox=use_sandbox)

    out: Dict[str, Any] = {
        "base_url": client.base_url,
        "env_mode": "sandbox" if use_sandbox else "production",
        "public_connection": None,
        "balance_check": None,
    }

    # Conexão pública
    try:
        ob = client.fetch_order_book('XBTUSD', limit=5)
        ok = bool(ob and isinstance(ob, dict) and 'result' in ob)
        out["public_connection"] = "ok" if ok else "error: resposta inesperada"
    except Exception as e:
        out["public_connection"] = f"error: {e}"

    # Checagem de credenciais sem ordem
    if creds and creds.api_key and creds.api_secret:
        try:
            bal = client.get_account_balance()
            # Espera estrutura com chave 'result'
            ok = bool(bal and isinstance(bal, dict) and 'result' in bal)
            out["balance_check"] = "ok" if ok else "error: resposta inesperada"
            out["balance_sample"] = bal.get('result', {}) if isinstance(bal, dict) else {}
        except Exception as e:
            out["balance_check"] = f"error: {e}"
    else:
        out["balance_check"] = "skipped: missing KRAKEN_API_KEY/KRAKEN_API_SECRET"

    try:
        OUT_PATH.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Validação Kraken (prod) salva em {OUT_PATH}")
    except Exception as e:
        print(f"Falha ao salvar validação: {e}")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("Interrompido pelo usuário")
