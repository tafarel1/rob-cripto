@echo off
setlocal EnableExtensions

set DEST=V:\development\smc_sentinel
set VENV_PY=%DEST%\.venv\Scripts\python.exe

echo ===============================================================
echo [VALIDACAO] Pos-migracao do smc_sentinel
if not exist "%DEST%" (
  echo [ERRO] Destino nao existe: %DEST%
  exit /b 1
)

pushd "%DEST%"
where git >nul 2>&1 && (
  echo [INFO] Git encontrado. Status resumido:
  git status --porcelain
) || (
  echo [ATENCAO] Git nao encontrado no PATH.
)

if exist "%VENV_PY%" (
  echo [INFO] Verificando Streamlit...
  "%VENV_PY%" -m streamlit --version
  echo [INFO] Verificando import do pacote...
  "%VENV_PY%" -c "import smc_sentinel; print('import smc_sentinel OK')" || (
    echo [ERRO] Falha ao importar smc_sentinel no venv
    set ERR=1
  )
) else (
  echo [ERRO] Ambiente virtual nao encontrado: %VENV_PY%
  set ERR=1
)

if not defined ERR (
  echo [OK] Validacao basica concluida com sucesso.
  set EXITCODE=0
) else (
  echo [ERRO] Validacao falhou.
  set EXITCODE=1
)

popd
endlocal
exit /b %EXITCODE%