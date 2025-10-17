[CmdletBinding()]
param(
    [string]$ServiceName = "SMCSentinel",
    [string]$NssmPath = ""
)

$ErrorActionPreference = 'Stop'

try {
    $ScriptDir = $PSScriptRoot
    $ProjectRoot = Split-Path -Parent $ScriptDir
    Set-Location $ProjectRoot

    function Ensure-Nssm {
        param([string]$DesiredPath)
        if ($DesiredPath -and (Test-Path $DesiredPath)) { return $DesiredPath }
        $cmd = (Get-Command nssm -ErrorAction SilentlyContinue)
        if ($cmd) { return $cmd.Source }
        # Tentar localizar nos tools baixados pelo script de registro
        $candidate = Get-ChildItem -Path (Join-Path $ScriptDir 'tools') -Recurse -Filter nssm.exe -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($candidate) { return $candidate.FullName }
        throw "nssm.exe não encontrado. Informe -NssmPath ou execute o script de registro anteriormente."
    }

    $nssm = Ensure-Nssm -DesiredPath $NssmPath

    if (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue) {
        Write-Host "[service] Parando serviço '$ServiceName'"
        try { Stop-Service -Name $ServiceName -Force -ErrorAction Stop } catch { Write-Warning $_ }
    }

    Write-Host "[service] Removendo serviço '$ServiceName'"
    & $nssm remove $ServiceName confirm | Out-Null
    Write-Host "[service] Serviço removido."
}
catch {
    Write-Error $_
    exit 1
}