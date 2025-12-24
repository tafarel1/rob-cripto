import { nativeBridge } from './nativeBridge.js';
import { NotificationService } from './notificationService.js';
import { EventEmitter } from 'events';

export interface MonitorConfig {
    driftThresholdSigma: number;
    maxStoredDataPoints: number;
    checkIntervalMs: number;
}

export class StrategyMonitor extends EventEmitter {
    private notificationService: NotificationService;
    private returnsHistory: number[] = [];
    private priceHistory: number[] = [];
    private baselineReturns: number[] = [];
    private config: MonitorConfig;
    private lastDriftCheck: number = 0;

    constructor(notificationService: NotificationService, config?: Partial<MonitorConfig>) {
        super();
        this.notificationService = notificationService;
        this.config = {
            driftThresholdSigma: 2.0,
            maxStoredDataPoints: 1000,
            checkIntervalMs: 60000 * 60, // Check every hour
            ...config
        };
        
        // Initialize baseline with a standard normal distribution (simulating expected 0.1% daily return with 2% vol)
        // In production this should be loaded from backtest results
        this.baselineReturns = Array.from({length: 100}, () => (Math.random() * 0.04 - 0.02) + 0.001);
    }

    public updateMetrics(price: number, tradeReturn?: number) {
        this.priceHistory.push(price);
        if (tradeReturn !== undefined) {
            this.returnsHistory.push(tradeReturn);
        }

        // Maintain buffer size
        if (this.priceHistory.length > this.config.maxStoredDataPoints) {
            this.priceHistory.shift();
        }
        if (this.returnsHistory.length > this.config.maxStoredDataPoints) {
            this.returnsHistory.shift();
        }

        this.performChecks();
    }

    private async performChecks() {
        const now = Date.now();
        
        // Real-time Volatility Check (Fast Path - Node.js)
        this.checkRealtimeVolatility();

        // Quant Checks (Slow Path - Python)
        if (now - this.lastDriftCheck >= this.config.checkIntervalMs) {
            this.lastDriftCheck = now;
            await Promise.all([
                this.checkDrift(),
                this.checkRegime()
            ]);
        }
    }

    private checkRealtimeVolatility() {
        // Calculate standard deviation of last 20 prices
        if (this.priceHistory.length < 20) return;
        
        const window = this.priceHistory.slice(-20);
        const mean = window.reduce((a, b) => a + b, 0) / window.length;
        const variance = window.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / window.length;
        const stdDev = Math.sqrt(variance);
        
        // Coefficient of Variation (Volatility as % of price)
        const volatility = stdDev / mean;
        
        // Threshold: 0.5% sudden move in last 20 ticks (approx few seconds)
        if (volatility > 0.005) {
             console.warn(`[Monitor] ⚠️ High Frequency Volatility Spike: ${(volatility * 100).toFixed(4)}%`);
             // We could trigger a temporary trading halt here
        }

        // Emit volatility update for other components (e.g. HedgingManager)
        this.emit('volatility', volatility);
    }

    private async checkDrift() {
        if (this.returnsHistory.length < 10) return;

        try {
            // Use initial part of history as baseline if not enough data
            const baseline = this.returnsHistory.length > 100 
                ? this.returnsHistory.slice(0, 50) 
                : this.baselineReturns;

            const result = await nativeBridge.executeQuantTask('detect_drift', {
                recent_returns: this.returnsHistory.slice(-50), // Check last 50 trades
                baseline_returns: baseline,
                threshold_sigma: this.config.driftThresholdSigma
            });

            if (result.drift_detected) {
                const msg = `⚠️ STRATEGY DRIFT DETECTED!\nZ-Score: ${result.z_score.toFixed(2)}\nCurrent Mean: ${(result.current_mean * 100).toFixed(2)}%\nBaseline Mean: ${(result.baseline_mean * 100).toFixed(2)}%`;
                console.warn(msg);
                
                this.emit('drift', {
                    detected: true,
                    severity: 'HIGH',
                    details: result
                });

                await this.notificationService.notifyError(new Error("Strategy Drift"), msg);
            }
        } catch (error) {
            console.error('Error checking drift:', error);
        }
    }

    private async checkRegime() {
        if (this.priceHistory.length < 20) return;

        try {
            const result = await nativeBridge.executeQuantTask('detect_market_regime', {
                closes: this.priceHistory.slice(-50)
            });

            this.emit('regime', result);

            // Alert on extreme volatility or regime change
            if (result.volatility_score > 0.8) { // Extreme threshold
                 const msg = `🚨 EXTREME VOLATILITY DETECTED: ${result.volatility_score.toFixed(2)}\nRegime: ${result.regime}`;
                 console.warn(msg);
                 await this.notificationService.notifyError(new Error("Market Regime Warning"), msg);
            }
            
            console.log(`[Monitor] Market Regime: ${result.regime} (Vol: ${result.volatility_score.toFixed(2)}, Trend: ${result.trend_strength.toFixed(4)})`);
        } catch (error) {
            console.error('Error checking regime:', error);
        }
    }
}
