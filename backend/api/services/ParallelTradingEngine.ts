import { Worker } from 'worker_threads';
import path from 'path';
import { MarketData, SMCAnalysis, StrategyConfig } from '../../../shared/types';
import { TradingEngine } from './tradingEngine';

export class ParallelTradingEngine extends TradingEngine {
  
  /**
   * Overrides analyzeStrategy to use Worker Threads
   * This prevents the event loop from blocking during heavy SMC calculations.
   */
  protected async runSMCAnalysisInWorker(
    data: MarketData[], 
    config: StrategyConfig
  ): Promise<SMCAnalysis> {
    return new Promise((resolve, reject) => {
      const workerPath = path.resolve(__dirname, '../workers/smcWorker.ts');
      
      // Note: In production with compiled JS, point to the .js file
      // or use a worker loader. For dev with ts-node/tsx:
      const worker = new Worker(workerPath, {
        execArgv: ['--require', 'ts-node/register'] // Ensure TS support
      });

      worker.postMessage({
        type: 'ANALYZE',
        data,
        config: config.smcParams
      });

      worker.on('message', (result) => {
        if (result.success) {
          resolve(result.analysis);
        } else {
          reject(new Error(result.error));
        }
        worker.terminate();
      });

      worker.on('error', (err) => {
        reject(err);
        worker.terminate();
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });
    });
  }
}
