from typing import Dict

DEFAULTS: Dict[str, Dict] = {
    'smc_scalp': {
        'symbol': 'BTCUSDT',
        'size': 0.01,
        'timeframe': '5m',
        'higher_tf': '1h',
        'min_ob_quality': 0.6,
    },
    'smc_swing': {
        'symbol': 'BTCUSDT',
        'size': 0.02,
        'timeframe': '1h',
        'higher_tf': '4h',
        'min_ob_quality': 0.7,
    },
    'multi_timeframe': {
        'symbol': 'BTCUSDT',
        'size': 0.01,
        'tfs': ['5m', '15m', '1h'],
        'higher_tf': '4h',
        'min_ob_quality': 0.6,
    },
}


def get_strategy_config(name: str) -> Dict:
    """Retorna config default por estratégia, com cópia independente."""
    return DEFAULTS.get(name, DEFAULTS['smc_scalp']).copy()