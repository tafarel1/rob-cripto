# Checklist Pós-Migração — smc_sentinel

- Diretório existe: `V:\\development\\smc_sentinel`
- `.git` presente e íntegro (git status roda)
- `.venv` recriado e funcional
  - `python.exe -m pip install -r requirements.txt` OK
- Streamlit disponível
  - `python.exe -m streamlit --version` OK
- Import básico
  - `python.exe -c "import smc_sentinel"` OK
- Dashboard inicia
  - `python.exe -m streamlit run dashboard.py` abre sem erros
- Scripts de deploy funcionam no novo local
  - `deploy.ps1` roda e classifica corretamente
  - `deploy-auto.bat` create commit/push
- Serviços/Tarefas (se usados)
  - Reconfigurados com `scripts/register_service_nssm.ps1` ou `register_scheduled_task.ps1`
- Variáveis `.env` revisadas (paths como `SMC_JSONL_PATH`)
- Logs e dados acessíveis em `data/` e `logs/`
- Rollback disponível (`rollback_plan.bat`)