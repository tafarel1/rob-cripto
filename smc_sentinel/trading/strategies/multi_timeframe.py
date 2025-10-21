from typing import Dict, List
import pandas as pd

from ...analysis.signals.signal_generator import SignalGenerator

import asyncio
from typing import Any, Dict, List, Optional

from smc_sentinel.analysis.indicators.smart_money import smart_money_signal


class MultiTimeframeStrategy:
    """Combine signals across TFs for consensus trading decisions."""

    def __init__(self, data: Dict[str, pd.DataFrame], config: Dict):
        self.data = data
        self.config = config
        self.sg = SignalGenerator(data, config)

    def generate_orders(self, tfs: List[str]) -> List[Dict]:
        orders: List[Dict] = []
        consensus_long = 0
        consensus_short = 0
        for tf in tfs:
            for s in self.sg.generate(tf):
                if s.get('bias') in ('long', 'bullish'):
                    consensus_long += 1
                elif s.get('bias') in ('short', 'bearish'):
                    consensus_short += 1
        if consensus_long > consensus_short:
            orders.append({"symbol": self.config.get('symbol', 'BTCUSDT'), "side": "buy", "size": self.config.get('size', 0.01)})
        elif consensus_short > consensus_long:
            orders.append({"symbol": self.config.get('symbol', 'BTCUSDT'), "side": "sell", "size": self.config.get('size', 0.01)})
        return orders


class MultiTimeframeSMCStrategy:
    """Estratégia SMC multi-timeframe com geração de sinais assíncrona.

    Requisitos de config:
    - trading_symbols: lista de símbolos
    - timeframe_hierarchy: lista de timeframes em ordem de prioridade
    - entry_tf: timeframe preferencial de entrada (opcional)
    """

    def __init__(self, config: Dict[str, Any], data_feeds: Any):
        self.config = config
        self.data_feeds = data_feeds
        self.timeframe_hierarchy: List[str] = list(
            config.get("timeframe_hierarchy", ["5m", "15m", "1h", "4h"])  # padrão
        )

    async def generate_trade_signals(self) -> List[Dict[str, Any]]:
        """Gera sinais baseados em análise multi-timeframe SMC."""
        signals: List[Dict[str, Any]] = []
        symbols = self.config.get("trading_symbols") or [self.config.get("symbol", "BTCUSDT")]

        for symbol in symbols:
            mtf_analysis = await self.analyze_multi_timeframe(symbol)
            if self.is_high_confidence_setup(mtf_analysis):
                signal = self.build_trade_signal(symbol, mtf_analysis)
                if signal:
                    signals.append(signal)
        return signals

    async def analyze_multi_timeframe(self, symbol: str) -> Dict[str, Any]:
        """Análise SMC completa em múltiplos timeframes."""
        analysis: Dict[str, Any] = {}
        for tf in self.timeframe_hierarchy:
            data = await self._get_data(symbol, tf)
            ms = self.analyze_market_structure(data)
            ob = self.find_order_blocks(data, ms)
            lz = self.identify_liquidity_zones(data)
            mom = self.assess_momentum(data)
            analysis[tf] = {
                "market_structure": ms,
                "order_blocks": ob,
                "liquidity_zones": lz,
                "momentum": mom,
            }
        return analysis

    def is_high_confidence_setup(self, mtf_analysis: Dict[str, Any]) -> bool:
        """Valida setup de alta confiança baseado em alinhamento multi-TF."""
        bullish_count = 0
        bearish_count = 0
        for tf, a in mtf_analysis.items():
            bias = a.get("market_structure", {}).get("bias", "neutral")
            if bias == "bullish":
                bullish_count += 1
            elif bias == "bearish":
                bearish_count += 1
        return (bullish_count >= 3 and bearish_count <= 1) or (bearish_count >= 3 and bullish_count <= 1)

    def build_trade_signal(self, symbol: str, mtf_analysis: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Constrói o sinal consolidado baseado no alinhamento multi-TF."""
        bullish = sum(1 for tf in mtf_analysis if mtf_analysis[tf]["market_structure"]["bias"] == "bullish")
        bearish = sum(1 for tf in mtf_analysis if mtf_analysis[tf]["market_structure"]["bias"] == "bearish")
        if bullish >= 3 and bearish <= 1:
            direction = "LONG"
        elif bearish >= 3 and bullish <= 1:
            direction = "SHORT"
        else:
            return None

        entry_tf = self.config.get("entry_tf") or ("15m" if "15m" in self.timeframe_hierarchy else self.timeframe_hierarchy[0])
        ms_entry = mtf_analysis.get(entry_tf, {}).get("market_structure", {})
        entry_price = ms_entry.get("last_close")
        if entry_price is None:
            return None

        # Usa zonas de liquidez e OBs de TFs maiores para suporte/resistência
        high_tf = next((tf for tf in ["4h", "1h"] if tf in mtf_analysis), None)
        smc_support = None
        smc_resistance = None
        if high_tf:
            zones = mtf_analysis[high_tf].get("liquidity_zones", [])
            smc_support = self._nearest_below(entry_price, zones)
            smc_resistance = self._nearest_above(entry_price, zones)

        # ATR simples (média das ranges das últimas 10 barras do entry_tf)
        atr = ms_entry.get("atr", None)

        bias_map = {tf: mtf_analysis[tf]["market_structure"]["bias"] for tf in self.timeframe_hierarchy if tf in mtf_analysis}
        return {
            "type": "MTF_SMC",
            "symbol": symbol,
            "direction": direction,
            "entry_price": float(entry_price),
            "atr": float(atr) if atr is not None else None,
            "bias_map": bias_map,
            "metadata": {
                "entry_tf": entry_tf,
                "high_tf": high_tf,
                "support": smc_support,
                "resistance": smc_resistance,
            },
        }

    def analyze_market_structure(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Heurística simples de estrutura de mercado: bias, BOS e ATR simplificado."""
        bars: List[Dict[str, float]] = list(data.get("bars", []))
        if len(bars) < 3:
            return {"bias": "neutral", "bos": False, "last_close": None, "atr": None}
        last_close = float(bars[-1]["close"])
        prev_close = float(bars[-2]["close"])
        window = bars[-10:] if len(bars) >= 10 else bars
        prev_high = max(float(b["high"]) for b in window[:-1]) if len(window) > 1 else float(bars[-2]["high"]) if len(bars) >= 2 else last_close
        prev_low = min(float(b["low"]) for b in window[:-1]) if len(window) > 1 else float(bars[-2]["low"]) if len(bars) >= 2 else last_close
        bos_up = last_close > prev_high
        bos_down = last_close < prev_low
        if bos_up:
            bias = "bullish"
        elif bos_down:
            bias = "bearish"
        else:
            bias = "bullish" if last_close > prev_close else ("bearish" if last_close < prev_close else "neutral")
        atr = sum(float(b["high"]) - float(b["low"]) for b in window) / max(len(window), 1)
        return {"bias": bias, "bos": bool(bos_up or bos_down), "last_close": last_close, "atr": atr}

    def find_order_blocks(self, data: Dict[str, Any], ms: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Identifica OBs simples: última vela contrária antes de rompimento (heurístico)."""
        bars: List[Dict[str, float]] = list(data.get("bars", []))
        if len(bars) < 5:
            return []
        blocks: List[Dict[str, Any]] = []
        # Busca na janela mais recente
        window = bars[-20:] if len(bars) > 20 else bars
        bias = ms.get("bias", "neutral")
        if bias == "bullish":
            # Última vela bearish antes de avanço
            for b in reversed(window[:-1]):
                if float(b["close"]) < float(b["open"]):
                    body = abs(float(b["close"]) - float(b["open"])) / max(float(b["open"]), 1e-9)
                    blocks.append({"type": "bullish", "open": float(b["open"]), "close": float(b["close"]), "high": float(b["high"]), "low": float(b["low"]), "quality": body})
                    break
        elif bias == "bearish":
            # Última vela bullish antes de queda
            for b in reversed(window[:-1]):
                if float(b["close"]) > float(b["open"]):
                    body = abs(float(b["close"]) - float(b["open"])) / max(float(b["open"]), 1e-9)
                    blocks.append({"type": "bearish", "open": float(b["open"]), "close": float(b["close"]), "high": float(b["high"]), "low": float(b["low"]), "quality": body})
                    break
        return blocks

    def identify_liquidity_zones(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Detecta zonas de liquidez por topos/fundos iguais (tolerância pequena)."""
        bars: List[Dict[str, float]] = list(data.get("bars", []))
        zones: List[Dict[str, Any]] = []
        if len(bars) < 3:
            return zones
        tol = 0.0005  # ~0.05%
        window = bars[-30:] if len(bars) > 30 else bars
        highs = [float(b["high"]) for b in window]
        lows = [float(b["low"]) for b in window]
        # Resistência
        for i in range(1, len(highs)):
            if abs(highs[i] - highs[i - 1]) / max((highs[i] + highs[i - 1]) / 2.0, 1e-9) < tol:
                zones.append({"type": "resistance", "price": (highs[i] + highs[i - 1]) / 2.0})
        # Suporte
        for i in range(1, len(lows)):
            if abs(lows[i] - lows[i - 1]) / max((lows[i] + lows[i - 1]) / 2.0, 1e-9) < tol:
                zones.append({"type": "support", "price": (lows[i] + lows[i - 1]) / 2.0})
        return zones

    def assess_momentum(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Avalia momentum usando smart_money_signal e retorno recente (fallback)."""
        bars: List[Dict[str, float]] = list(data.get("bars", []))
        try:
            sms = smart_money_signal(bars)
        except Exception:
            sms = {"volume_spike": 0.0, "displacement": 0.0, "imbalance": 0.0}
        mom = 0.0
        if len(bars) >= 2:
            last = float(bars[-1]["close"]) / max(float(bars[-2]["close"]), 1e-9) - 1.0
            mom = last
        return {"scores": sms, "momentum_score": mom}

    async def _get_data(self, symbol: str, timeframe: str) -> Dict[str, Any]:
        """Obtém dados do feed assíncrono/síncrono com fallback seguro."""
        df = self.data_feeds
        try:
            if hasattr(df, "get_data") and callable(df.get_data):
                res = df.get_data(symbol, timeframe)
                if asyncio.iscoroutine(res):
                    return await res
                if asyncio.iscoroutinefunction(df.get_data):
                    return await df.get_data(symbol, timeframe)
                return res  # síncrono
        except Exception:
            pass
        return {"bars": []}

    def _nearest_below(self, price: float, zones: List[Dict[str, Any]]) -> Optional[float]:
        below = [z["price"] for z in zones if z.get("type") == "support" and float(z["price"]) <= price]
        return max(below) if below else None

    def _nearest_above(self, price: float, zones: List[Dict[str, Any]]) -> Optional[float]:
        above = [z["price"] for z in zones if z.get("type") == "resistance" and float(z["price"]) >= price]
        return min(above) if above else None