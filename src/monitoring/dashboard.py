import os
import sys
import json
import time
from pathlib import Path
from collections import deque

import streamlit as st
from smc_sentinel.monitoring.realtime.performance_tracker import AdvancedPerformanceTracker
from smc_sentinel.config.settings import TradingSettings

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
    import plotly.graph_objects as go
except Exception:
    go = None
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
    ["Dashboard", "Exchanges", "Coletor", "Dados", "Extensibilidade", "Migração", "Sistema", "Configuracao"],
    title="Navegação",
    default="Dashboard",
)

# Carrega env
env = read_env(ENV_PATH if ENV_PATH.exists() else ENV_EXAMPLE_PATH)

# Seção: Dashboard
if page == "Dashboard":
    # Paleta de cores trading
    trading_colors = {
        "primary": "#2563eb",
        "success": "#10b981",
        "danger": "#ef4444",
        "warning": "#f59e0b",
        "background": "#0f172a",
        "card": "#1e293b",
        "text_primary": "#f8fafc",
    }

    # Inicializa tracker avançado na sessão
    if "adv_tracker" not in st.session_state:
        st.session_state["adv_tracker"] = AdvancedPerformanceTracker({
            "max_daily_loss": 0.03,
            "loss_streak_alert": 5,
            "min_win_rate": 0.4,
            "min_trades_for_winrate": 10,
            "initial_balance": 10000,
        })
    tracker = st.session_state["adv_tracker"]

    # Leitura de métricas/alertas de runtime
    RUNTIME_DIR = PROJECT_ROOT / "runtime"
    PERF_PATH = RUNTIME_DIR / "performance.json"
    ALERTS_PATH = RUNTIME_DIR / "alerts.json"

    def read_json_file(path: Path) -> dict | None:
        try:
            if path.exists():
                with open(path, "r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception:
            return None
        return None

    # Funções de componentes reutilizáveis
    def metric_card(title: str, value: str, change: str | None = None, trend: str = "neutral"):
        c = st.container()
        with c:
            col1, col2 = st.columns([3, 1])
            col1.markdown(f"**{title}**")
            if change is not None:
                col2.markdown(f"<span style='color:{trading_colors['success'] if str(change).startswith('+') else trading_colors['danger']}'>{change}</span>", unsafe_allow_html=True)
            st.metric(label="", value=value)
        return c

    def price_display(symbol: str, price: float, change: float, size: str = "medium"):
        color = trading_colors['success'] if change > 0 else trading_colors['danger']
        st.markdown(f"<span style='color:{trading_colors['text_primary']};font-weight:600'>{symbol}</span>", unsafe_allow_html=True)
        st.markdown(f"<span style='color:{color};font-size:1.2rem'>${price:,.2f} ({change:+.2f}%)</span>", unsafe_allow_html=True)

    def calculate_depth(bids: list[float], asks: list[float]) -> dict:
        return {
            "bid_volume": sum(bids) if bids else 0.0,
            "ask_volume": sum(asks) if asks else 0.0,
        }

    def order_book(bids: list[float], asks: list[float], spread: float):
        depth = calculate_depth(bids, asks)
        st.write({"bids": sorted(bids, reverse=True)[:10], "asks": sorted(asks)[:10], "spread": spread, "depth": depth})

    # Gráficos
    def interactive_candlestick():
        events_path = get_events_path(env)
        events = tail_jsonl(events_path, limit=500)
        if not events or not pd:
            st.info("Sem dados suficientes para gráfico de preço.")
            return
        df = pd.json_normalize(events)
        ts_col = next((c for c in df.columns if "time" in c.lower() or "timestamp" in c.lower()), None)
        price_col = next((c for c in df.columns if c.lower() in ("price", "close", "last", "best_bid") ), None)
        if ts_col and price_col and px:
            fig = px.line(df.sort_values(ts_col), x=ts_col, y=price_col, title="Preço em Tempo")
            fig.update_layout(height=360, margin=dict(l=10, r=10, t=20, b=10))
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.line_chart(df[price_col] if price_col in df.columns else df.iloc[:,0])

    def equity_curve():
        # Usa histórico de retornos do tracker como proxy
        if not tracker.returns_history:
            st.info("Sem histórico de retornos para equity curve.")
            return
        if px:
            cum = []
            acc = 0.0
            for r in tracker.returns_history:
                acc += r
                cum.append(acc)
            fig = px.line(y=cum, title="Equity Curve (acumulado)")
            fig.update_layout(height=300, margin=dict(l=10, r=10, t=10, b=10))
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.line_chart(tracker.returns_history)

    def portfolio_allocation():
        alloc = {"BTC": 50, "ETH": 30, "USDT": 20}
        if px:
            fig = px.pie(names=list(alloc.keys()), values=list(alloc.values()), title="Alocação de Portfolio")
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.bar_chart(alloc)

    def risk_exposure():
        st.progress(min(int(tracker.metrics.get('max_drawdown', 0.0) * 100), 100), text="Max Drawdown")
        st.caption(f"Profit Factor: {tracker.metrics.get('profit_factor'):.2f} | Sharpe: {tracker.metrics.get('sharpe_ratio'):.2f}")

    # Painel de controle de estratégias
    def strategy_status_grid():
        ts = TradingSettings()
        strategies = ts.ENABLED_STRATEGIES
        st.table({"Strategy": strategies, "Status": ["running" if ts.TRADING_ENABLED else "stopped"] * len(strategies)})

    def action_buttons():
        c1, c2, c3 = st.columns(3)
        if c1.button("Iniciar Trading"):
            st.session_state["trading_enabled"] = True
        if c2.button("Parar Trading"):
            st.session_state["trading_enabled"] = False
        c3.button("Rebalancear")

    def parameter_sliders():
        st.slider("Risk %", min_value=0.1, max_value=5.0, value=1.0)
        st.slider("Posição Máxima", min_value=0.01, max_value=1.0, value=0.1)
        st.selectbox("Timeframe Primário", ["1m", "5m", "15m", "1h", "4h", "1d"], index=2)

    def strategy_performance():
        st.metric("Win Rate", f"{tracker.metrics.get('win_rate', 0.0)*100:.1f}%")
        st.metric("Profit Factor", f"{tracker.metrics.get('profit_factor', 0.0):.2f}")

    # Sistema de alertas
    def alert_feed():
        data = read_json_file(ALERTS_PATH)
        alerts = []
        if data and isinstance(data.get("alerts"), list):
            alerts = data["alerts"]
        else:
            alerts = tracker.generate_performance_alerts()
        if not alerts:
            st.success("Sem alertas ativos.")
        else:
            for a in alerts:
                st.warning(a)

    def alert_settings():
        st.number_input("Max Daily Loss", min_value=0.005, max_value=0.10, value=0.03, step=0.005)
        st.number_input("Loss Streak Alert", min_value=2, max_value=10, value=5, step=1)

    def notification_preferences():
        st.checkbox("Enviar notificações por e-mail", value=False)
        st.checkbox("Enviar notificações por Telegram", value=False)

    # Layout principal com abas
    main_tabs = ["📈 Visão Geral", "💰 Portfolio", "📊 Mercado", "⚡ Trading", "🛡️ Risco", "📋 Relatórios"]
    tabs = st.tabs(main_tabs)

    # Visão Geral
    with tabs[0]:
        with stellar_card("Métricas em Tempo Real"):
            cols = st.columns(4)
            cpu_text = mem_text = "N/D"
            if psutil:
                cpu = psutil.cpu_percent(interval=0.2)
                mem = psutil.virtual_memory()
                cpu_text = f"{cpu:.1f}%"
                mem_text = f"{mem.percent:.1f}%"

            # Carregar métricas de performance do runtime se disponíveis
            perf_data = read_json_file(PERF_PATH) or {}
            daily_pnl_val = float(perf_data.get("daily_pnl", tracker.metrics.get('daily_pnl', 0.0)))
            win_rate_val = float(perf_data.get("win_rate", tracker.metrics.get('win_rate', 0.0)))

            with cols[0]:
                metric_card("CPU", cpu_text, None, "neutral")
            with cols[1]:
                metric_card("Memória", mem_text, None, "neutral")
            with cols[2]:
                metric_card("P&L Diário", f"R$ {daily_pnl_val:,.2f}", None, "neutral")
            with cols[3]:
                metric_card("Win Rate", f"{win_rate_val*100:.1f}%", None, "neutral")

        with stellar_card("Alertas de Performance (runtime)"):
            alerts_data = read_json_file(ALERTS_PATH) or {}
            alerts = alerts_data.get("alerts", []) if isinstance(alerts_data, dict) else []
            if not alerts:
                st.success("Sem alertas de runtime.")
            else:
                for a in alerts[:5]:
                    st.warning(str(a))

    # Portfolio
    with tabs[1]:
        with stellar_card("Resumo do Portfolio"):
            portfolio_allocation()

    # Mercado
    with tabs[2]:
        with stellar_card("Preço / Gráficos"):
            interactive_candlestick()
        with stellar_card("Order Book"):
            order_book([100, 200, 300], [110, 210, 310], spread=10)

    # Trading
    with tabs[3]:
        with stellar_card("Controle de Estratégias"):
            strategy_status_grid()
            action_buttons()
            parameter_sliders()
        with stellar_card("Performance Estratégias"):
            strategy_performance()

    # Risco
    with tabs[4]:
        with stellar_card("Exposição e Risco"):
            risk_exposure()
        with stellar_card("Alertas"):
            alert_feed()
            alert_settings()
            notification_preferences()

    # Relatórios
    with tabs[5]:
        with stellar_card("Equity Curve"):
            equity_curve()

# Seção: Exchanges
elif page == "Exchanges":
    st.subheader("Dashboard Comparativo das Exchanges")
    METRICS_PATH = PROJECT_ROOT / "runtime" / "metrics_trading.json"
    EVENTS_PATH = PROJECT_ROOT / "runtime" / "events.jsonl"

    def read_json_file(path: Path) -> dict | None:
        try:
            if path.exists():
                with open(path, "r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception:
            return None
        return None

    data = read_json_file(METRICS_PATH) or {}
    bex = data.get("by_exchange", {}) if isinstance(data, dict) else {}
    ext = data.get("extensibility", {}) if isinstance(data, dict) else {}

    with stellar_card("Métricas side-by-side"):
        rows = []
        for ex, v in bex.items():
            po = v.get("place_order", {}) or {}
            fa = v.get("fee_accuracy", {}) or {}
            rows.append({
                "exchange": ex or "(desconhecida)",
                "success_rate": float(v.get("success_rate", 0.0)),
                "avg_fill_time_s": float(v.get("avg_fill_time_s", 0.0)),
                "buy_success_rate": float(((v.get("by_side", {}) or {}).get("buy", {}) or {}).get("success_rate", 0.0) or 0.0),
                "sell_success_rate": float(((v.get("by_side", {}) or {}).get("sell", {}) or {}).get("success_rate", 0.0) or 0.0),
                "po_success_rate": float(po.get("success_rate", 0.0)),
                "po_avg_latency_s": float(po.get("avg_latency_s", 0.0)),
                "fee_mean_abs_pct": float(fa.get("mean_abs_pct", 0.0)),
                "fee_samples": int(fa.get("samples", 0)),
            })
        if pd and rows:
            df = pd.DataFrame(rows)
            st.dataframe(df)
        else:
            st.write(rows)

    with stellar_card("Tendências ao longo do tempo"):
        def _load_events(path: Path) -> list[dict]:
            evs: list[dict] = []
            try:
                with path.open("r", encoding="utf-8") as fh:
                    for line in fh:
                        line = line.strip()
                        if not line:
                            continue
                        try:
                            obj = json.loads(line)
                            if isinstance(obj, dict):
                                evs.append(obj)
                        except Exception:
                            pass
            except Exception:
                pass
            return evs

        def _success_series(events: list[dict], window_secs: int = 300) -> dict[str, list[tuple[float, float]]]:
            by_ts: dict[str, list[tuple[float, int, int]]] = {}
            for ev in events:
                ts = float(ev.get("ts", time.time()))
                tmin = int(ts // 60) * 60
                t = ev.get("type")
                ex = ""
                if t == "order_fill":
                    ex = str((ev.get("payload", {}) or {}).get("exchange", ""))
                    s = 1
                    f = 0
                elif t in ("order_fill_timeout", "order_fill_error"):
                    ex = str((ev.get("payload", {}) or {}).get("exchange", ""))
                    s = 0
                    f = 1
                else:
                    continue
                if not ex:
                    continue
                by_ts.setdefault(ex, [])
                by_ts[ex].append((float(tmin), int(s), int(f)))
            series: dict[str, list[tuple[float, float]]] = {}
            for ex, entries in by_ts.items():
                bucket: dict[float, tuple[int, int]] = {}
                for tm, s, f in entries:
                    cur = bucket.get(tm, (0, 0))
                    bucket[tm] = (cur[0] + s, cur[1] + f)
                xs = sorted(bucket.items(), key=lambda x: x[0])
                series_list: list[tuple[float, float]] = []
                wins: list[tuple[float, int, int]] = []
                for tm, (s, f) in xs:
                    wins.append((tm, s, f))
                    while len(wins) > 0 and (tm - wins[0][0]) > window_secs:
                        wins.pop(0)
                    ssum = sum(w[1] for w in wins)
                    fsum = sum(w[2] for w in wins)
                    denom = max(ssum + fsum, 1)
                    series_list.append((tm, float(ssum) / float(denom)))
                series[ex] = series_list
            return series

        events = _load_events(EVENTS_PATH)
        sr = _success_series(events)
        if go and sr:
            fig = go.Figure()
            for ex, seq in sr.items():
                xs = [time.strftime('%H:%M', time.localtime(t)) for t, _ in seq]
                ys = [v for _, v in seq]
                fig.add_trace(go.Scatter(x=xs, y=ys, mode="lines", name=ex))
            fig.update_layout(title="Success rate (janela móvel)", yaxis=dict(range=[0, 1.0]), height=300, margin=dict(l=10, r=10, t=30, b=10))
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.write(sr if sr else "Sem eventos para tendências.")

    with stellar_card("Alertas de Degradação"):
        alerts = []
        for row in rows:
            if row.get("success_rate", 0.0) < 0.8:
                alerts.append(f"{row['exchange']}: success_rate abaixo de 80% ({row['success_rate']:.2f}).")
            if row.get("avg_fill_time_s", 0.0) > 2.0:
                alerts.append(f"{row['exchange']}: avg_fill_time acima de 2s ({row['avg_fill_time_s']:.2f}s).")
            if row.get("fee_mean_abs_pct", 0.0) > 0.05 and row.get("fee_samples", 0) > 5:
                alerts.append(f"{row['exchange']}: erro absoluto de taxa alto ({row['fee_mean_abs_pct']*100:.1f}%).")
        if alerts:
            for a in alerts:
                st.warning(a)
        else:
            st.success("Sem sinais de degradação com os dados atuais.")

    with stellar_card("Insights para Decisões"):
        def pick_best(items: list[dict], key: str, asc: bool = True) -> dict | None:
            if not items:
                return None
            return sorted(items, key=lambda r: r.get(key, float('inf') if asc else -float('inf')), reverse=(not asc))[0]
        best_perf = pick_best(rows, "po_avg_latency_s", asc=True)
        best_rel = pick_best(rows, "success_rate", asc=False)
        best_fee = pick_best(rows, "fee_mean_abs_pct", asc=True)
        st.write({
            "melhor_performance": (best_perf or {}).get("exchange"),
            "maior_confiabilidade": (best_rel or {}).get("exchange"),
            "menor erro de taxa": (best_fee or {}).get("exchange"),
            "extensibilidade_score": float(ext.get("extensibility_score", 0.0) or 0.0),
            "pollers_registrados": int(ext.get("poller_registry_size", 0) or 0),
            "fees_registrados": int(ext.get("fee_registry_size", 0) or 0),
        })

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

# Seção: Extensibilidade
elif page == "Extensibilidade":
    st.subheader("Comparativo de Performance e Extensibilidade")
    METRICS_PATH = PROJECT_ROOT / "runtime" / "metrics_trading.json"

    def read_json_file(path: Path) -> dict | None:
        try:
            if path.exists():
                with open(path, "r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception:
            return None
        return None

    data = read_json_file(METRICS_PATH) or {}
    if not data:
        st.info("Sem métricas coletadas ainda. Execute o trading para popular.")
    else:
        with stellar_card("Comparativo de Latência (service vs legado)"):
            comp = data.get("comparison", {})
            c1, c2 = st.columns(2)
            c1.metric("Service avg latency", f"{float(comp.get('service_avg_latency_s', 0.0)):.3f}s")
            c2.metric("Legacy avg latency", f"{float(comp.get('legacy_avg_latency_s', 0.0)):.3f}s")
        
        with stellar_card("Sucesso por Exchange e Tipo de Ordem"):
            bex = data.get("by_exchange", {})
            rows = []
            for ex, v in bex.items():
                rows.append({
                    "exchange": ex or "(desconhecida)",
                    "success_rate": float(v.get("success_rate", 0.0)),
                    "avg_fill_time_s": float(v.get("avg_fill_time_s", 0.0)),
                    "buy_success_rate": float(v.get("by_side", {}).get("buy", {}).get("success_rate", 0.0)),
                    "sell_success_rate": float(v.get("by_side", {}).get("sell", {}).get("success_rate", 0.0)),
                    "service_avg_latency_s": float(v.get("path", {}).get("service_avg_latency_s", 0.0)),
                    "legacy_avg_latency_s": float(v.get("path", {}).get("legacy_avg_latency_s", 0.0)),
                })
            if pd and rows:
                df = pd.DataFrame(rows)
                st.dataframe(df)
                if px:
                    fig = px.bar(df, x="exchange", y=["buy_success_rate", "sell_success_rate"], barmode="group", title="Success rate por side")
                    st.plotly_chart(fig, use_container_width=True)
            else:
                st.write(rows)

        with stellar_card("Tempo Médio de Fill"):
            c1, c2 = st.columns(2)
            c1.metric("Global", f"{float(data.get('avg_fill_time_s', 0.0)):.3f}s")
            bex = data.get("by_exchange", {})
            bex_sorted = sorted([(ex, float(v.get("avg_fill_time_s", 0.0))) for ex, v in bex.items()], key=lambda x: x[1])
            st.caption("Top exchanges (menor tempo de fill):")
            for ex, val in bex_sorted[:3]:
                st.write(f"{ex}: {val:.3f}s")

        # Novas métricas: Place Order
        with stellar_card("Place Order por Exchange"):
            bex = data.get("by_exchange", {})
            rows = []
            for ex, v in bex.items():
                po = v.get("place_order", {}) or {}
                rows.append({
                    "exchange": ex or "(desconhecida)",
                    "po_attempts": int(po.get("attempts", 0)),
                    "po_success_rate": float(po.get("success_rate", 0.0)),
                    "po_avg_latency_s": float(po.get("avg_latency_s", 0.0)),
                    "po_failure": int(po.get("failure", 0)),
                    "po_fail_reasons": json.dumps(po.get("fail_reasons", {})),
                })
            if pd and rows:
                df = pd.DataFrame(rows)
                st.dataframe(df)
            else:
                st.write(rows)

        # Novas métricas: Precisão de Taxas
        with stellar_card("Precisão de Taxas (Fee Accuracy)"):
            bex = data.get("by_exchange", {})
            rows = []
            for ex, v in bex.items():
                fa = v.get("fee_accuracy", {}) or {}
                rows.append({
                    "exchange": ex or "(desconhecida)",
                    "samples": int(fa.get("samples", 0)),
                    "mean_abs_pct": float(fa.get("mean_abs_pct", 0.0)),
                    "unknown_samples": int(fa.get("unknown_samples", 0)),
                })
            if pd and rows:
                df = pd.DataFrame(rows)
                st.dataframe(df)
            else:
                st.write(rows)

        with stellar_card("Extensibilidade"):
            ext = data.get("extensibility", {})
            c = st.columns(4)
            c[0].metric("Poller registries", str(ext.get("poller_registry_size", 0)))
            c[1].metric("Fee registries", str(ext.get("fee_registry_size", 0)))
            c[2].metric("Score", f"{float(ext.get('extensibility_score', 0.0)):.2f}")
            c[3].metric("Tentativas", str(data.get("attempts_total", 0)))
            st.write({"pollers": ext.get("poller_registry", []), "fees": ext.get("fee_registry", [])})
            st.caption("Score qualitativo: facilidade de registrar nova exchange (1.0=melhor)")

# Seção: Migração
elif page == "Migração":
    st.subheader("Monitoramento da Migração e Feature Flags")
    METRICS_PATH = PROJECT_ROOT / "runtime" / "metrics_trading.json"
    FF_PATH = PROJECT_ROOT / "runtime" / "feature_flags.json"
    EVENTS_PATH = PROJECT_ROOT / "runtime" / "events.jsonl"

    def read_json_file(path: Path) -> dict | None:
        try:
            if path.exists():
                with open(path, "r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception:
            return None
        return None

    def tail_jsonl(path: Path, limit: int = 500) -> list:
        if not path.exists():
            return []
        from collections import deque as _dq
        records = _dq(maxlen=limit)
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
                        continue
        except Exception:
            pass
        return list(records)

    data = read_json_file(METRICS_PATH) or {}
    mig = data.get("migration", {}) if isinstance(data, dict) else {}
    ff = mig.get("feature_flags") if isinstance(mig, dict) else None
    if ff is None:
        ff = read_json_file(FF_PATH) or {}

    with stellar_card("Status dos Feature Toggles"):
        comps = (ff or {}).get("components", {})
        rows = []
        for name, c in comps.items():
            rows.append({
                "componente": name,
                "modo": c.get("mode"),
                "% rollout": c.get("rollout_pct"),
                "tentativas": c.get("attempts"),
                "sucesso": c.get("success"),
                "falha": c.get("failure"),
                "falhas consecutivas": c.get("consecutive_failures"),
                "rollback ativo": bool(c.get("rollback_active")),
                "rollback até": time.strftime('%H:%M:%S', time.localtime(float(c.get("rollback_until", 0.0)))) if c.get("rollback_until") else "-",
                "erro": c.get("last_error") or "",
            })
        if pd and rows:
            df = pd.DataFrame(rows)
            st.dataframe(df)
        else:
            st.write(rows)

    with stellar_card("Comparativo de Migração (service vs legado)"):
        comp = data.get("comparison", {})
        c1, c2 = st.columns(2)
        c1.metric("Service avg latency", f"{float(comp.get('service_avg_latency_s', 0.0)):.3f}s")
        c2.metric("Legacy avg latency", f"{float(comp.get('legacy_avg_latency_s', 0.0)):.3f}s")
        # Por exchange: tentativas por caminho
        bex = data.get("by_exchange", {})
        rows = []
        for ex, v in bex.items():
            rows.append({
                "exchange": ex,
                "service_attempts": int(v.get("path", {}).get("service_attempts", 0)),
                "legacy_attempts": int(v.get("path", {}).get("legacy_attempts", 0)),
            })
        if pd and rows:
            df = pd.DataFrame(rows)
            st.dataframe(df)
            if px:
                fig = px.bar(df, x="exchange", y=["service_attempts", "legacy_attempts"], barmode="group", title="Tentativas por caminho")
                st.plotly_chart(fig, use_container_width=True)
        else:
            st.write(rows)

    with stellar_card("Logs da Transição (events.jsonl)"):
        evs = tail_jsonl(EVENTS_PATH, limit=300)
        ff_logs = [e for e in evs if isinstance(e, dict) and str(e.get("type")) in ("ff_decision", "ff_rollback")]
        if not ff_logs:
            st.info("Sem eventos de migração registrados.")
        else:
            if pd:
                df = pd.json_normalize(ff_logs)
                st.dataframe(df.tail(60))
            else:
                st.write(ff_logs[-60:])

    st.caption("Os toggles suportam modos legacy/new/auto, rollback automático e canários (%). Métricas e logs ajudam a validar e auditar a transição.")

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