import express from 'express';
import cors from 'cors';
// ESM server without __filename/__dirname helpers

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Robô Cripto SMC - API funcionando',
    timestamp: new Date().toISOString()
  });
});

// Account routes (temporary implementation)
app.get('/api/account/status', (req, res) => {
  res.json({
    success: true,
    mode: 'VIRTUAL',
    virtualAccount: {
      id: 'virtual-demo-001',
      balance: 10000,
      initialBalance: 10000,
      currency: 'USD',
      positions: [],
      tradeHistory: [],
      riskSettings: {
        maxRiskPerTrade: 2,
        dailyLossLimit: 5,
        maxOpenTrades: 5,
        allowedPairs: ['BTC/USDT', 'ETH/USDT', 'ADA/USDT', 'SOL/USDT', 'DOT/USDT']
      }
    },
    realAccount: {
      id: 'real-production-001',
      balance: 0,
      initialBalance: 0,
      currency: 'USDT',
      positions: [],
      tradeHistory: [],
      riskSettings: {
        maxRiskPerTrade: 1,
        dailyLossLimit: 3,
        maxOpenTrades: 3,
        allowedPairs: ['BTC/USDT', 'ETH/USDT']
      },
      apiKeys: null
    },
    exchangeConnected: false
  });
});

app.post('/api/account/switch-mode', (req, res) => {
  const { mode } = req.body;
  
  if (!['VIRTUAL', 'REAL'].includes(mode)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid mode. Must be VIRTUAL or REAL'
    });
  }

  res.json({
    success: true,
    mode: mode,
    message: `Switched to ${mode} mode`
  });
});

app.get('/api/account/performance', (req, res) => {
  const { mode } = req.query;
  
  res.json({
    success: true,
    mode: mode || 'VIRTUAL',
    performance: {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalPnl: 0,
      balance: mode === 'VIRTUAL' ? 10000 : 0,
      initialBalance: mode === 'VIRTUAL' ? 10000 : 0,
      totalReturn: 0
    }
  });
});

// Exchange routes (temporary implementation)
app.get('/api/exchange/status', (req, res) => {
  res.json({
    success: true,
    connected: false,
    exchange: 'binance',
    status: 'disconnected',
    message: 'Exchange not configured'
  });
});

app.get('/api/exchange/balance', (req, res) => {
  res.json({
    success: true,
    data: {
      total: { USDT: 10000 },
      free: { USDT: 10000 },
      used: { USDT: 0 }
    }
  });
});

app.get('/api/exchange/positions', (req, res) => {
  res.json({
    success: true,
    data: []
  });
});

// Error handling middleware
app.use((err, req, res, _next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Robo Cripto SMC rodando na porta ${PORT}`);
  console.log(`📊 Acesse: http://localhost:${PORT}`);
  console.log(`🔧 API disponível em: http://localhost:${PORT}/api/health`);
});

export default app;
