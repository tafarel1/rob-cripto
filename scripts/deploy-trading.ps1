param(
    [string]$Environment = "paper",
    [switch]$InstallService,
    [switch]$EnableTrading,
    [string]$RiskProfile = "conservative"
)

# Reutilizar lógica existente
. "$PSScriptRoot\deploy-runner.ps1" -Environment $Environment

if ($EnableTrading) {
    Write-Host "🎯 ATIVANDO MÓDULO DE TRADING SMC..." -ForegroundColor Yellow
    Write-Host "📊 Perfil de Risco: $RiskProfile" -ForegroundColor Cyan

    # Configurar ambiente de trading (variáveis apenas para esta sessão)
    $env:TRADING_ENABLED = "true"
    $env:RISK_PROFILE = $RiskProfile

    # Verificar credenciais de exchange
    . "$PSScriptRoot\validate-exchange-credentials.ps1"
}

if ($InstallService) {
    Write-Host "🛠 Instalando serviço de trading (NSSM)..." -ForegroundColor Green
    $serviceName = "SMC_Sentinel_Trading"
    $appDir = (Resolve-Path "$PSScriptRoot\..\").Path
    $pythonExe = (Get-Command python).Source
    $scriptPath = Join-Path $appDir "run_trading.py"

    if (-Not (Test-Path $scriptPath)) {
        Write-Host "⚠ Script de trading não encontrado em: $scriptPath" -ForegroundColor Red
    }

    # Registrar serviço via NSSM se disponível
    $nssm = Get-Command nssm -ErrorAction SilentlyContinue
    if ($null -eq $nssm) {
        Write-Host "⚠ NSSM não encontrado. Pule a instalação do serviço ou instale o NSSM." -ForegroundColor Red
    } else {
        nssm install $serviceName $pythonExe $scriptPath
        nssm set $serviceName AppDirectory $appDir
        nssm set $serviceName DisplayName "SMC Sentinel Trading"
        nssm set $serviceName Description "Serviço de execução de trading do SMC Sentinel"
        nssm set $serviceName Start SERVICE_AUTO_START
        Write-Host "✅ Serviço instalado: $serviceName" -ForegroundColor Green
    }
}