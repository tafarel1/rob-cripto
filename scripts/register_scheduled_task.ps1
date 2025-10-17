[CmdletBinding()]
param(
    [string]$TaskName = "SMCSentinel",
    [string]$Description = "SMC Sentinel Collector (Scheduled Task)",
    [switch]$Bootstrap,
    [switch]$Update,
    [switch]$DoNotStart,
    [string]$PythonPath = "",
    [string]$EnvFile = ".env",
    [string]$StdoutLog = "logs/task.out.log",
    [string]$StderrLog = "logs/task.err.log",
    [bool]$TriggerAtStartup = $true,
    [bool]$TriggerAtLogon = $false,
    [string]$User = "", # Se vazio, executa como SYSTEM
    [System.Security.SecureString]$Password
)

$ErrorActionPreference = 'Stop'

function Resolve-Python {
    param([string]$Preferred)
    if ($Preferred -and (Test-Path $Preferred)) { return $Preferred }
    $cmd = (Get-Command python -ErrorAction SilentlyContinue)
    if ($cmd) { return $cmd.Source }
    $cmd = (Get-Command python3 -ErrorAction SilentlyContinue)
    if ($cmd) { return $cmd.Source }
    throw "Python não encontrado no PATH. Instale Python 3.11+ e garanta que 'python' está acessível."
}

try {
    $ScriptDir = $PSScriptRoot
    $ProjectRoot = Split-Path -Parent $ScriptDir
    Set-Location $ProjectRoot

    if ($Bootstrap.IsPresent) {
        $bootstrap = Join-Path $ScriptDir "bootstrap.ps1"
        if (Test-Path $bootstrap) {
            Write-Host "[task] Executando bootstrap"
            & powershell -ExecutionPolicy Bypass -File $bootstrap | Write-Host
        } else {
            Write-Warning "bootstrap.ps1 não encontrado; prosseguindo sem bootstrap."
        }
    }

    # Garantir venv e python
    $venvPath = Join-Path $ProjectRoot ".venv"
    $venvPy = Join-Path $venvPath "Scripts/python.exe"
    if (-not (Test-Path $venvPy)) {
        Write-Host "[task] venv não encontrado; criando..."
        $python = Resolve-Python -Preferred $PythonPath
        & $python -m venv $venvPath
        & $venvPy -m pip install -U pip
        & $venvPy -m pip install -r (Join-Path $ProjectRoot "requirements.txt")
    }

    # Garantir .env
    $envFilePath = Join-Path $ProjectRoot $EnvFile
    if (-not (Test-Path $envFilePath)) {
        $example = Join-Path $ProjectRoot ".env.example"
        if (Test-Path $example) {
            Copy-Item $example $envFilePath
        } else {
            Set-Content -Path $envFilePath -Value "" -Encoding UTF8
        }
    }

    # Logs
    $logsDir = Join-Path $ProjectRoot "logs"
    if (-not (Test-Path $logsDir)) { New-Item -ItemType Directory -Path $logsDir | Out-Null }
    $stdoutFull = Join-Path $ProjectRoot $StdoutLog
    $stderrFull = Join-Path $ProjectRoot $StderrLog
    foreach ($p in @($stdoutFull,$stderrFull)) {
        $dir = Split-Path -Parent $p
        if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
    }

    # Ação: usar cmd.exe para redirecionar stdout/stderr para arquivos
    $cmd = "cmd.exe"
    $inner = '"' + $venvPy + '" -m smc_sentinel.run_collector >> ' + '"' + $stdoutFull + '"' + ' 2>> ' + '"' + $stderrFull + '"'
    $args = "/c " + '"' + $inner + '"'

    $action = New-ScheduledTaskAction -Execute $cmd -Argument $args -WorkingDirectory $ProjectRoot

    # Triggers
    $triggers = @()
    if ($TriggerAtStartup) { $triggers += (New-ScheduledTaskTrigger -AtStartup) }
    if ($TriggerAtLogon) { $triggers += (New-ScheduledTaskTrigger -AtLogOn) }
    if ($triggers.Count -eq 0) { $triggers += (New-ScheduledTaskTrigger -AtStartup) }

    # Principal
    if ($User) {
        if ($Password) {
            $principal = New-ScheduledTaskPrincipal -UserId $User -LogonType Password -RunLevel Highest
        } else {
            # Sem senha, execução confiável nem sempre é possível em background; preferir SYSTEM
            Write-Warning "[task] Usuário informado sem senha. Usando SYSTEM por segurança."
            $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
        }
    } else {
        $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
    }

    # Settings (reinício automático e tolerante a energia)
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

    # Registrar/atualizar
    Write-Host "[task] Registrando tarefa '$TaskName'"
    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $triggers -Description $Description -Principal $principal -Settings $settings -Force | Out-Null

    if (-not $DoNotStart) {
        Write-Host "[task] Iniciando tarefa '$TaskName'"
        Start-ScheduledTask -TaskName $TaskName | Out-Null
    }

    Write-Host "[task] OK. Logs: $stdoutFull ; $stderrFull"
}
catch {
    Write-Error $_
    exit 1
}