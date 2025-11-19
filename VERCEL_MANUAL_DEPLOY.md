# Robo Cripto SMC - Deploy Manual para Vercel

## 🚀 Deploy Imediato (Sem CLI)

### Opção 1: Deploy via GitHub (Recomendado)

1. **Crie um repositório no GitHub:**
   - Acesse: https://github.com/new
   - Nome: `robo-cripto-smc`
   - Deixe público

2. **Faça upload dos arquivos:**
   ```bash
   git init
   git add .
   git commit -m "Robo Cripto SMC - Deploy inicial"
   git remote add origin https://github.com/SEU-USUARIO/robo-cripto-smc.git
   git push -u origin main
   ```

3. **Deploy no Vercel via GitHub:**
   - Acesse: https://vercel.com
   - Clique em "New Project"
   - Importe do GitHub
   - Configure:
     - **Framework Preset:** Vite
     - **Build Command:** `npm run build`
     - **Output Directory:** `dist`
     - **Install Command:** `npm install`

4. **Configure as variáveis de ambiente:**
   ```bash
   BINANCE_API_KEY=sua_chave_binance
   BINANCE_SECRET=seu_segredo_binance
   NODE_ENV=production
   ```

### Opção 2: Deploy via Upload ZIP

1. **Prepare os arquivos:**
   ```bash
   # Crie um arquivo ZIP com os arquivos necessários
   zip -r robo-cripto-smc.zip . -x "node_modules/*" ".git/*" "*.log"
   ```

2. **Acesse:** https://vercel.com/import

3. **Faça upload do ZIP**

4. **Configure o deploy:**
   - **Framework:** Vite
   - **Build:** `npm run build`
   - **Output:** `dist`

### Opção 3: Deploy Alternativo (Render)

1. **Acesse:** https://render.com

2. **Clique em:** "New" → "Web Service"

3. **Conecte seu GitHub** ou faça upload

4. **Configure:**
   - **Name:** `robo-cripto-smc`
   - **Environment:** Node
   - **Build Command:** `npm run build`
   - **Start Command:** `node production-server.js`
   - **Instance:** Free

## 🔧 Arquivos Necessários para Deploy

✅ `dist/` - Frontend buildado
✅ `api/simple.js` - API backend
✅ `production-server.js` - Servidor
✅ `package.json` - Dependências
✅ `vercel.json` - Configuração Vercel

## 📋 Checklist de Deploy

- [ ] Build funcionando (`npm run build`)
- [ ] Servidor local testado (`node production-server.js`)
- [ ] Variáveis de ambiente configuradas
- [ ] API respondendo (`/api/health`)
- [ ] Frontend carregando

## 🎯 Após o Deploy

1. **Teste a URL** gerada
2. **Verifique os logs** do deploy
3. **Configure notificações** (Telegram/Email)
4. **Teste em testnet** antes de produção

## 🚨 Segurança

- **Sempre** use testnet primeiro
- **Configure** limites de risco
- **Monitore** regularmente
- **Nunca** exponha chaves privadas

## 📞 Suporte

Se tiver problemas:
1. Verifique logs no dashboard
2. Confirme variáveis de ambiente
3. Teste localmente primeiro
4. Acesse: https://vercel.com/support

---

**🎉 SUA APLICAÇÃO ESTÁ PRONTA PARA DEPLOY!**

Escolha uma opção acima e **FAÇA O DEPLOY AGORA**! 🚀