# Troubleshooting — Migração smc_sentinel

## Erros comuns

- Permissões negadas durante cópia
  - Feche IDEs/antivírus; execute PowerShell como Administrador
  - Use `icacls` para resetar permissões

- Venv não funciona
  - Recrie: `python -m venv .venv`
  - Atualize pip: `python -m pip install --upgrade pip`
  - Reinstale deps: `pip install -r requirements.txt`

- Git erros de identidade
  - `git config --global user.name "Seu Nome"`
  - `git config --global user.email "seu@email"`

- Push falha (auth/proxy)
  - Configure `credential.helper manager-core`
  - Verifique proxy: `git config --global --get http.proxy`

- Streamlit não inicia
  - Verifique versão: `streamlit --version`
  - Cheque `.streamlit/config.toml` válido
  - Rode `python -c "import streamlit; import smc_sentinel"`

- Serviços NSSM/Tarefa
  - Reinstale via `scripts/register_service_nssm.ps1` ou `register_scheduled_task.ps1`
  - Revise `StdoutLog`/`StderrLog` caminhos

## Ferramentas úteis
- `migrate_to_v_drive.ps1` — reexecuta migração automatizada
- `validation_checklist.bat` — validações rápidas
- `rollback_plan.bat` — reversão de estado