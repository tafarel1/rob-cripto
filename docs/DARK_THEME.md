# SMC Sentinel — Dark Theme (Sistema Dark-Only)

Este documento descreve o sistema de tema escuro do SMC Sentinel, sua paleta, componentes e como utilizar no projeto.

## Paleta
- Fundos: `#0a0a0f`, `#0f0f17`, `#1a1a2e`
- Destaques: `#6366f1` (quasar), `#8b5cf6` (pulsar)
- Textos: `#f8fafc`, `#e2e8f0`

## Componentes
- Cosmic Frame: container principal com gradientes, bordas e blur
- Stellar Cards: cartões escuros com sombra e vidro fosco (context manager)
- Quasar Buttons: botões com gradiente e glow
- Navigation Dock: sidebar escura com navegação

## Instalação & Configuração
- Arquivo `dark_theme.py` em `project_root/dark_theme.py`
- Configuração automática do Streamlit em `.streamlit/config.toml` com `base="dark"`

## Uso Básico
```python
from dark_theme import apply_dark_theme, navigation_dock, cosmic_frame, stellar_card, quasar_button

apply_dark_theme(page_title="SMC Sentinel", layout="wide", sidebar_expanded=True)
cosmic_frame("SMC Sentinel — Painel de Monitoramento", subtitle="Observabilidade e Coleta")

page = navigation_dock(["Dashboard","Coletor","Dados","Sistema","Configuracao"], title="Navegação", default="Dashboard")

if page == "Dashboard":
    with stellar_card("Visão Geral"):
        st.metric("CPU", "12.3%")
        st.metric("Memória", "43.1%")

    with stellar_card("Ações"):
        if quasar_button("Iniciar Coleta"):
            ...
```

## Diretrizes de Design
- Tema claro foi removido; o sistema é 100% dark-only.
- Efeitos: gradientes, sombras profundas, bordas suaves e blur de fundo.
- Evite cores fora da paleta; use `--quasar` e `--pulsar` para destaques.

## Integração com Dashboard
- `dashboard.py` já foi atualizado para:
  - chamar `apply_dark_theme()` e `cosmic_frame()` no topo
  - usar `navigation_dock()` na sidebar
  - envolver seções em `stellar_card()`
  - usar `quasar_button()` para botões de ação

## Ajustes Futuros
- Adicionar tema de gráficos (Plotly) sincronizado com paleta escura
- Componentes extra: toasts, modais e tabs escuros

## Suporte
- Em caso de problemas de estilo, verifique `.streamlit/config.toml`
- O CSS é injetado via `st.markdown(<style>...)` dentro de `apply_dark_theme()`