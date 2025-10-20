# Uso: powershell -ExecutionPolicy Bypass -File scripts\run.ps1
# Inicia o coletor usando o venv local e .env no diretório do projeto.

$ErrorActionPreference = 'Stop'

try {
    $ScriptDir = $PSScriptRoot
    $ProjectRoot = Split-Path -Parent $ScriptDir
    Set-Location $ProjectRoot

    $venvPy = Join-Path $ProjectRoot ".venv/Scripts/python.exe"
    if (-not (Test-Path $venvPy)) {
        throw "Venv não encontrado em .venv. Execute scripts/\bootstrap.ps1 primeiro."
    }

    & $venvPy -m smc_sentinel.run_collector
}
catch {
    Write-Error $_
    exit 1
}