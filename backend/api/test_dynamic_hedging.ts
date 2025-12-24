import { HedgingManager } from './services/hedgingManager.js';
// import { StrategyMonitor } from './services/strategyMonitor.js'; // Commented out to avoid nativeBridge dependency issues in test
import { EventEmitter } from 'events';
import { ExchangeService } from './services/exchangeService.js';
import { NotificationService } from './services/notificationService.js';

// Define types locally to avoid module resolution issues during test
interface TradePosition {
    id: string;
    symbol: string;
    type: 'LONG' | 'SHORT';
    entryPrice: number;
    quantity: number;
    stopLoss: number;
    takeProfit: number[];
    status: 'OPEN' | 'CLOSED';
    openTime?: number;
    fees?: number;
}

interface HedgingConfig {
    enabled: boolean;
    hedgeExchange: string;
    hedgeSymbol: string;
    maxDeltaExposure: number;
    targetDelta: number;
    checkInterval: number;
}

interface ExchangeOrder {
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

// MOCKS
class MockExchangeService extends ExchangeService {
    constructor() { super([]); }
    async getTicker(exchange: string, symbol: string) {
        return { symbol, bid: 50000, ask: 50000, last: 50000, volume: 1000, timestamp: Date.now() };
    }
    async createMarketOrder(exchange: string, symbol: string, side: 'buy' | 'sell', amount: number): Promise<ExchangeOrder> {
        console.log(`[MOCK EXCHANGE] Executing ${side.toUpperCase()} ${amount} ${symbol}`);
        return { id: 'order-123', symbol, side, type: 'market', quantity: amount, filledQuantity: amount, status: 'closed', createdAt: Date.now(), updatedAt: Date.now() };
    }
}

const mockNotificationService = {
    notifyError: async (error: Error, context?: string) => { console.log(`[MOCK NOTIFICATION] ERROR: ${error.message}`); },
    notifySignal: async () => {},
    notifyPosition: async () => {},
    notifyPositionClosed: async () => {},
    sendTelegramMessage: async (msg: string) => { console.log(`[MOCK TELEGRAM] ${msg}`); }
} as unknown as NotificationService;

class MockStrategyMonitor extends EventEmitter {
    constructor(notificationService: any, config: any) { super(); }
    updateMetrics(price: number) { }
}

async function runDynamicHedgingTest() {
    console.log('🚀 Starting Dynamic Hedging Test...');

    // 1. Setup Components
    const exchangeService = new MockExchangeService();
    
    // Hedging Config: Base Max Exposure $1000
    const hedgingConfig: HedgingConfig = {
        enabled: true,
        hedgeExchange: 'binance',
        hedgeSymbol: 'BTC/USDT',
        maxDeltaExposure: 1000, 
        targetDelta: 0,
        checkInterval: 0
    };

    const hedgingManager = new HedgingManager(hedgingConfig, exchangeService, mockNotificationService);
    // const strategyMonitor = new StrategyMonitor(mockNotificationService, { checkIntervalMs: 0 });
    const strategyMonitor = new MockStrategyMonitor(mockNotificationService, { checkIntervalMs: 0 });

    console.log('HedgingManager instance:', hedgingManager);
    
    // 2. Wire up (Simulating TradingEngine logic)
    strategyMonitor.on('volatility', (vol) => {
        try {
            console.log(`Received volatility: ${vol}`);
            hedgingManager.updateMarketVolatility(vol);
        } catch (err) {
            console.error('Error in volatility handler:', err);
        }
    });

    // 3. Scenario A: Low Volatility (Baseline)
    console.log('\n--- Scenario A: Low Volatility ---');
    // Feed stable prices (simulated)
    strategyMonitor.emit('volatility', 0.001); // 0.1% volatility
    
    // Test Portfolio with $1500 Delta (Should Trigger Rebalance because > $1000)
    const pos1: TradePosition = {
        id: 'p1', symbol: 'BTC/USDT', type: 'LONG', entryPrice: 48000, quantity: 0.03, // 0.03 * 50k = $1500
        stopLoss: 45000, takeProfit: [55000], status: 'OPEN', openTime: Date.now(), fees: 0
    };
    
    console.log('Evaluating Portfolio (Delta $1500, Limit $1000)...');
    await hedgingManager.evaluatePortfolio([pos1]);

    // 4. Scenario B: High Volatility Spike
    console.log('\n--- Scenario B: High Volatility Spike ---');
    // Emit high volatility event
    console.log('Emitting Volatility: 1.5%');
    strategyMonitor.emit('volatility', 0.015);

    // Now volatility should be high (> 1%). Limit should drop to $200 (20% of 1000).
    // Test Portfolio with $300 Delta. 
    // If limit was $1000, this would be fine. 
    // But with limit $200, this should trigger rebalance.
    
    const pos2: TradePosition = {
        id: 'p2', symbol: 'BTC/USDT', type: 'LONG', entryPrice: 48000, quantity: 0.006, // 0.006 * 50k = $300
        stopLoss: 45000, takeProfit: [55000], status: 'OPEN', openTime: Date.now(), fees: 0
    };

    console.log('Evaluating Portfolio (Delta $300, Expected Limit ~$200)...');
    await hedgingManager.evaluatePortfolio([pos2]);

    // 5. Scenario C: Load Test
    console.log('\n--- Scenario C: Load Test ---');
    console.log('Generating 1000 random positions...');
    const loadPositions: TradePosition[] = [];
    for (let i = 0; i < 1000; i++) {
        loadPositions.push({
            id: `p${i}`,
            symbol: 'BTC/USDT',
            type: Math.random() > 0.5 ? 'LONG' : 'SHORT',
            entryPrice: 50000 + (Math.random() * 1000 - 500),
            quantity: 0.001, // $50 each
            stopLoss: 45000,
            takeProfit: [55000],
            status: 'OPEN',
            openTime: Date.now(),
            fees: 0
        });
    }
    
    console.log('Running stress test: 50 volatility updates + evaluations...');
    const startTime = Date.now();
    
    for (let i = 0; i < 50; i++) {
        // Toggle volatility
        const vol = i % 2 === 0 ? 0.001 : 0.02;
        strategyMonitor.emit('volatility', vol);
        
        // Evaluate
        await hedgingManager.evaluatePortfolio(loadPositions);
        
        if (i % 10 === 0) process.stdout.write('.');
    }
    
    const duration = Date.now() - startTime;
    console.log(`\nLoad test completed in ${duration}ms`);
    console.log(`Average time per iteration: ${(duration / 50).toFixed(2)}ms`);
}

runDynamicHedgingTest().catch(console.error);
