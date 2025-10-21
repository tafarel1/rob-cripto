param(
    [int]$Port = 8501,
    [int]$IntervalSec = 10,
    [int]$RetriesBeforeRestart = 3
)

$proj = "V:\development\smc_sentinel"
$restartScript = Join-Path $proj "scripts\restart_dashboard.ps1"
$healthLog = Join-Path $proj "logs\dashboard_health.log"
if (-not (Test-Path (Split-Path $healthLog))) { New-Item -ItemType Directory -Path (Split-Path $healthLog) -Force | Out-Null }

function Write-Health($msg) {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "$ts | $msg"
    $line | Add-Content -Path $healthLog
    Write-Host $line
}

function Test-Dashboard([int]$p) {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:$p" -UseBasicParsing -TimeoutSec 3
        return ($r.StatusCode -eq 200)
    } catch { return $false }
}

$failCount = 0
Write-Health "Monitor started on port $Port (interval ${IntervalSec}s, retries $RetriesBeforeRestart)"

while ($true) {
    $ok = Test-Dashboard -p $Port
    if ($ok) {
        if ($failCount -gt 0) { Write-Health "Recovered; HTTP 200. Resetting fail counter." }
        $failCount = 0
    } else {
        $failCount++
        Write-Health "Health check failed ($failCount/$RetriesBeforeRestart)."
        if ($failCount -ge $RetriesBeforeRestart) {
            Write-Health "Restarting dashboard after consecutive failures..."
            try {
                & $restartScript -Port $Port -TimeoutSec 25
                $failCount = 0
                Write-Health "Restart attempt completed."
            } catch {
                Write-Health "Restart script error: $($_.Exception.Message)"
            }
        }
    }
    Start-Sleep -Seconds $IntervalSec
}