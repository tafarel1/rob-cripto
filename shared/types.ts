// Market Data Types
export interface MarketData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  symbol?: string; // Optional since it might be inferred from context
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

export interface WashTradingActivity {
  type: 'volume_spike' | 'high_vol_doji';
  timestamp: number;
  details: string;
  severity: 'high' | 'medium' | 'low';
}

export interface PremiumDiscountZone {
  high: number;
  low: number;
  equilibrium: number;
  status: 'PREMIUM' | 'DISCOUNT';
}

export interface SessionLiquidity {
  asia?: { high: number; low: number; label: string };
  london?: { high: number; low: number; label: string };
  newYork?: { high: number; low: number; label: string };
}

export interface SMCAnalysis {
  liquidityZones: LiquidityZone[];
  orderBlocks: OrderBlock[];
  fairValueGaps: FairValueGap[];
  marketStructures: MarketStructure[];
  buySideLiquidity: number[];
  sellSideLiquidity: number[];
  washTrading?: WashTradingActivity[];
  premiumDiscount?: PremiumDiscountZone | null;
  sessionLiquidity?: SessionLiquidity | null;
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
  openTime?: number; // Made optional
  entryTime?: number; // Added alias
  closeTime?: number;
  realizedPnl?: number;
  fees?: number; // Made optional
}

export interface RiskManagement {
  maxRiskPerTrade: number; // Percentage of capital
  maxDailyLoss: number;
  maxPositions: number;
  riskRewardRatio: number;
  positionSizingMethod: 'fixed' | 'percentage' | 'kelly';
}

export interface HedgingConfig {
  enabled: boolean;
  hedgeExchange: string;
  hedgeSymbol: string;
  maxDeltaExposure: number; // USD value
  targetDelta: number; // 0 for neutral
  checkInterval: number; // ms
}

export interface RiskStats {
  dailyLoss: number;
  dailyTrades: number;
  maxDailyLossReached: boolean;
  openPositions: number;
  maxPositions: number;
  accountBalance: number;
  riskExposure: number;
  availableRisk: number;
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
  strategyId?: string;
  startDate?: string;
  endDate?: string;
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
  expectancy: number; // Added
  sortinoRatio: number; // Added
  cagr: number; // Added
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

// Alternative Data Types
export interface SentimentData {
  source: 'twitter' | 'news' | 'reddit';
  score: number; // -1 to 1 (Negative to Positive)
  volume: number; // Number of mentions
  timestamp: number;
}

export interface OnChainData {
  metric: 'mvrv' | 'nupl' | 'active_addresses' | 'exchange_inflow';
  value: number;
  timestamp: number;
}

export interface DerivativesData {
  symbol: string;
  fundingRate: number;
  openInterest: number; // in USD
  longShortRatio: number;
  liquidations: {
    longs: number;
    shorts: number;
  };
  timestamp: number;
}

export interface AlternativeMetrics {
  sentiment: SentimentData[];
  onChain: OnChainData[];
  derivatives: DerivativesData;
}
