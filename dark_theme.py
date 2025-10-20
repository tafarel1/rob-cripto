"""
SMC Sentinel — Dark Theme System (dark-only)

Este módulo aplica um tema escuro completo ao Streamlit e fornece
componentes de UI prontos para uso:

- Cosmic Frame: container principal com gradiente, glow e blur
- Stellar Cards: cartões escuros com sombras e vidro fosco
- Quasar Buttons: botões com gradiente e brilho pulsante
- Navigation Dock: sidebar escura com navegação

Paleta:
- Fundos: #0a0a0f, #0f0f17, #1a1a2e
- Destaques: #6366f1 (quasar), #8b5cf6 (pulsar)
- Textos: #f8fafc, #e2e8f0

Uso básico:
    from dark_theme import apply_dark_theme, navigation_dock, cosmic_frame, stellar_card, quasar_button

    apply_dark_theme(page_title="SMC Sentinel")
    cosmic_frame("SMC Sentinel — Painel")
    page = navigation_dock(["Dashboard","Coletor","Dados","Sistema","Configuracao"]) 

    with stellar_card(title="Métricas"):
        st.metric("CPU", "12.3%")
        quasar_button("Ação Primária")

Configuração automática: cria .streamlit/config.toml com base=dark.
"""
from __future__ import annotations
import textwrap
from pathlib import Path
import streamlit as st

PROJECT_ROOT = Path(__file__).parent

CSS = f"""
:root {{
  --bg-0: #0a0a0f;
  --bg-1: #0f0f17;
  --bg-2: #1a1a2e;
  --text-0: #f8fafc;
  --text-1: #e2e8f0;
  --quasar: #6366f1;
  --pulsar: #8b5cf6;
}}

/* Reset geral para dark-only */
html, body, .stApp {{
  background: radial-gradient(1000px 600px at 80% -10%, rgba(99,102,241,0.08), transparent),
              radial-gradient(800px 400px at 10% 0%, rgba(139,92,246,0.07), transparent),
              linear-gradient(180deg, var(--bg-0), var(--bg-1));
  color: var(--text-0);
}}

/* Container principal */
.main .block-container {{
  background: linear-gradient(180deg, rgba(10,10,15,0.85), rgba(15,15,23,0.92));
  backdrop-filter: blur(6px);
  border: 1px solid rgba(99,102,241,0.18);
  box-shadow: 0 25px 60px rgba(0,0,0,0.6), inset 0 0 14px rgba(99,102,241,0.08);
  border-radius: 16px;
  padding: 1.25rem 1.5rem;
}}

/* Tipografia */
.stMarkdown p, .stMarkdown, .stText, .stCaption, .stHeader h1, .stHeader h2, h1, h2, h3, h4, h5, h6 {{
  color: var(--text-0) !important;
}}

/* Sidebar (Navigation Dock) */
section[data-testid="stSidebar"] > div {{
  background: linear-gradient(180deg, rgba(15,15,23,0.95), rgba(26,26,46,0.98));
  color: var(--text-1);
  border-right: 1px solid rgba(99,102,241,0.2);
  box-shadow: 0 0 24px rgba(99,102,241,0.1);
}}
section[data-testid="stSidebar"] [data-testid="stMarkdownContainer"] * {{ color: var(--text-1) !important; }}

/* Botões (Quasar) */
.stButton > button {{
  color: var(--text-0);
  background: linear-gradient(135deg, var(--quasar), var(--pulsar));
  border: 1px solid rgba(99,102,241,0.45);
  box-shadow: 0 10px 24px rgba(99,102,241,0.35), 0 0 0 2px rgba(139,92,246,0.25) inset;
  border-radius: 12px;
  padding: 0.6rem 1rem;
}}
.stButton > button:hover {{
  box-shadow: 0 0 28px rgba(139,92,246,0.45);
  filter: brightness(1.05);
}}
.stButton > button:active {{
  transform: translateY(1px);
}}

/* Cards (Stellar) */
.stellar-card {{
  background: linear-gradient(180deg, rgba(15,15,23,0.85), rgba(26,26,46,0.9));
  border: 1px solid rgba(226,232,240,0.06);
  box-shadow: 0 8px 24px rgba(0,0,0,0.45), 0 0 32px rgba(99,102,241,0.12);
  border-radius: 14px;
  backdrop-filter: blur(6px);
  padding: 1rem 1.25rem;
  margin-bottom: 1rem;
}}
.stellar-card .title {{
  color: var(--text-0);
  font-weight: 600;
  letter-spacing: 0.3px;
  margin-bottom: 0.5rem;
}}

/* Métricas */
div[data-testid="metric-container"] {{
  background: linear-gradient(180deg, rgba(26,26,46,0.5), rgba(15,15,23,0.6));
  border: 1px solid rgba(99,102,241,0.2);
  border-radius: 12px;
  padding: 0.5rem 0.75rem;
}}

/* Tabelas/Dataframe */
[data-testid="stTable"] {{ filter: brightness(0.92); }}
[data-testid="StyledDataFrame"] {{
  background: linear-gradient(180deg, rgba(26,26,46,0.45), rgba(15,15,23,0.55));
  border: 1px solid rgba(99,102,241,0.18);
  border-radius: 12px;
}}

/* Cosmic Frame (hero) */
.cosmic-frame {{
  position: relative;
  background: radial-gradient(800px 400px at 20% -10%, rgba(99,102,241,0.18), transparent),
              radial-gradient(700px 360px at 80% -10%, rgba(139,92,246,0.16), transparent),
              linear-gradient(180deg, rgba(10,10,15,0.8), rgba(15,15,23,0.92));
  border: 1px solid rgba(99,102,241,0.24);
  box-shadow: 0 30px 70px rgba(0,0,0,0.6), inset 0 0 18px rgba(99,102,241,0.10);
  border-radius: 18px;
  padding: 1.2rem 1.4rem;
  margin-bottom: 1rem;
}}
.cosmic-frame .title {{
  color: var(--text-0);
  font-size: 1.25rem;
  font-weight: 700;
}}
.cosmic-frame .subtitle {{ color: var(--text-1); font-size: 0.95rem; }}
"""


def _write_config_toml() -> None:
    cfg_dir = PROJECT_ROOT / ".streamlit"
    cfg_dir.mkdir(parents=True, exist_ok=True)
    cfg_file = cfg_dir / "config.toml"
    content = textwrap.dedent(
        """
        [theme]
        base = "dark"
        primaryColor = "#6366f1"
        backgroundColor = "#0a0a0f"
        secondaryBackgroundColor = "#0f0f17"
        textColor = "#f8fafc"
        """
    ).strip() + "\n"
    try:
        if (not cfg_file.exists()) or (cfg_file.read_text(encoding="utf-8") != content):
            cfg_file.write_text(content, encoding="utf-8")
    except Exception:
        # Silencioso: CSS abaixo garante dark-only mesmo sem arquivo
        pass


def apply_dark_theme(page_title: str = "SMC Sentinel", layout: str = "wide", sidebar_expanded: bool = True, auto_config: bool = True) -> None:
    """Aplica tema escuro e injeta CSS/JS de componentes dark-only.
    Deve ser chamado antes de qualquer render de conteúdo principal.
    """
    if auto_config:
        _write_config_toml()
    st.set_page_config(page_title=page_title, layout=layout, initial_sidebar_state=("expanded" if sidebar_expanded else "auto"))
    st.markdown(f"<style>{CSS}</style>", unsafe_allow_html=True)


def cosmic_frame(title: str, subtitle: str | None = None) -> None:
    st.markdown(
        f"""
        <div class="cosmic-frame">
          <div class="title">{title}</div>
          {f'<div class="subtitle">{subtitle}</div>' if subtitle else ''}
        </div>
        """,
        unsafe_allow_html=True,
    )


class _CardCtx:
    def __init__(self, title: str | None = None):
        self.title = title
    def __enter__(self):
        st.markdown("<div class='stellar-card'>" + (f"<div class='title'>{self.title}</div>" if self.title else ""), unsafe_allow_html=True)
        return self
    def __exit__(self, exc_type, exc, tb):
        st.markdown("</div>", unsafe_allow_html=True)


def stellar_card(title: str | None = None) -> _CardCtx:
    """Context manager para criar um card escuro estilizado.
    Uso:
        with stellar_card("Métricas"):
            st.metric("CPU", "42%")
    """
    return _CardCtx(title)


def quasar_button(label: str, key: str | None = None) -> bool:
    """Botão estilizado global (override de .stButton)."""
    return st.button(label, key=key)


def navigation_dock(items: list[str], title: str = "Navegação", default: str | None = None) -> str:
    """Sidebar escura com navegação.
    Retorna o item selecionado.
    """
    st.sidebar.markdown(f"**{title}**")
    index = 0
    if default and default in items:
        index = items.index(default)
    selected = st.sidebar.radio("Selecione a seção", items, index=index)
    return selected