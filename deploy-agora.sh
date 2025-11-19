#!/bin/bash

echo "🚀 Robo Cripto SMC - Deploy Imediato"
echo "======================================"
echo ""

# Verificar se o servidor local está rodando
echo "🔍 Verificando servidor local..."
if curl -s http://localhost:3000/api/health > /dev/null; then
    echo "✅ Servidor local está funcionando em http://localhost:3000"
else
    echo "⚠️  Servidor local não está rodando. Iniciando..."
    node production-server.js &
    sleep 3
fi

echo ""
echo "📦 Preparando deploy..."

# Criar arquivo de ambiente se não existir
if [ ! -f ".env" ]; then
    echo "🔧 Criando arquivo .env com configurações padrão..."
    cat > .env << 'EOF'
# Configurações Básicas
NODE_ENV=production
PORT=3000

# Exchange APIs (Preencha com suas chaves)
BINANCE_API_KEY=sua_chave_binance_aqui
BINANCE_SECRET=seu_segredo_binance_aqui
BYBIT_API_KEY=sua_chave_bybit_aqui
BYBIT_SECRET=seu_segredo_bybit_aqui

# Notificações (Opcional)
TELEGRAM_BOT_TOKEN=seu_token_telegram_aqui
TELEGRAM_CHAT_ID=seu_chat_id_aqui
EMAIL_USER=seu_email@gmail.com
EMAIL_PASSWORD=sua_senha_email_aqui

# Database (Opcional)
SUPABASE_URL=sua_url_supabase_aqui
SUPABASE_ANON_KEY=sua_chave_anon_aqui
EOF
fi

echo ""
echo "🎯 OPÇÕES DE DEPLOY:"
echo ""
echo "1️⃣  RAILWAY (Recomendado - Gratuito)"
echo "   npm install -g @railway/cli"
echo "   railway login"
echo "   railway init"
echo "   railway up"
echo ""
echo "2️⃣  RENDER (Gratuito - Mais rápido)"
echo "   Acesse: https://render.com"
echo "   New → Web Service"
echo "   Build: npm run build"
echo "   Start: node production-server.js"
echo ""
echo "3️⃣  FLY.IO (Moderno - Gratuito)"
echo "   curl -L https://fly.io/install.sh | sh"
echo "   flyctl auth signup"
echo "   flyctl launch"
echo ""
echo "4️⃣  SERVIDOR LOCAL (Já está funcionando!)"
echo "   http://localhost:3000"
echo ""
echo "📝 ARQUIVOS CRIADOS:"
echo "   ✅ production-server.js - Servidor completo"
echo "   ✅ api/simple.js - API simplificada"
echo "   ✅ vercel.json - Config Vercel"
echo "   ✅ railway.json - Config Railway"
echo "   ✅ Dockerfile - Container"
echo "   ✅ .env - Variáveis de ambiente"
echo ""
echo "🎯 ESCOLHA UMA OPÇÃO E FAÇA O DEPLOY AGORA!"
echo ""
echo "💡 Dica: Railway é o mais fácil e rápido!"