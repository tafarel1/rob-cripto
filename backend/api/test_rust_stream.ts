
import { nativeBridge } from './services/nativeBridge.ts';

async function runTest() {
    console.log('Testing Rust Bridge Streaming...');
    
    // Listen for market data events
    nativeBridge.on('market_data', (data) => {
        console.log('⚡ [Real-time] Market Data received from Rust:', JSON.stringify(data).substring(0, 100) + '...');
        
        // Check for specific fields to validate structure
        if (data.e === 'aggTrade') {
             console.log(`   Trade: ${data.s} Price: ${data.p} Qty: ${data.q}`);
        }
    });

    // Give some time for the process to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
        console.log('Starting Market Stream via Rust...');
        const result = await nativeBridge.executeRustTask('start_market_stream', {});
        console.log('Command Result:', result);
        
        console.log('Waiting for data stream (10 seconds)...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
    } catch (error) {
        console.error('Test Failed:', error);
    } finally {
        console.log('Stopping test...');
        nativeBridge.shutdown();
        process.exit(0);
    }
}

runTest();
