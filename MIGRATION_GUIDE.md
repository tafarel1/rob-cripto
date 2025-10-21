# smc_sentinel — Guia de Migração para V:\\development\smc_sentinel

Este guia documenta a migração completa do projeto do diretório de origem para o destino V:\\development. O objetivo é preservar estrutura, configurações, Git, ambiente Python e automações.

## Resumo
- Origem: `V:\\development\\smc_sentinel`
- Destino: `V:\\development\\smc_sentinel`
- Tempo estimado: < 30 minutos
- Critérios de sucesso: funcionalidade intacta, Git e deploy funcionando

## Fases

### 1) Preparação
- Garanta acesso ao drive `V:` e permissões.
- Feche IDEs/antivírus que bloqueiem arquivos.
- Opcional: crie backup do estado atual.

### 2) Migração de arquivos
- Copia robusta: `robocopy V:\\development\\smc_sentinel V:\\development\\smc_sentinel /E /COPY:DAT /R:2 /W:2`
- Exclusões: `.venv`, `__pycache__`, `.pytest_cache`.

### 3) Atualização de paths
- Execute `path_updater.py` para substituir referências absolutas:
  - de `V:\\development\\smc_sentinel`
  - para `V:\\development\\smc_sentinel`

### 4) Recriação do ambiente
- Crie `.venv`: `python -m venv V:\\development\\smc_sentinel\\.venv`
- Instale deps: `V:\\development\\smc_sentinel\\.venv\\Scripts\\python.exe -m pip install -r requirements.txt`

### 5) Validação
- Rode `validation_checklist.bat` no destino.
- Verifique `streamlit --version` e `import smc_sentinel` no venv.
- Opcional: `streamlit run dashboard.py` para validar UI.

## Scripts de apoio
- `migrate_to_v_drive.ps1` — automatiza cópia, atualização de paths, venv e validação.
- `path_updater.py` — substitui paths absolutos.
- `validation_checklist.bat` — valida pós-migração.
- `rollback_plan.bat` — reverte em caso de falhas.

## Observações
- Git: todo o histórico é preservado ao copiar `.git`.
- Serviços (NSSM/Task): reconfigure executando os scripts em `scripts/` apontando para o novo diretório.
- `.env`: ajuste se houver caminhos específicos em variáveis como `SMC_JSONL_PATH`.

## Próximos passos
- Atualizar tarefas agendadas/serviço para apontar `V:\\development\\smc_sentinel`.
- Executar deploys a partir do novo local.