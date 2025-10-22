Write-Host "Validando credenciais de exchange..." -ForegroundColor Cyan

# Binance
$apiKey = $env:BINANCE_API_KEY
$secretKey = $env:BINANCE_SECRET_KEY
if (-not $secretKey -or [string]::IsNullOrWhiteSpace($secretKey)) { $secretKey = $env:BINANCE_API_SECRET }

if ([string]::IsNullOrWhiteSpace($apiKey) -or [string]::IsNullOrWhiteSpace($secretKey)) {
    Write-Host "Credenciais BINANCE_API_KEY e (BINANCE_SECRET_KEY ou BINANCE_API_SECRET) não configuradas." -ForegroundColor Yellow
    Write-Host "Configure no arquivo .env ou via variáveis de ambiente." -ForegroundColor Yellow
} else {
    Write-Host "Binance: credenciais encontradas." -ForegroundColor Green
}

# Kraken
$krakenKey = $env:KRAKEN_API_KEY
$krakenSecret = $env:KRAKEN_API_SECRET
$krSandboxFlag = $env:KRAKEN_USE_SANDBOX
$krBaseOverride = $env:KRAKEN_BASE_URL

if ([string]::IsNullOrWhiteSpace($krakenKey) -or [string]::IsNullOrWhiteSpace($krakenSecret)) {
    Write-Host "Credenciais KRAKEN_API_KEY e KRAKEN_API_SECRET não configuradas." -ForegroundColor Yellow
    Write-Host "Configure no arquivo .env ou via variáveis de ambiente." -ForegroundColor Yellow
} else {
    Write-Host "Kraken: credenciais encontradas." -ForegroundColor Green
}

# Ambiente selecionado para Kraken
$mode = "sandbox"
if ($krSandboxFlag) {
    $flag = $krSandboxFlag.ToLower()
    if ($flag -eq "false" -or $flag -eq "0" -or $flag -eq "no" -or $flag -eq "off") { $mode = "production" }
} else {
    $mode = "sandbox"
}
Write-Host ("Kraken modo: {0}" -f $mode) -ForegroundColor Cyan
if ($krBaseOverride) { Write-Host ("Kraken base override: {0}" -f $krBaseOverride) -ForegroundColor Cyan }

# Rate limits atuais (capacidade/fill_rate)
$rlGlobalCap = $env:KRAKEN_RL_GLOBAL_CAP
$rlGlobalFr  = $env:KRAKEN_RL_GLOBAL_FR
$rlMdCap     = $env:KRAKEN_RL_MD_CAP
$rlMdFr      = $env:KRAKEN_RL_MD_FR
$rlOrderCap  = $env:KRAKEN_RL_ORDER_CAP
$rlOrderFr   = $env:KRAKEN_RL_ORDER_FR
$rlStatCap   = $env:KRAKEN_RL_ORDER_STATUS_CAP
$rlStatFr    = $env:KRAKEN_RL_ORDER_STATUS_FR

Write-Host "Kraken rate limits:" -ForegroundColor Cyan
Write-Host ("  global: cap={0} fr={1}" -f $rlGlobalCap, $rlGlobalFr)
Write-Host ("  market_data: cap={0} fr={1}" -f $rlMdCap, $rlMdFr)
Write-Host ("  order: cap={0} fr={1}" -f $rlOrderCap, $rlOrderFr)
Write-Host ("  order_status: cap={0} fr={1}" -f $rlStatCap, $rlStatFr)