
export type EventSource = 'smc' | 'auto' | 'pro' | 'system';

export interface BaseEvent {
  timestamp: number;
  source: EventSource;
}

export interface TradePayload {
  symbol: string;
  side: 'BUY' | 'SELL';
  price: number;
  amount: number;
  orderId: string;
}

export interface SignalPayload {
  symbol: string;
  type: 'BULLISH' | 'BEARISH';
  reason: string;
  confidence?: number;
  timeframe?: string;
  price?: number;
}

export interface RiskAlertPayload {
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  code: string;
  timestamp: number;
}

export interface NavigationPayload {
  action?: string;
  symbol?: string;
  view?: string;
  tradeId?: string;
  date?: string;
  timeframe?: string;
  type?: 'BULLISH' | 'BEARISH';
  price?: number;
  score?: number;
  params?: {
    minLiquidityStrength?: number;
    minOrderBlockStrength?: number;
    minFvgSize?: number;
  };
}

export type DashboardEvent =
  | ({ type: 'TRADE_EXECUTED'; payload: TradePayload } & BaseEvent)
  | ({ type: 'SIGNAL_DETECTED'; payload: SignalPayload } & BaseEvent)
  | ({ type: 'RISK_ALERT'; payload: RiskAlertPayload } & BaseEvent)
  | ({ type: 'SYSTEM_STATUS'; payload: { status: string; version?: string } } & BaseEvent)
  | ({ type: 'NAVIGATE_TO_TRADE'; payload: NavigationPayload } & BaseEvent)
  | ({ type: 'NAVIGATE_TO_SMC'; payload: NavigationPayload } & BaseEvent);
