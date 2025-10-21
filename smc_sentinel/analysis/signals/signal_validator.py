from typing import Dict


class SignalValidator:
    """Validate signals against basic risk/config constraints."""

    def __init__(self, config: Dict):
        self.config = config

    def is_valid(self, signal: Dict) -> bool:
        max_signals = int(self.config.get('max_signals_per_tick', 10))
        min_quality = float(self.config.get('min_ob_quality', 0.6))
        if signal.get('type') == 'OB':
            return signal.get('quality', 0.0) >= min_quality
        return True