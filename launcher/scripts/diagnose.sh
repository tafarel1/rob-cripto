#!/bin/bash

LOG_DIR="$(dirname "$0")/../logs"
mkdir -p "$LOG_DIR"
LOGFILE="$LOG_DIR/diagnostics_$(date +%Y%m%d_%H%M%S).txt"

echo "========================================================"
echo "  RoboCrypto Launcher - Ferramenta de Diagnostico"
echo "========================================================"
echo ""

echo "[INFO] Iniciando diagnostico em $(date)" > "$LOGFILE"
echo "[INFO] OS: $(uname -a)" >> "$LOGFILE"

echo "1. Verificando Node.js..."

# 1.1 Check Portable
PORTABLE_NODE="$(dirname "$0")/../tools/node/node-v20.10.0-linux-x64/bin/node"
NODE_CMD=""

if [ -f "$PORTABLE_NODE" ]; then
    echo "   [OK] Node.js Portatil encontrado."
    echo "[OK] Node.js Portatil: Encontrado" >> "$LOGFILE"
    NODE_CMD="$PORTABLE_NODE"
else
    echo "   [INFO] Node.js Portatil nao encontrado."
    echo "[INFO] Node.js Portatil: Nao encontrado" >> "$LOGFILE"

    # 1.2 Check System
    if command -v node &> /dev/null; then
        NODE_VER=$(node --version)
        echo "   [OK] Node.js Sistema encontrado: $NODE_VER"
        echo "[OK] Node.js Sistema: $NODE_VER" >> "$LOGFILE"
        NODE_CMD="node"
    else
        echo "   [ERRO] Node.js nao encontrado (Nem portatil, nem no PATH)."
        echo "[ERRO] Node.js: Nao encontrado" >> "$LOGFILE"
    fi
fi

echo ""
echo "2. Verificando NPM..."
if [ -n "$NODE_CMD" ]; then
    # Simplification: just check version using the node command context if possible, 
    # but portable node usually has npm alongside.
    # We'll just try to find npm in path or assume it works if node works for now to keep it simple,
    # or check relative path for portable.
    
    if command -v npm &> /dev/null; then
         NPM_VER=$(npm --version)
         echo "   [OK] NPM encontrado: $NPM_VER"
         echo "[OK] NPM: $NPM_VER" >> "$LOGFILE"
    else
         echo "   [AVISO] NPM global nao encontrado. (Normal se usando Node portatil)"
         echo "[AVISO] NPM Global: Nao encontrado" >> "$LOGFILE"
    fi
else
    echo "   [ERRO] Nao e possivel verificar NPM sem Node.js."
fi

echo ""
echo "3. Verificando Conexao com Internet..."
if ping -c 1 8.8.8.8 &> /dev/null; then
    echo "   [OK] Conexao ativa."
    echo "[OK] Internet: Conectado" >> "$LOGFILE"
else
    echo "   [AVISO] Sem conexao com a internet."
    echo "[AVISO] Internet: Desconectado" >> "$LOGFILE"
fi

echo ""
echo "4. Verificando Permissoes de Escrita..."
TEST_FILE="$(dirname "$0")/test_write.tmp"
if touch "$TEST_FILE" 2>/dev/null; then
    echo "   [OK] Permissao de escrita confirmada."
    echo "[OK] Escrita: Permitido" >> "$LOGFILE"
    rm "$TEST_FILE"
else
    echo "   [ERRO] Falha ao escrever no diretorio. Verifique permissoes."
    echo "[ERRO] Escrita: Negado" >> "$LOGFILE"
fi

echo ""
echo "5. Verificando Portas (9999)..."
if lsof -i :9999 &> /dev/null; then
    echo "   [AVISO] A porta 9999 ja esta em uso."
    echo "[AVISO] Porta 9999: Em uso" >> "$LOGFILE"
else
    echo "   [OK] Porta 9999 livre."
    echo "[OK] Porta 9999: Livre" >> "$LOGFILE"
fi

echo ""
echo "========================================================"
echo "  Diagnostico Concluido."
echo "  Relatorio salvo em: $LOGFILE"
echo "========================================================"
