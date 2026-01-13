# Setup

1. Copiar `.env.example` para `.env` e preencher variáveis.
2. Instalar dependências na raiz, `frontend` e `backend`: `npm ci`.
3. Rodar em desenvolvimento: `npm run dev`.
4. Validar saúde: `GET /api/health` e abrir `http://localhost:5173`.

## Ambientes

- `.env.development`: uso local (porta, chaves de testnet).
- `.env.staging`: pré-produção (integrações reais com restrições).
- `.env.production`: produção (chaves seguras, logs e métricas).

Frontend:
- Ver `frontend/.env.example` com `VITE_API_URL`, `VITE_APP_NAME`, `VITE_DEMO_MODE`, `VITE_ENVIRONMENT`.

Backend:
- Ver `backend/.env.example` com `EXCHANGE_MODE`, `DEFAULT_SYMBOL`, `PORT`.

As variações por ambiente devem ser gerenciadas via Secrets no GitHub Actions e nunca versionadas.
