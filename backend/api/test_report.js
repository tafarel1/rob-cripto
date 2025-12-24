import { AdvancedBacktester } from './services/quantBacktester.js';
import { nativeBridge } from './services/nativeBridge.js';
async function testPipeline() {
    console.log('Initializing Backtest Pipeline...');
    const backtester = new AdvancedBacktester();
    const initialBalance = 10000;
    // Mock Result
    const mockTrades = [
        { id: '1', symbol: 'BTCUSDT', type: 'LONG', entryPrice: 50000, quantity: 0.1, status: 'CLOSED', entryTime: 1, realizedPnl: 500, stopLoss: 49000, takeProfit: [52000] },
        { id: '2', symbol: 'BTCUSDT', type: 'LONG', entryPrice: 51000, quantity: 0.1, status: 'CLOSED', entryTime: 2, realizedPnl: -200, stopLoss: 50000, takeProfit: [53000] },
        { id: '3', symbol: 'BTCUSDT', type: 'LONG', entryPrice: 50500, quantity: 0.1, status: 'CLOSED', entryTime: 3, realizedPnl: 800, stopLoss: 49500, takeProfit: [52500] },
        { id: '4', symbol: 'BTCUSDT', type: 'LONG', entryPrice: 52000, quantity: 0.1, status: 'CLOSED', entryTime: 4, realizedPnl: -100, stopLoss: 51000, takeProfit: [54000] },
        { id: '5', symbol: 'BTCUSDT', type: 'LONG', entryPrice: 53000, quantity: 0.1, status: 'CLOSED', entryTime: 5, realizedPnl: 1200, stopLoss: 52000, takeProfit: [55000] },
    ];
    const mockResult = {
        totalTrades: 5,
        winRate: 0.6,
        profitFactor: 2.0,
        maxDrawdown: 0.05,
        sharpeRatio: 1.8,
        totalReturn: 0.22,
        trades: mockTrades,
        averageWin: 833,
        averageLoss: 150,
        expectancy: 440,
        sortinoRatio: 2.5,
        cagr: 0.5,
        winningTrades: 3,
        losingTrades: 2,
        largestWin: 1200,
        largestLoss: 200
    };
    try {
        console.log('Generating Institutional Report...');
        const reportPath = await backtester.generateFullReport('BTC_Trend_V1', mockResult, initialBalance);
        console.log(`Report generated at: ${reportPath}`);
    }
    catch (error) {
        console.error('Pipeline failed:', error);
    }
    finally {
        nativeBridge.shutdown();
    }
}
testPipeline();
