import { ExchangeService } from './exchangeService.js';
import { OnChainData, DerivativesData, AlternativeMetrics } from '../../../shared/types.js';

export class AlternativeDataService {
  constructor(private exchangeService: ExchangeService) {}

  /**
   * Aggregates all alternative data
   */
  async getAlternativeMetrics(symbol: string): Promise<AlternativeMetrics> {
    const [sentiment, onChain, derivatives] = await Promise.all([
      this.getSentimentData(symbol),
      this.getOnChainData(symbol),
      this.getDerivativesData(symbol)
    ]);

    return {
      symbol,
      sentiment,
      onChain,
      derivatives
    };
  }

  /**
   * Mocks Sentiment Data (Twitter/News)
   * In production, this would call Twitter API, LunarCrush, etc.
   */
  private async getSentimentData(symbol: string): Promise<{ source: string; score: number }[]> {
    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 100));

    // Mock Logic: Random score between -1 and 1 based on recent "trend"
    const baseScore = Math.random() * 2 - 1; 
    
    return [
      {
        source: 'twitter',
        score: parseFloat(baseScore.toFixed(2))
      },
      {
        source: 'news',
        score: parseFloat((baseScore * 0.8 + (Math.random() * 0.4 - 0.2)).toFixed(2))
      }
    ];
  }

  /**
   * Mocks On-Chain Data (Glassnode/Santiment)
   */
  private async getOnChainData(symbol: string): Promise<OnChainData> {
    await new Promise(resolve => setTimeout(resolve, 100));

    // Mock Values
    return {
        mvrv: parseFloat((1.5 + (Math.random() * 0.5)).toFixed(2)), // Healthy range 1.5-2.0
        exchangeInflow: parseFloat((Math.random() * 1000).toFixed(2)), // BTC/ETH amount
        activeAddresses: 10000,
        transactionVolume: 5000000
    };
  }

  /**
   * Fetches Real Derivatives Data via ExchangeService (or mocks if fails)
   */
  private async getDerivativesData(symbol: string): Promise<DerivativesData> {
    try {
        // Try Binance Futures first
        // Note: Assuming 'binance' is the key in ExchangeService
        const fundingRate = await this.exchangeService.getFundingRate('binance', symbol);
        const openInterest = await this.exchangeService.getOpenInterest('binance', symbol);
        
        return {
            fundingRate,
            openInterest,
            longShortRatio: parseFloat((1 + (Math.random() * 0.4 - 0.2)).toFixed(2)), // Mock L/S ratio
            liquidations: {
                long: parseFloat((Math.random() * 100000).toFixed(2)),
                short: parseFloat((Math.random() * 100000).toFixed(2))
            },
            timestamp: Date.now()
        };
    } catch (error) {
        console.warn('Failed to fetch derivatives data, using mock:', error);
        return {
            fundingRate: 0.01, // 0.01%
            openInterest: 50000000,
            longShortRatio: 1.1,
            liquidations: { long: 0, short: 0 },
            timestamp: Date.now()
        };
    }
  }
}
