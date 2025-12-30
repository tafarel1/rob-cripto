export interface ExchangeConfig {
  name: string;
  apiKey: string;
  apiSecret: string;
  testnet?: boolean;
  enableFutures?: boolean;
  symbols?: string[]; // Optional: restrict to specific symbols
}

export interface MarketData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  symbol?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: number;
}

export interface TradingSignal {
  type: 'BUY' | 'SELL';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number[];
  reason: string;
  confidence: number;
  timestamp: number;
  timeframe?: string;
}

export interface TradePosition {
  id: string;
  symbol: string;
  type: 'LONG' | 'SHORT';
  entryPrice: number;
  quantity: number;
  stopLoss: number;
  takeProfit: number[];
  status: 'OPEN' | 'CLOSED' | 'PARTIALLY_CLOSED';
  openTime?: number;
  fees?: number;
  pnl?: number;
  closePrice?: number;
  closeTime?: number;
  stopLossOrderId?: string;
  takeProfitOrderIds?: string[];
  realizedPnl?: number;
  triggeredTpLevels?: number[];
}

export interface StrategyConfig {
  name: string;
  symbol?: string; // Legacy support
  symbols?: string[]; // Multi-symbol support
  timeframe?: string; // Legacy support
  timeframes?: string[]; // Multi-timeframe support
  enabled: boolean;
  parameters: Record<string, any>;
  smcParams?: any;
  riskParams?: Partial<RiskManagement>;
  notifications?: any;
}

export interface SMCAnalysis {
  marketStructure: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  orderBlocks: OrderBlock[];
  liquidityZones: LiquidityZone[];
  fairValueGaps: FairValueGap[];
  trend?: 'UP' | 'DOWN' | 'SIDEWAYS';
  marketStructures?: MarketStructurePoint[];
  buySideLiquidity?: LiquidityZone[];
  sellSideLiquidity?: LiquidityZone[];
  washTrading?: WashTradingActivity[];
  premiumDiscount?: PremiumDiscountZone;
  sessionLiquidity?: SessionLiquidity;
}

export interface MarketStructurePoint {
  type: 'BOS' | 'CHOCH' | 'HH' | 'HL' | 'LL' | 'LH';
  price: number;
  timestamp: number;
  trend?: 'BULLISH' | 'BEARISH'; // Optional because swing points might not have trend yet
  direction?: 'bullish' | 'bearish'; // For internal usage in SMC analyzer
}

export interface OrderBlock {
  price: number;
  type: 'BULLISH' | 'BEARISH' | 'bullish' | 'bearish';
  strength: number;
  timestamp?: number;
  startTime?: number;
  endTime?: number;
  mitigated?: boolean;
}

export interface LiquidityZone {
  price: number;
  type: 'BUY_SIDE' | 'SELL_SIDE' | 'high' | 'low';
  strength: number;
  timestamp?: number;
}

export interface FairValueGap {
  top: number;
  bottom: number;
  midpoint: number;
  type: 'BULLISH' | 'BEARISH' | 'bullish' | 'bearish';
  timestamp?: number;
  filled?: boolean;
}

export interface RiskManagement {
  maxRiskPerTrade: number; // % of balance
  maxDailyLoss: number;    // % of balance
  maxDrawdown: number;     // % of balance
  riskRewardRatio: number;
  maxPositionSize: number; // Max size per trade in USD
  stopLossType: 'FIXED' | 'ATR' | 'SMC';
  stopLossValue: number;   // ATR multiplier or %
  maxPositions?: number;
  takeProfitType?: 'FIXED' | 'RISK_REWARD' | 'SMC';
  takeProfitValue?: number;
  positionSizingMethod?: 'fixed' | 'risk_based' | 'percentage' | 'kelly';
}

export interface RiskStats {
  dailyLoss: number;
  currentDrawdown: number;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio?: number;
  maxDrawdown?: number;
  
  // Extended metrics
  dailyTrades?: number;
  maxDailyLossReached?: boolean;
  openPositions?: number;
  maxPositions?: number;
  accountBalance?: number;
  riskExposure?: number;
  availableRisk?: number;
  openPositionsRisk?: number;
  portfolioBeta?: number;
}

export interface HedgingConfig {
  enabled: boolean;
  hedgeExchange: string;
  hedgeSymbol: string;
  maxDeltaExposure: number;
  targetDelta: number;
  checkInterval: number;
}

export interface AlternativeMetrics {
  symbol?: string;
  sentiment: number | { source: string; score: number }[]; // Unified: can be number or array
  onChain?: OnChainData;
  derivatives?: DerivativesData;
}

export interface OnChainData {
  mvrv?: number;
  nupl?: number;
  activeAddresses?: number;
  transactionVolume?: number;
  exchangeInflow?: number;
  exchangeOutflow?: number;
  largeTxCount?: number;
}

export interface DerivativesData {
  fundingRate: number;
  openInterest: number;
  longShortRatio: number;
  liquidations?: {
    long: number;
    short: number;
  };
  timestamp?: number;
}

export interface ExchangeOrder {
  id: string;
  symbol: string;
  type: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  status: string;
  timestamp: number;
  filled?: number;
  remaining?: number;
  fee?: number;
  averagePrice?: number;
  stopPrice?: number;
  createdAt?: number;
  updatedAt?: number;
  datetime?: string; // Optional for compatibility
}

export type MarketStructure = 'BULLISH' | 'BEARISH' | 'NEUTRAL';

export interface WashTradingActivity {
  type: string;
  timestamp: number;
  details: string;
  severity: 'low' | 'medium' | 'high';
}

export interface PremiumDiscountZone {
  high: number;
  low: number;
  equilibrium: number;
  status: 'PREMIUM' | 'DISCOUNT';
  timestamp?: number;
}

export interface SessionLiquidity {
  asia?: { high: number; low: number; label: string };
  london?: { high: number; low: number; label: string };
  newYork?: { high: number; low: number; label: string };
}

export interface BacktestResult {
  strategyId?: string;
  startDate?: string;
  endDate?: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  netProfit: number;
  totalReturn?: number;
  maxDrawdown: number;
  sharpeRatio?: number;
  averageWin?: number;
  averageLoss?: number;
  expectancy?: number;
  sortinoRatio?: number;
  cagr?: number;
  largestWin?: number;
  largestLoss?: number;
  equityCurve: { timestamp: number; equity: number }[];
  trades: TradePosition[];
}
