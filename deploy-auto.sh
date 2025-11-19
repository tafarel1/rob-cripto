#!/bin/bash

echo "🚀 Robo Cripto SMC - Deploy Automático"
echo "=========================================="

# Verificar se o build existe
if [ ! -d "dist" ]; then
    echo "📦 Build não encontrado. Fazendo build..."
    npm run build
fi

# Criar arquivo de configuração para Railway
echo "🛤️  Criando configuração para Railway..."
cat > railway.json << 'EOF'
{
  "project": "robo-cripto-smc",
  "services": {
    "web": {
      "build": "npm run build",
      "start": "node production-server.js",
      "env": {
        "NODE_ENV": "production",
        "PORT": "${PORT}"
      }
    }
  }
}
EOF

# Criar arquivo de ambiente exemplo
echo "🔧 Criando arquivo de ambiente..."
cat > .env.example << 'EOF'
# Exchange APIs
BINANCE_API_KEY=sua_chave_binance_aqui
BINANCE_SECRET=seu_segredo_binance_aqui
BYBIT_API_KEY=sua_chave_bybit_aqui
BYBIT_SECRET=seu_segredo_bybit_aqui

# Notificações
TELEGRAM_BOT_TOKEN=seu_token_telegram_aqui
TELEGRAM_CHAT_ID=seu_chat_id_aqui
EMAIL_USER=seu_email@gmail.com
EMAIL_PASSWORD=sua_senha_email_aqui

# Database
SUPABASE_URL=sua_url_supabase_aqui
SUPABASE_ANON_KEY=sua_chave_anon_aqui

# Configurações
NODE_ENV=production
PORT=3000
EOF

echo "✅ Arquivos de deploy criados!"
echo ""
echo "📋 Próximos passos:"
echo "1️⃣  Escolha seu serviço de deploy favorito:"
echo ""
echo "🛤️  Railway (Recomendado):"
echo "   npm install -g @railway/cli"
echo "   railway login"
echo "   railway init"
echo "   railway up"
echo ""
echo "🎨 Render:"
echo "   Acesse: https://render.com"
echo "   New → Web Service"
echo "   Build: npm run build"
echo "   Start: node production-server.js"
echo ""
echo "🚀 Fly.io:"
echo "   curl -L https://fly.io/install.sh | sh"
echo "   flyctl auth signup"
echo "   flyctl launch"
echo ""
echo "📄 Arquivos criados:"
echo "   ✅ railway.json - Config Railway"
echo "   ✅ .env.example - Variáveis de ambiente"
echo "   ✅ production-server.js - Servidor"
echo "   ✅ DEPLOY_IMEDIATO.md - Instruções completas"
echo ""
echo "🎯 **Aplicação funcionando localmente em: http://localhost:3000"