from typing import Dict

PROFILES: Dict[str, Dict] = {
    'conservador': {
        'risk_pct': 0.005,
        'stop_atr_mult': 2.0,
        'size': 0.005,
    },
    'moderado': {
        'risk_pct': 0.01,
        'stop_atr_mult': 1.5,
        'size': 0.01,
    },
    'agressivo': {
        'risk_pct': 0.02,
        'stop_atr_mult': 1.2,
        'size': 0.02,
    },
}


def get_profile(name: str) -> Dict:
    """Retorna o perfil de risco pelo nome, ou 'moderado' se não encontrado."""
    return PROFILES.get(name, PROFILES['moderado']).copy()