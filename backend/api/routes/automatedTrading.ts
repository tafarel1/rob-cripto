import { Router, type Request, type Response } from 'express';
import { TradingEngine } from '../services/tradingEngine.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { ExchangeConfig, RiskManagement, StrategyConfig } from '../../../shared/types.js';

const router = Router();

// Global trading engine instance
let tradingEngine: TradingEngine | null = null;
let engineConfig: any = null;

export const resetEngineState = () => {
  tradingEngine = null;
  engineConfig = null;
};

// Initialize trading engine
router.post('/initialize',
  asyncHandler(async (req: Request, res: Response) => {
    const { 
      exchangeConfigs = [], 
      riskConfig = {
        maxRiskPerTrade: 0.02,
        maxDailyLoss: 0.05,
        maxPositions: 5,
        stopLossValue: 0.02,
        stopLossType: 'FIXED',
        takeProfitValue: 0.04,
        takeProfitType: 'RISK_REWARD'
      },
      initialBalance = 10000,
      strategies = []
    } = req.body as any;

    try {
      // Create new trading engine instance
      // Note: TradingEngine creates its own SMCAnalyzer internally now
      tradingEngine = new TradingEngine(
        exchangeConfigs as ExchangeConfig[], 
        riskConfig as RiskManagement, 
        initialBalance,
        process.env.DATABASE_URL
      );
      
      engineConfig = { exchangeConfigs, riskConfig, initialBalance, strategies };

      // Initialize the engine
      await tradingEngine.initialize();

      // Add default strategies if none provided
      if (strategies.length === 0) {
        const defaultStrategy: StrategyConfig = {
          name: 'SMC_Auto_Strategy_1',
          symbol: 'BTC/USDT',
          timeframe: '15m',
          enabled: true,
          parameters: {},
          smcParams: {
            minLiquidityStrength: 0.7,
            minOrderBlockStrength: 0.8,
            minFvgSize: 0.002
          },
          riskParams: {
            maxRiskPerTrade: 0.02,
            stopLossValue: 0.02,
            stopLossType: 'FIXED',
            takeProfitValue: 0.04,
            takeProfitType: 'RISK_REWARD'
          }
        };
        tradingEngine.addStrategy(defaultStrategy);
      } else {
        strategies.forEach((strategy: StrategyConfig) => tradingEngine!.addStrategy(strategy));
      }

      const io = (req as any).app.get('io');
      io && io.emit('engine:status', { status: 'NOT_INITIALIZED', timestamp: Date.now() });
      res.json({
        success: true,
        message: 'Motor de trading automático inicializado com sucesso',
        data: {
          engineStats: tradingEngine.getStats(),
          strategies: tradingEngine.getStrategies(),
          config: engineConfig
        }
      });
    } catch (error: any) {
      console.error('Erro ao inicializar motor de trading:', error);
      throw new Error(`Falha ao inicializar motor de trading: ${error.message}`);
    }
  }));

router.get('/status', async (req: any, res: any) => {
  try {
    const engine = (req as any).app.get('tradingEngine') as TradingEngine;
    if (!engine) {
      return res.status(503).json({ error: 'Trading engine not initialized' });
    }
    const status = engine.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/start', async (req: any, res: any) => {
  try {
    const engine = (req as any).app.get('tradingEngine') as TradingEngine;
    if (!engine) {
      return res.status(503).json({ error: 'Trading engine not initialized' });
    }
    await engine.start();
    res.json({ message: 'Trading engine started' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/stop', async (req: any, res: any) => {
  try {
    const engine = (req as any).app.get('tradingEngine') as TradingEngine;
    if (!engine) {
      return res.status(503).json({ error: 'Trading engine not initialized' });
    }
    await engine.stop();
    res.json({ message: 'Trading engine stopped' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/performance', async (req: any, res: any) => {
  try {
    const engine = (req as any).app.get('tradingEngine') as TradingEngine;
    if (!engine) {
      return res.status(503).json({ error: 'Trading engine not initialized' });
    }
    const performance = await engine.getStats();
    res.json(performance);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Add new strategy
router.post('/strategies',
  asyncHandler(async (req: Request, res: Response) => {
    if (!tradingEngine) {
      return res.status(400).json({
        success: false,
        error: 'Motor de trading não inicializado.'
      });
    }

    const strategy = req.body as StrategyConfig;
    
    // Validate required fields
    if (!strategy.name || !strategy.symbol || !strategy.timeframe) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: name, symbol, timeframe'
      });
    }

    try {
      tradingEngine.addStrategy(strategy);
      
      res.json({
        success: true,
        message: 'Estratégia adicionada com sucesso',
        data: {
          strategies: tradingEngine.getStrategies(),
          engineStats: tradingEngine.getStats()
        }
      });
    } catch (error: any) {
      console.error('Erro ao adicionar estratégia:', error);
      throw new Error(`Falha ao adicionar estratégia: ${error.message}`);
    }
  }));

// Remove strategy
router.delete('/strategies/:name',
  asyncHandler(async (req: Request, res: Response) => {
    if (!tradingEngine) {
      return res.status(400).json({
        success: false,
        error: 'Motor de trading não inicializado.'
      });
    }

    const { name } = req.params;

    try {
      tradingEngine.removeStrategy(name);
      
      res.json({
        success: true,
        message: 'Estratégia removida com sucesso',
        data: {
          strategies: tradingEngine.getStrategies(),
          engineStats: tradingEngine.getStats()
        }
      });
    } catch (error: any) {
      console.error('Erro ao remover estratégia:', error);
      throw new Error(`Falha ao remover estratégia: ${error.message}`);
    }
  }));

// Update strategy
(router as any).put('/strategies/:name',
  asyncHandler(async (req: Request, res: Response) => {
    if (!tradingEngine) {
      return res.status(400).json({
        success: false,
        error: 'Motor de trading não inicializado.'
      });
    }

    const { name } = req.params;
    const updates = req.body;

    try {
      // Get current strategies
      const strategies = tradingEngine.getStrategies();
      const strategyIndex = strategies.findIndex(s => s.name === name);
      
      if (strategyIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'Estratégia não encontrada'
        });
      }

      // Update strategy
      const updatedStrategy = { ...strategies[strategyIndex], ...(updates as any) };
      
      // Remove old and add updated
      tradingEngine.removeStrategy(name);
      tradingEngine.addStrategy(updatedStrategy);
      
      res.json({
        success: true,
        message: 'Estratégia atualizada com sucesso',
        data: {
          strategies: tradingEngine.getStrategies(),
          engineStats: tradingEngine.getStats()
        }
      });
    } catch (error: any) {
      console.error('Erro ao atualizar estratégia:', error);
      throw new Error(`Falha ao atualizar estratégia: ${error.message}`);
    }
  }));

// Get active positions
router.get('/positions',
  asyncHandler(async (req: Request, res: Response) => {
    if (!tradingEngine) {
      return res.status(400).json({
        success: false,
        error: 'Motor de trading não inicializado.'
      });
    }

    const positions = tradingEngine.getActivePositions();
    
    res.json({
      success: true,
      data: {
        positions: positions,
        count: positions.length,
        timestamp: new Date().toISOString()
      }
    });
  }));

// Emergency stop (close all positions)
router.post('/emergency-stop',
  asyncHandler(async (req: Request, res: Response) => {
    if (!tradingEngine) {
      return res.status(400).json({
        success: false,
        error: 'Motor de trading não inicializado.'
      });
    }

    try {
      // Stop the engine first
      tradingEngine.stop();
      const io = (req as any).app.get('io');
      io && io.emit('engine:status', { status: 'EMERGENCY_STOPPED', timestamp: Date.now() });
      
      // Get all active positions
      const positions = tradingEngine.getActivePositions();
      
      // Close all positions (this would need to be implemented in the TradingEngine)
      // For now, we'll just return the positions that need to be closed
      
      res.json({
        success: true,
        message: 'Emergência ativada - Trading parado',
        data: {
          status: 'EMERGENCY_STOPPED',
          positionsToClose: positions,
          count: positions.length,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error: any) {
      console.error('Erro ao ativar emergência:', error);
      throw new Error(`Falha ao ativar emergência: ${error.message}`);
    }
  }));

// Reset trading engine
router.post('/reset',
  asyncHandler(async (req: Request, res: Response) => {
    if (!tradingEngine) {
      return res.status(400).json({
        success: false,
        error: 'Motor de trading não inicializado.'
      });
    }

    try {
      const { preserveSettings = true, initialBalance } = (req.body as any) || {};
      const stats = tradingEngine.reset({ preserveSettings, initialBalance });
      const io = (req as any).app.get('io');
      const resetStatus = stats.isRunning ? 'RUNNING' : 'STOPPED';
      io && io.emit('engine:status', { status: resetStatus, timestamp: Date.now() });
      res.json({
        success: true,
        message: 'Motor de trading resetado com sucesso',
        data: {
          status: stats.isRunning ? 'RUNNING' : 'STOPPED',
          engineStats: stats,
          activePositions: tradingEngine.getActivePositions(),
          strategies: tradingEngine.getStrategies(),
          timestamp: new Date().toISOString(),
          config: engineConfig
        }
      });
    } catch (error: any) {
      console.error('Erro ao resetar motor de trading:', error);
      throw new Error(`Falha ao resetar motor de trading: ${error.message}`);
    }
  }));

export default router;