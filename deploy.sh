#!/bin/bash

# Script de Deploy para Robo Cripto SMC
# Este script prepara e faz deploy da aplicação

echo "🚀 Iniciando deploy do Robo Cripto SMC..."

# Build da aplicação
echo "📦 Fazendo build da aplicação..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build concluído com sucesso!"
else
    echo "❌ Erro no build. Corrija os erros e tente novamente."
    exit 1
fi

# Criar arquivo de servidor para produção
echo "🔧 Criando servidor de produção..."
cat > production-server.js << 'EOF'
import express from 'express';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos do build
app.use(express.static(path.join(__dirname, 'dist')));

// Rota API simples para health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Robo Cripto SMC - Servidor Online',
    timestamp: new Date().toISOString()
  });
});

// Rota para servir o frontend (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Robo Cripto SMC rodando na porta ${PORT}`);
  console.log(`📊 Acesse: http://localhost:${PORT}`);
});
EOF

echo "✅ Servidor de produção criado!"
echo ""
echo "🎯 Deploy preparado com sucesso!"
echo ""
echo "📋 Opções de deploy:"
echo "1️⃣  Deploy local: node production-server.js"
echo "2️⃣  Deploy Vercel: npx vercel --prod"
echo "3️⃣  Deploy Netlify: npx netlify deploy --prod"
echo "4️⃣  Deploy Railway: npx railway login && npx railway up"
echo ""
echo "⚠️  Lembre-se de configurar as variáveis de ambiente antes do deploy!"
echo "📄 Veja o arquivo .env.example para referência"