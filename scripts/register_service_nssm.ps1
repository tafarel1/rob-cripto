[CmdletBinding()]
param(
    [string]$ServiceName = "SMCSentinel",
    [string]$DisplayName = "SMC Sentinel Collector",
    [string]$Description = "Market data collector (Binance/Coinbase) with JSONL sink and rotation",
    [ValidateSet("auto","demand","disabled")]
    [string]$Start = "auto",
    [switch]$Bootstrap,
    [switch]$Update,
    [switch]$ForceReinstall,
    [switch]$DoNotStart,
    [switch]$Fallback, # Se NSSM indisponível/falhar, usar Scheduled Task
    [string]$PythonPath = "",
    [string]$EnvFile = ".env",
    [string]$NssmPath = "",
    [string]$NssmUrl = "https://nssm.cc/release/nssm-2.24.zip",
    [string]$StdoutLog = "logs/collector.out.log",
    [string]$StderrLog = "logs/collector.err.log",
    [int]$RotateBytes = 104857600,   # 100 MiB
    [int]$RotateDelaySec = 86400,    # 24h
    [string]$User = "",
    [System.Security.SecureString]$Password
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

function Ensure-Nssm {
    param([string]$DesiredPath, [string]$Url, [string]$ToolsDir)
    if ($DesiredPath -and (Test-Path $DesiredPath)) { return $DesiredPath }
    $cmd = (Get-Command nssm -ErrorAction SilentlyContinue)
    if ($cmd) { return $cmd.Source }

    if (-not (Test-Path $ToolsDir)) { New-Item -ItemType Directory -Force -Path $ToolsDir | Out-Null }
    $zipPath = Join-Path $ToolsDir "nssm.zip"
    $extractDir = Join-Path $ToolsDir "nssm"

    Write-Host "[service] Baixando NSSM de $Url"
    Invoke-WebRequest -Uri $Url -OutFile $zipPath

    Write-Host "[service] Extraindo para $extractDir"
    if (Test-Path $extractDir) { Remove-Item -Recurse -Force $extractDir }
    Expand-Archive -Path $zipPath -DestinationPath $extractDir

    $arch = if ([Environment]::Is64BitOperatingSystem) { 'win64' } else { 'win32' }
    $exe = Get-ChildItem -Path (Join-Path $extractDir "nssm-*/$arch/nssm.exe") -Recurse | Select-Object -First 1
    if (-not $exe) { throw "Não foi possível localizar nssm.exe no pacote extraído." }

    return $exe.FullName
}

function Invoke-FallbackScheduledTask {
    param(
        [string]$Reason
    )
    if (-not $Fallback) { throw $Reason }
    $ScriptDir = $PSScriptRoot
    $taskScript = Join-Path $ScriptDir "register_scheduled_task.ps1"
    if (-not (Test-Path $taskScript)) { throw "Fallback habilitado, mas scripts/register_scheduled_task.ps1 não encontrado." }
    Write-Warning "[service] $Reason"
    Write-Warning "[service] Aplicando fallback para Scheduled Task ($ServiceName)."

    $argsList = @("-ExecutionPolicy","Bypass","-File", $taskScript, "-TaskName", $ServiceName, "-EnvFile", $EnvFile, "-StdoutLog", $StdoutLog, "-StderrLog", $StderrLog)
    if ($Bootstrap) { $argsList += "-Bootstrap" }
    if ($Update) { $argsList += "-Update" }
    if ($DoNotStart) { $argsList += "-DoNotStart" }
    if ($PythonPath) { $argsList += @("-PythonPath", $PythonPath) }
    if ($User) { $argsList += @("-User", $User) }
    if ($Password) { $argsList += @("-Password", $Password) }

    & powershell @argsList
    exit 0
}

try {
    $ScriptDir = $PSScriptRoot
    $ProjectRoot = Split-Path -Parent $ScriptDir
    Set-Location $ProjectRoot

    if ($Bootstrap.IsPresent) {
        $bootstrap = Join-Path $ScriptDir "bootstrap.ps1"
        if (Test-Path $bootstrap) {
            Write-Host "[service] Executando bootstrap"
            & powershell -ExecutionPolicy Bypass -File $bootstrap | Write-Host
        } else {
            Write-Warning "bootstrap.ps1 não encontrado; prosseguindo sem bootstrap."
        }
    }

    # Garantir venv e python
    $venvPath = Join-Path $ProjectRoot ".venv"
    $venvPy = Join-Path $venvPath "Scripts/python.exe"
    if (-not (Test-Path $venvPy)) {
        Write-Host "[service] venv não encontrado; criando..."
        $python = Resolve-Python -Preferred $PythonPath
        & $python -m venv $venvPath
        & $venvPy -m pip install -U pip
        & $venvPy -m pip install -r (Join-Path $ProjectRoot "requirements.txt")
    }

    # Garantir .env
    $envFilePath = Join-Path $ProjectRoot $EnvFile
    if (-not (Test-Path $envFilePath)) {
        $example = Join-Path $ProjectRoot ".env.example"
        if (Test-Path $example) {
            Copy-Item $example $envFilePath
        } else {
            Set-Content -Path $envFilePath -Value "" -Encoding UTF8
        }
    }

    # Preparar NSSM (ou fallback)
    $toolsDir = Join-Path $ScriptDir "tools"
    try {
        $nssm = Ensure-Nssm -DesiredPath $NssmPath -Url $NssmUrl -ToolsDir $toolsDir
    } catch {
        Invoke-FallbackScheduledTask -Reason "NSSM indisponível: $($_.Exception.Message)"
    }
    Write-Host "[service] NSSM: $nssm"

    # Caminhos de logs
    $logsDir = Join-Path $ProjectRoot "logs"
    if (-not (Test-Path $logsDir)) { New-Item -ItemType Directory -Path $logsDir | Out-Null }
    $stdoutFull = Join-Path $ProjectRoot $StdoutLog
    $stderrFull = Join-Path $ProjectRoot $StderrLog
    foreach ($p in @($stdoutFull,$stderrFull)) {
        $dir = Split-Path -Parent $p
        if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
    }

    $argsLine = "-m smc_sentinel.run_collector"

    $svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    $exists = $null -ne $svc

    if ($exists -and $ForceReinstall) {
        Write-Host "[service] Forçando reinstalação de '$ServiceName'"
        if ($svc.Status -eq 'Running') {
            try { Stop-Service -Name $ServiceName -Force -ErrorAction Stop } catch { Write-Warning $_ }
        }
        & $nssm remove $ServiceName confirm | Out-Null
        $exists = $false
    }

    if (-not $exists) {
        Write-Host "[service] Instalando serviço '$ServiceName'"
        & $nssm install $ServiceName $venvPy $argsLine

        & $nssm set $ServiceName AppDirectory $ProjectRoot
        & $nssm set $ServiceName DisplayName $DisplayName
        & $nssm set $ServiceName Description $Description

        & $nssm set $ServiceName AppStdout $stdoutFull
        & $nssm set $ServiceName AppStderr $stderrFull
        & $nssm set $ServiceName AppRotateFiles 1
        & $nssm set $ServiceName AppRotateOnline 1
        & $nssm set $ServiceName AppRotateBytes $RotateBytes
        & $nssm set $ServiceName AppRotateDelay $RotateDelaySec

        & $nssm set $ServiceName AppExit Default Restart

        switch ($Start) {
            'auto'    { sc.exe config $ServiceName start= auto    | Out-Null }
            'demand'  { sc.exe config $ServiceName start= demand  | Out-Null }
            'disabled'{ sc.exe config $ServiceName start= disabled| Out-Null }
        }

        if ($User) {
            if ($Password) {
                $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password)
                $plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
                sc.exe config $ServiceName obj= $User password= $plain | Out-Null
            } else {
                sc.exe config $ServiceName obj= $User | Out-Null
            }
        }

        if (-not $DoNotStart) {
            Write-Host "[service] Iniciando serviço '$ServiceName'"
            Start-Service -Name $ServiceName
            Start-Sleep -Seconds 2
        }
    }
    else {
        # Modo update inteligente
        $wasRunning = (Get-Service -Name $ServiceName).Status -eq 'Running'
        if ($wasRunning) {
            Write-Host "[service] Parando serviço para aplicar atualização"
            try { Stop-Service -Name $ServiceName -Force -ErrorAction Stop } catch { Write-Warning $_ }
        }

        # Corrigir caminho do App e parâmetros, e demais configs
        & $nssm set $ServiceName Application $venvPy
        & $nssm set $ServiceName AppParameters $argsLine
        & $nssm set $ServiceName AppDirectory $ProjectRoot
        & $nssm set $ServiceName DisplayName $DisplayName
        & $nssm set $ServiceName Description $Description
        & $nssm set $ServiceName AppStdout $stdoutFull
        & $nssm set $ServiceName AppStderr $stderrFull
        & $nssm set $ServiceName AppRotateFiles 1
        & $nssm set $ServiceName AppRotateOnline 1
        & $nssm set $ServiceName AppRotateBytes $RotateBytes
        & $nssm set $ServiceName AppRotateDelay $RotateDelaySec
        & $nssm set $ServiceName AppExit Default Restart

        switch ($Start) {
            'auto'    { sc.exe config $ServiceName start= auto    | Out-Null }
            'demand'  { sc.exe config $ServiceName start= demand  | Out-Null }
            'disabled'{ sc.exe config $ServiceName start= disabled| Out-Null }
        }
        if ($User) {
            if ($Password) {
                $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password)
                $plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
                sc.exe config $ServiceName obj= $User password= $plain | Out-Null
            } else {
                sc.exe config $ServiceName obj= $User | Out-Null
            }
        }

        if ($wasRunning -and -not $DoNotStart) {
            Write-Host "[service] Reiniciando serviço '$ServiceName'"
            Start-Service -Name $ServiceName
            Start-Sleep -Seconds 2
        } elseif (-not $wasRunning -and -not $DoNotStart) {
            Write-Host "[service] Iniciando serviço '$ServiceName'"
            Start-Service -Name $ServiceName
            Start-Sleep -Seconds 2
        } else {
            Write-Host "[service] Atualização aplicada. Serviço mantido parado por -DoNotStart."
        }
    }

    $svcFinal = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($svcFinal) { Write-Host "[service] Status: $($svcFinal.Status)" }
    Write-Host "[service] Logs: $stdoutFull ; $stderrFull"
}
catch {
    try { Invoke-FallbackScheduledTask -Reason "Falha ao registrar serviço via NSSM: $($_.Exception.Message)" } catch { }
    if (-not $Fallback) { Write-Error $_; exit 1 }
}