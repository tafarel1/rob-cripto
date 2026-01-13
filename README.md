# 🤖 Robô Cripto - Trading Automatizado com Smart Money Concepts

![CI](https://github.com/tafarel1/rob-cripto/actions/workflows/ci.yml/badge.svg)
![Quality](https://github.com/tafarel1/rob-cripto/actions/workflows/quality.yml/badge.svg)
![CodeQL](https://github.com/tafarel1/rob-cripto/actions/workflows/codeql.yml/badge.svg)
![License](https://img.shields.io/github/license/tafarel1/rob-cripto)
![Version](https://img.shields.io/github/v/tag/tafarel1/rob-cripto?label=version&sort=semver)

Uma aplicação completa de trading automatizado de criptomoedas baseada na estratégia Smart Money Concepts (SMC), com integração às principais exchanges e gestão de risco avançada.

## 🚀 Características Principais

### 📊 Análise SMC Automatizada
- **Detecção de Zonas de Liquidez**: Identifica automaticamente áreas de alta e baixa liquidez
- **Order Blocks**: Detecta blocos de ordens de alta e baixa qualidade
- **Fair Value Gaps (FVG)**: Identifica gaps de valor justo no mercado
- **Estruturas de Mercado**: Analisa HH, HL, LH, LL, BOS e CHOCH
- **Confirmações de Volume**: Valida sinais com análise de volume

### 🔄 Integração com Exchanges
- **Binance**: Suporte completo para spot e futures
- **Bybit**: Integração com spot e contratos perpétuos
- **WebSocket**: Dados em tempo real e execução rápida
- **API REST**: Interface robusta e segura

### 🛡️ Gestão de Risco Avançada
- **Controle de Posição**: Cálculo automático baseado em risco
- **Stop Loss Dinâmico**: Ajustado por volatilidade e break-even
- **Take Profit Múltiplo**: Saídas parciais em níveis definidos
- **Limites Diários**: Proteção contra perdas excessivas
- **Risk/Reward Ratio**: Mínimo 1:2 para todas as operações

### 📱 Dashboard Interativo
- **Monitoramento em Tempo Real**: Acompanhe suas operações ao vivo
- **Estatísticas Detalhadas**: Performance, PnL, taxa de acerto
- **Controle Total**: Inicie/pare o robô, configure estratégias
- **Notificações**: Alertas via Telegram e Email

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: Node.js, Express, TypeScript
- **Banco de Dados**: Supabase (PostgreSQL)
- **Integrações**: CCXT para exchanges, Redis para cache
- **Notificações**: Telegram Bot API, Nodemailer
- **Análise Técnica**: TechnicalIndicators.js

## 📦 Instalação

### Pré-requisitos
- Node.js 18+ 
- npm ou pnpm
- Conta em exchange (Binance ou Bybit)
- Conta Supabase (opcional, para banco de dados)

### Passo a Passo

1. **Clone o repositório**
```bash
git clone https://github.com/seu-usuario/robo-cripto.git
cd robo-cripto
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure o ambiente**
```bash
node setup.js
```

4. **Configure suas chaves API**
Edite o arquivo `.env` com suas credenciais:
```env
# Binance
BINANCE_API_KEY=sua_api_key_aqui
BINANCE_SECRET=sua_secret_aqui

# Bybit
BYBIT_API_KEY=sua_api_key_aqui
BYBIT_SECRET=sua_secret_aqui

# Supabase
SUPABASE_URL=sua_supabase_url_aqui
SUPABASE_ANON_KEY=sua_anon_key_aqui

# Notificações
TELEGRAM_BOT_TOKEN=seu_telegram_bot_token
TELEGRAM_CHAT_ID=seu_chat_id
```

5. **Inicie o servidor**
```bash
npm run dev
```

6. **Acesse o dashboard**
Abra seu navegador em: http://localhost:5173

## 🔀 Estrutura de Branches

- `main`: branch protegida para releases estáveis
- `develop`: integração contínua de funcionalidades
- `feature/*`: desenvolvimento isolado por feature (ex.: `feature/virtual-mode`)

Regras recomendadas de proteção em `main`:
- Require pull request reviews
- Require status checks (CI, Quality, CodeQL)
- Include administrators

## ⚙️ Configuração

### Configuração de Exchange

#### Binance
1. Acesse: https://www.binance.com/en/my/settings/api-management
2. Crie uma nova API key
3. Ative permissões de leitura e trading
4. Configure restrições de IP (recomendado)

#### Bybit
1. Acesse: https://www.bybit.com/app/user/api-management
2. Crie uma nova API key
3. Ative permissões de leitura e trading
4. Configure restrições de IP (recomendado)

### Configuração de Notificações

#### Telegram
1. Crie um bot com @BotFather
2. Obtenha o token do bot
3. Inicie uma conversa com seu bot
4. Obtenha seu chat ID com @userinfobot

#### Email (Gmail)
1. Ative autenticação de 2 fatores
2. Crie uma senha de app específica
3. Configure no arquivo .env

### Configuração de Estratégias

As estratégias podem ser configuradas através do dashboard ou da API:

```json
{
  "name": "SMC-BTC-1H",
  "symbol": "BTC/USDT",
  "timeframe": "1h",
  "enabled": true,
  "smcParams": {
    "minLiquidityStrength": 0.7,
    "minOrderBlockStrength": 0.8,
    "minFvgSize": 0.002,
    "useMarketStructure": true,
    "useVolumeConfirmation": true
  },
  "riskParams": {
    "maxRiskPerTrade": 2,
    "maxDailyLoss": 5,
    "maxPositions": 5,
    "riskRewardRatio": 2,
    "positionSizingMethod": "fixed"
  }
}
```

## 📊 Uso da API

### Endpoints Principais

#### Status do Sistema
```bash
GET /api/trading/status
```

#### Iniciar/Parar Trading
```bash
POST /api/trading/start
POST /api/trading/stop
```

#### Gerenciar Estratégias
```bash
GET /api/trading/strategies
POST /api/trading/strategies
DELETE /api/trading/strategies/:name
```

#### Análise de Mercado
```bash
POST /api/trading/analyze
{
  "symbol": "BTC/USDT",
  "timeframe": "1h",
  "limit": 100
}
```

#### Posições Ativas
```bash
GET /api/trading/positions
POST /api/trading/positions/:id/close
```

## 🔧 Desenvolvimento

### Estrutura do Projeto
```
robo-cripto/
├── api/                    # Backend Node.js
│   ├── services/          # Serviços principais
│   ├── routes/           # Rotas da API
│   ├── config/           # Configurações
│   └── app.ts            # Aplicação Express
├── src/                   # Frontend React
│   ├── components/       # Componentes React
│   ├── pages/           # Páginas
│   ├── hooks/           # Hooks customizados
│   └── lib/             # Utilitários
├── shared/               # Tipos compartilhados
└── supabase/            # Configurações do banco
```

### Executar em Modo Desenvolvimento
```bash
# Frontend
npm run client:dev

# Backend
npm run server:dev

# Ambos simultaneamente
npm run dev
```

### Executar Testes
```bash
npm run test
```

### Build para Produção
```bash
npm run build
```

### Publicar Release
```bash
git tag v1.1.0
git push origin v1.1.0
```

## 📈 Performance e Métricas

### Métricas de Trading
- **Win Rate**: Taxa de operações vencedoras
- **Sharpe Ratio**: Retorno ajustado ao risco
- **Maximum Drawdown**: Máxima perda registrada
- **Profit Factor**: Relação lucro/prejuízo
- **Average Win/Loss**: Média de ganhos e perdas

### Métricas de Sistema
- **Latência**: Tempo de execução das ordens
- **Uptime**: Disponibilidade do sistema
- **Taxa de Erros**: Operações com falha
- **Performance**: Tempo de resposta da API

## 🛡️ Segurança

### Práticas Implementadas
- **Criptografia de Chaves**: API keys são criptografadas
- **Rate Limiting**: Limitação de requisições
- **Validação de Dados**: Entradas sempre validadas
- **Logs de Auditoria**: Registro de todas as operações
- **Autenticação JWT**: Tokens seguros para API

### Recomendações
- Use sempre HTTPS em produção
- Configure restrições de IP nas exchanges
- Mantenhas suas chaves API seguras
- Monitore logs regularmente
- Faça backup dos dados frequentemente

## ⚠️ Avisos Importantes

### Riscos de Trading
- **Perda de Capital**: Trading envolve risco de perda
- **Volatilidade**: Mercado de criptomoedas é altamente volátil
- **Alavancagem**: Use com cautela, aumenta riscos
- **Liquidez**: Verifique liquidez antes de operar

### Recomendações de Uso
- **Teste em Demo**: Sempre teste em conta demo primeiro
- **Comece Pequeno**: Inicie com valores baixos
- **Monitore Constantemente**: Nunca deixe desassistido
- **Diversifique**: Não concentre todo capital em uma estratégia
- **Estude**: Entenda SMC antes de usar

## 🆘 Suporte

### Documentação
- [Wiki do Projeto](wiki)
- [Documentação da API](docs/api.md)
- [Guia de Configuração](docs/setup.md)

### Comunidade
- [Discord](discord-link)
- [Telegram Group](telegram-link)
- [GitHub Issues](issues-link)

### Contato
- Email: suporte@robo-cripto.com
- Telegram: @suporte_robo_cripto

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor, leia o [CONTRIBUTING.md](CONTRIBUTING.md) para saber como contribuir.

## 🙏 Agradecimentos

- [CCXT](https://github.com/ccxt/ccxt) - Biblioteca de integração com exchanges
- [TradingView](https://www.tradingview.com) - Inspiração para análises
- [Smart Money Concepts](https://www.youtube.com/c/InnerCircleTrader) - Comunidade ICT

---

**⚠️ Disclaimer**: Este software é fornecido "como está", sem garantias de qualquer tipo. O trading de criptomoedas envolve riscos significativos e você pode perder todo o seu capital investido. Use por sua própria conta e risco.
