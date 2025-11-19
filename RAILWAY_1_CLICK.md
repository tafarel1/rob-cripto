# Robo Cripto SMC - Deploy Imediato

## 🚄 Deploy no Railway (1 Clique)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https%3A%2F%2Fgithub.com%2Fseu-usuario%2Frobo-cripto-smc&envs=BINANCE_API_KEY%2CBINANCE_SECRET%2CTELEGRAM_BOT_TOKEN%2CTELEGRAM_CHAT_ID%2CEMAIL_USER%2CEMAIL_PASSWORD%2CNODE_ENV%2CPORT&envDescriptions=Chave+API+Binance%2CSegredo+API+Binance%2CToken+do+Bot+do+Telegram%2CID+do+Chat+do+Telegram%2CEmail+para+Notifica%C3%A7%C3%B5es%2CSenha+do+Email%2CAmbiente%28production%29%2CPorta+do+Servidor&referralCode=ROBO-CRIPTO)

## 📋 Instruções Rápidas

### Opção 1: Railway (Recomendado)
1. Clique no botão acima ☝️
2. Conecte sua conta do GitHub
3. Configure as variáveis de ambiente
4. Clique em "Deploy"
5. Aguarde 2-3 minutos

### Opção 2: Manual
```bash
# Instale o CLI do Railway
npm install -g @railway/cli

# Faça login
railway login

# Clone ou use os arquivos locais
railway init
railway up
```

## 🔧 Variáveis de Ambiente

### Obrigatórias:
- `BINANCE_API_KEY` - Sua chave API da Binance
- `BINANCE_SECRET` - Seu segredo API da Binance
- `PORT` - Porta do servidor (Railway define automaticamente)
- `NODE_ENV` - production

### Opcionais:
- `TELEGRAM_BOT_TOKEN` - Para notificações via Telegram
- `TELEGRAM_CHAT_ID` - ID do seu chat no Telegram
- `EMAIL_USER` - Email para notificações
- `EMAIL_PASSWORD` - Senha do email (use senha de app)

## 📊 Funcionalidades

✅ **Dashboard Web** - Interface completa
✅ **Análise SMC** - Smart Money Concepts
✅ **Trading Automatizado** - Integração com exchanges
✅ **Gestão de Risco** - Limites e controles
✅ **Notificações** - Telegram e Email
✅ **Interface Responsiva** - Mobile e Desktop

## 🎯 Após o Deploy

1. **Acesse a URL** fornecida pelo Railway
2. **Configure suas chaves** de API nas variáveis
3. **Teste o sistema** em modo demo primeiro
4. **Monitore** via dashboard

## 🚨 Segurança

- **Sempre** use testnet primeiro
- **Configure** limites de risco
- **Monitore** regularmente
- **Nunca** compartilhe chaves de API

## 💡 Dicas

- O plano gratuito do Railway inclui 500 horas/mês
- O deploy é automático após push para o repositório
- Logs disponíveis no dashboard do Railway
- Suporte via comunidade Railway

---

**🚀 SEU ROBO DE TRADING ESTÁ PRONTO PARA PRODUÇÃO!**