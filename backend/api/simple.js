import express from 'express';
import cors from 'cors';
import ExchangeManager from '../src/exchange/ExchangeManager.js';

const app = express();

// Exchange manager (modo simplificado compatível com Railway)
const exchangeManager = new ExchangeManager();

// Estado global do trading
const tradingState = {
  status: 'stopped',
  activeStrategies: 0,
  activePositions: 0,
  totalTrades: 0,
  lastActivity: Date.now(),
  hibernationMode: false,
  riskStats: {
    dailyLoss: 0,
    dailyTrades: 0,
    maxDailyLossReached: false,
    openPositions: 0,
    maxPositions: 5,
    accountBalance: 10000,
    riskExposure: 0,
    availableRisk: 500
  }
};

// Monitor de atividade para hibernação inteligente
const activityMonitor = {
  lastRequest: Date.now(),
  requestCount: 0,
  isActive: () => Date.now() - activityMonitor.lastRequest < 1800000, // 30 minutos
  updateActivity: () => {
    activityMonitor.lastRequest = Date.now();
    activityMonitor.requestCount++;
    tradingState.lastActivity = Date.now();
    tradingState.hibernationMode = false;
    console.log(`📊 Atividade detectada - Requests: ${activityMonitor.requestCount}`);
  }
};

// Middleware de atividade - atualiza em cada requisição
app.use((req, res, next) => {
  activityMonitor.updateActivity();
  next();
});

// Middleware - CORS otimizado para Vercel
app.use(cors({
  origin: [
    'https://*.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173',
    'https://cripto-bot-production.up.railway.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Rotas simples para o frontend funcionar
app.get('/api/trading/status', (req, res) => {
  res.json({
    success: true,
    data: tradingState,
    timestamp: Date.now()
  });
});

app.get('/api/trading/positions', (req, res) => {
  res.json({
    success: true,
    data: [],
    timestamp: Date.now()
  });
});

// ===== Rotas essenciais de Exchange =====
app.post('/api/exchange/connect', async (req, res) => {
  try {
    const result = await exchangeManager.initialize();
    res.json({
      success: true,
      data: exchangeManager.getConnectionStatus(),
      message: result.message,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now()
    });
  }
});

app.get('/api/exchange/status', (req, res) => {
  res.json({
    success: true,
    data: exchangeManager.getConnectionStatus(),
    timestamp: Date.now()
  });
});

app.post('/api/exchange/disconnect', async (req, res) => {
  try {
    await exchangeManager.disconnect();
    res.json({
      success: true,
      data: exchangeManager.getConnectionStatus(),
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now()
    });
  }
});

app.get('/api/exchange/ticker', async (req, res) => {
  try {
    const { symbol } = req.query;
    const result = await exchangeManager.getTicker(symbol);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now()
    });
  }
});

app.post('/api/trading/start', (req, res) => {
  try {
    console.log('🚀 Iniciando trading bot - Modo Economia Ativo');
    
    // Verificar se já está rodando
    if (tradingState.status === 'running') {
      return res.json({
        success: false,
        error: 'Trading já está rodando',
        status: tradingState.status,
        hibernationMode: tradingState.hibernationMode,
        timestamp: Date.now()
      });
    }

    // Atualizar estado para running
    tradingState.status = 'running';
    tradingState.activeStrategies = 1;
    tradingState.activePositions = 0;
    tradingState.hibernationMode = false;
    
    console.log('✅ Trading iniciado com sucesso - Free Tier');
    
    res.json({
      success: true,
      message: 'Sistema iniciado com sucesso - Modo Economia',
      status: tradingState.status,
      hibernationMode: tradingState.hibernationMode,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar trading:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now()
    });
  }
});

app.post('/api/trading/stop', (req, res) => {
  try {
    // Verificar se já está parado
    if (tradingState.status === 'stopped') {
      return res.json({
        success: false,
        error: 'Trading já está parado',
        status: tradingState.status,
        timestamp: Date.now()
      });
    }

    // Atualizar estado para stopped
    tradingState.status = 'stopped';
    tradingState.activeStrategies = 0;
    tradingState.activePositions = 0;
    
    res.json({
      success: true,
      message: 'Sistema parado com sucesso',
      status: tradingState.status,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now()
    });
  }
});

// Health check com monitoramento
app.get('/api/health', (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  
  res.json({ 
    status: 'ok', 
    message: 'Robo Cripto SMC - API Online',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(uptime),
    memory: {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB'
    },
    activity: {
      requests: activityMonitor.requestCount,
      lastActivity: new Date(activityMonitor.lastRequest).toISOString(),
      isActive: activityMonitor.isActive()
    },
    freeTier: {
      hibernationMode: tradingState.hibernationMode,
      status: tradingState.status
    }
  });
});

// Monitor de uso para free tier
app.get('/api/usage', (req, res) => {
  res.json({
    success: true,
    data: {
      requests: activityMonitor.requestCount,
      lastActivity: activityMonitor.lastRequest,
      isActive: activityMonitor.isActive(),
      tradingStatus: tradingState.status,
      hibernationMode: tradingState.hibernationMode,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    },
    timestamp: Date.now()
  });
});

// Export for Vercel
export default app;
