import express from 'express';
const router = express.Router();
import VirtualTradingService from '../services/VirtualTradingService.js';
import { asyncHandler, validateRequestBody } from '../../middleware/errorHandler.js';

// Account state management
let accountState = {
  currentMode: 'VIRTUAL', // 'VIRTUAL' or 'REAL'
  virtualAccount: {
    id: 'virtual-demo-001',
    mode: 'VIRTUAL',
    balance: 10000,
    initialBalance: 10000,
    riskSettings: {
      maxRiskPerTrade: 2, // 2% per trade
      dailyLossLimit: 5,  // 5% daily limit
      maxOpenTrades: 5,
      allowedPairs: ['BTC/USDT', 'ETH/USDT', 'ADA/USDT', 'SOL/USDT', 'DOT/USDT']
    },
    performance: {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalProfit: 0,
      realizedPnl: 0,
      unrealizedPnl: 0,
      maxDrawdown: 0
    },
    tradeHistory: []
  },
  realAccount: {
    id: 'real-account-001',
    mode: 'REAL',
    balance: 0,
    initialBalance: 0,
    riskSettings: {
      maxRiskPerTrade: 1, // 1% per trade (more conservative)
      dailyLossLimit: 3,  // 3% daily limit
      maxOpenTrades: 3,
      allowedPairs: ['BTC/USDT', 'ETH/USDT']
    },
    performance: {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalProfit: 0,
      realizedPnl: 0,
      unrealizedPnl: 0,
      maxDrawdown: 0
    },
    tradeHistory: []
  }
};

// Initialize virtual trading service
const virtualTradingService = new VirtualTradingService();

// Get current account state
router.get('/state', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      currentMode: accountState.currentMode,
      currentAccount: accountState.currentMode === 'VIRTUAL' 
        ? accountState.virtualAccount 
        : accountState.realAccount,
      virtualAccount: accountState.virtualAccount,
      realAccount: accountState.realAccount
    }
  });
}));

// Switch account mode
router.post('/switch-mode', 
  validateRequestBody(['mode']),
  asyncHandler(async (req, res) => {
    const { mode, apiKey, apiSecret } = req.body;
    
    if (!['VIRTUAL', 'REAL'].includes(mode)) {
      return res.status(400).json({
        success: false,
        error: 'Modo inválido. Use "VIRTUAL" ou "REAL"'
      });
    }

    // Validate real account requirements
    if (mode === 'REAL') {
      if (!apiKey || !apiSecret) {
        return res.status(400).json({
          success: false,
          error: 'Chaves API necessárias para modo real'
        });
      }
      
      // Store API credentials (in production, encrypt these)
      accountState.realAccount.apiKey = apiKey;
      accountState.realAccount.apiSecret = apiSecret;
      
      // Test connection to exchange
      // This would be implemented with actual exchange API call
      accountState.realAccount.balance = 5000; // Mock balance for demo
      accountState.realAccount.initialBalance = 5000;
    }

    accountState.currentMode = mode;
    
    res.json({
      success: true,
      data: {
        currentMode: accountState.currentMode,
        currentAccount: accountState.currentMode === 'VIRTUAL' 
          ? accountState.virtualAccount 
          : accountState.realAccount
      }
    });
  }));

// Update account settings
router.put('/settings', 
  asyncHandler(async (req, res) => {
    const { riskSettings } = req.body;
    const currentAccount = accountState.currentMode === 'VIRTUAL' 
      ? accountState.virtualAccount 
      : accountState.realAccount;
    
    if (riskSettings) {
      currentAccount.riskSettings = {
        ...currentAccount.riskSettings,
        ...riskSettings
      };
    }
    
    res.json({
      success: true,
      data: currentAccount
    });
  }));

// Get performance metrics
router.get('/performance', asyncHandler(async (req, res) => {
  const currentAccount = accountState.currentMode === 'VIRTUAL' 
    ? accountState.virtualAccount 
    : accountState.realAccount;
  
  // Calculate additional metrics
  const totalReturn = ((currentAccount.balance - currentAccount.initialBalance) / currentAccount.initialBalance) * 100;
  const sharpeRatio = calculateSharpeRatio(currentAccount.tradeHistory);
  
  res.json({
    success: true,
    data: {
      ...currentAccount.performance,
      totalReturn,
      sharpeRatio,
      currentBalance: currentAccount.balance,
      initialBalance: currentAccount.initialBalance
    }
  });
}));

// Execute virtual trade
router.post('/virtual/trade', 
  validateRequestBody(['symbol', 'side', 'amount', 'entryPrice']),
  asyncHandler(async (req, res) => {
    if (accountState.currentMode !== 'VIRTUAL') {
      return res.status(400).json({
        success: false,
        error: 'Apenas disponível em modo virtual'
      });
    }

    const { symbol, side, amount, entryPrice, stopLoss, takeProfit } = req.body;
    
    // Validate trade parameters
    const validation = virtualTradingService.validateTrade({
      symbol,
      side,
      amount,
      entryPrice,
      balance: accountState.virtualAccount.balance,
      riskSettings: accountState.virtualAccount.riskSettings
    });
    
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    // Execute virtual trade
    const tradeResult = await virtualTradingService.executeTrade({
      symbol,
      side,
      amount,
      entryPrice,
      stopLoss,
      takeProfit
    });

    // Update account state
    accountState.virtualAccount.balance = tradeResult.newBalance;
    accountState.virtualAccount.performance = tradeResult.updatedPerformance;
    accountState.virtualAccount.tradeHistory.push(tradeResult.trade);
    
    res.json({
      success: true,
      data: {
        trade: tradeResult.trade,
        newBalance: tradeResult.newBalance,
        performance: tradeResult.updatedPerformance
      }
    });
  }));

// Get trade history
router.get('/trades', asyncHandler(async (req, res) => {
  const currentAccount = accountState.currentMode === 'VIRTUAL' 
    ? accountState.virtualAccount 
    : accountState.realAccount;
  
  res.json({
    success: true,
    data: currentAccount.tradeHistory
  });
}));

// Reset virtual account
router.post('/virtual/reset', asyncHandler(async (req, res) => {
  accountState.virtualAccount = {
    id: 'virtual-demo-001',
    mode: 'VIRTUAL',
    balance: 10000,
    initialBalance: 10000,
    riskSettings: {
      maxRiskPerTrade: 2,
      dailyLossLimit: 5,
      maxOpenTrades: 5,
      allowedPairs: ['BTC/USDT', 'ETH/USDT', 'ADA/USDT', 'SOL/USDT', 'DOT/USDT']
    },
    performance: {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalProfit: 0,
      realizedPnl: 0,
      unrealizedPnl: 0,
      maxDrawdown: 0
    },
    tradeHistory: []
  };
  
  res.json({
    success: true,
    data: accountState.virtualAccount
  });
}));

// Helper function to calculate Sharpe Ratio
function calculateSharpeRatio(trades) {
  if (trades.length < 2) return 0;
  
  const returns = trades.map(trade => trade.pnl / trade.amount);
  const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
  const stdDev = Math.sqrt(returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length);
  
  return stdDev === 0 ? 0 : (avgReturn / stdDev) * Math.sqrt(252); // Annualized
}

export default router;