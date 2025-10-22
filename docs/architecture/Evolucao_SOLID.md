# Evolução SOLID no SMC Sentinel — Aprendizado e Manutenção

Este documento descreve a evolução arquitetural orientada aos princípios SOLID no SMC Sentinel, com foco em facilitar o aprendizado de novos desenvolvedores e reduzir o custo de manutenção. Inclui diagramas antes/depois, comparativos de complexidade e manutenibilidade, checklist SOLID para novas features e um guia prático para adicionar uma nova exchange.

## Visão Geral
- Objetivos: modularidade, testabilidade, extensibilidade, métricas de performance e clareza operacional.
- Componentes-chave (após evolução): `TradingService`, `PollerFactory`, `FeeCalculatorFactory`, `AdvancedPerformanceTracker`, `TradingMetricsCollector`, `dashboard` (página Extensibilidade).

## Arquitetura — Antes
```
run_trading.py
  ├─ lógica direta de orquestração
  ├─ chamadas diretas a clients (ex.: Binance/Coinbase)
  ├─ cálculo de fees inline
  ├─ pouca separação de responsabilidades
  └─ métricas pontuais (sem agregação comparativa)
```

## Arquitetura — Depois (SOLID)
```
run_trading.py
  └─ TradingService
       ├─ PollerFactory ──> Poller (por exchange)
       ├─ FeeCalculatorFactory ──> FeeCalculator (por exchange/tipo)
       ├─ Order Executor / Risk Profile
       ├─ AdvancedPerformanceTracker (KPIs de trading)
       └─ TradingMetricsCollector (latência, sucesso/falha, fill time)

Dashboard (Streamlit)
  └─ Página "Extensibilidade"
       ├─ Comparativo service vs legacy (latência)
       ├─ Sucesso por exchange e por lado (buy/sell)
       ├─ Tempo médio de fill (global e por exchange)
       └─ Diagnósticos de registries (pollers/fees)
```

### Benefícios por princípio SOLID
- SRP (Responsabilidade Única): cada componente tem um papel claro (ex.: `Poller` coleta, `FeeCalculator` calcula fee, `TradingService` orquestra).
- OCP (Aberto/Fechado): novas exchanges entram via registries sem modificar o core.
- LSP (Substituição de Liskov): novos `Pollers` e `FeeCalculators` podem substituir implementações sem quebrar contratos.
- ISP (Segregação de Interfaces): contratos focados evitam métodos inúteis em implementações concretas.
- DIP (Inversão de Dependência): `TradingService` depende de abstrações (`Factory/Interfaces`) em vez de detalhes concretos.

## Comparativo de Complexidade e Manutenibilidade
```
| Aspecto                         | Antes                             | Depois (SOLID)                      | Impacto                        |
|---------------------------------|-----------------------------------|-------------------------------------|--------------------------------|
| Locais tocados p/ nova exchange | 6–10 pontos dispersos             | 2 registries + 2 classes            | ↓ acoplamento, ↑ previsibilidade |
| Testabilidade                   | Baixa (hard acoplado)             | Alta (mocks em `TradingService`)    | ↑ cobertura, ↓ custo de teste   |
| Métricas de performance         | Ad-hoc                            | Coletor dedicado + dashboard        | ↑ observabilidade               |
| Reuso de lógica                 | Limitado                          | Alto via `Factory` e serviços       | ↓ duplicação de código          |
| Risco de regressão              | Alto                              | Médio/Baixo                         | ↑ estabilidade                  |
```
Notas:
- Métricas comparativas reais (latência `service` vs `legacy`, sucesso por exchange e tipo de ordem, tempo médio de fill) são exibidas na página "Extensibilidade" do `dashboard` e persistidas em `runtime/metrics_trading.json`.

## Checklist SOLID para Novas Features
- Confirmar SRP: a feature cabe em uma classe/serviço com responsabilidade única?
- OCP: inserir via extensão (registries/interfaces) sem alterar o core?
- LSP: novas implementações respeitam contratos consumidos por `TradingService`?
- ISP: a interface usada é mínima e relevante ao caso (evitar métodos supérfluos)?
- DIP: depender de abstrações (factories/interfaces), não de classes concretas.
- Testes: incluir unit tests com mocks (sucesso, cancelamento, partial fills, erros e retry).
- Métricas: registrar `attempt/success/failure` com `path` (service/legacy), latência e `fill_time`.
- Documentação: atualizar esta seção se a feature muda contratos públicos.

## Guia: Como Adicionar uma Nova Exchange
1) Criar client/poller:
   - Implementar um `Poller` específico na pasta `smc_sentinel/trading/implementations/`.
   - Assinar contrato esperado pelo `TradingService` (ex.: `poll()` retorna dados da exchange com campos padronizados).
2) Criar fee calculator:
   - Implementar `FeeCalculator` para a exchange (spot/futures conforme necessário).
3) Registrar no `Factory`:
   - Em `smc_sentinel/trading/factories.py`: registrar `Poller` e `FeeCalculator`.
   - Exemplo:
     - `PollerFactory.register("KRAKEN", KrakenPoller)`
     - `FeeCalculatorFactory.register("KRAKEN", KrakenFeeCalculator)`
4) Integrar no `run_trading.py`:
   - Garantir que a configuração/símbolos contemplam a nova exchange.
   - `TradingMetricsCollector`: registrar `attempt/success/failure` com `path="service"` e latência.
5) Testes:
   - Adicionar testes unitários para `TradingService` cobrindo `execute_symbol_trading` e `execute_multi_symbol_trading` com a nova exchange (sucesso, cancelamento, parcial, erro, retry).
6) Dashboard:
   - Verificar a página "Extensibilidade" — a nova exchange deve aparecer em `by_exchange` automaticamente.

### Exemplo Prático (Skeleton)
```
# Poller (exemplo)
class KrakenPoller:
    def __init__(self, client):
        self.client = client
    def poll(self, symbol: str):
        # Retorna dados normalizados esperados pelo TradingService
        return {"symbol": symbol, "bid": 100.0, "ask": 100.2, "ts": 1234567890}

# FeeCalculator (exemplo)
class KrakenFeeCalculator:
    def calc(self, side: str, quantity: float, price: float) -> float:
        fee_rate = 0.0016  # exemplo
        return quantity * price * fee_rate

# Registro
from smc_sentinel.trading.factories import PollerFactory, FeeCalculatorFactory
PollerFactory.register("KRAKEN", KrakenPoller)
FeeCalculatorFactory.register("KRAKEN", KrakenFeeCalculator)
```

### Integração de Métricas
- Em operações de trading, chamar:
  - `metrics.record_attempt(exchange, symbol, path="service")`
  - `metrics.record_success(exchange, symbol, latency_s=..., fill_time_s=..., side=...)`
  - `metrics.record_failure(exchange, symbol, latency_s=..., side=..., error="...")`
- Persistência automática em `runtime/metrics_trading.json` pelo `run_trading.py`.

## Tutorial Rápido para Novos Devs
- Instalação: `pip install -r requirements.txt`.
- Rodar dashboard: `streamlit run v:\development\smc_sentinel\dashboard.py --server.port 8501`.
- Executar trading (dev): `python v:\development\smc_sentinel\run_trading.py`.
- Onde olhar:
  - `smc_sentinel/trading/factories.py`: registries de exchanges e fees.
  - `smc_sentinel/trading/services/trading_service.py`: orquestração central.
  - `smc_sentinel/monitoring/realtime/metrics_collector.py`: estrutura das métricas.
  - `runtime/metrics_trading.json`: saída das métricas em tempo real.
  - `dashboard.py` → página "Extensibilidade": visual comparativo.
- Fluxo de extensão:
  - Criar `Poller` e `FeeCalculator` → Registrar → Testar → Validar no dashboard.
- Boas práticas:
  - Usar mocks nos testes do `TradingService`.
  - Evitar acoplamento direto a clients: depender de interfaces/factories.
  - Atualizar documentação ao alterar contratos.

---
Última atualização: automatizada durante a evolução de métricas e UI de extensibilidade.