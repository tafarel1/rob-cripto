// Market Data Types
export interface MarketData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// SMC Analysis Types
export interface LiquidityZone {
  type: 'high' | 'low';
  price: number;
  strength: number;
  timestamp: number;
}

export interface OrderBlock {
  type: 'bullish' | 'bearish';
  price: number;
  startTime: number;
  endTime: number;
  strength: number;
  mitigated: boolean;
}

export interface FairValueGap {
  top: number;
  bottom: number;
  midpoint: number;
  timestamp: number;
  filled: boolean;
}

export interface MarketStructure {
  type: 'HH' | 'HL' | 'LH' | 'LL' | 'BOS' | 'CHOCH';
  price: number;
  timestamp: number;
  direction: 'bullish' | 'bearish';
}

export interface SMCAnalysis {
  liquidityZones: LiquidityZone[];
  orderBlocks: OrderBlock[];
  fairValueGaps: FairValueGap[];
  marketStructures: MarketStructure[];
  buySideLiquidity: number[];
  sellSideLiquidity: number[];
}

// Trading Types
export interface TradingSignal {
  type: 'BUY' | 'SELL';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number[];
  confidence: number;
  reason: string;
  timestamp: number;
  timeframe: string;
}

export interface TradePosition {
  id: string;
  symbol: string;
  type: 'LONG' | 'SHORT';
  entryPrice: number;
  quantity: number;
  stopLoss: number;
  takeProfit: number[];
  status: 'OPEN' | 'CLOSED' | 'CANCELLED' | 'PARTIALLY_CLOSED';
  openTime: number;
  closeTime?: number;
  realizedPnl?: number;
  fees: number;
}

export interface RiskManagement {
  maxRiskPerTrade: number; // Percentage of capital
  maxDailyLoss: number;
  maxPositions: number;
  riskRewardRatio: number;
  positionSizingMethod: 'fixed' | 'percentage' | 'kelly';
}

// Exchange Types
export interface ExchangeConfig {
  name: string;
  apiKey: string;
  apiSecret: string;
  testnet?: boolean;
  enableFutures?: boolean;
}

export interface ExchangeOrder {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop';
  quantity: number;
  price?: number;
  stopPrice?: number;
  status: 'open' | 'closed' | 'cancelled';
  filledQuantity: number;
  averagePrice?: number;
  createdAt: number;
  updatedAt: number;
}

// Strategy Configuration
export interface StrategyConfig {
  name: string;
  symbol: string;
  timeframe: string;
  enabled: boolean;
  smcParams: {
    minLiquidityStrength: number;
    minOrderBlockStrength: number;
    minFvgSize: number;
    useMarketStructure: boolean;
    useVolumeConfirmation: boolean;
  };
  riskParams: RiskManagement;
  notifications: {
    telegram?: string;
    email?: string;
    webhook?: string;
  };
}

// Backtesting Types
export interface BacktestResult {
  strategyId: string;
  startDate: string;
  endDate: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  trades: TradePosition[];
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export interface MarketDataRequest {
  symbol: string;
  timeframe: string;
  limit: number;
  startTime?: number;
  endTime?: number;
}