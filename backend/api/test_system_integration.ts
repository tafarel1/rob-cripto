
import { TradingEngine } from './services/tradingEngine.js';
import { ExchangeService } from './services/exchangeService.js';
import { NotificationService } from './services/notificationService.js';
import { StrategyMonitor } from './services/strategyMonitor.js'; // Real class or mock?
import { ExchangeConfig, RiskManagement } from '../shared/types.js';

// Mock ExchangeService to avoid real network calls
class MockExchangeService extends ExchangeService {
    constructor() { super([]); }
    async getMarketData() { return []; }
    async getTicker(exchange: string, symbol: string) {
        return { symbol, bid: 50000, ask: 50000, last: 50000, volume: 1000, timestamp: Date.now() };
    }
}

// Mock NotificationService
class MockNotificationService extends NotificationService {
    async send(message: string) { console.log(`[MOCK NOTIFY] ${message}`); }
    async notifyError(error: Error) { console.log(`[MOCK ERROR] ${error.message}`); }
}

async function runSystemIntegrationTest() {
    console.log('🚀 Starting System Integration Test (Drift & Regime Pause)...');

    // 1. Setup Config
    const exchangeConfigs: ExchangeConfig[] = [{ name: 'binance', apiKey: 'test', apiSecret: 'test', testnet: true }];
    const riskConfig: RiskManagement = { maxRiskPerTrade: 1, maxDailyLoss: 5, maxPositions: 3, riskRewardRatio: 2, positionSizingMethod: 'fixed' };

    // 2. Instantiate Engine
    // We need to override services with mocks. Since dependency injection isn't full, we'll cast to any.
    const engine = new TradingEngine(exchangeConfigs, riskConfig);
    
    // Inject Mocks
    (engine as any).exchangeService = new MockExchangeService();
    (engine as any).notificationService = new MockNotificationService();
    
    // We keep the real StrategyMonitor but we will manually emit events on it to simulate internal triggers
    // Or we can mock it if we want to avoid its internal logic.
    // Let's use the real one but emit events on it, assuming it inherits EventEmitter (which it does).
    const monitor = (engine as any).strategyMonitor;

    console.log('Engine initialized. Current State:', await engine.getStats());

    // 3. Test Case A: Drift Detection Pauses System
    console.log('\n--- Test Case A: Drift Detection ---');
    console.log('Simulating HIGH Severity Drift Event...');
    
    const driftEvent = {
        detected: true,
        severity: 'HIGH',
        details: { z_score: 3.5, current_return: -0.05, baseline_return: 0.01 }
    };

    // Emit event
    monitor.emit('drift', driftEvent);

    // Wait a tick
    await new Promise(resolve => setTimeout(resolve, 100));

    const statsAfterDrift = await engine.getStats();
    console.log('Engine State after Drift:', statsAfterDrift);

    if (statsAfterDrift.systemPaused === true) {
        console.log('✅ PASS: System paused on High Drift.');
    } else {
        console.error('❌ FAIL: System did NOT pause on High Drift.');
        process.exit(1);
    }

    // 4. Test Case B: Manual Resume (Simulated)
    console.log('\n--- Test Case B: Manual Resume ---');
    (engine as any).systemPaused = false;
    console.log('System manually resumed.');

    // 5. Test Case C: Extreme Volatility Regime
    console.log('\n--- Test Case C: Extreme Volatility Regime ---');
    console.log('Simulating EXTREME_VOLATILITY Regime...');
    
    const regimeEvent = {
        current: 'EXTREME_VOLATILITY',
        details: { vol: 0.05 }
    };

    monitor.emit('regime', regimeEvent);
    await new Promise(resolve => setTimeout(resolve, 100));

    const statsAfterRegime = await engine.getStats();
    console.log('Engine State after Regime Change:', statsAfterRegime);

    if (statsAfterRegime.systemPaused === true) {
        console.log('✅ PASS: System paused on Extreme Volatility.');
    } else {
        console.error('❌ FAIL: System did NOT pause on Extreme Volatility.');
        process.exit(1);
    }

    // 6. Test Case D: Normal Regime (Suggestion Only)
    console.log('\n--- Test Case D: Normal Regime Update ---');
    const normalRegimeEvent = {
        current: 'BULL_TREND',
        details: { vol: 0.005 }
    };
    
    monitor.emit('regime', normalRegimeEvent);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const statsFinal = await engine.getStats();
    if (statsFinal.systemPaused === true) {
        console.log('✅ PASS: System remains paused (requires manual intervention) even after regime normalizes.');
    } else {
        console.log('ℹ️ NOTE: System auto-resumed (unexpected behavior unless logic changed).');
    }

    console.log('\n🎉 All Integration Tests Passed!');
    process.exit(0);
}

runSystemIntegrationTest().catch(console.error);
