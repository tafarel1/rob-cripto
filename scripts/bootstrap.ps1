[CmdletBinding()]
param(
    [string]$PythonPath = "",
    [string]$Env = ".env",
    [ValidateSet("", "console", "jsonl")]
    [string]$Sink = "",
    [string]$JsonlPath = "",
    [double]$StatsInterval = -1,
    [switch]$EnableRotation,
    [switch]$Run,
    [switch]$RunTests
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

function Set-EnvVar {
    param([string]$File, [string]$Key, [string]$Value)
    $lines = @()
    if (Test-Path $File) { $lines = Get-Content -Path $File -Encoding UTF8 -ErrorAction SilentlyContinue }
    $updated = $false
    $out = @()
    foreach ($ln in $lines) {
        if ($ln -match "^\s*$([regex]::Escape($Key))\s*=") {
            $out += "$Key=$Value"
            $updated = $true
        } else {
            $out += $ln
        }
    }
    if (-not $updated) { $out += "$Key=$Value" }
    if ($out.Count -eq 0) { $out = @("$Key=$Value") }
    $out | Set-Content -Path $File -Encoding UTF8
}

try {
    $ScriptDir = $PSScriptRoot
    $ProjectRoot = Split-Path -Parent $ScriptDir
    Set-Location $ProjectRoot

    Write-Host "[bootstrap] Projeto: $ProjectRoot"

    $python = Resolve-Python -Preferred $PythonPath
    Write-Host "[bootstrap] Python: $python"

    $venvDir = Join-Path $ProjectRoot ".venv"
    $venvPy = Join-Path $venvDir "Scripts/python.exe"

    if (-not (Test-Path $venvPy)) {
        Write-Host "[bootstrap] Criando venv em $venvDir"
        & $python -m venv $venvDir
    } else {
        Write-Host "[bootstrap] venv existente em $venvDir"
    }

    Write-Host "[bootstrap] Atualizando pip"
    & $venvPy -m pip install -U pip

    $req = Join-Path $ProjectRoot "requirements.txt"
    if (Test-Path $req) {
        Write-Host "[bootstrap] Instalando dependências"
        & $venvPy -m pip install -r $req
    } else {
        throw "requirements.txt não encontrado em $ProjectRoot"
    }

    $envFile = Join-Path $ProjectRoot $Env
    $envExample = Join-Path $ProjectRoot ".env.example"
    if (-not (Test-Path $envFile)) {
        if (Test-Path $envExample) {
            Write-Host "[bootstrap] Criando $Env a partir de .env.example"
            Copy-Item $envExample $envFile
        } else {
            Write-Host "[bootstrap] Criando .env vazio"
            Set-Content -Path $envFile -Value "" -Encoding UTF8
        }
    }

    # Aplicar parâmetros em .env
    if ($Sink -ne "") {
        Set-EnvVar -File $envFile -Key "SMC_SINK" -Value $Sink
        if ($Sink -eq "jsonl") {
            if ($EnableRotation.IsPresent -and [string]::IsNullOrWhiteSpace($JsonlPath)) {
                $JsonlPath = "data/events-{date}.jsonl"
            }
            if ([string]::IsNullOrWhiteSpace($JsonlPath)) {
                $JsonlPath = "data/events.jsonl"
            }
            Set-EnvVar -File $envFile -Key "SMC_JSONL_PATH" -Value $JsonlPath
        }
    }

    if ($EnableRotation.IsPresent) {
        Set-EnvVar -File $envFile -Key "SMC_JSONL_ROTATE_DAILY" -Value "true"
    }

    if ($StatsInterval -gt 0) {
        Set-EnvVar -File $envFile -Key "SMC_STATS_INTERVAL" -Value ([string]$StatsInterval)
    }

    if ($RunTests.IsPresent) {
        Write-Host "[bootstrap] Executando testes"
        & $venvPy -m pytest -q
    }

    if ($Run.IsPresent) {
        Write-Host "[bootstrap] Iniciando coletor"
        & $venvPy -m smc_sentinel.run_collector
    } else {
        Write-Host "[bootstrap] Finalizado. Use -Run para iniciar o coletor."
        Write-Host "Ex: powershell -ExecutionPolicy Bypass -File scripts\\bootstrap.ps1 -Sink jsonl -EnableRotation -Run"
    }
}
catch {
    Write-Error $_
    exit 1
}