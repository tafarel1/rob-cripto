import { WorkerManager } from './services/workerManager.js';
import { MarketData, StrategyConfig } from '../shared/types.js';

async function testWorker() {
    console.log('Testing WorkerManager...');
    const manager = new WorkerManager();
    
    const mockData: MarketData[] = Array.from({ length: 100 }, (_, i) => ({
        timestamp: Date.now() - (100 - i) * 60000,
        open: 100 + Math.random(),
        high: 105 + Math.random(),
        low: 95 + Math.random(),
        close: 100 + Math.random(),
        volume: 1000 + Math.random() * 500
    }));

    const mockConfig: StrategyConfig = {
        name: 'TestStrategy',
        symbol: 'BTC/USDT',
        timeframe: '1h',
        enabled: true,
        smcParams: {
            minLiquidityStrength: 0.5,
            minOrderBlockStrength: 0.5,
            minFvgSize: 0.001,
            useMarketStructure: true,
            useVolumeConfirmation: true
        },
        riskParams: {
            maxRiskPerTrade: 1,
            maxDailyLoss: 5,
            maxPositions: 3,
            riskRewardRatio: 2,
            positionSizingMethod: 'fixed'
        },
        notifications: {}
    };

    try {
        console.log('Sending analysis task...');
        const start = Date.now();
        const analysis = await manager.executeAnalysis('BTC/USDT', mockData, mockConfig);
        console.log(`Analysis received in ${Date.now() - start}ms`);
        console.log('Liquidity Zones:', analysis.liquidityZones.length);
        
        console.log('Sending signal generation task...');
        const signals = await manager.generateSignals('BTC/USDT', analysis, 100, '1h', mockData, mockConfig);
        console.log('Signals:', signals);
        
        console.log('Test Passed!');
    } catch (err) {
        console.error('Test Failed:', err);
    } finally {
        manager.terminateAll();
    }
}

testWorker();
