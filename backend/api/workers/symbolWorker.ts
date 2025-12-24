import { parentPort, workerData } from 'worker_threads';
import { performance } from 'perf_hooks';
import { SMCAnalyzer } from '../services/smcAnalyzer';
import { MarketData } from '../../../shared/types';

// Check if running as a worker
if (parentPort) {
  const smc = new SMCAnalyzer();
  const symbol = workerData?.symbol || 'UNKNOWN';

  console.log(`[Worker ${symbol}] Started SMC processing thread`);

  parentPort.on('message', (message: { type: string, data: any }) => {
    if (message.type === 'PROCESS_CANDLE') {
      const { marketData, currentPrice, timeframe } = message.data;
      
      try {
        const start = performance.now();
        
        // 1. Run Analysis (Heavy Calculation)
        const analysis = smc.analyzeMarketStructure(marketData);

        // 2. Generate Signals
        const signals = smc.generateSignals(
          analysis,
          currentPrice,
          timeframe,
          marketData
        );
        
        const end = performance.now();

        parentPort?.postMessage({
          type: 'SIGNALS',
          symbol,
          signals,
          analysis, // Send back analysis for visualization if needed
          processingTime: end - start
        });
      } catch (error) {
        console.error(`[Worker ${symbol}] Error:`, error);
        parentPort?.postMessage({ type: 'ERROR', error });
      }
    }
  });
}
