# RoboCrypto Bootstrap Script (Windows)
# Auto-installs Node.js and prepares environment
param (
    [switch]$ForceDownload,
    [switch]$InstallOnly
)

$ErrorActionPreference = "Stop"
$ScriptPath = $PSScriptRoot
$ProjectRoot = Resolve-Path "$ScriptPath\..\.."
$ToolsDir = "$ProjectRoot\launcher\tools"
$NodeDir = "$ToolsDir\node"
$TempDir = "$ProjectRoot\launcher\temp"
$LauncherScript = "$ProjectRoot\launcher\src\launcher.cjs"

# Node.js Configuration
$NodeVersion = "v20.10.0"
$NodeUrl = "https://nodejs.org/dist/$NodeVersion/node-$NodeVersion-win-x64.zip"
$NodeZip = "$TempDir\node.zip"

# UI Helpers
function Write-Status {
    param([string]$Message, [string]$Color = "Cyan")
    Write-Host "[$((Get-Date).ToString('HH:mm:ss'))] $Message" -ForegroundColor $Color
}

function Show-Dialog {
    param([string]$Message)
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show($Message, "RoboCrypto Launcher", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)
}

# --- Checks ---

Write-Status "Iniciando RoboCrypto Launcher..." "Green"
Write-Status "Verificando ambiente..."

# 1. Check Portable Node
$PortableNode = "$NodeDir\node-$NodeVersion-win-x64\node.exe"
$NodeExe = ""

if (Test-Path $PortableNode) {
    Write-Status "Node.js portatil encontrado." "Green"
    $NodeExe = $PortableNode
    $env:PATH = "$NodeDir\node-$NodeVersion-win-x64;$env:PATH"
} else {
    # 2. Check System Node
    try {
        $SystemNode = Get-Command node -ErrorAction SilentlyContinue
        if ($SystemNode) {
            $VersionStr = node --version
            $VersionInt = [int]$VersionStr.Trim().Substring(1).Split('.')[0]
            
            if ($VersionInt -ge 16) {
                Write-Status "Node.js sistema encontrado: $VersionStr" "Green"
                $NodeExe = "node"
            } else {
                Write-Status "Node.js sistema ($VersionStr) antigo. Requer 16+. Ignorando." "Yellow"
            }
        }
    } catch {}
}

# 3. Download if missing
if (-not $NodeExe -or $ForceDownload) {
    Write-Status "Node.js nao encontrado. Iniciando instalacao automatica..." "Yellow"
    
    # GUI Progress Bar logic could go here, but CLI is safer for now.
    
    if (-not (Test-Path $TempDir)) { New-Item -ItemType Directory -Path $TempDir | Out-Null }
    
    Write-Status "Baixando Node.js $NodeVersion (aprox. 30MB)..." "Cyan"
    try {
        Invoke-WebRequest -Uri $NodeUrl -OutFile $NodeZip -UseBasicParsing
    } catch {
        Write-Status "Erro no download: $_" "Red"
        Write-Status "Verifique sua conexao com a internet." "Red"
        Show-Dialog "Falha ao baixar componentes necessarios. Verifique sua internet."
        exit 1
    }

    Write-Status "Extraindo arquivos..." "Cyan"
    try {
        Expand-Archive -Path $NodeZip -DestinationPath $NodeDir -Force
    } catch {
        Write-Status "Erro na extracao: $_" "Red"
        exit 1
    }

    # Verify again
    if (Test-Path $PortableNode) {
        Write-Status "Instalacao concluida com sucesso!" "Green"
        $NodeExe = $PortableNode
        $env:PATH = "$NodeDir\node-$NodeVersion-win-x64;$env:PATH"
        
        # Clean up
        Remove-Item $NodeZip -Force
    } else {
        Write-Status "Falha critica na instalacao." "Red"
        exit 1
    }
}

# --- Launch ---

if ($InstallOnly) {
    Write-Status "Modo InstallOnly: Instalação verificada. Encerrando." "Green"
    exit 0
}

if ($NodeExe) {
    Write-Status "Iniciando aplicacao..." "Green"
    
    # Check dependencies before launch (Basic check)
    if (-not (Test-Path "$ProjectRoot\node_modules")) {
        Write-Status "Dependencias nao encontradas. Instalando..." "Yellow"
        & $NodeExe "$NodeDir\node-$NodeVersion-win-x64\npm" install --prefix "$ProjectRoot"
    }

    & $NodeExe $LauncherScript
} else {
    Write-Status "Erro desconhecido ao iniciar." "Red"
    Pause
}
