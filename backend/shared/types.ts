export interface TradePosition {
  id: string;
  symbol: string;
  type: 'LONG' | 'SHORT';
  entryPrice: number;
  quantity: number;
  stopLoss: number;
  takeProfit: number[];
  stopLossOrderId?: string;
  takeProfitOrderIds?: string[];
  triggeredTpLevels?: number[];
  status: 'OPEN' | 'CLOSED';
  openTime: number;
  closeTime?: number;
  realizedPnl?: number;
  fees: number;
  pnl?: number;
}

export interface HedgingConfig {
    enabled: boolean;
    hedgeExchange: string;
    hedgeSymbol: string;
    maxDeltaExposure: number;
    targetDelta: number;
    checkInterval: number;
}

export interface ExchangeOrder {
    id: string;
    symbol: string;
    side: 'buy' | 'sell';
    type: 'market' | 'limit';
    quantity: number;
    filledQuantity: number;
    status: 'open' | 'closed' | 'canceled';
    createdAt: number;
    updatedAt: number;
}

export interface RiskManagement {
  maxRiskPerTrade: number;
  maxDailyLoss: number;
  maxPositions: number;
  riskRewardRatio: number;
  positionSizingMethod: string;
}

export interface TradingSignal {
    type: 'BUY' | 'SELL';
    symbol: string;
    confidence: number;
    reason: string;
    stopLoss: number;
    takeProfit: number[];
    entryPrice: number;
}
