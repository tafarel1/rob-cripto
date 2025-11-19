# Robo Cripto SMC - Deploy para Render

## Deploy Imediato (Gratuito)

1. **Acesse:** https://render.com/

2. **Clique em:** "New" → "Web Service"

3. **Conecte seu GitHub** ou faça upload dos arquivos

4. **Configure o deploy:**
   - **Name:** `robo-cripto-smc`
   - **Environment:** Node
   - **Build Command:** `npm run build`
   - **Start Command:** `node production-server.js`
   - **Instance Type:** Free

5. **Configure as variáveis de ambiente:**
   ```
   BINANCE_API_KEY=sua_chave_aqui
   BINANCE_SECRET=seu_segredo_aqui
   PORT=3000
   NODE_ENV=production
   ```

6. **Clique em:** "Create Web Service"

## Configuração de Variáveis

### Obrigatórias:
- `BINANCE_API_KEY` - Sua chave API da Binance
- `BINANCE_SECRET` - Seu segredo API da Binance
- `PORT` - Porta (o Render define automaticamente)
- `NODE_ENV` - production

### Opcionais:
- `TELEGRAM_BOT_TOKEN` - Token do seu bot
- `TELEGRAM_CHAT_ID` - ID do chat
- `EMAIL_USER` - Email para notificações
- `EMAIL_PASSWORD` - Senha do email
- `SUPABASE_URL` - URL do Supabase
- `SUPABASE_ANON_KEY` - Chave anon do Supabase

## Build Settings

O Render detectará automaticamente:
- Node.js 18+
- npm para instalação
- Build script do package.json
- Start command configurado

## Logs e Monitoramento

- Acesse o dashboard do Render
- Veja logs em tempo real
- Monitore performance
- Configure alertas

## Custom Domain (Opcional)

1. Vá para as configurações do serviço
2. Adicione seu domínio customizado
3. Configure DNS conforme instruído

## Notas Importantes

- Plano gratuito: 750 horas/mês
- Sleep após 15 minutos de inatividade
- Wake up automático ao receber requisição
- Logs persistem por 7 dias

## Suporte

Se tiver problemas:
1. Verifique os logs no dashboard
2. Confirme variáveis de ambiente
3. Teste localmente: `node production-server.js`
4. Acesse: https://community.render.com/

---

**🚀 Deploy rápido e gratuito em minutos!**