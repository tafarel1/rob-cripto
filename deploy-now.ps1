echo "🚀 Robo Cripto SMC - Preparação para Deploy"
echo "=============================================="
echo ""

# Verificar servidor local
echo "🔍 Verificando servidor local..."
$serverCheck = curl -s http://localhost:3000/api/health 2>$null
if ($serverCheck) {
    echo "✅ Servidor local funcionando em http://localhost:3000"
} else {
    echo "⚠️  Servidor local não está rodando. Inicie com: node production-server.js"
}

echo ""
echo "📦 Verificando build..."
if (Test-Path "dist") {
    echo "✅ Build encontrado"
} else {
    echo "📦 Fazendo build..."
    npm run build
}

echo ""
echo "🔧 Criando arquivos de deploy..."

# Criar .gitignore
if (!(Test-Path ".gitignore")) {
    @"
node_modules/
dist/
.env
.env.local
.DS_Store
*.log
.vercel
netlify.toml
railway.json
"@ | Out-File -FilePath ".gitignore" -Encoding UTF8
    echo "✅ .gitignore criado"
}

echo ""
echo "🎯 OPÇÕES DE DEPLOY:"
echo ""
echo "1️⃣  RAILWAY (Recomendado - Gratuito):"
echo "   npm install -g @railway/cli"
echo "   railway login"
echo "   railway init"
echo "   railway up"
echo ""
echo "2️⃣  RENDER (Gratuito - Mais rápido):"
echo "   Acesse: https://render.com"
echo "   New → Web Service"
echo "   Build: npm run build"
echo "   Start: node production-server.js"
echo ""
echo "3️⃣  VERCEL (via GitHub):"
echo "   Crie repositório no GitHub"
echo "   Acesse: https://vercel.com"
echo "   Importe o projeto"
echo ""
echo "🚀 **Aplicação funcionando localmente em: http://localhost:3000"