$ErrorActionPreference = 'Continue'

Write-Host "=== DIAGNOSTICO INICIAL ===" -ForegroundColor Yellow
$projectRoot = "V:\development\smc_sentinel"

# Verificar existencia da pasta principal
if (-not (Test-Path $projectRoot)) {
    Write-Host "CRITICO: Diretorio $projectRoot nao encontrado" -ForegroundColor Red
    exit 1
}

# Verificar componentes essenciais
$essentialFiles = @(
    "dashboard.py",
    "smc_sentinel\__init__.py",
    ".venv\Scripts\python.exe",
    "requirements.txt"
)

foreach ($file in $essentialFiles) {
    $fullPath = Join-Path $projectRoot $file
    if (Test-Path $fullPath) {
        Write-Host "OK: $file" -ForegroundColor Green
    } else {
        Write-Host "FALTANDO: $file" -ForegroundColor Red
    }
}

Write-Host "`n=== VERIFICACAO PYTHON ===" -ForegroundColor Cyan
$pythonExe = Join-Path $projectRoot ".venv\Scripts\python.exe"

# Testar execucao Python
try {
    $pythonVersion = & $pythonExe --version
    Write-Host "Python: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "Python nao executavel: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Testar importacao de modulos criticos
$testModules = @("streamlit", "smc_sentinel", "pandas")
foreach ($module in $testModules) {
    try {
        $testResult = & $pythonExe -c "import $module; print('OK')" 2>$null
        if ($testResult -eq "OK") {
            Write-Host "Modulo $($module): OK" -ForegroundColor Green
        } else {
            Write-Host "Modulo $($module): FALHOU" -ForegroundColor Red
        }
    } catch {
        Write-Host "Modulo $($module): FALHOU" -ForegroundColor Red
    }
}

Write-Host "`n=== VERIFICACAO SISTEMA ===" -ForegroundColor Magenta

# Verificar processos Streamlit existentes
$streamlitProcesses = Get-Process -Name "python" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like "*streamlit*" }

if ($streamlitProcesses) {
    Write-Host "Processos Streamlit encontrados (matando...)" -ForegroundColor Yellow
    $streamlitProcesses | Stop-Process -Force
}

# Verificar porta 8501
$portTest = Test-NetConnection -ComputerName localhost -Port 8501 -InformationLevel Quiet
if ($portTest) {
    Write-Host "Porta 8501 em uso" -ForegroundColor Yellow
} else {
    Write-Host "Porta 8501 disponivel" -ForegroundColor Green
}

Write-Host "`n=== INICIALIZANDO APLICACAO ===" -ForegroundColor Green

# Garantir pasta de logs
$logsDir = Join-Path $projectRoot "logs"
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
    Write-Host "Pasta logs criada" -ForegroundColor Green
}

# Iniciar Dashboard com redirecionamento robusto
Write-Host "Iniciando Dashboard Streamlit..." -ForegroundColor Yellow
$dashboardProcess = Start-Process -FilePath $pythonExe -ArgumentList @(
    "-m", "streamlit", "run",
    "dashboard.py",
    "--server.port", "8501",
    "--server.headless", "true"
) -WorkingDirectory $projectRoot -PassThru -NoNewWindow -RedirectStandardOutput (Join-Path $logsDir "dashboard_service.log") -RedirectStandardError (Join-Path $logsDir "dashboard_service.err.log")

# Iniciar Coletor
Write-Host "Iniciando Coletor de Dados..." -ForegroundColor Yellow
$collectorProcess = Start-Process -FilePath $pythonExe -ArgumentList @(
    "-m", "smc_sentinel.run_collector"
) -WorkingDirectory $projectRoot -PassThru -NoNewWindow -RedirectStandardOutput (Join-Path $logsDir "collector_service.log") -RedirectStandardError (Join-Path $logsDir "collector_service.err.log")

# Aguardar inicializacao
Write-Host "Aguardando inicializacao (20 segundos)..." -ForegroundColor Cyan
Start-Sleep -Seconds 20

Write-Host "`n=== VALIDACAO FINAL ===" -ForegroundColor Blue

# Verificar processos
$runningProcesses = Get-Process -Name "python" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like "*streamlit*" -or $_.CommandLine -like "*smc_sentinel*" }

if ($runningProcesses.Count -ge 2) {
    Write-Host "Processos em execucao: $($runningProcesses.Count)" -ForegroundColor Green
    $runningProcesses | Format-Table Id, CPU, StartTime -AutoSize
} else {
    Write-Host "Processos insuficientes: $($runningProcesses.Count)" -ForegroundColor Red
}

# Testar acesso ao dashboard
Write-Host "Testando acesso ao Dashboard..." -ForegroundColor Cyan
try {
    $webTest = Invoke-WebRequest -Uri "http://localhost:8501" -TimeoutSec 10 -UseBasicParsing
    if ($webTest.StatusCode -eq 200) {
        Write-Host "DASHBOARD ACESSIVEL: http://localhost:8501" -ForegroundColor Green
        Write-Host "APLICACAO FUNCIONANDO CORRETAMENTE!" -ForegroundColor Magenta
    }
} catch {
    Write-Host "Dashboard inacessivel: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Verificando logs de erro..." -ForegroundColor Yellow

    # Mostrar logs de erro se houver
    Get-ChildItem "$logsDir\*.log" -ErrorAction SilentlyContinue |
        ForEach-Object { Write-Host "LOG: $($_.Name)" -ForegroundColor Gray; Get-Content $_ -Tail 3 }
}