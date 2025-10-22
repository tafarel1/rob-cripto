# Relatório de Reorganização — SMC_Sentinel

## Objetivo
Reorganizar a estrutura por funcionalidade/camada, mantendo compatibilidade com scripts e testes, documentando mudanças e verificações.

## Mudanças Realizadas
- src/
  - Criadas subpastas: core, monitoring, detection, alerting, config, utils (com `__init__.py` e READMEs)
  - Movidos:
    - `dashboard.py` → `src/monitoring/dashboard.py` (wrapper criado em raiz)
    - `run_trading.py` → `src/core/run_trading.py` (wrapper criado em raiz)
    - `dark_theme.py` → `src/monitoring/dark_theme.py` (wrapper criado em raiz)
- docs/
  - Reorganizado em `api`, `deployment`, `architecture`
  - Movidos:
    - `docs/Kraken_Prod_Transition.md` → `docs/deployment/Kraken_Prod_Transition.md`
    - `docs/Evolucao_SOLID.md` → `docs/architecture/Evolucao_SOLID.md`
    - `docs/DARK_THEME.md` → `docs/architecture/DARK_THEME.md`
    - `docs/Nova_Exchange_Template.md` → `docs/api/Nova_Exchange_Template.md`
  - Adicionados READMEs e diagrama `docs/architecture/STRUCTURE_DIAGRAM.md` (Mermaid)
- scripts/
  - Criada subpasta `scripts/deployment` com wrappers para: deploy-dev, deploy-test, deploy-staging, deploy-prod, deploy-env, deploy-status, deploy-runner, register/unregister NSSM e scheduled task
  - Criada subpasta `scripts/maintenance` com README (scripts operacionais mantidos em `scripts/`)
- config/
  - Criadas subpastas `config/environments` e `config/security` com READMEs
- assets/
  - Criada pasta `assets` com subpastas `images`, `logs`, `temp` (marcadores `.keep`)
- pytest.ini
  - Ajustado para incluir `pythonpath = .` para resolver imports pós-reorganização

## Atualizações de Imports/Compatibilidade
- Wrappers de compatibilidade:
  - `dashboard.py` importa `src.monitoring.dashboard`
  - `run_trading.py` importa `src.core.run_trading`
  - `dark_theme.py` importa `src.monitoring.dark_theme`
- Scripts de deploy em `scripts/deployment` encaminham para originais em `scripts/`

## Verificação de Integridade
- Dashboard: processos ativos em `http://localhost:8501`, `http://localhost:8502`, `http://localhost:8503` continuam acessíveis (wrapper mantém caminho original).
- Testes: `pytest.ini` ajustado; recomenda-se executar `pytest -q` após definir `PYTHONPATH` se necessário.

## Itens Não Movidos (por compatibilidade)
- Pacote `smc_sentinel/` permanece intacto (clients, infra, config, monitoring, trading) — mudança futura deverá introduzir shims que importem de `src/*` para eliminar duplicação.

## Padrões de Nomenclatura
- Pastas: minúsculas e descritivas (core, monitoring, detection, alerting, config, utils)
- Arquivos: snake_case e nomes autoexplicativos
- Documentação: organizada em `api`, `deployment`, `architecture` com READMEs

## Próximos Passos
- Migrar gradualmente módulos de `smc_sentinel/infra` para `src/utils` com shims em `smc_sentinel/infra/*` mapeando para novos locais
- Migrar `smc_sentinel/clients` para `src/core/clients` com shims
- Atualizar testes para refletir novos caminhos quando os shims forem introduzidos
- Expandir `docs/architecture/STRUCTURE_DIAGRAM.md` com ligações entre módulos
