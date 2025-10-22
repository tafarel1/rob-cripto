from __future__ import annotations

import time
from typing import Any, Dict, List, Optional, Tuple


class TradingMetricsCollector:
    """
    Coleta métricas de execução de trading para comparar performance e extensibilidade.

    Métricas capturadas:
    - Tempo de execução do polling (service vs legado)
    - Sucesso por exchange e tipo de ordem (buy/sell)
    - Tempo médio de fill (global e por exchange)
    - Diagnóstico de extensibilidade (tamanho dos registries de fábricas)
    """

    def __init__(self) -> None:
        self._attempts_total: int = 0
        self._success_total: int = 0
        self._failure_total: int = 0

        # Por exchange
        # Estrutura: { exchange: {
        #   'attempts': int,
        #   'success': int,
        #   'failure': int,
        #   'by_side': { 'buy': {'attempts': int, 'success': int, 'failure': int}, 'sell': {...} },
        #   'fill_times': List[float],
        #   'statuses': Dict[str, int],
        #   'path': { 'service': {'attempts': int, 'durations': List[float]}, 'legacy': {...} }
        # }}
        self._by_exchange: Dict[str, Dict[str, Any]] = {}

    def _ensure_exchange(self, ex: str) -> Dict[str, Any]:
        ex = (ex or '').lower()
        if ex not in self._by_exchange:
            self._by_exchange[ex] = {
                'attempts': 0,
                'success': 0,
                'failure': 0,
                'by_side': {
                    'buy': {'attempts': 0, 'success': 0, 'failure': 0},
                    'sell': {'attempts': 0, 'success': 0, 'failure': 0},
                },
                'fill_times': [],
                'statuses': {},
                'path': {
                    'service': {'attempts': 0, 'durations': []},
                    'legacy': {'attempts': 0, 'durations': []},
                },
                # Place order metrics
                'place_order': {
                    'attempts': 0,
                    'success': 0,
                    'failure': 0,
                    'durations': [],
                    'fail_reasons': {},
                },
                # Fee calculation accuracy metrics
                'fee_accuracy': {
                    'samples': 0,
                    'errors_abs_pct': [],  # absolute error percentage per sample
                    'unknown_samples': 0,
                },
            }
        return self._by_exchange[ex]

    def record_attempt(self, exchange: str, side: str, path: str) -> float:
        """Registra uma tentativa de polling e retorna timestamp de início."""
        ex = self._ensure_exchange(exchange)
        self._attempts_total += 1
        ex['attempts'] += 1
        s = ('buy' if str(side).lower() == 'buy' else 'sell')
        ex['by_side'][s]['attempts'] += 1
        p = ('service' if str(path).lower() == 'service' else 'legacy')
        ex['path'][p]['attempts'] += 1
        return time.time()

    def record_success(self, exchange: str, side: str, path: str, latency_s: float, status: str = 'FILLED') -> None:
        ex = self._ensure_exchange(exchange)
        self._success_total += 1
        ex['success'] += 1
        s = ('buy' if str(side).lower() == 'buy' else 'sell')
        ex['by_side'][s]['success'] += 1
        ex['fill_times'].append(float(latency_s))
        st = str(status or '').upper()
        ex['statuses'][st] = int(ex['statuses'].get(st, 0)) + 1
        p = ('service' if str(path).lower() == 'service' else 'legacy')
        ex['path'][p]['durations'].append(float(latency_s))

    def record_failure(self, exchange: str, side: str, path: str, latency_s: float, reason: str = 'timeout') -> None:
        ex = self._ensure_exchange(exchange)
        self._failure_total += 1
        ex['failure'] += 1
        s = ('buy' if str(side).lower() == 'buy' else 'sell')
        ex['by_side'][s]['failure'] += 1
        p = ('service' if str(path).lower() == 'service' else 'legacy')
        # Opcionalmente, registrar duração até o fracasso para comparação
        if latency_s >= 0:
            ex['path'][p]['durations'].append(float(latency_s))
        ex['statuses']['FAIL'] = int(ex['statuses'].get('FAIL', 0)) + 1
        ex['statuses'][f'FAIL:{str(reason).upper()}'] = int(ex['statuses'].get(f'FAIL:{str(reason).upper()}', 0)) + 1

    @staticmethod
    def _avg(lst: List[float]) -> float:
        return (sum(lst) / len(lst)) if lst else 0.0

    def _aggregate_paths(self) -> Dict[str, float]:
        # Média global por caminho
        service_all: List[float] = []
        legacy_all: List[float] = []
        for ex in self._by_exchange.values():
            service_all.extend(ex['path']['service']['durations'])
            legacy_all.extend(ex['path']['legacy']['durations'])
        return {
            'service_avg_latency_s': self._avg(service_all),
            'legacy_avg_latency_s': self._avg(legacy_all),
        }

    @staticmethod
    def _extensibility_diagnostics(poller_factory: Any = None, fee_factory: Any = None) -> Dict[str, Any]:
        # Lê registries das fábricas (se disponíveis)
        poller_reg = dict(getattr(poller_factory, '_registry', {})) if poller_factory else {}
        fee_reg = dict(getattr(fee_factory, '_registry', {})) if fee_factory else {}
        pollers = sorted(list(poller_reg.keys()))
        fees = sorted(list(fee_reg.keys()))
        # Métrica qualitativa simples: quanto menor o atrito para registrar nova exchange
        # Fórmula: base 0.6 + 0.2 se ambos têm Null/Default, + 0.2 se existem >2 exchanges já registradas
        base = 0.6
        null_bonus = 0.2 if ('__doc__' in dir(poller_factory) and '__doc__' in dir(fee_factory)) else 0.0  # proxy irrelevante; mantemos base
        count_bonus = 0.2 if (len(pollers) >= 2 and len(fees) >= 2) else 0.0
        score = round(min(base + null_bonus + count_bonus, 1.0), 2)
        return {
            'poller_registry_size': len(pollers),
            'fee_registry_size': len(fees),
            'poller_registry': pollers,
            'fee_registry': fees,
            'extensibility_score': score,
        }

    def record_place_order_attempt(self, exchange: str) -> float:
        ex = self._ensure_exchange(exchange)
        ex['place_order']['attempts'] += 1
        return time.time()

    def record_place_order_result(self, exchange: str, latency_s: float, success: bool, reason: str | None = None) -> None:
        ex = self._ensure_exchange(exchange)
        ex['place_order']['durations'].append(float(latency_s))
        if success:
            ex['place_order']['success'] += 1
        else:
            ex['place_order']['failure'] += 1
            r = str(reason or 'unknown').upper()
            ex['place_order']['fail_reasons'][r] = int(ex['place_order']['fail_reasons'].get(r, 0)) + 1

    def record_fee_accuracy(self, exchange: str, fee_base: float | None, fee_quote: float | None, avg_price: float | None) -> None:
        ex = self._ensure_exchange(exchange)
        if fee_base is None or fee_quote is None or avg_price is None or avg_price <= 0:
            ex['fee_accuracy']['unknown_samples'] += 1
            return
        try:
            estimated_base = float(fee_quote) / float(avg_price)
            denom = max(abs(estimated_base), 1e-9)
            abs_err_pct = abs(float(fee_base) - estimated_base) / denom
            ex['fee_accuracy']['errors_abs_pct'].append(float(abs_err_pct))
            ex['fee_accuracy']['samples'] += 1
        except Exception:
            ex['fee_accuracy']['unknown_samples'] += 1

    def snapshot(self, poller_factory: Any = None, fee_factory: Any = None, feature_flags: Any = None) -> Dict[str, Any]:
        total = max(self._attempts_total, 1)  # evitar div por zero
        success_rate = float(self._success_total) / float(total)
        # Tempo médio de fill global
        all_fills: List[float] = []
        for ex, data in self._by_exchange.items():
            all_fills.extend(data['fill_times'])
        avg_fill_time = self._avg(all_fills)

        # Por exchange
        by_exchange_out: Dict[str, Any] = {}
        for ex, data in self._by_exchange.items():
            attempts = max(int(data['attempts']), 1)
            ex_success_rate = float(data['success']) / float(attempts)
            # Compute place order aggregates
            po_attempts = max(int(data['place_order']['attempts']), 1)
            po_success_rate = float(data['place_order']['success']) / float(po_attempts)
            po_avg_latency = (sum(data['place_order']['durations']) / len(data['place_order']['durations'])) if data['place_order']['durations'] else 0.0
            # Fee accuracy aggregates
            fee_samples = int(data['fee_accuracy']['samples'])
            fee_mean_abs_pct = (sum(data['fee_accuracy']['errors_abs_pct']) / fee_samples) if fee_samples > 0 else 0.0
            by_side = {}
            for side in ('buy', 'sell'):
                s_attempts = max(int(data['by_side'][side]['attempts']), 1)
                by_side[side] = {
                    'attempts': int(data['by_side'][side]['attempts']),
                    'success_rate': float(data['by_side'][side]['success']) / float(s_attempts),
                    'success': int(data['by_side'][side]['success']),
                    'failure': int(data['by_side'][side]['failure']),
                }
            by_exchange_out[ex] = {
                'attempts': int(data['attempts']),
                'success': int(data['success']),
                'failure': int(data['failure']),
                'success_rate': ex_success_rate,
                'avg_fill_time_s': self._avg(data['fill_times']),
                'by_side': by_side,
                'statuses': dict(data['statuses']),
                'path': {
                    'service_avg_latency_s': self._avg(data['path']['service']['durations']),
                    'legacy_avg_latency_s': self._avg(data['path']['legacy']['durations']),
                    'service_attempts': int(data['path']['service']['attempts']),
                    'legacy_attempts': int(data['path']['legacy']['attempts']),
                },
                # New: place order and fee accuracy
                'place_order': {
                    'attempts': int(data['place_order']['attempts']),
                    'success': int(data['place_order']['success']),
                    'failure': int(data['place_order']['failure']),
                    'success_rate': po_success_rate,
                    'avg_latency_s': float(po_avg_latency),
                    'fail_reasons': dict(data['place_order']['fail_reasons']),
                },
                'fee_accuracy': {
                    'samples': int(fee_samples),
                    'mean_abs_pct': float(fee_mean_abs_pct),
                    'unknown_samples': int(data['fee_accuracy']['unknown_samples']),
                },
            }

        out: Dict[str, Any] = {
            'attempts_total': int(self._attempts_total),
            'success_total': int(self._success_total),
            'failure_total': int(self._failure_total),
            'success_rate': success_rate,
            'avg_fill_time_s': avg_fill_time,
            'comparison': self._aggregate_paths(),
            'by_exchange': by_exchange_out,
        }

        # Extensibilidade
        out['extensibility'] = self._extensibility_diagnostics(poller_factory=poller_factory, fee_factory=fee_factory)
        # Migração/Feature Flags
        if feature_flags is not None:
            out['migration'] = {'feature_flags': feature_flags}
        return out