import { AlternativeDataService } from './services/alternativeDataService.js';
import { ExchangeService } from './services/exchangeService.js';
// Mock ExchangeService
class MockExchangeService extends ExchangeService {
    constructor() {
        super([]);
    }
    async getFundingRate(exchange, symbol) {
        return 0.0005; // 0.05% Positive Funding
    }
    async getOpenInterest(exchange, symbol) {
        return 10000000; // $10M
    }
}
async function runTest() {
    console.log('Starting Alternative Data Service Test...');
    const exchangeService = new MockExchangeService();
    const service = new AlternativeDataService(exchangeService);
    const symbol = 'BTC/USDT';
    const metrics = await service.getAlternativeMetrics(symbol);
    console.log('\n--- Alternative Metrics Report ---');
    console.log(`Symbol: ${metrics.derivatives.symbol}`);
    console.log('\n[Sentiment]');
    metrics.sentiment.forEach(s => {
        console.log(`- Source: ${s.source} | Score: ${s.score.toFixed(2)} | Vol: ${s.volume}`);
    });
    console.log('\n[On-Chain]');
    metrics.onChain.forEach(o => {
        console.log(`- Metric: ${o.metric} | Value: ${o.value.toFixed(2)}`);
    });
    console.log('\n[Derivatives]');
    console.log(`- Funding Rate: ${(metrics.derivatives.fundingRate * 100).toFixed(4)}%`);
    console.log(`- Open Interest: $${(metrics.derivatives.openInterest / 1000000).toFixed(2)}M`);
    console.log(`- L/S Ratio: ${metrics.derivatives.longShortRatio.toFixed(2)}`);
    // Simulate Signal Refinement Logic
    console.log('\n--- Signal Refinement Simulation ---');
    // Test Case 1: High Funding (Short Favor) + Negative Sentiment (Short Favor) -> Boost SELL
    // We'll mock data to ensure this path
    // Overwrite for test
    metrics.derivatives.fundingRate = 0.0002; // High positive
    const sellSignal = { type: 'SELL', confidence: 0.7, reason: 'SMC Bearish' };
    console.log(`Base Signal: ${sellSignal.type} | Conf: ${sellSignal.confidence}`);
    // Logic from TradingEngine
    let scoreModifier = 0;
    const sentimentScore = metrics.sentiment.reduce((acc, s) => acc + s.score, 0) / metrics.sentiment.length;
    console.log(`Avg Sentiment: ${sentimentScore.toFixed(2)}`);
    if (metrics.derivatives.fundingRate > 0.0001 && sellSignal.type === 'SELL') {
        console.log('-> Funding Rate supports SELL (+0.1)');
        scoreModifier += 0.1;
    }
    if (sentimentScore < -0.3 && sellSignal.type === 'SELL') {
        console.log('-> Sentiment supports SELL (+0.1)');
        scoreModifier += 0.1;
    }
    const finalConf = Math.min(0.99, sellSignal.confidence + scoreModifier);
    console.log(`Final Confidence: ${finalConf.toFixed(2)}`);
}
runTest().catch(console.error);
