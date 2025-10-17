[CmdletBinding()]
param(
    [ValidateSet('install','update','reinstall','uninstall','status')]
    [string]$Action = 'install',

    [string]$Namespace = 'SMC-Sentinel',
    [ValidateSet('Prod','Staging','Dev','Test')]
    [string]$Env = 'Test',

    [string]$User = '',
    [System.Security.SecureString]$Password,

    [switch]$DoNotStart
)

$ErrorActionPreference = 'Stop'

function Info($m){ Write-Host "[test-min] $m" }

try {
    $ScriptDir = $PSScriptRoot
    $ProjectRoot = Split-Path -Parent $ScriptDir
    Set-Location $ProjectRoot

    # Garantir diretórios padrão (data e logs) para evitar erro de IO
    $jsonlPath = 'data/events_{date}.jsonl'
    $jsonlParent = Split-Path -Parent (Join-Path $ProjectRoot $jsonlPath)
    if ($jsonlParent -and -not (Test-Path $jsonlParent)) { New-Item -ItemType Directory -Force -Path $jsonlParent | Out-Null }
    $logsDir = Join-Path $ProjectRoot 'logs'
    if (-not (Test-Path $logsDir)) { New-Item -ItemType Directory -Force -Path $logsDir | Out-Null }

    $runner = Join-Path $ScriptDir 'deploy-runner.ps1'
    if (-not (Test-Path $runner)) { throw 'scripts/deploy-runner.ps1 não encontrado' }

    $args = @(
        '-Mode','Auto',
        '-Action', $Action,
        '-Namespace', $Namespace,
        '-Env', $Env,
        '-ConfigureEnv',
        '-Sink','jsonl',
        '-JsonlPath','data/events_{date}.jsonl',
        '-EnableRotation',
        '-StatsInterval','30',
        '-Start','auto'
    )
    if ($User) { $args += @('-User', $User) }
    if ($Password) { $args += @('-Password', $Password) }
    if ($DoNotStart) { $args += '-DoNotStart' }

    Info ("Executando orquestrador com namespace: {0}-{1}" -f $Namespace,$Env)
    & $runner @args

    Info "Ação concluída. Serviço/Tarefa: $Namespace-$Env"
}
catch {
    Write-Error $_
    exit 1
}