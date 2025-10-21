[CmdletBinding()]param(
  [string]$Source = 'V:\\development\\smc_sentinel',
  [string]$Destination = 'V:\\development\\smc_sentinel',
  [switch]$CreateBackup,
  [string]$PythonPath = ''
)

$ErrorActionPreference = 'Stop'
$log = Join-Path $Destination 'migration_log.txt'

function Write-Log($msg) { $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'; "$ts $msg" | Tee-Object -FilePath $log -Append }
function Info($m){ Write-Host "[INFO] $m" -ForegroundColor Cyan; Write-Log "[INFO] $m" }
function Ok($m){ Write-Host "[OK] $m" -ForegroundColor Green; Write-Log "[OK] $m" }
function Warn($m){ Write-Host "[WARN] $m" -ForegroundColor Yellow; Write-Log "[WARN] $m" }
function Err($m){ Write-Host "[ERRO] $m" -ForegroundColor Red; Write-Log "[ERRO] $m" }

try {
  if (-not (Test-Path $Destination)) { New-Item -Path $Destination -ItemType Directory -Force | Out-Null }
  Info "Destino garantido: $Destination"

  if ($CreateBackup.IsPresent) {
    $stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
    $backup = "V:\\development\\smc_sentinel_backup_$stamp"
    New-Item -Path $backup -ItemType Directory -Force | Out-Null
    Info "Criando backup em: $backup"
    robocopy $Source $backup /E /COPY:DAT /R:2 /W:2 /XD '.venv' '__pycache__' '.pytest_cache' | Out-Null
    Ok "Backup concluido"
  }

  Info "Copiando projeto para destino"
  robocopy $Source $Destination /E /COPY:DAT /R:2 /W:2 /XD '.venv' '__pycache__' '.pytest_cache' | Out-Null
  Ok "Copia concluida"

  # Atualizar paths absolutos
  $pu = Join-Path $Destination 'path_updater.py'
  if (Test-Path $pu) {
    Info "Executando path_updater.py"
    $py = $PythonPath
    if (-not $py) { $cmd = Get-Command python -ErrorAction SilentlyContinue; if ($cmd) { $py = $cmd.Source } }
    if (-not $py) { Warn "Python não encontrado; pulando atualização de paths" }
    else { & $py $pu $Destination | Write-Host }
  } else { Warn "path_updater.py não encontrado no destino" }

  # Ambiente virtual
  $cmdPy = Get-Command python -ErrorAction SilentlyContinue
  if ($PythonPath) { $cmdPy = @{ Source = $PythonPath } }
  if (-not $cmdPy) { Err "Python não encontrado. Instale Python 3.11+ e tente novamente."; exit 1 }
  $pySrc = $cmdPy.Source
  Info "Criando venv com: $pySrc"
  & $pySrc -m venv (Join-Path $Destination '.venv')
  $venvPy = Join-Path (Join-Path $Destination '.venv\\Scripts') 'python.exe'
  & $venvPy -m pip install --upgrade pip | Write-Host
  & $venvPy -m pip install -r (Join-Path $Destination 'requirements.txt') | Write-Host
  Ok "Ambiente virtual pronto"

  # Validações rápidas
  Push-Location $Destination
  $git = Get-Command git -ErrorAction SilentlyContinue
  if ($git) { git status --porcelain | Write-Host; Ok "Git ok no destino" } else { Warn "Git não encontrado para validação" }
  & $venvPy -m streamlit --version | Write-Host
  & $venvPy -c "import smc_sentinel, sys; print('import smc_sentinel OK')" | Write-Host
  Pop-Location
  Ok "Migração concluída com sucesso"
}
catch {
  Err $_.Exception.Message
  exit 1
}