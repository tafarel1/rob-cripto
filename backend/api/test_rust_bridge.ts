
import { nativeBridge } from './services/nativeBridge.ts';

async function runTest() {
    console.log('Testing Rust Bridge...');
    
    // Give some time for the process to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    const mockCandles = [
        { open: 100.0, high: 105.0, low: 95.0, close: 100.0, volume: 1000.0, timestamp: 1000 },
        { open: 100.0, high: 110.0, low: 99.0, close: 108.0, volume: 2000.0, timestamp: 1060 },
        { open: 108.0, high: 112.0, low: 107.0, close: 110.0, volume: 1500.0, timestamp: 1120 }
    ];

    try {
        console.log('Sending analyze_smc command...');
        const result = await nativeBridge.executeRustTask('analyze_smc', mockCandles);
        console.log('Rust Response:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Test Failed:', error);
    } finally {
        nativeBridge.shutdown();
        process.exit(0);
    }
}

runTest();
