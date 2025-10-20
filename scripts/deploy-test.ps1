[CmdletBinding()]
param(
    [ValidateSet('install','update','reinstall','uninstall','status')]
    [string]$Action = 'install',

    [ValidateSet('Auto','Service','Task')]
    [string]$Mode = 'Auto',

    [string]$Namespace = 'SMC-Sentinel',
    [ValidateSet('Prod','Staging','Dev','Test')]
    [string]$Env = 'Test',

    [string]$Sink = 'jsonl',
    [string]$JsonlPath = 'data/events_{date}.jsonl',
    [bool]$EnableRotation = $true,
    [int]$StatsInterval = 30,

    [string]$StdoutLog = 'logs/collector.out.log',
    [string]$StderrLog = 'logs/collector.err.log',
    [int]$RotateBytes = 10485760,
    [int]$RotateDelaySec = 2,

    [string]$PythonPath = '',

    [string]$User = '',
    [System.Security.SecureString]$Password,

    [string]$Start = 'auto',
    [switch]$DoNotStart,
    [switch]$NoConfigureEnv
)

$ErrorActionPreference = 'Stop'

function Info($m){ Write-Host "[test] $m" }

try {
    $ScriptDir = $PSScriptRoot
    $ProjectRoot = Split-Path -Parent $ScriptDir
    Set-Location $ProjectRoot

    # Garantir diretórios para JSONL e logs
    $jsonlParent = Split-Path -Parent (Join-Path $ProjectRoot $JsonlPath)
    if ($jsonlParent -and -not (Test-Path $jsonlParent)) { New-Item -ItemType Directory -Force -Path $jsonlParent | Out-Null }
    $stdoutParent = Split-Path -Parent (Join-Path $ProjectRoot $StdoutLog)
    if ($stdoutParent -and -not (Test-Path $stdoutParent)) { New-Item -ItemType Directory -Force -Path $stdoutParent | Out-Null }
    $stderrParent = Split-Path -Parent (Join-Path $ProjectRoot $StderrLog)
    if ($stderrParent -and -not (Test-Path $stderrParent)) { New-Item -ItemType Directory -Force -Path $stderrParent | Out-Null }

    $runner = Join-Path $ScriptDir 'deploy-runner.ps1'
    if (-not (Test-Path $runner)) { throw 'scripts/deploy-runner.ps1 não encontrado' }

    $args = @(
        '-Mode', $Mode,
        '-Action', $Action,
        '-Namespace', $Namespace,
        '-Env', $Env,
        '-Sink', $Sink,
        '-JsonlPath', $JsonlPath,
        '-StatsInterval', $StatsInterval,
        '-Start', $Start,
        '-RotateBytes', $RotateBytes,
        '-RotateDelaySec', $RotateDelaySec
    )

    if (-not $NoConfigureEnv) { $args += '-ConfigureEnv' }
    if ($EnableRotation) { $args += '-EnableRotation' }
    if ($PythonPath) { $args += @('-PythonPath', $PythonPath) }
    if ($User) { $args += @('-User', $User) }
    if ($Password) { $args += @('-Password', $Password) }
    if ($PSBoundParameters.ContainsKey('StdoutLog')) { $args += @('-StdoutLog', $StdoutLog) }
    if ($PSBoundParameters.ContainsKey('StderrLog')) { $args += @('-StderrLog', $StderrLog) }
    if ($DoNotStart) { $args += '-DoNotStart' }

    Info ("Executando orquestrador com namespace: {0}-{1} (modo {2})" -f $Namespace,$Env,$Mode)
    & $runner @args

    Info "Ação concluída. Serviço/Tarefa: $Namespace-$Env"
}
catch {
    Write-Error $_
    exit 1
}