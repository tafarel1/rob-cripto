
import { TradingEngine } from './services/tradingEngine.ts';
import { ExchangeService } from './services/exchangeService.js';
import { NotificationService } from './services/notificationService.js';
import { AlternativeDataService } from './services/alternativeDataService.js';
import { ExchangeConfig, RiskManagement, StrategyConfig, AlternativeMetrics } from '../shared/types.js';

// Mock ExchangeService
class MockExchangeService extends ExchangeService {
    constructor() { super([]); }
    async getMarketData(symbol: string, timeframe: string, limit: number = 100) {
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
            sentiment: [{ source: 'mock', score: 0.5, volume: 100, timestamp: Date.now() }],
            onChain: [
                { metric: 'active_addresses', value: 1000, timestamp: Date.now() },
                { metric: 'exchange_inflow', value: 200, timestamp: Date.now() }
            ],
            derivatives: {
                symbol: symbol,
                openInterest: 1000000,
                fundingRate: 0.01,
                liquidations: { longs: 10000, shorts: 5000 },
                longShortRatio: 1.2,
                timestamp: Date.now()
            }
        };
    }
}

async function runSystemLoadTest() {
    console.log('🚀 Starting System Load & Memory Test (Worker Threads)...');

    // 1. Setup Config
    const exchangeConfigs: ExchangeConfig[] = [{ name: 'binance', apiKey: 'test', apiSecret: 'test', testnet: true }];
    const riskConfig: RiskManagement = { maxRiskPerTrade: 1, maxDailyLoss: 5, maxPositions: 10, riskRewardRatio: 2, positionSizingMethod: 'fixed' };

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
            smcParams: {
                minLiquidityStrength: 0.5,
                minOrderBlockStrength: 0.5,
                minFvgSize: 0.001,
                useMarketStructure: true,
                useVolumeConfirmation: true
            },
            riskParams: {
                maxRiskPerTrade: 1,
                maxDailyLoss: 5,
                maxPositions: 1,
                riskRewardRatio: 2,
                positionSizingMethod: 'fixed'
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
        let totalHeap = 0;
        let workerCount = 0;
        
        for (const symbol in workerStats) {
            if (workerStats[symbol] && !workerStats[symbol].error) {
                // Assuming metrics return some memory info, but if not, we just count
                // Since we implemented GET_METRICS in workerManager but maybe not in analysisWorker?
                // Let's check what analysisWorker returns for GET_METRICS later.
                workerCount++;
            }
        }

        const usedMemory = process.memoryUsage().heapUsed / 1024 / 1024;
        
        console.log(`[${Math.floor(elapsed/1000)}s] Workers: ${activeWorkers}/${symbols.length} | Main Heap: ${usedMemory.toFixed(2)} MB`);
        
        // Log detailed worker stats if available
        if (activeWorkers > 0) {
             // console.log('Worker Stats Sample:', JSON.stringify(Object.values(workerStats)[0]).substring(0, 100) + '...');
        }

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
