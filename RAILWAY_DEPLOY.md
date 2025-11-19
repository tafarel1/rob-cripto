# Robo Cripto SMC - Deploy para Railway

## Deploy Rápido (1 clique)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https%3A%2F%2Fgithub.com%2Fseu-usuario%2Frobo-cripto&envs=BINANCE_API_KEY%2CBINANCE_SECRET%2CBYBIT_API_KEY%2CBYBIT_SECRET%2CTELEGRAM_BOT_TOKEN%2CTELEGRAM_CHAT_ID%2CEMAIL_USER%2CEMAIL_PASSWORD%2CSUPABASE_URL%2CSUPABASE_ANON_KEY&envDescriptions=Chave+API+da+Binance%2CSegredo+API+da+Binance%2CChave+API+da+Bybit%2CSegredo+API+da+Bybit%2CToken+do+bot+do+Telegram%2CID+do+chat+do+Telegram%2CEmail+para+notificações%2CSenha+do+email%2CURL+do+Supabase%2CChave+anon+do+Supabase&referralCode=SEU-CODIGO)

## Deploy Manual

1. **Faça login no Railway:**
   ```bash
   npm install -g @railway/cli
   railway login
   ```

2. **Crie um novo projeto:**
   ```bash
   railway init
   ```

3. **Configure as variáveis de ambiente:**
   ```bash
   railway variables set BINANCE_API_KEY=sua_chave
   railway variables set BINANCE_SECRET=seu_segredo
   railway variables set TELEGRAM_BOT_TOKEN=seu_token
   railway variables set TELEGRAM_CHAT_ID=seu_chat_id
   ```

4. **Deploy:**
   ```bash
   railway up
   ```

## Configuração

O Railway detectará automaticamente:
- Build script: `npm run build`
- Start script: `npm start`
- Porta: `PORT` (fornecida pelo Railway)

## Variáveis Obrigatórias

- `BINANCE_API_KEY` - Chave API da Binance
- `BINANCE_SECRET` - Segredo API da Binance
- `PORT` - Porta (fornecida automaticamente)

## Variáveis Opcionais

- `TELEGRAM_BOT_TOKEN` - Para notificações
- `TELEGRAM_CHAT_ID` - ID do chat do Telegram
- `EMAIL_USER` - Email para notificações
- `EMAIL_PASSWORD` - Senha do email
- `SUPABASE_URL` - URL do Supabase
- `SUPABASE_ANON_KEY` - Chave do Supabase

## Notas

- O plano gratuito do Railway inclui 500 horas por mês
- O deploy é automático após push para o repositório
- Logs disponíveis no dashboard do Railway

## Suporte

Se tiver problemas:
1. Verifique as variáveis de ambiente
2. Confira os logs no dashboard
3. Teste localmente primeiro: `npm run dev`