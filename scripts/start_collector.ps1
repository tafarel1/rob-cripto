$proj = "V:\development\smc_sentinel"
$pythonExe = Join-Path $proj ".venv\Scripts\python.exe"
$logsDir = Join-Path $proj "logs"

Write-Host "Starting collector..." -ForegroundColor Yellow
Start-Process -FilePath $pythonExe -ArgumentList @("-m","smc_sentinel.run_collector") -WorkingDirectory $proj -PassThru -NoNewWindow -RedirectStandardOutput (Join-Path $logsDir "collector_service.log") -RedirectStandardError (Join-Path $logsDir "collector_service.err.log") | Out-Null
Start-Sleep -Seconds 3

Write-Host "Collector started. Tailing logs:" -ForegroundColor Cyan
Write-Host "=== ERR ===" -ForegroundColor Gray
Get-Content (Join-Path $logsDir "collector_service.err.log") -Tail 50
Write-Host "=== OUT ===" -ForegroundColor Gray
Get-Content (Join-Path $logsDir "collector_service.log") -Tail 50