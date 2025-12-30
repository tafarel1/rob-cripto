#!/bin/bash

# Configuration
NODE_VERSION="v20.10.0"
OS_TYPE=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH_TYPE=$(uname -m)
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TOOLS_DIR="$PROJECT_ROOT/launcher/tools"
NODE_DIR="$TOOLS_DIR/node"
TEMP_DIR="$PROJECT_ROOT/launcher/temp"
LAUNCHER_SCRIPT="$PROJECT_ROOT/launcher/src/launcher.cjs"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Normalize Arch
case "$ARCH_TYPE" in
    x86_64) ARCH="x64" ;;
    aarch64) ARCH="arm64" ;;
    armv7l) ARCH="armv7l" ;;
    *) error "Unsupported architecture: $ARCH_TYPE"; exit 1 ;;
esac

# Normalize OS
case "$OS_TYPE" in
    linux) PLATFORM="linux" ;;
    darwin) PLATFORM="darwin" ;;
    *) error "Unsupported OS: $OS_TYPE"; exit 1 ;;
esac

# Node Path
PORTABLE_NODE_DIR="$NODE_DIR/node-$NODE_VERSION-$PLATFORM-$ARCH"
PORTABLE_NODE_BIN="$PORTABLE_NODE_DIR/bin/node"

# 1. Check Environment
log "Verificando ambiente..."

NODE_EXEC=""

if [ -f "$PORTABLE_NODE_BIN" ]; then
    log "Node.js portatil encontrado."
    NODE_EXEC="$PORTABLE_NODE_BIN"
    export PATH="$PORTABLE_NODE_DIR/bin:$PATH"
elif command -v node &> /dev/null; then
    SYSTEM_VER=$(node -v)
    VER_MAJOR=$(echo $SYSTEM_VER | cut -d. -f1 | tr -d 'v')
    
    if [ "$VER_MAJOR" -ge 16 ]; then
        log "Node.js do sistema encontrado: $SYSTEM_VER"
        NODE_EXEC="node"
    else
        log "Node.js sistema ($SYSTEM_VER) antigo. Requer 16+. Ignorando."
        # Continue to download logic
    fi
else
    log "Node.js nao encontrado. Iniciando instalacao automatica..."
    
    # Download URL
    NODE_URL="https://nodejs.org/dist/$NODE_VERSION/node-$NODE_VERSION-$PLATFORM-$ARCH.tar.gz"
    TAR_FILE="$TEMP_DIR/node.tar.gz"
    
    mkdir -p "$TEMP_DIR"
    mkdir -p "$NODE_DIR"
    
    log "Baixando Node.js $NODE_VERSION ($PLATFORM-$ARCH)..."
    if command -v curl &> /dev/null; then
        curl -L "$NODE_URL" -o "$TAR_FILE"
    elif command -v wget &> /dev/null; then
        wget -O "$TAR_FILE" "$NODE_URL"
    else
        error "curl ou wget e necessario para instalacao automatica."
        exit 1
    fi
    
    log "Extraindo arquivos..."
    tar -xzf "$TAR_FILE" -C "$NODE_DIR"
    
    if [ -f "$PORTABLE_NODE_BIN" ]; then
        log "Instalacao concluida com sucesso!"
        NODE_EXEC="$PORTABLE_NODE_BIN"
        export PATH="$PORTABLE_NODE_DIR/bin:$PATH"
        rm "$TAR_FILE"
    else
        error "Falha na instalacao. Binario nao encontrado em $PORTABLE_NODE_BIN"
        exit 1
    fi
fi

# 2. Launch
if [ -n "$NODE_EXEC" ]; then
    log "Iniciando RoboCrypto Launcher..."
    "$NODE_EXEC" "$LAUNCHER_SCRIPT"
else
    error "Nao foi possivel inicializar o Node.js."
    exit 1
fi
