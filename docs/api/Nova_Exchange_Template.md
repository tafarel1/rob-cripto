# Template para Adicionar Nova Exchange (Kraken, Bybit)

Este guia prepara a arquitetura e os artefatos necessários para adicionar uma nova exchange seguindo a evolução SOLID do SMC Sentinel.

Recursos criados:
- Cliente base: `smc_sentinel/clients/templates/exchange_template.py`
- Poller/Fees: `smc_sentinel/trading/implementations/templates/template_poller.py` e `template_fee_calculator.py`
- Helper de registro: `smc_sentinel/trading/implementations/templates/register.py`
- Testes de integração modelo e validação SOLID: em `tests/unit/`

## Passo a Passo

1. Copiar o cliente template
   - Copie `clients/templates/exchange_template.py` para `clients/kraken.py` (ou `clients/bybit.py`).
   - Ajuste `name`, `base_url` e autenticação (`sign`).
   - Configure rate limits conservadores e refine após testes.

2. Implementar endpoints mínimos
   - `get_orderbook_depth(symbol, level)` para dados de liquidez.
   - `place_order(symbol, side, size, price, type)` para envio de ordens.
   - `get_trades_for_order(symbol, order_id)` para recuperar taxas/fills.

3. Implementar Poller e FeeCalculator
   - Crie `trading/implementations/kraken/poller.py` e `fee_calculator.py` (baseados nos templates) ou use os templates diretamente.
   - `TemplateOrderFillPoller.poll_fill(...)`: define a política de polling e normalização do fill.
   - `TemplateFeeCalculator.compute_fee_base(...)`: retorna a taxa em moeda base.

4. Registrar nas factories
   - Use `register_exchange("kraken", KrakenOrderFillPoller, KrakenFeeCalculator)`.
   - Alternativamente, chame diretamente `PollerFactory.register` e `FeeCalculatorFactory.register`.

5. Validar com testes
   - Execute `pytest -q` para rodar os testes modelo.
   - Verifique integração e tempo de execução do polling.

## Checklist SOLID para Nova Exchange

- SRP: O cliente só cuida de HTTP/WebSocket e autenticação.
- OCP: Inserção sem modificar código das factories (apenas registrar).
- LSP: Herda `BaseExchangeClient` e funciona em fluxos existentes.
- ISP: Métodos específicos e focados (`get_orderbook_depth`, `place_order`, `get_trades_for_order`).
- DIP: Poller/FeeCalculator dependem da abstração do cliente, não de classes concretas.

## Validações Automáticas (incluídas nos testes)

- Registro fácil: factories aceitam o nome e retornam instâncias corretas.
- Testes passam automaticamente: uso de mocks no cliente e templates sem chamar rede.
- Performance dentro dos limites: polling retorna rapidamente quando há trades; sem trades, respeita timeout curto.
- Compliance SOLID: herança das abstrações, ausência de import acoplado a outras exchanges nos templates.

## Integração com Dashboard

- A página “Extensibilidade” e “Migração” já exibem métricas agregadas por exchange.
- Ao registrar a nova exchange, os comparativos por exchange passam a incluir sua performance.

## Dicas de Produção

- Ajuste `RateLimiter` com as cotas oficiais da API.
- Use `retry_with_backoff` para erros transitórios (5xx/429), com limites seguros.
- Mantenha logs estruturados (events.jsonl) para auditoria.

Para detalhes completos e princípios, veja `docs/Evolucao_SOLID.md`.