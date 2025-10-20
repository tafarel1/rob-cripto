import os
import sys
import json
import time
from pathlib import Path
from collections import deque

import streamlit as st

# Dependências opcionais para gráficos e métricas
try:
    import pandas as pd
except Exception:
    pd = None
try:
    import plotly.express as px
except Exception:
    px = None
try:
    import psutil
except Exception:
    psutil = None

PROJECT_ROOT = Path(__file__).parent
ENV_PATH = PROJECT_ROOT / ".env"
ENV_EXAMPLE_PATH = PROJECT_ROOT / ".env.example"
DEFAULT_EVENTS_PATH = PROJECT_ROOT / "data" / "events_{date}.jsonl"
COLLECTOR_PID = PROJECT_ROOT / "collector.pid"

from dark_theme import apply_dark_theme, navigation_dock, cosmic_frame, stellar_card, quasar_button

apply_dark_theme(page_title="SMC Sentinel", layout="wide", sidebar_expanded=True)
# CSS adicional: div escura e span com letras brancas
st.markdown(
    """
    <style>
      .dark-div {
        background: #1a1a2e !important;
        color: #f8fafc !important;
        border: 1px solid rgba(99,102,241,0.22);
        box-shadow: 0 16px 40px rgba(0,0,0,0.5), inset 0 0 12px rgba(99,102,241,0.08);
        border-radius: 14px;
        padding: 0.8rem 1rem;
        margin-bottom: 0.8rem;
      }
      .dark-div span { color: #f8fafc !important; }
      span { color: #f8fafc !important; }
    </style>
    """,
    unsafe_allow_html=True,
)
# Header usando div + span
st.markdown("<div class='dark-div'><span>SMC Sentinel — Painel de Monitoramento</span></div>", unsafe_allow_html=True)

# Estado da sessão
if "events_cache" not in st.session_state:
    st.session_state["events_cache"] = deque(maxlen=2000)
if "is_collecting" not in st.session_state:
    st.session_state["is_collecting"] = False

# Utilidades

def read_env(path: Path) -> dict:
    data = {}
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            if not line.strip() or line.strip().startswith("#"):
                continue
            if "=" in line:
                k, v = line.split("=", 1)
                data[k.strip()] = v.strip()
    return data


def write_env(path: Path, data: dict) -> None:
    lines = ["# .env gerado via UI do SMC Sentinel"]
    for k, v in data.items():
        lines.append(f"{k}={v}")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def get_events_path(env: dict) -> Path:
    p = env.get("SMC_JSONL_PATH", str(DEFAULT_EVENTS_PATH))
    today = time.strftime("%Y-%m-%d")
    p = p.replace("{date}", today)
    return Path(p).resolve() if not Path(p).is_absolute() else Path(p)


def tail_jsonl(path: Path, limit: int = 500) -> list:
    """Lê as últimas linhas de um arquivo JSONL (resiliente)."""
    if not path.exists():
        return []
    records = deque(maxlen=limit)
    try:
        with path.open("r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                    records.append(obj)
                except Exception:
                    # ignora linhas corrompidas
                    continue
    except Exception:
        return list(records)
    return list(records)


def run_command(cmd: list, cwd: Path | None = None, shell: bool = False) -> tuple[str, str, int]:
    import subprocess
    try:
        proc = subprocess.run(cmd, cwd=str(cwd) if cwd else None, capture_output=True, text=True, shell=shell)
        return proc.stdout, proc.stderr, proc.returncode
    except Exception as e:
        return "", str(e), 1


def start_collector() -> tuple[bool, str]:
    """Inicia o coletor em processo separado e salva o PID."""
    import subprocess
    python_exe = sys.executable
    target = PROJECT_ROOT / "smc_sentinel" / "run_collector.py"
    if not target.exists():
        return False, "Arquivo run_collector.py nao encontrado."
    try:
        proc = subprocess.Popen([python_exe, str(target)], cwd=str(PROJECT_ROOT))
        COLLECTOR_PID.write_text(str(proc.pid), encoding="utf-8")
        st.session_state["is_collecting"] = True
        return True, f"Coletor iniciado com PID {proc.pid}"
    except Exception as e:
        return False, str(e)


def stop_collector() -> tuple[bool, str]:
    """Para o coletor se existir PID salvo (Windows)."""
    try:
        if COLLECTOR_PID.exists():
            pid = COLLECTOR_PID.read_text(encoding="utf-8").strip()
            out, err, code = run_command(["taskkill", "/PID", pid, "/F"], cwd=PROJECT_ROOT)
            COLLECTOR_PID.unlink(missing_ok=True)
            st.session_state["is_collecting"] = False
            if code == 0:
                return True, f"Coletor finalizado (PID {pid})."
            return False, err or out
        return False, "PID do coletor nao encontrado."
    except Exception as e:
        return False, str(e)


# Sidebar de navegação
page = navigation_dock(
    ["Dashboard", "Coletor", "Dados", "Sistema", "Configuracao"],
    title="Navegação",
    default="Dashboard",
)

# Carrega env
env = read_env(ENV_PATH if ENV_PATH.exists() else ENV_EXAMPLE_PATH)

# Seção: Dashboard
if page == "Dashboard":
    with stellar_card("Visão Geral"):
        cols = st.columns(4)
        # Métricas de sistema
        cpu_text = mem_text = "N/D"
        if psutil:
            cpu = psutil.cpu_percent(interval=0.2)
            mem = psutil.virtual_memory()
            cpu_text = f"{cpu:.1f}%"
            mem_text = f"{mem.percent:.1f}%"
        cols[0].metric("CPU", cpu_text)
        cols[1].metric("Memoria", mem_text)
        cols[2].metric("Coletor", "Online" if st.session_state.get("is_collecting") else "Offline")
        events_path = get_events_path(env)
        cols[3].metric("Arquivo Eventos", events_path.name)

    with stellar_card("Eventos Recentes"):
        st.subheader("Logs/Eventos recentes")
        events = tail_jsonl(events_path, limit=300)
        st.caption(f"Mostrando {len(events)} eventos recentes de {events_path}")
        if events:
            # Tabela simples
            st.dataframe(events[-50:])

            # Gráfico de preço se possível
            if pd and px:
                df = pd.json_normalize(events)
                ts_col = next((c for c in df.columns if "time" in c.lower() or "timestamp" in c.lower()), None)
                price_col = next((c for c in df.columns if c.lower() in ("price", "close", "last", "best_bid") ), None)
                symbol_col = next((c for c in df.columns if "symbol" in c.lower() or "pair" in c.lower()), None)
                if ts_col and price_col:
                    fig = px.line(df.sort_values(ts_col), x=ts_col, y=price_col, color=symbol_col)
                    fig.update_layout(height=300, margin=dict(l=10, r=10, t=20, b=10))
                    st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("Nenhum evento encontrado ainda. Ajuste SMC_JSONL_PATH em Configuracao.")

# Seção: Coletor
elif page == "Coletor":
    st.subheader("Controle do Coletor")
    c1, c2 = st.columns(2)
    with c1:
        if quasar_button("Iniciar Coleta"):
            ok, msg = start_collector()
            (st.success if ok else st.error)(msg)
    with c2:
        if quasar_button("Parar Coleta", key="stop"):
            ok, msg = stop_collector()
            (st.success if ok else st.error)(msg)

    st.divider()
    st.subheader("Selecao de Pares e Intervalos")
    # Ajuste de símbolos via env (apenas exibição por ora)
    b_syms = env.get("SMC_SYMBOLS_BINANCE", "BTCUSDT,ETHUSDT").split(",")
    c_syms = env.get("SMC_SYMBOLS_COINBASE", "BTC-USD,ETH-USD").split(",")
    st.write("Binance:", b_syms)
    st.write("Coinbase:", c_syms)
    st.caption("Edite pares na secao Configuracao para persistir.")

# Seção: Dados
elif page == "Dados":
    st.subheader("Visualizacao de Dados")
    events_path = get_events_path(env)
    events = tail_jsonl(events_path, limit=1000)
    if not events:
        st.warning("Sem dados para exibir.")
    else:
        if pd:
            df = pd.json_normalize(events)
            st.dataframe(df.tail(100))
            if px:
                # Gráfico de preços
                ts_col = next((c for c in df.columns if "time" in c.lower() or "timestamp" in c.lower()), None)
                price_col = next((c for c in df.columns if c.lower() in ("price", "close", "last", "best_bid") ), None)
                symbol_col = next((c for c in df.columns if "symbol" in c.lower() or "pair" in c.lower()), None)
                if ts_col and price_col:
                    fig = px.line(df.sort_values(ts_col), x=ts_col, y=price_col, color=symbol_col, title="Preco em Tempo (multi-par)")
                    st.plotly_chart(fig, use_container_width=True)
            # Exportação
            c1, c2 = st.columns(2)
            with c1:
                if st.download_button("Exportar CSV", df.to_csv(index=False).encode("utf-8"), file_name="events_export.csv"):
                    st.success("Exportado CSV.")
            with c2:
                if st.download_button("Exportar JSON", df.to_json(orient="records").encode("utf-8"), file_name="events_export.json"):
                    st.success("Exportado JSON.")
        else:
            st.write(events[-50:])

# Seção: Sistema
elif page == "Sistema":
    st.subheader("Scripts de Deploy e Status")
    c1, c2 = st.columns(2)
    with c1:
        if quasar_button("Executar deploy.ps1", key="run-deploy-ps1"):
            out, err, code = run_command(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(PROJECT_ROOT / "deploy.ps1")])
            st.code(out or err or "(sem saida)")
            st.caption(f"Exit code: {code}")
    with c2:
        if quasar_button("Executar deploy-auto.bat", key="run-deploy-bat"):
            out, err, code = run_command(["cmd", "/c", str(PROJECT_ROOT / "deploy-auto.bat")])
            st.code(out or err or "(sem saida)")
            st.caption(f"Exit code: {code}")

    st.divider()
    st.subheader("Servicos Windows (NSSM / Tarefas)")
    svc_name = st.text_input("Nome do Servico (NSSM)", value="smc_sentinel_service")
    if st.button("Consultar Servico"):
        out, err, code = run_command(["sc", "query", svc_name])
        st.code(out or err)
    task_name = st.text_input("Nome da Tarefa Agendada", value="smc_sentinel_task")
    if st.button("Consultar Tarefa"):
        out, err, code = run_command(["schtasks", "/Query", "/TN", task_name])
        st.code(out or err)

# Seção: Configuração
elif page == "Configuracao":
    st.subheader("Edicao Visual do .env")
    current = env.copy()
    # Campos principais
    log_level = st.selectbox("SMC_LOG_LEVEL", ["DEBUG", "INFO", "WARNING", "ERROR"], index=["DEBUG","INFO","WARNING","ERROR"].index(current.get("SMC_LOG_LEVEL", "INFO")))
    sink = st.selectbox("SMC_SINK", ["console", "jsonl"], index=["console","jsonl"].index(current.get("SMC_SINK", "jsonl")))
    jsonl_path = st.text_input("SMC_JSONL_PATH", value=current.get("SMC_JSONL_PATH", str(DEFAULT_EVENTS_PATH)))
    rotate_daily = st.checkbox("SMC_JSONL_ROTATE_DAILY", value=(current.get("SMC_JSONL_ROTATE_DAILY", "true").lower() == "true"))
    stats_interval = st.number_input("SMC_STATS_INTERVAL", min_value=5, max_value=600, value=int(float(current.get("SMC_STATS_INTERVAL", "30"))))

    st.divider()
    st.subheader("Credenciais de Exchanges")
    b_key = st.text_input("BINANCE_API_KEY", value=current.get("BINANCE_API_KEY", ""))
    b_sec = st.text_input("BINANCE_API_SECRET", value=current.get("BINANCE_API_SECRET", ""))
    c_key = st.text_input("COINBASE_API_KEY", value=current.get("COINBASE_API_KEY", ""))
    c_sec = st.text_input("COINBASE_API_SECRET", value=current.get("COINBASE_API_SECRET", ""))
    c_pass = st.text_input("COINBASE_PASSPHRASE", value=current.get("COINBASE_PASSPHRASE", ""))

    st.divider()
    st.subheader("Pares e Orderbook")
    b_syms = st.text_input("SMC_SYMBOLS_BINANCE (comma)", value=current.get("SMC_SYMBOLS_BINANCE", "BTCUSDT,ETHUSDT"))
    c_syms = st.text_input("SMC_SYMBOLS_COINBASE (comma)", value=current.get("SMC_SYMBOLS_COINBASE", "BTC-USD,ETH-USD"))
    ob_level = st.number_input("SMC_ORDERBOOK_LEVEL", min_value=1, max_value=100, value=int(current.get("SMC_ORDERBOOK_LEVEL", "10")))
    ob_period = st.number_input("SMC_ORDERBOOK_PERIOD", min_value=1.0, max_value=3600.0, value=float(current.get("SMC_ORDERBOOK_PERIOD", "20.0")))

    if st.button("Salvar .env", type="primary"):
        new_env = {
            "SMC_LOG_LEVEL": log_level,
            "SMC_SINK": sink,
            "SMC_JSONL_PATH": jsonl_path,
            "SMC_JSONL_ROTATE_DAILY": str(rotate_daily).lower(),
            "SMC_STATS_INTERVAL": str(stats_interval),
            "BINANCE_API_KEY": b_key,
            "BINANCE_API_SECRET": b_sec,
            "COINBASE_API_KEY": c_key,
            "COINBASE_API_SECRET": c_sec,
            "COINBASE_PASSPHRASE": c_pass,
            "SMC_SYMBOLS_BINANCE": b_syms,
            "SMC_SYMBOLS_COINBASE": c_syms,
            "SMC_ORDERBOOK_LEVEL": str(ob_level),
            "SMC_ORDERBOOK_PERIOD": str(ob_period),
        }
        try:
            # Backup antes de salvar
            if ENV_PATH.exists():
                backup = PROJECT_ROOT / f".env.backup.{int(time.time())}"
                ENV_PATH.replace(backup)
                backup.write_text(backup.read_text(encoding="utf-8"), encoding="utf-8")
            write_env(ENV_PATH, new_env)
            st.success(f".env salvo em {ENV_PATH}")
        except Exception as e:
            st.error(f"Falha ao salvar .env: {e}")

st.caption("© SMC Sentinel — Interface MVP em Streamlit")