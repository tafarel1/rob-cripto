from typing import Dict, List, Optional
import pandas as pd


class SmartOrderBlockDetector:
    """
    Identify quality order blocks using multi-factor heuristics.
    The implementation is intentionally simple and safe to extend.
    """

    def __init__(self, historical_data: Dict[str, pd.DataFrame], config: Dict):
        self.data = historical_data
        self.config = config

    def _ensure_range(self, df: pd.DataFrame) -> pd.Series:
        return df['range'] if 'range' in df.columns else (df['high'] - df['low'])

    def find_quality_order_blocks(self, timeframe: str = '1h') -> List[Dict]:
        df = self.data.get(timeframe)
        if df is None or len(df) < 3:
            return []

        potential_blocks: List[Dict] = []
        rng = self._ensure_range(df)

        for i in range(2, len(df) - 1):
            if self.is_bullish_ob_candidate(df, rng, i):
                block = self.validate_bullish_block(df, i)
                if block and self.calculate_block_quality(block) > 0.7:
                    potential_blocks.append(block)

            if self.is_bearish_ob_candidate(df, rng, i):
                block = self.validate_bearish_block(df, i)
                if block and self.calculate_block_quality(block) > 0.7:
                    potential_blocks.append(block)

        return sorted(potential_blocks, key=lambda x: x['quality'], reverse=True)

    def is_bullish_ob_candidate(self, df: pd.DataFrame, rng: pd.Series, index: int) -> bool:
        candle = df.iloc[index]
        prev_candle = df.iloc[index - 1]

        cond = (
            candle['close'] > candle['open'] and
            candle['volume'] > df['volume'].rolling(20).mean().iloc[index] * 1.8 and
            candle['low'] < prev_candle['low'] and
            (candle['close'] - candle['open']) > rng.iloc[index] * 0.6 and
            self.has_immediate_followthrough(df, index, 'bullish')
        )
        return bool(cond)

    def is_bearish_ob_candidate(self, df: pd.DataFrame, rng: pd.Series, index: int) -> bool:
        candle = df.iloc[index]
        prev_candle = df.iloc[index - 1]

        cond = (
            candle['close'] < candle['open'] and
            candle['volume'] > df['volume'].rolling(20).mean().iloc[index] * 1.8 and
            candle['high'] > prev_candle['high'] and
            (candle['open'] - candle['close']) > rng.iloc[index] * 0.6 and
            self.has_immediate_followthrough(df, index, 'bearish')
        )
        return bool(cond)

    def has_immediate_followthrough(self, df: pd.DataFrame, index: int, bias: str) -> bool:
        if index + 1 >= len(df):
            return False
        next_candle = df.iloc[index + 1]
        if bias == 'bullish':
            return next_candle['close'] >= df.iloc[index]['close']
        return next_candle['close'] <= df.iloc[index]['close']

    def validate_bullish_block(self, df: pd.DataFrame, index: int) -> Optional[Dict]:
        candle = df.iloc[index]
        block = {
            'type': 'bullish',
            'start_index': index,
            'price_zone': (min(candle['open'], candle['close']), candle['low']),
            'quality': 0.0,
        }
        block['quality'] = self.calculate_block_quality(block)
        return block

    def validate_bearish_block(self, df: pd.DataFrame, index: int) -> Optional[Dict]:
        candle = df.iloc[index]
        block = {
            'type': 'bearish',
            'start_index': index,
            'price_zone': (candle['high'], max(candle['open'], candle['close'])),
            'quality': 0.0,
        }
        block['quality'] = self.calculate_block_quality(block)
        return block

    def calculate_block_quality(self, block: Dict) -> float:
        base = 0.5
        # Simple quality boosts by type or other configurable criteria
        if block['type'] == 'bullish':
            base += 0.2
        else:
            base += 0.15
        return min(base, 1.0)