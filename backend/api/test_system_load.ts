
import { TradingEngine } from './services/tradingEngine.js';
import { ExchangeService } from './services/exchangeService.js';
import { NotificationService } from './services/notificationService.js';
import { AlternativeDataService } from './services/alternativeDataService.js';
import { ExchangeConfig, RiskManagement, StrategyConfig, AlternativeMetrics } from '../shared/types.js';

// Mock ExchangeService
class MockExchangeService extends ExchangeService {
    constructor() { super([]); }
    async getMarketData(exchangeName: string, symbol: string, timeframe: string, limit: number = 100, since?: number): Promise<any[]> {
        // Generate random candles
        return Array.from({ length: limit }, (_, i) => ({
            timestamp: Date.now() - (limit - i) * 60000,
            open: 50000 + Math.random() * 1000,
            high: 51000 + Math.random() * 1000,
            low: 49000 + Math.random() * 1000,
            close: 50000 + Math.random() * 1000,
            volume: 1000 + Math.random() * 500
        }));
    }
    async getTicker(exchange: string, symbol: string) {
        return { symbol, bid: 50000, ask: 50000, last: 50000, volume: 1000, timestamp: Date.now() };
    }
}

// Mock NotificationService
class MockNotificationService extends NotificationService {
    async send(message: string) { } // Silent
    async notifyError(error: Error) { console.error(`[MOCK ERROR] ${error.message}`); }
}

// Mock AlternativeDataService
class MockAlternativeDataService extends AlternativeDataService {
    async getAlternativeMetrics(symbol: string): Promise<AlternativeMetrics> {
        return {
            sentiment: [{ source: 'mock', score: 0.5 }],
            onChain: {
                mvrv: 1.5,
                nupl: 0.5,
                activeAddresses: 1000,
                transactionVolume: 500000,
                exchangeInflow: 200,
                exchangeOutflow: 150
            },
            derivatives: {
                fundingRate: 0.01,
                openInterest: 1000000,
                longShortRatio: 1.2,
                liquidations: { long: 10000, short: 5000 },
                timestamp: Date.now()
            }
        };
    }
}

async function runSystemLoadTest() {
    console.log('🚀 Starting System Load & Memory Test (Worker Threads)...');

    // 1. Setup Config
    const exchangeConfigs: ExchangeConfig[] = [{ name: 'binance', apiKey: 'test', apiSecret: 'test', testnet: true }];
    const riskConfig: RiskManagement = { 
        maxRiskPerTrade: 1, 
        maxDailyLoss: 5, 
        maxDrawdown: 10,
        riskRewardRatio: 2, 
        maxPositionSize: 1000,
        stopLossType: 'FIXED',
        stopLossValue: 0.02
    };

    // 2. Instantiate Engine
    const engine = new TradingEngine(exchangeConfigs, riskConfig);
    
    // Inject Mocks
    (engine as any).exchangeService = new MockExchangeService();
    (engine as any).notificationService = new MockNotificationService();
    (engine as any).alternativeDataService = new MockAlternativeDataService(new MockExchangeService());

    // 3. Add 10 Strategies
    const symbols = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'ADA/USDT', 'XRP/USDT', 'DOT/USDT', 'DOGE/USDT', 'AVAX/USDT', 'MATIC/USDT', 'LINK/USDT'];
    
    console.log(`Adding ${symbols.length} strategies...`);
    
    for (const symbol of symbols) {
        const strategy: StrategyConfig = {
            name: `Strategy-${symbol}`,
            symbol: symbol,
            timeframe: '1m', // Fast timeframe for testing
            enabled: true,
            parameters: {
                rsiPeriod: 14,
                macdFast: 12,
                macdSlow: 26,
                macdSignal: 9
            },
            riskParams: {
                maxRiskPerTrade: 1,
                maxDailyLoss: 5,
                maxDrawdown: 10
            },
            notifications: {}
        };
        engine.addStrategy(strategy);
    }

    // 4. Start Engine
    console.log('Starting Engine...');
    engine.start();

    // 5. Monitor Loop
    console.log('👀 Monitoring System Stability (40s)...');
    
    const startTime = Date.now();
    const duration = 40000; // 40 seconds
    const interval = 5000; // Check every 5s

    const monitorInterval = setInterval(async () => {
        const elapsed = Date.now() - startTime;
        if (elapsed >= duration) {
            clearInterval(monitorInterval);
            finishTest(engine);
            return;
        }

        console.log('Calling engine.getStats()...');
        const stats = await engine.getStats();
        const workerStats = stats.workerStats || {};
        const activeWorkers = Object.keys(workerStats).length;
        
        // Calculate average memory per worker if available
        const usedMemory = process.memoryUsage().heapUsed / 1024 / 1024;
        
        console.log(`[${Math.floor(elapsed/1000)}s] Workers: ${activeWorkers}/${symbols.length} | Main Heap: ${usedMemory.toFixed(2)} MB`);

    }, interval);

}

async function finishTest(engine: TradingEngine) {
    console.log('\n🛑 Stopping Engine...');
    engine.stop();
    
    // Allow time for cleanup
    setTimeout(() => {
        console.log('✅ Load Test Completed.');
        process.exit(0);
    }, 2000);
}

runSystemLoadTest().catch(console.error);
