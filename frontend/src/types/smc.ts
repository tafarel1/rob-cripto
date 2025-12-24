export interface SMCSignal {
  type: 'BUY' | 'SELL';
  entry: number;
  stopLoss: number;
  takeProfit: number[];
  confidence: number;
  reason: string;
  timestamp: number;
}

export interface LiquidityZone {
  type: 'buy_side' | 'sell_side';
  price: number;
  strength: number;
  timestamp: number;
  volume: number;
}

export interface OrderBlock {
  type: 'bullish' | 'bearish';
  price: number;
  range: [number, number];
  strength: number;
  timestamp: number;
  volume: number;
}

export interface FairValueGap {
  type: 'bullish' | 'bearish';
  price: number;
  range: [number, number];
  strength: number;
  timestamp: number;
}

export interface MarketStructure {
  trend: 'bullish' | 'bearish' | 'neutral';
  higherHighs: number;
  higherLows: number;
  lowerHighs: number;
  lowerLows: number;
  timestamp: number;
}

export interface WashTradingActivity {
  type: 'volume_spike' | 'high_vol_doji';
  timestamp: number;
  details: string;
  severity: 'high' | 'medium';
}

export interface PremiumDiscountZone {
  high: number;
  low: number;
  equilibrium: number;
  status: 'PREMIUM' | 'DISCOUNT';
}

export interface SessionData {
  high: number;
  low: number;
  label: string;
}

export interface SessionLiquidity {
  asia?: SessionData;
  london?: SessionData;
  newYork?: SessionData;
}

export interface Candle {
  time: number;
  timestamp?: number; // Backend returns timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface SMCAnalysisData {
  liquidityZones: LiquidityZone[];
  orderBlocks: OrderBlock[];
  fairValueGaps: FairValueGap[];
  marketStructures: MarketStructure[];
  washTrading?: WashTradingActivity[];
  premiumDiscount?: PremiumDiscountZone;
  sessionLiquidity?: SessionLiquidity;
  signals: SMCSignal[];
  candles: Candle[];
  currentPrice?: number;
  ticker?: unknown;
}

export interface SMCAnalysisResponse {
  success: boolean;
  data: SMCAnalysisData;
  symbol: string;
  timeframe: string;
  timestamp: number;
  error?: string;
}
