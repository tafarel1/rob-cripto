from typing import Dict, Tuple
import pandas as pd


class AdvancedMarketStructure:
    """
    Multi-timeframe market structure analysis focusing on SMC concepts.

    This class provides swing point detection, BOS (Break of Structure),
    and CHoCH (Change of Character) helpers with simple, extensible logic.
    """

    def __init__(self, multi_timeframe_data: Dict[str, pd.DataFrame]):
        self.mtf_data = multi_timeframe_data
        self.swing_highs_lows: Dict[str, Tuple[pd.Series, pd.Series]] = {}

    def identify_swing_points(self, df: pd.DataFrame, window: int = 5) -> Tuple[pd.Series, pd.Series]:
        """Identify swing highs and lows using centered rolling extrema and volume confirmation."""
        highs = df['high'].rolling(window, center=True).max()
        lows = df['low'].rolling(window, center=True).min()

        swing_highs = (df['high'] == highs) & (df['volume'] > df['volume'].mean())
        swing_lows = (df['low'] == lows) & (df['volume'] > df['volume'].mean())

        return swing_highs.fillna(False), swing_lows.fillna(False)

    def analyze_structure(self, tf_data: pd.DataFrame) -> Dict[str, str]:
        """
        Very simple structure analysis:
        - trend: bullish if short MA > long MA, else bearish
        - momentum: strong/weak based on ROC threshold
        """
        if tf_data.empty:
            return {"trend": "neutral", "momentum": "weak"}

        close = tf_data['close']
        short_ma = close.rolling(20).mean()
        long_ma = close.rolling(50).mean()
        trend = 'bullish' if short_ma.iloc[-1] > long_ma.iloc[-1] else 'bearish'

        # Simple rate of change as momentum proxy
        roc = (close.iloc[-1] - close.iloc[-10]) / max(close.iloc[-10], 1e-9) if len(close) > 10 else 0.0
        momentum = 'strong' if abs(roc) > 0.01 else 'weak'

        return {"trend": trend, "momentum": momentum}

    def volume_confirmation(self, df: pd.DataFrame, event: str) -> bool:
        """Confirm an event (e.g., 'breakout') using a volume spike heuristic."""
        vol = df['volume']
        recent = vol.iloc[-20:] if len(vol) >= 20 else vol
        return recent.iloc[-1] > recent.mean() * (1.5 if event == 'breakout' else 1.2)

    def detect_bos(self, current_tf: pd.DataFrame, higher_tf: pd.DataFrame) -> bool:
        """Detect Break of Structure with higher timeframe momentum confirmation."""
        current_structure = self.analyze_structure(current_tf)
        higher_structure = self.analyze_structure(higher_tf)

        bos = (
            current_structure['trend'] == 'bullish' and
            higher_structure['momentum'] == 'strong' and
            self.volume_confirmation(current_tf, 'breakout')
        )
        return bool(bos)

    def failure_test_pattern(self, price_action: pd.DataFrame) -> bool:
        """
        Placeholder for FT pattern: last candle fails to break prior swing.
        """
        if len(price_action) < 3:
            return False
        last = price_action.iloc[-1]
        prev = price_action.iloc[-2]
        return last['high'] <= prev['high'] and last['low'] >= prev['low']

    def liquidity_grab_detected(self, volume_data: pd.DataFrame) -> bool:
        """Detect a simple 'liquidity grab' via wick length vs body and volume spike."""
        df = volume_data
        if df.empty:
            return False
        c = df.iloc[-1]
        body = abs(c['close'] - c['open'])
        wick = (c['high'] - max(c['close'], c['open'])) + (min(c['close'], c['open']) - c['low'])
        return wick > body * 1.5 and c['volume'] > df['volume'].mean() * 1.3

    def momentum_divergence(self, price_action: pd.DataFrame, volume_data: pd.DataFrame) -> bool:
        """
        Naive divergence: price makes higher high while simple momentum weakens (ROC decreases).
        """
        if len(price_action) < 10:
            return False
        close = price_action['close']
        roc_now = (close.iloc[-1] - close.iloc[-5]) / max(close.iloc[-5], 1e-9)
        roc_prev = (close.iloc[-6] - close.iloc[-10]) / max(close.iloc[-10], 1e-9)
        price_higher_high = price_action['high'].iloc[-1] > price_action['high'].iloc[-6]
        return price_higher_high and roc_now < roc_prev

    def detect_choch(self, price_action: pd.DataFrame, volume_data: pd.DataFrame) -> bool:
        """Detect Change of Character using FT pattern, liquidity grab, and divergence checks."""
        choch = (
            self.failure_test_pattern(price_action) and
            self.liquidity_grab_detected(volume_data) and
            self.momentum_divergence(price_action, volume_data)
        )
        return bool(choch)