Write-Host "🔐 Validando credenciais de exchange..." -ForegroundColor Cyan

$apiKey = $env:BINANCE_API_KEY
$secretKey = $env:BINANCE_SECRET_KEY
if (-not $secretKey -or [string]::IsNullOrWhiteSpace($secretKey)) { $secretKey = $env:BINANCE_API_SECRET }

if ([string]::IsNullOrWhiteSpace($apiKey) -or [string]::IsNullOrWhiteSpace($secretKey)) {
    Write-Host "⚠ Credenciais BINANCE_API_KEY e (BINANCE_SECRET_KEY ou BINANCE_API_SECRET) não configuradas." -ForegroundColor Yellow
    Write-Host "   Configure no arquivo .env ou via variáveis de ambiente." -ForegroundColor Yellow
} else {
    Write-Host "✅ Credenciais encontradas. Prosseguindo." -ForegroundColor Green
}