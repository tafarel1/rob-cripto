[CmdletBinding()]
param(
    [ValidateSet('install','update','reinstall','uninstall','status')]
    [string]$Action = 'install',

    [string]$ServiceName = 'SMCSentinel',
    [string]$TaskName = 'SMCSentinel',

    [string]$EnvFile = '.env',

    [string]$JsonlPath = 'data/events_{date}.jsonl',
    [double]$StatsInterval = 30.0,

    [string]$StdoutLog = 'logs/collector.out.log',
    [string]$StderrLog = 'logs/collector.err.log',
    [int]$RotateBytes = 104857600,     # 100 MiB
    [int]$RotateDelaySec = 86400,      # 24h

    [string]$PythonPath = '',
    [string]$NssmPath = '',
    [string]$NssmUrl = 'https://nssm.cc/release/nssm-2.24.zip',

    [string]$User = '',
    [System.Security.SecureString]$Password,

    [switch]$DoNotStart
)

$ErrorActionPreference = 'Stop'

function Write-Info($msg) { Write-Host "[prod] $msg" }

try {
    $ScriptDir = $PSScriptRoot
    $ProjectRoot = Split-Path -Parent $ScriptDir
    Set-Location $ProjectRoot

    # Garante diretórios padrão (data e logs)
    $jsonlParent = Split-Path -Parent (Join-Path $ProjectRoot $JsonlPath)
    if ($jsonlParent -and -not (Test-Path $jsonlParent)) { New-Item -ItemType Directory -Force -Path $jsonlParent | Out-Null }
    $logsDir = Join-Path $ProjectRoot 'logs'
    if (-not (Test-Path $logsDir)) { New-Item -ItemType Directory -Force -Path $logsDir | Out-Null }

    $runner = Join-Path $ScriptDir 'deploy-runner.ps1'
    if (-not (Test-Path $runner)) { throw 'scripts/deploy-runner.ps1 não encontrado' }

    $argsCommon = @(
        '-Mode','Auto',
        '-Action', $Action,
        '-ServiceName', $ServiceName,
        '-TaskName', $TaskName,
        '-EnvFile', $EnvFile,
        '-Start','auto',
        '-RotateBytes', $RotateBytes,
        '-RotateDelaySec', $RotateDelaySec
    )
    if ($PythonPath) { $argsCommon += @('-PythonPath', $PythonPath) }
    if ($NssmPath) { $argsCommon += @('-NssmPath', $NssmPath) }
    if ($NssmUrl) { $argsCommon += @('-NssmUrl', $NssmUrl) }
    if ($User) { $argsCommon += @('-User', $User) }
    if ($Password) { $argsCommon += @('-Password', $Password) }
    if ($DoNotStart) { $argsCommon += '-DoNotStart' }
    if ($PSBoundParameters.ContainsKey('StdoutLog')) { $argsCommon += @('-StdoutLog', $StdoutLog) }
    if ($PSBoundParameters.ContainsKey('StderrLog')) { $argsCommon += @('-StderrLog', $StderrLog) }

    if ($Action -in @('install','reinstall')) {
        $args = $argsCommon + @(
            '-ConfigureEnv',
            '-Sink','jsonl',
            '-JsonlPath', $JsonlPath,
            '-StatsInterval', $StatsInterval,
            '-EnableRotation'
        )
    } else {
        $args = $argsCommon
    }

    Write-Info ("Executando orquestrador: {0}" -f ($args -join ' '))
    & $runner @args

    Write-Info "Ação '$Action' finalizada. Logs: $StdoutLog ; $StderrLog"
}
catch {
    Write-Error $_
    exit 1
}