@echo off
setlocal EnableExtensions

:: Plano de rollback - restaura projeto ao local original
set SRC=C:\Users\tafarel.brito\smc_sentinel
set DEST=V:\development\smc_sentinel
set BACKUP=V:\development\smc_sentinel_backup_for_rollback

if "%~1"=="/help" (
  echo Uso: rollback_plan.bat [copy-back]
  echo   copy-back  - copia do destino de volta para a origem
  exit /b 0
)

if /I "%~1"=="copy-back" (
  echo [INFO] Copiando do destino de volta para a origem...
  powershell -NoProfile -Command "robocopy '%DEST%' '%SRC%' /E /COPY:DAT /R:2 /W:2 /XD '.venv' '__pycache__' '.pytest_cache'" || (
    echo [ERRO] Falha ao copiar.
    exit /b 1
  )
  echo [OK] Copia concluida.
  exit /b 0
)

:: Backup de segurança do destino (se precisar congelar estado)
if not exist "%BACKUP%" (
  echo [INFO] Criando backup do destino: %BACKUP%
  powershell -NoProfile -Command "New-Item -Path '%BACKUP%' -ItemType Directory -Force | Out-Null; robocopy '%DEST%' '%BACKUP%' /E /COPY:DAT /R:2 /W:2" >nul
  echo [OK] Backup concluido.
) else (
  echo [ATENCAO] Backup ja existe: %BACKUP%
)

echo [DICA] Para reverter rapidamente use: rollback_plan.bat copy-back
endlocal
exit /b 0