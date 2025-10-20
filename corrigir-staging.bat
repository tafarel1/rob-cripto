@echo off
setlocal EnableExtensions EnableDelayedExpansion

:: Corrigir Staging - Rob Cripto
:: Este script tenta resolver falhas no "git add -A" (staging)
:: Mensagens ASCII para compatibilidade total em Windows.

title Corrigir Staging - Rob Cripto
cd /d "%~dp0"

set "LOG_ERR=%TEMP%\_staging_fix_err.txt"
set "LOG_OUT=%TEMP%\_staging_fix_out.txt"
if exist "%LOG_ERR%" del /f /q "%LOG_ERR%" >nul 2>&1
if exist "%LOG_OUT%" del /f /q "%LOG_OUT%" >nul 2>&1

set "FINAL="

echo ===============================================================
echo [INFO] Iniciando correcao do staging do Git...
echo [INFO] Pasta atual: %CD%
echo ===============================================================

:: Checagem: Git instalado
where git >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Git nao encontrado no PATH.
  echo [CORRECAO] Instale o Git: https://git-scm.com/download/win
  set "FINAL=FALHA"
  goto END
)

:: Checagem: Dentro de um repositorio Git
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Este diretorio nao e um repositorio Git.
  echo [CORRECAO] Execute este script dentro da pasta do repositorio.
  set "FINAL=FALHA"
  goto END
)

:: Checagem: privilegios de administrador (melhor para icacls)
fltmc >nul 2>&1
if errorlevel 1 (
  echo [ATENCAO] Execucao sem privilegios de administrador.
  echo [ATENCAO] Algumas correcoes de permissoes podem falhar.
  echo [DICA] Clique direito e escolha "Executar como Administrador" se precisar.
) else (
  echo [INFO] Priviliegios de administrador detectados.
)

echo ---------------------------------------------------------------
echo [ETAPA 1] Resetar permissoes (icacls . /reset /t /c)
icacls . /reset /t /c >>"%LOG_OUT%" 2>>"%LOG_ERR%"
if errorlevel 1 (
  echo [ERRO] Falha ao resetar permissoes.
) else (
  echo [OK] Permissoes resetadas.
)

echo [ETAPA 2] Conceder permissoes completas ao usuario atual
echo           (icacls . /grant:r "%USERNAME%":(F) /t /c)
icacls . /grant:r "%USERNAME%":(F) /t /c >>"%LOG_OUT%" 2>>"%LOG_ERR%"
if errorlevel 1 (
  echo [ERRO] Falha ao conceder permissoes.
) else (
  echo [OK] Permissoes concedidas para %USERNAME%.
)

echo [ETAPA 3] Remover atributos de arquivos (Read-only/Hidden/System)
attrib -R -H -S /S /D 2>nul
if errorlevel 1 (
  echo [ERRO] Falha ao remover atributos.
) else (
  echo [OK] Atributos removidos.
)

echo [ETAPA 4] Resetar estado do Git (git reset)
git reset >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Falha em git reset.
) else (
  echo [OK] Git reset concluido.
)

echo [ETAPA 5] Limpar cache do index do Git (git rm -r --cached .)
git rm -r --cached . >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Falha ao limpar cache do Git.
  echo [DICA] Se houver arquivo reservado, pode causar erros.
) else (
  echo [OK] Cache do Git limpo.
)

echo [ETAPA 6] Remover arquivo NUL (se existir)
del /f /q "NUL" 2>nul
:: Observacao: NUL e dispositivo reservado do Windows. Se persistir no index:
:: use: git rm -f --cached --ignore-unmatch NUL
if exist "NUL" (
  echo [ATENCAO] Nao foi possivel remover NUL ou nao existe fisicamente.
  echo [DICA] Para remover do index: git rm -f --cached --ignore-unmatch NUL
) else (
  echo [OK] Verificacao de NUL concluida.
)

echo [ETAPA 7] Recriar staging com git add -A
git add -A >nul 2>&1
set "RC=%ERRORLEVEL%"
if not "%RC%"=="0" goto STAGING_FAIL
goto STAGING_OK

:STAGING_FAIL
echo [ERRO] Falha ao preparar staging (git add -A).
echo [CORRECAO] Siga estes passos:
echo    1^) Feche programas que bloqueiam arquivos ^(IDE, antivirus^).
echo    2^) Execute este script como Administrador.
echo    3^) Remova do index entradas problematicas: git rm -f --cached NUL
echo    4^) Tente novamente: git add -A
echo [INFO] Verificando se 'NUL' esta no index...
git ls-files --error-unmatch NUL >nul 2>&1
set "RCNU=%ERRORLEVEL%"
if "%RCNU%"=="0" goto REMOVE_NUL
set "FINAL=FALHA"
goto AFTER_STAGING

:REMOVE_NUL
echo [INFO] Removendo NUL do index automaticamente...
git rm -f --cached --ignore-unmatch NUL >nul 2>&1
git add -A >nul 2>&1
set "RC2=%ERRORLEVEL%"
if "%RC2%"=="0" set "FINAL=SUCESSO"
goto AFTER_STAGING

:STAGING_OK
echo [OK] Staging recriado com sucesso.
set "FINAL=SUCESSO"

:AFTER_STAGING

echo ---------------------------------------------------------------
echo [RESULTADO] %FINAL%
if /I "%FINAL%"=="SUCESSO" goto RESULT_OK
goto RESULT_FAIL

:RESULT_OK
echo [PROXIMO] Execute seu deploy: deploy-auto.bat ou .\deploy.ps1
echo [DICA] Verifique: git status
echo [DICA] Opcional: git commit -m "fix staging" e git push
goto AFTER_RESULT

:RESULT_FAIL
echo [DICA] Consulte o log de erros do icacls: %LOG_ERR%
echo [DICA] Verifique nomes reservados: NUL, CON, PRN, AUX.
echo [DICA] Para remover do index: git rm -f --cached --ignore-unmatch NUL
echo [DICA] Como ultimo recurso:
echo        1) Mova arquivos para pasta nova
echo        2) git init
echo        3) git remote add origin URL_AQUI
echo        4) git add -A && git commit -m "novo repo" && git push

:AFTER_RESULT
echo.
pause

endlocal
exit /b 0