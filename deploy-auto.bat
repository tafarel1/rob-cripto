@echo off
setlocal EnableExtensions EnableDelayedExpansion

rem ===== Interface =====
title Deploy Automatico - Rob Cripto
cd /d "%~dp0"

set REPO_URL=https://github.com/tafarel1/rob-cripto.git
set BRANCH=main
set GIT_DOWNLOAD=https://git-scm.com/download/win
set OUT=%TEMP%\deploy_out.txt
set ERR=%TEMP%\deploy_err.txt
set CLASS=

rem ===== Deteccao de pagina de codigo =====
for /f "tokens=2 delims=:" %%C in ('chcp') do set OLDCP=%%C
set OLDCP=%OLDCP: =%
set CP_CHANGED=
if not "%OLDCP%"=="1252" (
  chcp 1252 >nul
  set CP_CHANGED=1
)
call :sep
call :echoInfo "[INFO] Iniciando deploy automatico..."
call :echoInfo "[INFO] Codigo de pagina atual: %OLDCP% (temporariamente 1252)"
call :sep

rem ===== Pre-checagens =====
rem Git instalado?
git --version >nul 2>&1
if errorlevel 1 (
  call :echoError "[ERRO] Git nao esta instalado ou nao esta no PATH."
  call :echoFix "[CORRECAO] Baixe e instale o Git: %GIT_DOWNLOAD%"
  set CLASS=CRITICAL_ERROR
  goto :finalBlock
)

rem E repositorio Git?
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  call :echoError "[ERRO] Este diretorio nao e um repositorio Git."
  call :echoFix "[CORRECAO] Como corrigir:"
  call :echoFix "[CORRECAO] 1) git init"
  call :echoFix "[CORRECAO] 2) git remote add origin %REPO_URL%"
  call :echoFix "[CORRECAO] 3) git branch -M %BRANCH%"
  set CLASS=CRITICAL_ERROR
  goto :finalBlock
)

rem ===== Identidade Git =====
for /f "usebackq tokens=* delims=" %%x in (`git config --get user.name 2^>nul`) do set GIT_UN=%%x
for /f "usebackq tokens=* delims=" %%x in (`git config --get user.email 2^>nul`) do set GIT_UE=%%x
if not defined GIT_UN for /f "usebackq tokens=* delims=" %%x in (`git config --global --get user.name 2^>nul`) do set GIT_UN=%%x
if not defined GIT_UE for /f "usebackq tokens=* delims=" %%x in (`git config --global --get user.email 2^>nul`) do set GIT_UE=%%x
if not defined GIT_UN (
  call :echoError "[ERRO] Identidade Git (user.name) nao configurada."
  call :echoFix "[CORRECAO] git config --global user.name \"Seu Nome\""
)
if not defined GIT_UE (
  call :echoError "[ERRO] Identidade Git (user.email) nao configurada."
  call :echoFix "[CORRECAO] git config --global user.email \"seu@email\""
)
if not defined GIT_UN if not defined GIT_UE (
  set CLASS=FIXABLE_FAILURE
  goto :finalBlock
)
rem ===== CRLF =====
for /f "usebackq tokens=* delims=" %%x in (`git config --get core.autocrlf 2^>nul`) do set CORE_AUTOCRLF=%%x
if not defined CORE_AUTOCRLF (
  call :echoWarn "[ATENCAO] Git core.autocrlf nao configurado."
  call :echoFix "[CORRECAO] Windows recomendado: git config --global core.autocrlf true"
  call :echoFix "[CORRECAO] Linux/macOS recomendado: git config --global core.autocrlf input"
) else (
  call :echoInfo "[INFO] core.autocrlf: !CORE_AUTOCRLF!"
)
rem ===== Remoto e branch =====
for /f "usebackq tokens=*" %%r in (`git remote get-url origin 2^>nul`) do set ORIGIN_URL=%%r
if not defined ORIGIN_URL (
  git remote add origin %REPO_URL%
  call :echoInfo "[INFO] Remoto origin configurado para %REPO_URL%"
) else (
  set REPO_URL=%ORIGIN_URL%
)

for /f "usebackq tokens=*" %%b in (`git rev-parse --abbrev-ref HEAD`) do set CUR=%%b
if /I not "%CUR%"=="%BRANCH%" (
  git show-ref --verify --quiet refs/heads/%BRANCH%
  if errorlevel 1 (
    git branch -M %BRANCH%
    call :echoInfo "[INFO] Branch principal ajustado para %BRANCH%"
  ) else (
    git checkout %BRANCH%
  )
)

git rev-parse --abbrev-ref --symbolic-full-name @{u} >nul 2>&1
if errorlevel 1 git branch --set-upstream-to=origin/%BRANCH% %BRANCH% >nul 2>&1

rem ===== Staging e commit =====
git add -A
if errorlevel 1 (
  call :echoWarn "[ATENCAO] Falha em git add -A. Verificando 'NUL' no index..."
  git ls-files --error-unmatch NUL >nul 2>&1
  if not errorlevel 1 (
    call :echoInfo "[INFO] Removendo 'NUL' do index automaticamente..."
    git rm -f --cached --ignore-unmatch NUL >nul 2>&1
    git add -A
    if not errorlevel 1 (
      call :echoOk "[OK] Staging recriado apos remover 'NUL'."
    ) else (
      call :echoError "[ERRO] Staging ainda falhou apos remover 'NUL'."
      call :echoFix "[CORRECAO] Feche programas que bloqueiam arquivos e rode como Administrador."
      set CLASS=FIXABLE_FAILURE
      goto :finalBlock
    )
  ) else (
    call :echoError "[ERRO] Falha ao preparar staging."
    call :echoFix "[CORRECAO] Verifique permissoes de arquivos e tente novamente."
    set CLASS=FIXABLE_FAILURE
    goto :finalBlock
  )
)

set HAS=0
for /f "usebackq tokens=* delims=" %%s in (`git diff --cached --name-only`) do set HAS=1

if "%HAS%"=="0" (
  call :echoWarn "[ATENCAO] Nenhuma alteracao detectada."
  set CLASS=NO_CHANGES
) else (
  for /f "usebackq tokens=* delims=" %%t in (`powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd HH:mm:ss'"`) do set STAMP=%%t
  git commit -m "Deploy automatico: !STAMP!" 1>"%OUT%" 2>"%ERR%"
  if errorlevel 1 (
    findstr /I /C:"Please tell me who you are" "%ERR%" >nul && (
      call :echoError "[ERRO] Identidade Git nao configurada."
      call :echoFix "[CORRECAO] Como corrigir:"
      call :echoFix "[CORRECAO] git config --global user.name \"Seu Nome\""
      call :echoFix "[CORRECAO] git config --global user.email \"seu@email\""
      set CLASS=FIXABLE_FAILURE
    ) || (
      call :echoError "[ERRO] Falha ao criar commit."
      set CLASS=FIXABLE_FAILURE
    )
  ) else (
    call :echoOk "[OK] Commit criado com sucesso."
  )
)

rem ===== Push e tratamento =====
git push 1>"%OUT%" 2>"%ERR%"
if errorlevel 1 (
  call :echoWarn "[ATENCAO] Push falhou. Tentando sincronizar (pull --rebase)..."
  git pull --rebase 1>"%OUT%" 2>"%ERR%"
  if errorlevel 1 (
    findstr /I "CONFLICT" "%OUT%" "%ERR%" >nul && (
      call :echoError "[ERRO] Conflitos detectados durante rebase."
      call :echoFix "[CORRECAO] Passo a passo para resolver:"
      call :echoFix "[CORRECAO] 1) git status"
      call :echoFix "[CORRECAO] 2) Edite arquivos marcados como CONFLICT"
      call :echoFix "[CORRECAO] 3) git add <arquivos resolvidos>"
      call :echoFix "[CORRECAO] 4) git rebase --continue"
      call :echoFix "[CORRECAO] Se necessario: git rebase --abort"
      set CLASS=FIXABLE_FAILURE
      goto :finalBlock
    )
  )
  git push 1>"%OUT%" 2>"%ERR%"
  if errorlevel 1 (
    findstr /I /C:"Authentication failed" /C:"Permission denied" "%ERR%" >nul && (
      call :echoError "[ERRO] Falha de autenticacao com GitHub."
      call :echoFix "[CORRECAO] Verifique e corrija:"
      call :echoFix "[CORRECAO] 1) Remoto HTTPS: git remote set-url origin %REPO_URL%"
      call :echoFix "[CORRECAO] 2) Credential Manager: git config --global credential.helper manager-core"
      call :echoFix "[CORRECAO] 3) Faca push para abrir login no navegador"
      set CLASS=FIXABLE_FAILURE
      goto :finalBlock
    )
    findstr /I /C:"Failed to connect" /C:"Could not resolve host" /C:"timed out" "%ERR%" >nul && (
      call :echoError "[ERRO] Problema de rede ao acessar GitHub."
      call :echoFix "[CORRECAO] Verifique conexao e proxy:"
      call :echoFix "[CORRECAO] ping github.com"
      call :echoFix "[CORRECAO] git config --global --get http.proxy"
      call :echoFix "[CORRECAO] Desativar proxy: git config --global --unset http.proxy"
      set CLASS=FIXABLE_FAILURE
      goto :finalBlock
    )
    findstr /I /C:"Repository not found" /C:"remote repository" "%ERR%" >nul && (
      call :echoError "[ERRO] Repositorio remoto nao encontrado ou sem permissao."
      call :echoFix "[CORRECAO] Confira URL e acesso: %REPO_URL%"
      set CLASS=CRITICAL_ERROR
      goto :finalBlock
    )
    call :echoError "[ERRO] Push ainda falhou. Verifique credenciais/permissoes."
    set CLASS=FIXABLE_FAILURE
    goto :finalBlock
  )
)

if not defined CLASS set CLASS=SUCCESS

:finalBlock
call :sep
if /I "%CLASS%"=="SUCCESS" (
  call :echoOk "[SUCESSO] DEPLOY CONCLUIDO COM SUCESSO!"
  call :echoInfo "[INFO] STATUS: Codigo sincronizado com o GitHub"
  call :echoInfo "[INFO] ACESSE: %REPO_URL%"
)
if /I "%CLASS%"=="NO_CHANGES" (
  call :echoWarn "[ATENCAO] SEM ALTERACOES - nada para commitar/push"
  call :echoFix "[CORRECAO] Edite arquivos e execute novamente para criar novo commit."
)
if /I "%CLASS%"=="FIXABLE_FAILURE" (
  call :echoWarn "[ERRO] FALHA COM CORRECAO - veja instrucoes acima"
  call :echoFix "[CORRECAO] Siga os passos indicados e rode novamente."
)
if /I "%CLASS%"=="CRITICAL_ERROR" (
  call :echoError "[ERRO] ERRO CRITICO - problemas de configuracao"
  call :echoFix "[CORRECAO] Resolva conforme instrucoes e tente novamente."
)
call :sep
if defined CP_CHANGED chcp %OLDCP% >nul
powershell -NoProfile -Command "Write-Host ' ' ; Write-Host '[Pressione Enter para continuar...]' -ForegroundColor White ; Read-Host" 
set "EXITCODE=0"
if /I "%CLASS%"=="SUCCESS" set "EXITCODE=0"
if /I "%CLASS%"=="NO_CHANGES" set "EXITCODE=0"
if /I "%CLASS%"=="FIXABLE_FAILURE" set "EXITCODE=1"
if /I "%CLASS%"=="CRITICAL_ERROR" set "EXITCODE=2"
exit /b %EXITCODE%

rem ===== Utilidades de UI =====
:sep
powershell -NoProfile -Command "Write-Host ('=' * 70) -ForegroundColor DarkGray"
exit /b

:echoInfo
powershell -NoProfile -Command "Write-Host '%~1' -ForegroundColor Cyan"
exit /b

:echoOk
powershell -NoProfile -Command "Write-Host '%~1' -ForegroundColor Green"
exit /b

:echoWarn
powershell -NoProfile -Command "Write-Host '%~1' -ForegroundColor Yellow"
exit /b

:echoError
powershell -NoProfile -Command "Write-Host '%~1' -ForegroundColor Red"
exit /b

:echoFix
powershell -NoProfile -Command "Write-Host '%~1' -ForegroundColor Magenta"
exit /b