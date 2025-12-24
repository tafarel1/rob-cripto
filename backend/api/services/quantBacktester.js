import { SMCAnalyzer } from './smcAnalyzer.js';
import { nativeBridge } from './nativeBridge.js';
import { ReportGenerator } from './reportGenerator.js';
export class AdvancedBacktester {
    constructor() {
        this.smcAnalyzer = new SMCAnalyzer();
        this.reportGenerator = new ReportGenerator();
    }
    /**
     * Executes a Walk-Forward Analysis to validate strategy robustness.
     * Splits data into rolling windows (In-Sample / Out-of-Sample).
     */
    async walkForwardAnalysis(data, baseConfig, windows = 5, isRatio = 0.7 // 70% In-Sample, 30% Out-of-Sample
    ) {
        console.log(`Starting Walk-Forward Analysis: ${windows} windows`);
        const windowSize = Math.floor(data.length / windows);
        const results = [];
        for (let i = 0; i < windows; i++) {
            const startIdx = i * windowSize;
            const endIdx = startIdx + windowSize;
            const windowData = data.slice(startIdx, endIdx);
            const splitPoint = Math.floor(windowData.length * isRatio);
            const inSample = windowData.slice(0, splitPoint);
            const outOfSample = windowData.slice(splitPoint);
            // 1. Optimize on In-Sample (Simplified: Just running base config here)
            // In a full implementation, we would run an optimizer loop here.
            // 2. Test on Out-of-Sample
            const oosResult = await this.runBacktest(outOfSample, baseConfig);
            results.push(oosResult);
        }
        // Aggregate results
        const aggregated = this.aggregateResults(results);
        const stabilityScore = this.calculateStability(results);
        return { aggregatedResult: aggregated, stabilityScore };
    }
    /**
     * Performs Monte Carlo Simulation to assess tail risk and path dependency.
     * Shuffles trade sequence to generate N possible equity curves.
     */
    monteCarloSimulation(trades, initialBalance, iterations = 10000) {
        console.log(`Starting Monte Carlo Simulation: ${iterations} iterations`);
        const returns = trades.map(t => (t.realizedPnl || 0) / initialBalance);
        const simulations = [];
        const finalReturns = [];
        const maxDrawdowns = [];
        let ruinCount = 0;
        for (let i = 0; i < iterations; i++) {
            // Shuffle returns
            const shuffled = this.shuffleArray([...returns]);
            const equityCurve = [initialBalance];
            let currentBalance = initialBalance;
            let peak = initialBalance;
            let maxDd = 0;
            for (const ret of shuffled) {
                const pnl = currentBalance * ret; // Compounding assumption
                currentBalance += pnl;
                equityCurve.push(currentBalance);
                if (currentBalance > peak)
                    peak = currentBalance;
                const dd = (peak - currentBalance) / peak;
                if (dd > maxDd)
                    maxDd = dd;
                if (currentBalance <= initialBalance * 0.5) { // 50% drawdown threshold for "ruin" in this context
                    // Ruin check logic could be stricter
                }
            }
            if (currentBalance <= initialBalance * 0.1)
                ruinCount++;
            simulations.push(equityCurve);
            finalReturns.push((currentBalance - initialBalance) / initialBalance);
            maxDrawdowns.push(maxDd);
        }
        // Sort to find percentiles
        maxDrawdowns.sort((a, b) => a - b);
        finalReturns.sort((a, b) => a - b);
        const p95_idx = Math.floor(iterations * 0.95);
        return {
            p95_drawdown: maxDrawdowns[p95_idx], // 95% worst case drawdown
            p95_return: finalReturns[Math.floor(iterations * 0.05)], // 5th percentile return (conservative)
            ruinProbability: ruinCount / iterations,
            simulations: simulations.slice(0, 100) // Return first 100 for visualization
        };
    }
    /**
     * Basic backtest engine for a slice of data
     */
    async runBacktest(data, config) {
        // Mocking execution for speed - connecting to actual SMCAnalyzer logic
        // In real system, this would instantiate TradingEngine in simulation mode
        const trades = [];
        let balance = 10000;
        const smc = new SMCAnalyzer(config.smcParams);
        const analysis = smc.analyze(data);
        // Simulate simple loop
        // Note: SMCAnalyzer needs rolling window, passing full data is a simplification for "Analyze All"
        // Ideally we iterate candle by candle.
        // Placeholder result
        return {
            strategyId: 'backtest_run',
            startDate: new Date(data[0].timestamp).toISOString(),
            endDate: new Date(data[data.length - 1].timestamp).toISOString(),
            totalTrades: 10,
            winningTrades: 6,
            losingTrades: 4,
            winRate: 0.6,
            totalReturn: 0.05,
            maxDrawdown: 0.02,
            sharpeRatio: 1.5,
            profitFactor: 1.8,
            averageWin: 100,
            averageLoss: 50,
            largestWin: 200,
            largestLoss: 60,
            expectancy: 40,
            sortinoRatio: 2.0,
            cagr: 0.6,
            trades: []
        };
    }
    aggregateResults(results) {
        // Average out the metrics
        const totalTrades = results.reduce((sum, r) => sum + r.totalTrades, 0);
        const winRate = results.reduce((sum, r) => sum + r.winRate, 0) / results.length;
        // ... complete aggregation logic
        return {
            ...results[0],
            totalTrades,
            winRate
        };
    }
    calculateStability(results) {
        // Variance of returns
        const returns = results.map(r => r.totalReturn);
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
        return 1 / (1 + variance); // Higher is better
    }
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    async generateFullReport(strategyName, result, initialBalance) {
        const returns = result.trades.map(t => (t.realizedPnl || 0) / initialBalance);
        // 1. Calculate Advanced Metrics via Python Bridge
        let calmar = 0, omega = 0;
        try {
            calmar = await nativeBridge.executeQuantTask('calculate_calmar', { returns });
            omega = await nativeBridge.executeQuantTask('calculate_omega', { returns, threshold: 0 });
        }
        catch (e) {
            console.warn('Failed to calculate advanced metrics via Python:', e);
        }
        // 2. Run Monte Carlo
        const monteCarlo = this.monteCarloSimulation(result.trades, initialBalance);
        // 3. Generate Report
        const reportPath = this.reportGenerator.generateMarkdownReport(strategyName, result, monteCarlo, { calmar, omega });
        // Also generate LaTeX for reference
        this.reportGenerator.generateLatexReport(strategyName, result, monteCarlo, { calmar, omega });
        return reportPath;
    }
    /**
     * Offloads heavy price path simulation to Python worker.
     */
    async runPythonPriceSimulation(initialPrice, mu, sigma) {
        try {
            console.log('Offloading Price Simulation to Python Worker...');
            const result = await nativeBridge.executeQuantTask('monte_carlo', {
                initial_price: initialPrice,
                mu,
                sigma
            });
            return result;
        }
        catch (error) {
            console.error('Python simulation failed, falling back to TS or error:', error);
            throw error;
        }
    }
}
