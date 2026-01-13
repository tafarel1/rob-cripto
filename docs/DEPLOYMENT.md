# Deployment

- GitHub Actions: CI (`.github/workflows/ci.yml`, `quality.yml`).
- CodeQL: análise estática de segurança (`codeql.yml`).
- Dependabot: atualizações automáticas (`.github/dependabot.yml`).
- Tags e Releases: `git tag v1.1.0` (semver), publique no GitHub.

## Proteções de Branch (main)

- Require pull request reviews (1+ aprovador).
- Require status checks obrigatórios: CI, Quality, CodeQL.
- Include administrators.
- Proibir commits direto na `main`.

Passos:
- Settings → Branches → Branch protection rules → Add rule → Branch name pattern: `main`.
- Marcar opções acima e salvar.

## Secrets para CI/CD

Configure em Settings → Secrets and variables → Actions:
- `BINANCE_API_KEY`, `BINANCE_SECRET`, `BYBIT_API_KEY`, `BYBIT_SECRET` (somente se necessário para testes).
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` (se usar banco em CI).
- `TELEGRAM_BOT_TOKEN` (opcional, não recomendado em CI).

Nunca commitar `.env` ou chaves no repositório. Use `.env.example` como referência.

## Ambientes (dev/staging/prod)

- Defina variáveis por ambiente em `.env.development`, `.env.staging`, `.env.production`.
- Frontend usa `VITE_...` variáveis (ver `frontend/.env.example`).
- Backend usa portas e chaves específicas por ambiente.

## Fluxo de Deploy Seguro

- `git checkout develop`
- Merge de features via PR → `develop` (CI deve passar).
- Release: crie PR `develop → main`, aprove e merge.
- Tag: `git tag vX.Y.Z && git push origin vX.Y.Z`.

## Verificações Pós-Deploy

- Clonar em máquina limpa e executar `npm ci && npm run dev`.
- Validar dashboard em `http://localhost:5173` e API de backend.
- Revisar logs e alertas do CodeQL.
