# Transição da Kraken de Sandbox para Produção

Este guia descreve os passos para migrar a integração Kraken do ambiente de sandbox para produção, cobrindo preparação, validações, performance, procedimentos de deploy, segurança, plano de desastre e monitoramento.

## Preparação
- Credenciais production-ready
  - Configure `KRAKEN_API_KEY` e `KRAKEN_API_SECRET` em `.env` (ou via variáveis de ambiente). O `API_SECRET` deve estar em Base64 conforme exigido pela Kraken.
  - Mantenha o arquivo `.env` fora de VCS e restrinja permissões.
- Alternância de ambiente
  - Defina `KRAKEN_USE_SANDBOX=false` para produção (default é `true`).
  - Opcional: `KRAKEN_BASE_URL` para override explícito da base.
- Rate limits para produção
  - Ajuste via env:
    - `KRAKEN_RL_GLOBAL_CAP` e `KRAKEN_RL_GLOBAL_FR`
    - `KRAKEN_RL_MD_CAP` e `KRAKEN_RL_MD_FR`
    - `KRAKEN_RL_ORDER_CAP` e `KRAKEN_RL_ORDER_FR`
    - `KRAKEN_RL_ORDER_STATUS_CAP` e `KRAKEN_RL_ORDER_STATUS_FR`
  - Recomendações iniciais (conservadoras; ajuste por métricas):
    - `global`: cap=20, fr=2.0
    - `market_data`: cap=15, fr=2.0
    - `order`: cap=10, fr=1.5
    - `order_status`: cap=10, fr=1.5

## Validação (sem ordens)
- Verifique credenciais e ambiente:
  - `powershell ./scripts/validate-exchange-credentials.ps1`
  - Confirme "Kraken modo: production" e rate limits configurados.
- Validação de produção:
  - `python ./scripts/kraken_prod_validation.py`
  - Saída em `runtime/kraken_prod_validation.json` com:
    - `public_connection`: ok/erro (Depth `XBTUSD`)
    - `balance_check`: ok/erro (endpoint privado `Balance`)
    - `base_url` e `env_mode`

## Performance Testing
- Micro-benchmark (cuidado: pode enviar ordens se credenciais existirem):
  - `python ./scripts/benchmark_exchanges.py`
  - Controle de espera: `SMC_BENCH_MAX_WAIT=10` (env)
  - Verifique `runtime/benchmark_results.json` e o `metrics_snapshot` para latência de `place_order`, taxa de sucesso e precisão de taxa.
- Teste com volumes reais (progressivo):
  - Inicie com pequenos tamanhos (`volume`), em janelas controladas.
  - Monitore degradations via dashboard e `events.jsonl`.

## Procedures de Deploy
- Preparar `.env` com credenciais e flags:
  - `KRAKEN_USE_SANDBOX=false`
  - Rate limits ajustados conforme acima.
- Deploy (produçao):
  - `powershell ./scripts/deploy-prod.ps1` (ou `deploy-prod-min.ps1`)
  - Confirmar serviço ativo e logs sem erros.
- Rollback imediato (se necessário):
  - `rollback_plan.bat`
  - Ajuste `FF_EXECUTION_MODE=legacy` no `.env` para fallback do executor.

## Checklist de Segurança
- Armazenamento de segredos:
  - `.env` protegido, sem commit em VCS.
  - Opcional: usar Vault/Secret Manager se disponível.
- Logs:
  - `StructuredLogger` não loga secrets; verifique que nenhum output imprime `API_KEY`/`API_SECRET`.
- Assinatura/Autenticação:
  - Kraken usa HMAC-SHA512 com `API_SECRET` em Base64; implementação valida em `kraken.py`.

## Plano de Recuperação de Desastre
- Feature toggles:
  - `FEATURE_TOGGLES_ENABLED=true`
  - `FF_EXECUTION_MODE=legacy` para rollback rápido do caminho de execução.
  - Ajustar `FF_*_ROLLBACK_TIMEOUT_S` conforme criticidade.
- Parada controlada:
  - Usar botões do dashboard ou `deploy-runner.ps1` para suspender trading.
- Backups/Métricas:
  - Persistência em `runtime/metrics_trading.json` e `events.jsonl` para pós-mortem.

## Monitoring e Alerting
- Dashboard (Streamlit):
  - `streamlit run V:\development\smc_sentinel\dashboard.py --server.port 8501`
  - Página "Exchanges": comparativos de taxa de sucesso, latência, tempo de fill e precisão de taxa.
  - Alertas de degradação configuráveis (thresholds) e tendências via `events.jsonl`.
- Logs estruturados:
  - `runtime/events.jsonl` para séries temporais (sucesso/latência por exchange).

## Notas Técnicas
- Alternância de ambiente:
  - `KrakenClient(..., use_sandbox: Optional[bool])` e `KRAKEN_USE_SANDBOX`/`KRAKEN_BASE_URL` controlam `base_url` (`sandbox` vs `https://api.kraken.com`).
- Validação segura:
  - Método `get_account_balance()` implementado para checar credenciais sem enviar ordens.
- Rate limits:
  - Buckets: `kraken:global`, `kraken:market_data`, `kraken:order`, `kraken:order_status`.
- Métricas e auditoria:
  - `TradingMetricsCollector` e `StructuredLogger` já integram dados para comparativos e tendências.
