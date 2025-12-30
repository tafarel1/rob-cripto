import { Worker } from 'worker_threads';
import { EventEmitter } from 'events';
import path from 'path';
import { fileURLToPath } from 'url';
import type { MarketData, StrategyConfig, SMCAnalysis, TradingSignal } from '../../../shared/types.ts';

// ESM compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface WorkerTask {
    id: string;
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
    startTime: number;
}

export class WorkerManager extends EventEmitter {
    private workers: Map<string, Worker> = new Map(); // Map<Symbol, Worker>
    private pendingTasks: Map<string, WorkerTask> = new Map();
    private workerPath: string;

    constructor() {
        super();
        // Path to the compiled worker file
        // Assuming the structure matches dist/api/services/workers/analysisWorker.js after compilation
        // Or using ts-node/register for dev
        this.workerPath = path.join(__dirname, 'workers', 'analysisWorker.js');
        
        // If running in dev with tsx/ts-node, we might need to point to the .ts file
        if (process.env.NODE_ENV === 'development' || __filename.endsWith('.ts')) {
             this.workerPath = path.join(__dirname, 'workers', 'analysisWorker.ts');
        }
    }

    public async executeAnalysis(symbol: string, data: MarketData[], config: StrategyConfig): Promise<SMCAnalysis> {
        return this.sendTask(symbol, {
            type: 'ANALYZE',
            data,
            config
        });
    }

    public async generateSignals(
        symbol: string, 
        analysis: SMCAnalysis, 
        currentPrice: number, 
        timeframe: string, 
        data: MarketData[], 
        config: StrategyConfig
    ): Promise<TradingSignal[]> {
        return this.sendTask(symbol, {
            type: 'GENERATE_SIGNALS',
            data, // Needed for volume confirmation
            config,
            payload: {
                analysis,
                currentPrice,
                timeframe
            }
        });
    }

    public async getWorkerMetrics(symbol: string): Promise<any> {
        if (!this.workers.has(symbol)) return null;
        return this.sendTask(symbol, { type: 'GET_METRICS', data: [], config: {} as any });
    }

    public async getAllWorkerMetrics(): Promise<Record<string, any>> {
        const metrics: Record<string, any> = {};
        for (const symbol of this.workers.keys()) {
            try {
                metrics[symbol] = await this.getWorkerMetrics(symbol);
            } catch (error) {
                metrics[symbol] = { error: 'Failed to retrieve metrics' };
            }
        }
        return metrics;
    }

    private async sendTask(symbol: string, message: any): Promise<any> {
        const worker = this.getOrCreateWorker(symbol);
        
        return new Promise((resolve, reject) => {
            const id = Math.random().toString(36).substring(7);
            
            this.pendingTasks.set(id, {
                id,
                resolve,
                reject,
                startTime: Date.now()
            });

            worker.postMessage({
                id,
                ...message
            });

            // Timeout safety
            setTimeout(() => {
                if (this.pendingTasks.has(id)) {
                    this.pendingTasks.delete(id);
                    reject(new Error(`Task timeout for ${symbol}`));
                }
            }, 5000); // 5s timeout
        });
    }

    private getOrCreateWorker(symbol: string): Worker {
        if (this.workers.has(symbol)) {
            return this.workers.get(symbol)!;
        }

        console.log(`Starting new worker for ${symbol}`);
        
        // Check if we are running in TS environment (e.g. tsx)
        const isTs = this.workerPath.endsWith('.ts');
        
        const worker = new Worker(this.workerPath, {
            workerData: { symbol },
            execArgv: isTs ? ['--import', 'tsx/esm'] : undefined
        });

        worker.on('message', (message: any) => {
            const { id, success, data, error } = message;
            const task = this.pendingTasks.get(id);

            if (task) {
                this.pendingTasks.delete(id);
                if (success) {
                    task.resolve(data);
                } else {
                    task.reject(new Error(error));
                }
            }
        });

        worker.on('error', (err) => {
            console.error(`Worker error for ${symbol}:`, err);
            // Rejection logic for all pending tasks for this worker could go here
        });

        worker.on('exit', (code) => {
            console.log(`Worker for ${symbol} exited with code ${code}`);
            if (code !== 0) {
                console.error(`Worker for ${symbol} stopped with exit code ${code}`);
            }
            this.workers.delete(symbol);
        });

        this.workers.set(symbol, worker);
        return worker;
    }

    public terminateAll() {
        for (const [symbol, worker] of this.workers) {
            console.log(`Terminating worker for ${symbol}`);
            worker.terminate();
        }
        this.workers.clear();
        this.pendingTasks.clear();
    }
}
