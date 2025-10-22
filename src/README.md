# src

Estrutura funcional do código-fonte. Subpastas:
- core: orquestração de trading, serviços e integrações principais
- monitoring: módulos de monitoramento e visualização
- detection: geração de sinais, análise e indicadores
- alerting: sistema de alertas, thresholds e notificações
- config: modelos e carregamento de configurações
- utils: utilitários e helpers (retry, rate limit, logging)

Nota: Nesta fase mantemos o pacote Python existente (`smc_sentinel`) para garantir compatibilidade. Esta pasta estrutura o projeto por funcionalidade, servindo como destino planejado para migrações futuras.