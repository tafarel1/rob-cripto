param(
    [int]$Port = 8501,
    [int]$TimeoutSec = 20
)

$proj = "V:\development\smc_sentinel"
$pythonExe = Join-Path $proj ".venv\Scripts\python.exe"
$logsDir = Join-Path $proj "logs"

Write-Host "Stopping any existing Streamlit processes..." -ForegroundColor Yellow
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like "*streamlit*" } | ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } catch {} }

Write-Host "Starting dashboard on port $Port..." -ForegroundColor Yellow
if (-not (Test-Path $logsDir)) { New-Item -ItemType Directory -Path $logsDir -Force | Out-Null }

Start-Process -FilePath $pythonExe -ArgumentList @("-m","streamlit","run","dashboard.py","--server.port", "$Port", "--server.headless","true") -WorkingDirectory $proj -NoNewWindow -RedirectStandardOutput (Join-Path $logsDir "dashboard_service.log") -RedirectStandardError (Join-Path $logsDir "dashboard_service.err.log") | Out-Null

$start = Get-Date
$deadline = $start.AddSeconds($TimeoutSec)
$ok = $false
Write-Host "Waiting for HTTP 200 at http://localhost:$Port ..." -ForegroundColor Cyan
while ((Get-Date) -lt $deadline) {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:$Port" -UseBasicParsing -TimeoutSec 3
        if ($r.StatusCode -eq 200) { $ok = $true; break }
    } catch {}
    Start-Sleep -Seconds 2
}

if ($ok) {
    Write-Host "Dashboard up: http://localhost:$Port" -ForegroundColor Green
} else {
    Write-Host "Dashboard still down after $TimeoutSec sec" -ForegroundColor Red
    Write-Host "Recent logs:" -ForegroundColor Gray
    if (Test-Path (Join-Path $logsDir "dashboard_service.err.log")) { Get-Content (Join-Path $logsDir "dashboard_service.err.log") -Tail 50 }
    if (Test-Path (Join-Path $logsDir "dashboard_service.log")) { Get-Content (Join-Path $logsDir "dashboard_service.log") -Tail 50 }
}