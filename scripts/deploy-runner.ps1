[CmdletBinding()]
param(
    [ValidateSet('Auto','Service','Task')]
    [string]$Mode = 'Auto',

    [ValidateSet('install','update','reinstall','uninstall','status')]
    [string]$Action = 'install',

    [string]$ServiceName = 'SMCSentinel',
    [string]$TaskName = 'SMCSentinel',

    [string]$DisplayName = 'SMC Sentinel Collector',
    [string]$Description = 'Market data collector (Binance/Coinbase) with JSONL sink and rotation',

    [ValidateSet('auto','demand','disabled')]
    [string]$Start = 'auto',

    [switch]$ConfigureEnv,
    [string]$Sink = 'jsonl',
    [string]$JsonlPath = 'data/events_{date}.jsonl',
    [switch]$EnableRotation,
    [double]$StatsInterval = 30.0,
    [switch]$RunTests,

    [string]$PythonPath = '',
    [string]$EnvFile = '.env',

    [string]$NssmPath = '',
    [string]$NssmUrl = 'https://nssm.cc/release/nssm-2.24.zip',

    [string]$StdoutLog = 'logs/collector.out.log',
    [string]$StderrLog = 'logs/collector.err.log',
    [int]$RotateBytes = 104857600,
    [int]$RotateDelaySec = 86400,

    [switch]$DoNotStart,

    [bool]$TriggerAtStartup = $true,
    [bool]$TriggerAtLogon = $false,

    [string]$User = '',
    [System.Security.SecureString]$Password,

    [string]$Namespace = '',
    [ValidateSet('Prod','Staging','Dev','Test')]
    [string]$Env = 'Prod',
    [int]$Tail = 20
)

$ErrorActionPreference = 'Stop'

function Write-Info($msg) { Write-Host "[deploy] $msg" }
function To-PlainPassword([System.Security.SecureString]$sec) {
    if (-not $sec) { return '' }
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
    return [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
}

try {
    $ScriptDir = $PSScriptRoot
    $ProjectRoot = Split-Path -Parent $ScriptDir
    Set-Location $ProjectRoot

    # Deriva nomes a partir de Namespace/Env se informados
    if ($PSBoundParameters.ContainsKey('Namespace')) {
        $nsSan = ($Namespace -replace '[^A-Za-z0-9_.-]', '-').Trim('-')
        if (-not $nsSan) { $nsSan = 'SMC-Sentinel' }
        $derived = "$nsSan-$Env"
        if (-not $PSBoundParameters.ContainsKey('ServiceName')) { $ServiceName = $derived }
        if (-not $PSBoundParameters.ContainsKey('TaskName')) { $TaskName = $derived }
        # Logs padrão por ambiente/nome quando não fornecidos explicitamente
        if (-not $PSBoundParameters.ContainsKey('StdoutLog') -and -not $PSBoundParameters.ContainsKey('StderrLog')) {
            $StdoutLog = "logs/$ServiceName.out.log"
            $StderrLog = "logs/$ServiceName.err.log"
        }
    }

    # Garantir diretório base do JsonlPath
    try {
        $jsonlFull = Join-Path $ProjectRoot $JsonlPath
        $jsonlDir = Split-Path -Parent $jsonlFull
        if ($jsonlDir -and -not (Test-Path $jsonlDir)) { New-Item -ItemType Directory -Path $jsonlDir | Out-Null }
    } catch { Write-Warning "Falha ao garantir diretório de JsonlPath: $($_.Exception.Message)" }

    $bootstrapScript = Join-Path $ScriptDir 'bootstrap.ps1'
    $svcRegScript = Join-Path $ScriptDir 'register_service_nssm.ps1'
    $svcUnregScript = Join-Path $ScriptDir 'unregister_service_nssm.ps1'
    $taskRegScript = Join-Path $ScriptDir 'register_scheduled_task.ps1'
    $taskUnregScript = Join-Path $ScriptDir 'unregister_scheduled_task.ps1'

    # Optional environment configuration/bootstrap
    if ($ConfigureEnv -or $RunTests) {
        if (Test-Path $bootstrapScript) {
            Write-Info "Executando bootstrap (.venv, deps, .env)"
            $bootstrapArgs = @()
            if ($Sink) { $bootstrapArgs += @('-Sink', $Sink) }
            if ($JsonlPath) { $bootstrapArgs += @('-JsonlPath', $JsonlPath) }
            if ($PSBoundParameters.ContainsKey('StatsInterval')) { $bootstrapArgs += @('-StatsInterval', $StatsInterval) }
            if ($EnableRotation) { $bootstrapArgs += '-EnableRotation' }
            if ($RunTests) { $bootstrapArgs += '-RunTests' }
            if ($PythonPath) { $bootstrapArgs += @('-PythonPath', $PythonPath) }
            & $bootstrapScript @bootstrapArgs
        } else {
            Write-Warning "bootstrap.ps1 não encontrado; pulando configuração de ambiente."
        }
    }

    # Ação de status: inspeciona serviço/tarefa, logs e JSONL de hoje
    if ($Action -eq 'status') {
        try {
            $nameSvc = $ServiceName
            $nameTask = $TaskName
            Write-Info "Status para '$nameSvc' / '$nameTask'"

            $svc = $null
            try { $svc = Get-Service -Name $nameSvc -ErrorAction Stop } catch {}

            $stdout = Join-Path $ProjectRoot $StdoutLog
            $stderr = Join-Path $ProjectRoot $StderrLog

            $nssmCmd = $null
            try { $nssmCmd = (Get-Command nssm -ErrorAction Stop).Source } catch {}

            if ($svc) {
                $svcWmi = Get-WmiObject -Class Win32_Service -Filter "Name='$nameSvc'" -ErrorAction SilentlyContinue
                Write-Host ("[status] Tipo: Serviço (NSSM esperado)")
                Write-Host ("  Status     : {0}" -f $svc.Status)
                if ($svcWmi) {
                    Write-Host ("  StartMode  : {0}" -f $svcWmi.StartMode)
                    Write-Host ("  PathName   : {0}" -f $svcWmi.PathName)
                }
                if ($nssmCmd) {
                    try { $o = & $nssmCmd get $nameSvc AppStdout 2>$null; if ($LASTEXITCODE -eq 0 -and $o) { $stdout = $o.Trim() } } catch {}
                    try { $e = & $nssmCmd get $nameSvc AppStderr 2>$null; if ($LASTEXITCODE -eq 0 -and $e) { $stderr = $e.Trim() } } catch {}
                }
            } else {
                $task = $null
                try { $task = Get-ScheduledTask -TaskName $nameTask -ErrorAction Stop } catch {}
                if ($task) {
                    $ti = Get-ScheduledTaskInfo -TaskName $nameTask
                    Write-Host ("[status] Tipo: Tarefa Agendada (fallback)")
                    Write-Host ("  State      : {0}" -f $ti.State)
                    Write-Host ("  LastRun    : {0}" -f $ti.LastRunTime)
                    Write-Host ("  NextRun    : {0}" -f $ti.NextRunTime)
                    $tr = ($task.Triggers | ForEach-Object { $_.TriggerType } | Sort-Object -Unique) -join ', '
                    if ($tr) { Write-Host ("  Triggers   : {0}" -f $tr) }
                    $act = $task.Actions | Select-Object -First 1
                    if ($act) {
                        Write-Host ("  Execute    : {0}" -f $act.Execute)
                        if ($act.Arguments) { Write-Host ("  Arguments  : {0}" -f $act.Arguments) }
                    }
                } else {
                    Write-Host "[status] Não encontrado como Serviço ou Tarefa."
                }
            }

            Write-Host "[status] Logs"
            foreach ($lf in @($stdout,$stderr)) {
                $label = (Split-Path -Leaf $lf)
                if (Test-Path $lf) {
                    $fi = Get-Item $lf
                    Write-Host ("  {0} : {1} bytes, {2}" -f $label,$fi.Length,$fi.LastWriteTime)
                } else {
                    Write-Host ("  {0} : (não encontrado)" -f $label)
                }
            }
            if (Test-Path $stdout) { Write-Host "`n--- Últimas linhas (stdout) ---"; Get-Content -Path $stdout -Tail $Tail }
            if (Test-Path $stderr) { Write-Host "`n--- Últimas linhas (stderr) ---"; Get-Content -Path $stderr -Tail $Tail }

            $today = Get-Date -Format 'yyyy-MM-dd'
            $jsonlToday = ($JsonlPath -replace '\{date\}', $today)
            $jsonlFull = Join-Path $ProjectRoot $jsonlToday
            Write-Host "[status] Eventos (JSONL)"
            if (Test-Path $jsonlFull) {
                $fi = Get-Item $jsonlFull
                Write-Host ("  {0} : {1} bytes, {2}" -f $jsonlToday, $fi.Length, $fi.LastWriteTime)
            } else {
                Write-Host ("  {0} : (não encontrado)" -f $jsonlToday)
            }
        } catch { Write-Warning $_ }
        return
    }

    # Uninstall path
    if ($Action -eq 'uninstall') {
        if ($Mode -eq 'Service' -or $Mode -eq 'Auto') {
            if (Test-Path $svcUnregScript) {
                Write-Info "Removendo serviço '$ServiceName' (NSSM)"
                & powershell -ExecutionPolicy Bypass -File $svcUnregScript -ServiceName $ServiceName
            }
        }
        if ($Mode -eq 'Task' -or $Mode -eq 'Auto') {
            if (Test-Path $taskUnregScript) {
                Write-Info "Removendo Scheduled Task '$TaskName'"
                & $taskUnregScript -TaskName $TaskName
            }
        }
        Write-Info "Ação 'uninstall' concluída."
        return
    }

    # Install/Update/Reinstall
    if ($Mode -eq 'Task') {
        if (-not (Test-Path $taskRegScript)) { throw "register_scheduled_task.ps1 não encontrado" }
        Write-Info "Registrando Scheduled Task '$TaskName'"
        $updateSwitch = $Action -eq 'update'
        if ($Action -eq 'reinstall') {
            if (Test-Path $taskUnregScript) { & $taskUnregScript -TaskName $TaskName }
        }
        & $taskRegScript -TaskName $TaskName -Description $Description -DoNotStart:$DoNotStart -PythonPath $PythonPath -EnvFile $EnvFile -StdoutLog $StdoutLog -StderrLog $StderrLog -TriggerAtStartup:$TriggerAtStartup -TriggerAtLogon:$TriggerAtLogon -User $User -Password $Password -Update:$updateSwitch
        if (-not $DoNotStart) { try { Start-ScheduledTask -TaskName $TaskName | Out-Null } catch { Write-Warning $_ } }
        Write-Info "Scheduled Task pronta. Logs: $StdoutLog ; $StderrLog"
        return
    }

    # Service path (Auto/Service)
    if (-not (Test-Path $svcRegScript)) { throw "register_service_nssm.ps1 não encontrado" }

    if ($Action -eq 'reinstall') {
        if (Test-Path $svcUnregScript) {
            Write-Info "Reinstalação: removendo serviço '$ServiceName'"
            & powershell -ExecutionPolicy Bypass -File $svcUnregScript -ServiceName $ServiceName
        }
    }

    Write-Info "Registrando serviço '$ServiceName' via NSSM"
    $psArgs = @(
        '-ExecutionPolicy','Bypass','-File', $svcRegScript,
        '-ServiceName', $ServiceName,
        '-DisplayName', $DisplayName,
        '-Description', $Description,
        '-Start', $Start,
        '-EnvFile', $EnvFile,
        '-StdoutLog', $StdoutLog,
        '-StderrLog', $StderrLog,
        '-RotateBytes', $RotateBytes,
        '-RotateDelaySec', $RotateDelaySec,
        '-DoNotStart' # vamos controlar start após setar credenciais abaixo
    )
    if ($PythonPath) { $psArgs += @('-PythonPath', $PythonPath) }
    if ($NssmPath) { $psArgs += @('-NssmPath', $NssmPath) }
    if ($NssmUrl) { $psArgs += @('-NssmUrl', $NssmUrl) }
    if ($Action -eq 'update') { $psArgs += '-Update' }
    if ($Action -eq 'reinstall') { $psArgs += '-ForceReinstall' }
    # Desabilita fallback interno; orquestrador decide fallback
    $psArgs += '-Fallback:$false'

    & powershell @psArgs
    $svcExit = $LASTEXITCODE

    if ($svcExit -ne 0) {
        if ($Mode -eq 'Auto') {
            Write-Warning "Registro do serviço falhou (exit=$svcExit). Aplicando fallback para Scheduled Task."
            if (-not (Test-Path $taskRegScript)) { throw "register_scheduled_task.ps1 não encontrado para fallback" }
            $updateSwitch = $Action -eq 'update'
            & $taskRegScript -TaskName $TaskName -Description $Description -DoNotStart:$DoNotStart -PythonPath $PythonPath -EnvFile $EnvFile -StdoutLog $StdoutLog -StderrLog $StderrLog -TriggerAtStartup:$true -TriggerAtLogon:$TriggerAtLogon -User $User -Password $Password -Update:$updateSwitch
            if (-not $DoNotStart) { try { Start-ScheduledTask -TaskName $TaskName | Out-Null } catch { Write-Warning $_ } }
            Write-Info "Fallback Scheduled Task pronto. Logs: $StdoutLog ; $StderrLog"
            return
        } else {
            throw "Falha ao registrar serviço via NSSM (exit=$svcExit)."
        }
    }

    # Ajustar credenciais da conta do serviço, se fornecido
    if ($User) {
        $svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
        if ($svc -and $svc.Status -eq 'Running') {
            try { Stop-Service -Name $ServiceName -Force -ErrorAction Stop } catch { Write-Warning $_ }
        }
        $plain = To-PlainPassword -sec $Password
        if ($plain) { sc.exe config $ServiceName obj= $User password= $plain | Out-Null }
        else { sc.exe config $ServiceName obj= $User | Out-Null }
    }

    if (-not $DoNotStart) {
        try { Start-Service -Name $ServiceName -ErrorAction Stop } catch { Write-Warning $_ }
    }

    $svcFinal = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($svcFinal) { Write-Info ("Serviço: {0}; Status: {1}" -f $ServiceName, $svcFinal.Status) }
    Write-Info "Logs: $StdoutLog ; $StderrLog"
}
catch {
    Write-Error $_
    exit 1
}