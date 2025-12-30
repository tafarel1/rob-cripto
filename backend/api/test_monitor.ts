import { StrategyMonitor } from './services/strategyMonitor.js';
import { NotificationService } from './services/notificationService.js';
import { nativeBridge } from './services/nativeBridge.js';

async function testMonitor() {
    console.log("Initializing Monitor Test...");

    // Mock NotificationService to avoid external calls/dependencies issues
    const mockNotificationService = {
        notifyError: async (error: Error, context?: string) => {
            console.log(`[MOCK NOTIFICATION] ERROR: ${error.message} | Context: ${context}`);
        },
        notifySignal: async () => {},
        notifyPosition: async () => {},
        notifyPositionClosed: async () => {}
    } as unknown as NotificationService;

    const monitor = new StrategyMonitor(mockNotificationService, {
        driftThresholdSigma: 1.5, // Lower threshold to trigger easier
        checkIntervalMs: 0 // Instant check
    });

    console.log("Feeding Data...");
    
    // 1. Feed "Normal" data (match baseline)
    // Baseline is roughly N(0.1%, 2%)
    for (let i = 0; i < 50; i++) {
        monitor.updateMetrics(100 + i, (Math.random() * 0.04 - 0.02) + 0.001); 
    }

    console.log("Checking Normal State...");
    // @ts-ignore - accessing private method for test
    await monitor.performChecks();

    // 2. Feed "Drift" data (Negative returns)
    console.log("Feeding Drift Data (Losses)...");
    for (let i = 0; i < 20; i++) {
        monitor.updateMetrics(150, -0.05); // 5% loss consistently
    }

    console.log("Checking Drift State...");
    // @ts-ignore
    await monitor.performChecks();

    // 3. Feed "Extreme Volatility" data
    console.log("Feeding Volatile Prices...");
    let price = 100;
    for (let i = 0; i < 30; i++) {
        price = price * (1 + (Math.random() > 0.5 ? 0.1 : -0.1)); // 10% jumps
        monitor.updateMetrics(price);
    }
    
    console.log("Checking Regime State...");
    // @ts-ignore
    await monitor.performChecks();

    console.log("Test Complete. Shutting down bridge.");
    nativeBridge.shutdown();
}

testMonitor().catch(console.error);
