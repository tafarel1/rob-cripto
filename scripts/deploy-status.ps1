[CmdletBinding()]
param(
    [string]$Namespace = 'SMC-Sentinel',
    [ValidateSet('Prod','Staging','Dev','Test')]
    [string]$Env = 'Prod',
    [int]$Tail = 20
)

$ErrorActionPreference = 'Stop'

function Info($m){ Write-Host "[status] $m" }

try {
    $ScriptDir = $PSScriptRoot
    $ProjectRoot = Split-Path -Parent $ScriptDir
    Set-Location $ProjectRoot

    $name = "{0}-{1}" -f $Namespace,$Env
    Info ("Apurando status para: {0}" -f $name)

    $svc = $null
    $svcWmi = $null
    $task = $null

    try { $svc = Get-Service -Name $name -ErrorAction Stop } catch { }
    if ($svc) {
        $svcWmi = Get-WmiObject -Class Win32_Service -Filter "Name='$name'" -ErrorAction SilentlyContinue
        Info "Tipo: Serviço (NSSM esperado)"
        Write-Host ("  Status     : {0}" -f $svc.Status)
        if ($svcWmi) {
            Write-Host ("  StartMode  : {0}" -f $svcWmi.StartMode)
            Write-Host ("  PathName   : {0}" -f $svcWmi.PathName)
        }
    }
    else {
        try { $task = Get-ScheduledTask -TaskName $name -ErrorAction Stop } catch { }
        if ($task) {
            $ti = Get-ScheduledTaskInfo -TaskName $name
            Info "Tipo: Tarefa Agendada (fallback)"
            Write-Host ("  State      : {0}" -f $ti.State)
            Write-Host ("  LastRun    : {0}" -f $ti.LastRunTime)
            Write-Host ("  NextRun    : {0}" -f $ti.NextRunTime)
            $triggers = ($task.Triggers | ForEach-Object { $_.TriggerType } | Sort-Object -Unique) -join ', '
            if ($triggers) { Write-Host ("  Triggers   : {0}" -f $triggers) }
            $action = $task.Actions | Select-Object -First 1
            if ($action) {
                Write-Host ("  Execute    : {0}" -f $action.Execute)
                if ($action.Arguments) { Write-Host ("  Arguments  : {0}" -f $action.Arguments) }
            }
        }
        else {
            Info "Não encontrado como Serviço ou Tarefa."
        }
    }

    # Descobrir caminhos de log via NSSM se possível
    $stdoutLog = Join-Path $ProjectRoot 'logs/collector.out.log'
    $stderrLog = Join-Path $ProjectRoot 'logs/collector.err.log'
    $nssm = $null
    try { $nssm = (Get-Command nssm -ErrorAction Stop).Source } catch { }
    if ($svc -and $nssm) {
        try {
            $out = & $nssm get $name AppStdout 2>$null
            if ($LASTEXITCODE -eq 0 -and $out) { $stdoutLog = $out.Trim() }
        } catch {}
        try {
            $err = & $nssm get $name AppStderr 2>$null
            if ($LASTEXITCODE -eq 0 -and $err) { $stderrLog = $err.Trim() }
        } catch {}
    }

    # Exibir info dos logs
    Info "Logs"
    foreach($lf in @($stdoutLog,$stderrLog)){
        $label = (Split-Path -Leaf $lf)
        if (Test-Path $lf) {
            $fi = Get-Item $lf
            Write-Host ("  {0} : {1} bytes, {2}" -f $label,$fi.Length,$fi.LastWriteTime)
        } else {
            Write-Host ("  {0} : (não encontrado)" -f $label)
        }
    }

    # Tail básico
    if (Test-Path $stdoutLog) {
        Write-Host "\n--- Últimas linhas (stdout) ---"
        Get-Content -Path $stdoutLog -Tail $Tail
    }
    if (Test-Path $stderrLog) {
        Write-Host "\n--- Últimas linhas (stderr) ---"
        Get-Content -Path $stderrLog -Tail $Tail
    }

    # JSONL do dia
    $today = Get-Date -Format 'yyyy-MM-dd'
    $jsonlDefault = Join-Path $ProjectRoot ("data/events_{0}.jsonl" -f $today)
    Info "Eventos (JSONL)"
    if (Test-Path $jsonlDefault) {
        $fi = Get-Item $jsonlDefault
        Write-Host ("  data/events_{0}.jsonl : {1} bytes, {2}" -f $today, $fi.Length, $fi.LastWriteTime)
    } else {
        Write-Host ("  data/events_{0}.jsonl : (não encontrado)" -f $today)
    }

    Info "Concluído"
}
catch {
    Write-Error $_
    exit 1
}