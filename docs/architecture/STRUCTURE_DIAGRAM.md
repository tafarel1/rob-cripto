# Diagrama de Estrutura

```mermaid
flowchart TD
    A[Root: smc_sentinel] --> B[src]
    A --> C[docs]
    A --> D[scripts]
    A --> E[tests]
    A --> F[config]
    A --> G[assets]

    B --> B1[core]
    B --> B2[monitoring]
    B --> B3[detection]
    B --> B4[alerting]
    B --> B5[config]
    B --> B6[utils]

    C --> C1[api]
    C --> C2[deployment]
    C --> C3[architecture]

    D --> D1[deployment]
    D --> D2[maintenance]
    D --> D3[database]

    F --> F1[environments]
    F --> F2[security]

    G --> G1[images]
    G --> G2[logs]
    G --> G3[temp]
```

Notas:
- `smc_sentinel` (pacote Python) permanece por compatibilidade; `src` define organização por funcionalidade para migrações futuras.
- `docs` foi reorganizado em `api`, `deployment` e `architecture`.