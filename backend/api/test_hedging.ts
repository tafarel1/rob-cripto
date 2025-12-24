import { HedgingManager } from './services/hedgingManager.js';
import { ExchangeService } from './services/exchangeService.js';
import { NotificationService } from './services/notificationService.js';
import { TradePosition, HedgingConfig, ExchangeOrder } from '../../shared/types.js';

// Mock ExchangeService
class MockExchangeService extends ExchangeService {
    constructor() {
        super([]);
    }

    async getTicker(exchange: string, symbol: string) {
        return {
            symbol,
            bid: 50000,
            ask: 50000,
            last: 50000, // Fixed price for test
            volume: 1000,
            timestamp: Date.now()
        };
    }

    async createMarketOrder(exchange: string, symbol: string, side: 'buy' | 'sell', amount: number): Promise<ExchangeOrder> {
        console.log(`[MOCK EXCHANGE] Executing ${side.toUpperCase()} ${amount} ${symbol}`);
        return {
            id: 'order-123',
            symbol,
            side,
            type: 'market',
            quantity: amount,
            filledQuantity: amount,
            status: 'closed',
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
    }
}

// Mock NotificationService
class MockNotificationService extends NotificationService {
    async sendTelegramMessage(msg: string) {
        console.log(`[MOCK NOTIFICATION] Telegram: ${msg}`);
    }
    
    async notifyError(err: Error, ctx?: string) {
        console.error(`[MOCK NOTIFICATION] Error in ${ctx}:`, err);
    }
}

async function runTest() {
    console.log('Starting Hedging Manager Test...');

    const exchangeService = new MockExchangeService();
    const notificationService = new MockNotificationService();

    const config: HedgingConfig = {
        enabled: true,
        hedgeExchange: 'binance',
        hedgeSymbol: 'BTC/USDT',
        maxDeltaExposure: 1000, // $1000 tolerance
        targetDelta: 0,         // Neutral
        checkInterval: 0        // Immediate
    };

    const manager = new HedgingManager(config, exchangeService, notificationService);

    // Scenario 1: No Positions. Delta = 0.
    console.log('\n--- Scenario 1: No Positions ---');
    await manager.evaluatePortfolio([]);
    
    // Scenario 2: 1 BTC Long ($50k). Delta = +50k. Threshold 1k. Should Short 1 BTC.
    console.log('\n--- Scenario 2: 1 BTC Long ---');
    const pos1: TradePosition = {
        id: 'p1',
        symbol: 'BTC/USDT',
        type: 'LONG',
        entryPrice: 48000,
        quantity: 1,
        stopLoss: 45000,
        takeProfit: [55000],
        status: 'OPEN'
    };
    await manager.evaluatePortfolio([pos1]);

    // Scenario 3: Verify Hedge Position
    console.log(`Current Hedge Position: ${manager.getCurrentHedgePosition()} (Expected -1)`);

    // Scenario 4: Position Closed. Portfolio Delta = 0. Hedge is now Short 1 (-50k).
    // Total Delta = -50k. Threshold 1k. Should Buy 1 BTC to close hedge.
    console.log('\n--- Scenario 3: Position Closed ---');
    await manager.evaluatePortfolio([]); // Empty positions
    
    console.log(`Current Hedge Position: ${manager.getCurrentHedgePosition()} (Expected 0)`);
}

runTest().catch(console.error);
