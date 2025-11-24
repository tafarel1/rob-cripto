const express = require('express');
const cors = require('cors');

const app = express();

// CORS configuration for production
app.use(cors({
  origin: ['https://traerobocriptoxeol.vercel.app', 'http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

// Mock trading data
let tradingData = {
  balance: 10000,
  positions: [],
  orders: [],
  trades: [],
  performance: {
    totalProfit: 0,
    totalLoss: 0,
    winRate: 0,
    profitFactor: 0
  },
  settings: {
    maxRiskPerTrade: 2,
    maxDailyLoss: 5,
    stopLoss: 2,
    takeProfit: 4,
    tradingEnabled: true,
    emergencyStop: false
  }
};

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/balance', (req, res) => {
  res.json({ balance: tradingData.balance, timestamp: new Date().toISOString() });
});

app.get('/api/positions', (req, res) => {
  res.json({ positions: tradingData.positions, timestamp: new Date().toISOString() });
});

app.get('/api/orders', (req, res) => {
  res.json({ orders: tradingData.orders, timestamp: new Date().toISOString() });
});

app.get('/api/trades', (req, res) => {
  res.json({ trades: tradingData.trades, timestamp: new Date().toISOString() });
});

app.get('/api/performance', (req, res) => {
  res.json({ performance: tradingData.performance, timestamp: new Date().toISOString() });
});

app.get('/api/settings', (req, res) => {
  res.json({ settings: tradingData.settings, timestamp: new Date().toISOString() });
});

app.post('/api/settings', (req, res) => {
  tradingData.settings = { ...tradingData.settings, ...req.body };
  res.json({ settings: tradingData.settings, timestamp: new Date().toISOString() });
});

app.post('/api/trade', (req, res) => {
  const { symbol, side, quantity, price } = req.body;
  
  // Simulate trade execution
  const trade = {
    id: Date.now().toString(),
    symbol,
    side,
    quantity,
    price,
    timestamp: new Date().toISOString(),
    status: 'executed'
  };
  
  tradingData.trades.unshift(trade);
  
  // Update balance (simplified)
  if (side === 'buy') {
    tradingData.balance -= quantity * price;
  } else {
    tradingData.balance += quantity * price;
  }
  
  res.json({ trade, balance: tradingData.balance });
});

app.post('/api/emergency-stop', (req, res) => {
  tradingData.settings.emergencyStop = true;
  tradingData.settings.tradingEnabled = false;
  res.json({ 
    message: 'Emergency stop activated',
    settings: tradingData.settings,
    timestamp: new Date().toISOString()
  });
});

app.delete('/api/orders/:id', (req, res) => {
  const orderId = req.params.id;
  tradingData.orders = tradingData.orders.filter(order => order.id !== orderId);
  res.json({ message: 'Order cancelled', orderId });
});

// Market data endpoints
app.get('/api/market/:symbol', (req, res) => {
  const symbol = req.params.symbol;
  
  // Mock market data
  const marketData = {
    symbol,
    price: Math.random() * 50000 + 30000,
    change: (Math.random() - 0.5) * 10,
    volume: Math.random() * 1000000,
    timestamp: new Date().toISOString()
  };
  
  res.json(marketData);
});

// Smart Money Concepts data
app.get('/api/smc/:symbol', (req, res) => {
  const symbol = req.params.symbol;
  
  // Mock SMC analysis data
  const smcData = {
    symbol,
    support: Math.random() * 45000 + 35000,
    resistance: Math.random() * 55000 + 45000,
    orderBlocks: [
      { price: Math.random() * 50000 + 30000, type: 'bullish' },
      { price: Math.random() * 50000 + 30000, type: 'bearish' }
    ],
    fairValueGaps: [
      { start: Math.random() * 48000 + 32000, end: Math.random() * 52000 + 38000 }
    ],
    liquidity: {
      highs: [Math.random() * 55000 + 45000],
      lows: [Math.random() * 35000 + 25000]
    },
    timestamp: new Date().toISOString()
  };
  
  res.json(smcData);
});

// Exchange simulation endpoints
app.get('/api/exchange/status', (req, res) => {
  res.json({ 
    success: true, 
    connected: true, 
    exchange: 'binance',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/exchange/balance', (req, res) => {
  res.json({ 
    success: true, 
    data: {
      total: { USDT: tradingData.balance },
      free: { USDT: tradingData.balance },
      used: { USDT: 0 }
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/api/exchange/positions', (req, res) => {
  res.json({ 
    success: true, 
    data: tradingData.positions,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/exchange/connect', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Connected to exchange',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/exchange/disconnect', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Disconnected from exchange',
    timestamp: new Date().toISOString()
  });
});

// Default route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Robo Cripto API - Serverless',
    version: '1.0.0',
    endpoints: [
      '/api/health',
      '/api/balance',
      '/api/positions',
      '/api/orders',
      '/api/trades',
      '/api/performance',
      '/api/settings',
      '/api/market/:symbol',
      '/api/smc/:symbol',
      '/api/exchange/status',
      '/api/exchange/balance',
      '/api/exchange/positions'
    ],
    timestamp: new Date().toISOString()
  });
});

// Export for Vercel
module.exports = app;