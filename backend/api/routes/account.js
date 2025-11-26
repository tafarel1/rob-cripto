import express from 'express';
const router = express.Router();
import VirtualTradingService from '../services/VirtualTradingService.js';

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

// Helper function para garantir resposta JSON válida
const sendJsonResponse = (res, data, statusCode = 200) => {
  try {
    // Garantir que sempre retornamos um objeto JSON válido
    const response = {
      success: true,
      timestamp: Date.now(),
      ...data
    };
    
    res.status(statusCode).json(response);
  } catch (error) {
    console.error('Erro ao enviar resposta JSON:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno ao processar resposta',
      timestamp: Date.now()
    });
  }
};

// Helper function para enviar erro JSON
const sendErrorResponse = (res, error, statusCode = 400) => {
  console.error('Erro na API:', error);
  res.status(statusCode).json({
    success: false,
    error: error.message || error,
    timestamp: Date.now()
  });
};

// Get current account state - CORRIGIDO
router.get('/state', async (req, res) => {
  try {
    console.log('📋 Requisição de estado da conta recebida');
    
    // Garantir que temos dados válidos
    const currentAccount = accountState.currentMode === 'VIRTUAL' 
      ? accountState.virtualAccount 
      : accountState.realAccount;

    if (!currentAccount) {
      throw new Error('Conta atual não encontrada');
    }

    sendJsonResponse(res, {
      data: {
        currentMode: accountState.currentMode,
        currentAccount: currentAccount,
        virtualAccount: accountState.virtualAccount,
        realAccount: accountState.realAccount
      }
    });
  } catch (error) {
    sendErrorResponse(res, error);
  }
});

// Switch account mode - CORRIGIDO
router.post('/switch-mode', async (req, res) => {
  try {
    console.log('🔄 Requisição de troca de modo:', req.body);
    const { mode, apiKey, apiSecret } = req.body;
    
    if (!mode) {
      return sendErrorResponse(res, new Error('Modo é obrigatório'), 400);
    }
    
    if (!['VIRTUAL', 'REAL'].includes(mode)) {
      return sendErrorResponse(res, new Error('Modo inválido. Use "VIRTUAL" ou "REAL"'), 400);
    }

    // Validate real account requirements
    if (mode === 'REAL') {
      if (!apiKey || !apiSecret) {
        return sendErrorResponse(res, new Error('Chaves API necessárias para modo real'), 400);
      }
      
      // Store API credentials (in production, encrypt these)
      accountState.realAccount.apiKey = apiKey;
      accountState.realAccount.apiSecret = apiSecret;
      
      // Fallback: definir saldo mock e status de conexão
      accountState.realAccount.balance = accountState.realAccount.balance || 5000;
      accountState.realAccount.initialBalance = accountState.realAccount.initialBalance || 5000;
      accountState.realAccount.exchangeConnected = false;
    }

    accountState.currentMode = mode;
    
    const updatedAccount = accountState.currentMode === 'VIRTUAL' 
      ? accountState.virtualAccount 
      : accountState.realAccount;

    sendJsonResponse(res, {
      data: {
        currentMode: accountState.currentMode,
        currentAccount: updatedAccount
      }
    });
    
  } catch (error) {
    sendErrorResponse(res, error);
  }
});

// Update account settings - CORRIGIDO
router.put('/settings', async (req, res) => {
  try {
    console.log('⚙️ Requisição de atualização de configurações:', req.body);
    
    const { riskSettings } = req.body;
    const currentAccount = accountState.currentMode === 'VIRTUAL' 
      ? accountState.virtualAccount 
      : accountState.realAccount;
    
    if (!currentAccount) {
      throw new Error('Conta atual não encontrada');
    }
    
    if (riskSettings) {
      currentAccount.riskSettings = {
        ...currentAccount.riskSettings,
        ...riskSettings
      };
    }
    
    sendJsonResponse(res, {
      data: currentAccount
    });
    
  } catch (error) {
    sendErrorResponse(res, error);
  }
});

// Get performance metrics - CORRIGIDO
router.get('/performance', async (req, res) => {
  try {
    console.log('📊 Requisição de métricas de performance');
    
    const currentAccount = accountState.currentMode === 'VIRTUAL' 
      ? accountState.virtualAccount 
      : accountState.realAccount;
    
    if (!currentAccount) {
      throw new Error('Conta atual não encontrada');
    }

    // Calculate additional metrics
    const totalReturn = currentAccount.initialBalance > 0 
      ? ((currentAccount.balance - currentAccount.initialBalance) / currentAccount.initialBalance) * 100
      : 0;
    
    const sharpeRatio = calculateSharpeRatio(currentAccount.tradeHistory);
    
    sendJsonResponse(res, {
      data: {
        ...currentAccount.performance,
        totalReturn: totalReturn || 0,
        sharpeRatio: sharpeRatio || 0,
        currentBalance: currentAccount.balance || 0,
        initialBalance: currentAccount.initialBalance || 0,
        mode: accountState.currentMode
      }
    });
    
  } catch (error) {
    sendErrorResponse(res, error);
  }
});

// Execute virtual trade - CORRIGIDO
router.post('/virtual/trade', async (req, res) => {
  try {
    console.log('💰 Requisição de trade virtual:', req.body);
    
    const { symbol, side, amount, entryPrice, stopLoss, takeProfit } = req.body;
    
    // Validar campos obrigatórios
    if (!symbol || !side || !amount || !entryPrice) {
      return sendErrorResponse(res, new Error('Campos obrigatórios: symbol, side, amount, entryPrice'), 400);
    }
    
    // Garantir modo virtual ativo antes de executar trade
    if (accountState.currentMode !== 'VIRTUAL') {
      console.warn('Executando trade virtual com modo atual diferente. Alternando para VIRTUAL.');
      accountState.currentMode = 'VIRTUAL';
    }
    
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
      return sendErrorResponse(res, new Error(validation.error), 400);
    }

    // Execute virtual trade
    const tradeResult = await virtualTradingService.executeTrade({
      symbol,
      side,
      amount,
      entryPrice,
      stopLoss,
      takeProfit,
      currentBalance: accountState.virtualAccount.balance
    });

    // Update account state
    accountState.virtualAccount.balance = tradeResult.newBalance;
    accountState.virtualAccount.performance = tradeResult.updatedPerformance;
    accountState.virtualAccount.tradeHistory.push(tradeResult.trade);
    
    sendJsonResponse(res, {
      data: {
        trade: tradeResult.trade,
        newBalance: tradeResult.newBalance,
        performance: tradeResult.updatedPerformance
      }
    });
    
  } catch (error) {
    sendErrorResponse(res, error);
  }
});

// Get trade history - CORRIGIDO
router.get('/trades', async (req, res) => {
  try {
    console.log('📈 Requisição de histórico de trades');
    
    const currentAccount = accountState.currentMode === 'VIRTUAL' 
      ? accountState.virtualAccount 
      : accountState.realAccount;
    
    if (!currentAccount) {
      throw new Error('Conta atual não encontrada');
    }

    // Garantir que tradeHistory existe e é um array
    const tradeHistory = currentAccount.tradeHistory || [];
    
    sendJsonResponse(res, {
      data: tradeHistory,
      count: tradeHistory.length
    });
    
  } catch (error) {
    sendErrorResponse(res, error);
  }
});

// Reset virtual account - CORRIGIDO
router.post('/virtual/reset', async (req, res) => {
  try {
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

    sendJsonResponse(res, {
      data: accountState.virtualAccount
    });
  } catch (error) {
    sendErrorResponse(res, error);
  }
});

// Helper function to calculate Sharpe Ratio
function calculateSharpeRatio(trades) {
  if (!trades || trades.length < 2) return 0;
  
  try {
    const returns = trades.map(trade => {
      if (!trade || !trade.amount || trade.amount === 0) return 0;
      return (trade.pnl || 0) / trade.amount;
    });
    
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev === 0 ? 0 : (avgReturn / stdDev) * Math.sqrt(252); // Annualized
  } catch (error) {
    console.error('Erro ao calcular Sharpe Ratio:', error);
    return 0;
  }
}

// Get risk management data - CORRIGIDO
router.get('/risk', async (req, res) => {
  try {
    console.log('⚠️ Requisição de dados de risco');
    
    const currentAccount = accountState.currentMode === 'VIRTUAL' 
      ? accountState.virtualAccount 
      : accountState.realAccount;
    
    if (!currentAccount) {
      throw new Error('Conta atual não encontrada');
    }

    const riskData = {
      currentMode: accountState.currentMode,
      riskSettings: currentAccount.riskSettings || {},
      currentBalance: currentAccount.balance || 0,
      initialBalance: currentAccount.initialBalance || 0,
      performance: currentAccount.performance || {},
      dailyLoss: currentAccount.performance?.realizedPnl || 0,
      openPositions: currentAccount.tradeHistory?.filter(trade => !trade.exitPrice).length || 0,
      maxPositions: currentAccount.riskSettings?.maxOpenTrades || 5,
      riskExposure: 0 // Calculado baseado em posições abertas
    };

    sendJsonResponse(res, {
      data: riskData
    });
    
  } catch (error) {
    sendErrorResponse(res, error);
  }
});

// Get trade history by ID - CORRIGIDO
router.get('/trades/history', async (req, res) => {
  try {
    console.log('📈 Requisição de histórico de trades (endpoint alternativo)');
    
    const currentAccount = accountState.currentMode === 'VIRTUAL' 
      ? accountState.virtualAccount 
      : accountState.realAccount;
    
    if (!currentAccount) {
      throw new Error('Conta atual não encontrada');
    }

    // Garantir que tradeHistory existe e é um array
    const tradeHistory = currentAccount.tradeHistory || [];
    
    // Adicionar filtros opcionais
    const { limit = 50, symbol, side } = req.query;
    let filteredTrades = tradeHistory;
    
    if (symbol) {
      filteredTrades = filteredTrades.filter(trade => trade.symbol === symbol);
    }
    
    if (side) {
      filteredTrades = filteredTrades.filter(trade => trade.side === side);
    }
    
    if (limit) {
      filteredTrades = filteredTrades.slice(-parseInt(limit));
    }
    
    sendJsonResponse(res, {
      data: filteredTrades,
      count: filteredTrades.length,
      total: tradeHistory.length
    });
    
  } catch (error) {
    sendErrorResponse(res, error);
  }
});

export default router;
