import express from 'express';
const router = express.Router();
import { SimpleTradingEngine } from '../services/simpleTradingEngine.js';
import { asyncHandler } from '../../middleware/errorHandler.js';

// Global trading engine instance
let tradingEngine = null;
let engineConfig = null;

// Initialize trading engine
router.post('/initialize',
  asyncHandler(async (req, res) => {
    const { 
      exchangeConfigs = [], 
      riskConfig = {
        maxRiskPerTrade: 0.02,
        maxDailyLoss: 0.05,
        maxOpenPositions: 5,
        stopLossDistance: 0.02,
        takeProfitDistance: 0.04,
        trailingStop: true,
        breakEvenAfter: 0.01
      },
      initialBalance = 10000,
      strategies = []
    } = req.body;

    try {
      // Create new trading engine instance
      tradingEngine = new SimpleTradingEngine(exchangeConfigs, riskConfig, initialBalance);
      engineConfig = { exchangeConfigs, riskConfig, initialBalance, strategies };

      // Initialize the engine
      await tradingEngine.initialize();

      // Add default strategies if none provided
      if (strategies.length === 0) {
        const defaultStrategy = {
          name: 'SMC_Auto_Strategy_1',
          symbol: 'BTC/USDT',
          timeframe: '15m',
          enabled: true,
          smcParams: {
            minLiquidityStrength: 0.7,
            minOrderBlockStrength: 0.8,
            minFvgSize: 0.002
          },
          riskParams: {
            maxRiskPerTrade: 0.02,
            stopLossDistance: 0.02,
            takeProfitDistance: 0.04
          }
        };
        tradingEngine.addStrategy(defaultStrategy);
      } else {
        strategies.forEach(strategy => tradingEngine.addStrategy(strategy));
      }

      res.json({
        success: true,
        message: 'Motor de trading automático inicializado com sucesso',
        data: {
          engineStats: tradingEngine.getStats(),
          strategies: tradingEngine.getStrategies(),
          config: engineConfig
        }
      });
    } catch (error) {
      console.error('Erro ao inicializar motor de trading:', error);
      throw new Error(`Falha ao inicializar motor de trading: ${error.message}`);
    }
  }));

// Start automated trading
router.post('/start',
  asyncHandler(async (req, res) => {
    if (!tradingEngine) {
      return res.status(400).json({
        success: false,
        error: 'Motor de trading não inicializado. Use /initialize primeiro.'
      });
    }

    try {
      tradingEngine.start();
      
      res.json({
        success: true,
        message: 'Trading automático iniciado com sucesso',
        data: {
          status: 'RUNNING',
          engineStats: tradingEngine.getStats(),
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Erro ao iniciar trading automático:', error);
      throw new Error(`Falha ao iniciar trading automático: ${error.message}`);
    }
  }));

// Stop automated trading
router.post('/stop',
  asyncHandler(async (req, res) => {
    if (!tradingEngine) {
      return res.status(400).json({
        success: false,
        error: 'Motor de trading não inicializado.'
      });
    }

    try {
      tradingEngine.stop();
      
      res.json({
        success: true,
        message: 'Trading automático parado com sucesso',
        data: {
          status: 'STOPPED',
          engineStats: tradingEngine.getStats(),
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Erro ao parar trading automático:', error);
      throw new Error(`Falha ao parar trading automático: ${error.message}`);
    }
  }));

// Get engine status
router.get('/status',
  asyncHandler(async (req, res) => {
    if (!tradingEngine) {
      return res.json({
        success: true,
        data: {
          status: 'NOT_INITIALIZED',
          message: 'Motor de trading não inicializado'
        }
      });
    }

    const stats = tradingEngine.getStats();
    const activePositions = tradingEngine.getActivePositions();
    const strategies = tradingEngine.getStrategies();

    res.json({
      success: true,
      data: {
        status: stats.isRunning ? 'RUNNING' : 'STOPPED',
        engineStats: stats,
        activePositions: activePositions,
        strategies: strategies,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        config: engineConfig
      }
    });
  }));

// Add new strategy
router.post('/strategies',
  asyncHandler(async (req, res) => {
    if (!tradingEngine) {
      return res.status(400).json({
        success: false,
        error: 'Motor de trading não inicializado.'
      });
    }

    const strategy = req.body;
    
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
    } catch (error) {
      console.error('Erro ao adicionar estratégia:', error);
      throw new Error(`Falha ao adicionar estratégia: ${error.message}`);
    }
  }));

// Remove strategy
router.delete('/strategies/:name',
  asyncHandler(async (req, res) => {
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
    } catch (error) {
      console.error('Erro ao remover estratégia:', error);
      throw new Error(`Falha ao remover estratégia: ${error.message}`);
    }
  }));

// Update strategy
router.put('/strategies/:name',
  asyncHandler(async (req, res) => {
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
      const updatedStrategy = { ...strategies[strategyIndex], ...updates };
      
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
    } catch (error) {
      console.error('Erro ao atualizar estratégia:', error);
      throw new Error(`Falha ao atualizar estratégia: ${error.message}`);
    }
  }));

// Get active positions
router.get('/positions',
  asyncHandler(async (req, res) => {
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
  asyncHandler(async (req, res) => {
    if (!tradingEngine) {
      return res.status(400).json({
        success: false,
        error: 'Motor de trading não inicializado.'
      });
    }

    try {
      // Stop the engine first
      tradingEngine.stop();
      
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
    } catch (error) {
      console.error('Erro ao ativar emergência:', error);
      throw new Error(`Falha ao ativar emergência: ${error.message}`);
    }
  }));

export default router;