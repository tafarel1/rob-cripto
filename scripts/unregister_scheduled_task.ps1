[CmdletBinding()]
param(
    [string]$TaskName = "SMCSentinel"
)

$ErrorActionPreference = 'Stop'

try {
    if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
        Write-Host "[task] Parando tarefa '$TaskName'"
        try { Stop-ScheduledTask -TaskName $TaskName -ErrorAction Stop | Out-Null } catch { Write-Warning $_ }
        Write-Host "[task] Removendo tarefa '$TaskName'"
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false | Out-Null
        Write-Host "[task] Tarefa removida."
    } else {
        Write-Host "[task] Tarefa '$TaskName' não existe."
    }
}
catch {
    Write-Error $_
    exit 1
}