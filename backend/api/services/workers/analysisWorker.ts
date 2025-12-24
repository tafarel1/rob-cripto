import { parentPort, workerData } from 'worker_threads';
import { SMCAnalyzer } from '../smcAnalyzer.ts';
import type { MarketData, StrategyConfig } from '../../../shared/types.ts';

if (!parentPort) {
    throw new Error('This file must be run as a worker thread');
}

// Map to store analyzers per strategy to avoid re-instantiation if config hasn't changed
// Key: strategyId (or just use one analyzer if the worker is dedicated to one symbol/strategy)
let analyzer: SMCAnalyzer | null = null;
let currentConfig: any = null;

parentPort.on('message', async (message: any) => {
    try {
        const { id, type, data, config } = message;

        if (type === 'ANALYZE') {
            // Re-instantiate if config changed or first run
            if (!analyzer || JSON.stringify(config.smcParams) !== JSON.stringify(currentConfig)) {
                analyzer = new SMCAnalyzer(config.smcParams);
                currentConfig = config.smcParams;
            }

            const analysis = analyzer.analyze(data);
            
            // Send result back
            parentPort!.postMessage({
                id,
                success: true,
                data: analysis
            });
        } else if (type === 'GENERATE_SIGNALS') {
             if (!analyzer || JSON.stringify(config.smcParams) !== JSON.stringify(currentConfig)) {
                analyzer = new SMCAnalyzer(config.smcParams);
                currentConfig = config.smcParams;
            }
            
            const { analysis, currentPrice, timeframe } = message.payload;
            const signals = analyzer.generateSignals(analysis, currentPrice, timeframe, data);
            
             parentPort!.postMessage({
                id,
                success: true,
                data: signals
            });
        } else if (type === 'GET_METRICS') {
            const memoryUsage = process.memoryUsage();
            parentPort!.postMessage({
                id,
                success: true,
                data: {
                    memory: memoryUsage,
                    uptime: process.uptime()
                }
            });
        }
    } catch (error: any) {
        parentPort!.postMessage({
            id: message.id,
            success: false,
            error: error.message
        });
    }
});
