import { Router, type Request, type Response } from 'express';
import { SMCAnalyzer } from '../services/smcAnalyzer.js';
import { ExchangeService } from '../services/exchangeService.js';
import { ExchangeConfig, MarketData, TradingSignal } from '../../../shared/types.js';

const router = Router();

// Initialize services
// TODO: Centralize service initialization or dependency injection
const exchangeConfigs: ExchangeConfig[] = [
  {
    name: 'binance',
    apiKey: process.env.BINANCE_API_KEY || '',
    apiSecret: process.env.BINANCE_SECRET || '',
    testnet: process.env.NODE_ENV === 'development'
  }
];

const exchangeService = new ExchangeService(exchangeConfigs);
const smcAnalyzer = new SMCAnalyzer();

/**
 * GET /api/analysis/smc
 * Get SMC analysis for a symbol
 */
router.get('/smc', async (req: Request, res: Response) => {
  try {
    const { symbol = 'BTC/USDT', timeframe = '1h' } = req.query;
    
    // Fetch market data
    // Default to binance for now as it is the only configured exchange
    const marketData: MarketData[] = await exchangeService.getMarketData(
      'binance', 
      String(symbol), 
      String(timeframe), 
      200 // Need enough candles for analysis
    );

    if (!marketData || marketData.length === 0) {
      throw new Error('No market data available');
    }

    // Perform analysis
    const analysis = smcAnalyzer.analyze(marketData);
    
    // Generate signals
    // Note: generateSignals expects currentPrice and timeframe
    const currentPrice = marketData[marketData.length - 1].close;
    const signals: TradingSignal[] = smcAnalyzer.generateSignals(analysis, currentPrice, String(timeframe), marketData);

    // Format response
    // The frontend expects SMCAnalysisData structure
    const responseData = {
      ...analysis,
      signals: signals.map(s => ({
         type: s.type,
         entry: s.entryPrice,
         stopLoss: s.stopLoss,
         takeProfit: s.takeProfit,
         confidence: s.confidence,
         reason: s.reason,
         timestamp: s.timestamp
      })),
      candles: marketData.map(c => ({
        time: c.timestamp / 1000, // Frontend expects seconds for lightweight-charts
        timestamp: c.timestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume
      })),
      currentPrice: currentPrice,
    };

    const fullResponse = {
      success: true,
      data: responseData,
      symbol: String(symbol),
      timeframe: String(timeframe),
      timestamp: Date.now()
    };

    res.json(fullResponse);
  } catch (error) {
    console.error('SMC Analysis Error:', error);
    const response = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now(),
      symbol: String(req.query.symbol),
      timeframe: String(req.query.timeframe)
    };
    res.status(500).json(response);
  }
});

export default router;
