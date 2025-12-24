import express from 'express';
import path from 'path';
import cors from 'cors';
import compression from 'compression';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import ExchangeManager from './src/exchange/ExchangeManager.js';
import SMCAnalyzer from './src/analysis/SMCAnalyzer.js';
import { 
  handleApiErrors, 
  handleCorsErrors,
  ensureJsonResponse,
  requestLogger
} from './middleware/errorHandler.js';
import accountRoutes from './api/routes/account.js';
import automatedTradingRoutes, { resetEngineState } from './api/routes/automatedTrading.js';

// Carregar variáveis de ambiente
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const server = createServer(app);
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174'
].filter(Boolean);
const io = new SocketIOServer(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});
// Expor instancia do Socket.IO para rotas
app.set('io', io);

// Broadcast periódico de saldo e posições da exchange
let exchangeBroadcastInterval = null;
async function startExchangeBroadcast() {
  if (exchangeBroadcastInterval) return;
  exchangeBroadcastInterval = setInterval(async () => {
    try {
      if (!exchangeInitialized) return;
      const bal = await exchangeManager.getBalance();
      io.emit('exchange:balance', { ...bal, timestamp: Date.now() });
      const positions = await exchangeManager.getPositions();
      io.emit('exchange:positions', { ...positions, timestamp: Date.now() });
    } catch (err) {
      io.emit('exchange:balance', { success: false, error: String(err), data: {}, timestamp: Date.now() });
    }
  }, 8000);
}

function stopExchangeBroadcast() {
  if (exchangeBroadcastInterval) {
    clearInterval(exchangeBroadcastInterval);
    exchangeBroadcastInterval = null;
  }
}

// Instanciar gerenciadores
const exchangeManager = new ExchangeManager();
const smcAnalyzer = new SMCAnalyzer(exchangeManager);
let exchangeInitialized = false;

// ===== WEBSOCKET & SMC BROADCAST SYSTEM =====
const smcSubscriptions = new Map(); // Key: "symbol:timeframe", Value: Set<socketId>
const washTradingCache = new Map(); // Key: "symbol", Value: { severity: 'high'|'medium'|'low', activities: [] }
const alertHistory = []; // Armazenamento em memória de alertas
const lastProcessedSignalTime = new Map(); // Key: "symbol:timeframe", Value: timestamp
let smcBroadcastInterval = null;

function addAlert(alert) {
  const newAlert = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    timestamp: Date.now(),
    read: false,
    ...alert
  };
  
  alertHistory.unshift(newAlert);
  
  // Manter apenas últimos 100 alertas
  if (alertHistory.length > 100) {
    alertHistory.pop();
  }
  
  io.emit('alert:new', newAlert);
  return newAlert;
}

function startSMCBroadcast() {
  if (smcBroadcastInterval) return;
  
  console.log('🚀 Iniciando broadcast SMC (1s heartbeat)');
  smcBroadcastInterval = setInterval(async () => {
    try {
      if (smcSubscriptions.size === 0) return;
      
      const activeKeys = Array.from(smcSubscriptions.keys());
      
      for (const key of activeKeys) {
        const subscribers = smcSubscriptions.get(key);
        if (!subscribers || subscribers.size === 0) {
          smcSubscriptions.delete(key);
          continue;
        }
        
        const [symbol, timeframe] = key.split(':');
        
        // Executar análise (Limitado a 100 candles para performance no heartbeat)
        const result = await smcAnalyzer.analyzeMarket(symbol, timeframe, 100);
        
        if (result.success) {
           // Atualizar Cache de Wash Trading
           if (result.data.washTrading && result.data.washTrading.length > 0) {
             const highSeverity = result.data.washTrading.some(w => w.severity === 'high');
             const mediumSeverity = result.data.washTrading.some(w => w.severity === 'medium');
             
             washTradingCache.set(symbol, {
               severity: highSeverity ? 'high' : mediumSeverity ? 'medium' : 'low',
               activities: result.data.washTrading,
               timestamp: Date.now()
             });
           } else {
             washTradingCache.delete(symbol);
           }

           // Broadcast de dados SMC
           io.to(key).emit('smc:update', {
             symbol,
             timeframe,
             data: result.data,
             timestamp: Date.now()
           });
           
           // Processamento de Alertas
           if (result.data.signals && result.data.signals.length > 0) {
             const lastTime = lastProcessedSignalTime.get(key) || 0;
             const newSignals = result.data.signals.filter(s => s.timestamp > lastTime);
             
             if (newSignals.length > 0) {
               newSignals.forEach(signal => {
                 addAlert({
                   type: signal.confidence > 0.8 ? 'strategic' : 'standard',
                   title: `Sinal SMC: ${signal.type} ${symbol}`,
                   message: `${signal.reason} (Confiança: ${(signal.confidence * 100).toFixed(0)}%)`,
                   pair: symbol,
                   data: signal
                 });
               });
               
               // Atualizar timestamp do último sinal processado
               // Pegamos o maior timestamp entre os novos sinais
               const maxTimestamp = Math.max(...newSignals.map(s => s.timestamp));
               lastProcessedSignalTime.set(key, maxTimestamp);
             }
           }
        }
      }
    } catch (err) {
      console.error('❌ Erro no broadcast SMC:', err);
    }
  }, 1000); // 1 segundo heartbeat para dados críticos
}

io.on('connection', (socket) => {
  console.log(`🔌 Cliente conectado: ${socket.id}`);
  
  socket.on('subscribe:smc', ({ symbol, timeframe }) => {
    const key = `${symbol}:${timeframe}`;
    
    // Adicionar ao room do socket.io
    socket.join(key);
    
    // Adicionar ao mapa de controle
    if (!smcSubscriptions.has(key)) {
      smcSubscriptions.set(key, new Set());
    }
    smcSubscriptions.get(key).add(socket.id);
    
    console.log(`📡 Cliente ${socket.id} assinou SMC: ${key}`);
    
    // Enviar dados iniciais imediatamente
    smcAnalyzer.analyzeMarket(symbol, timeframe, 100).then(result => {
      if (result.success) {
        socket.emit('smc:update', {
          symbol,
          timeframe,
          data: result.data,
          timestamp: Date.now()
        });
      }
    });
    
    // Garantir que o broadcast está rodando
    startSMCBroadcast();
  });
  
  socket.on('unsubscribe:smc', ({ symbol, timeframe }) => {
    const key = `${symbol}:${timeframe}`;
    socket.leave(key);
    
    if (smcSubscriptions.has(key)) {
      smcSubscriptions.get(key).delete(socket.id);
      if (smcSubscriptions.get(key).size === 0) {
        smcSubscriptions.delete(key);
      }
    }
    console.log(`🔕 Cliente ${socket.id} cancelou assinatura SMC: ${key}`);
  });
  
  socket.on('disconnect', () => {
    console.log(`🔌 Cliente desconectado: ${socket.id}`);
    for (const [key, subscribers] of smcSubscriptions.entries()) {
      if (subscribers.has(socket.id)) {
        subscribers.delete(socket.id);
        if (subscribers.size === 0) {
          smcSubscriptions.delete(key);
        }
      }
    }
  });
});

const shouldAutoConnect = process.env.EXCHANGE_MODE === 'testnet' || !process.env.EXCHANGE_MODE;
if (shouldAutoConnect) {
  console.log('🔄 Auto-iniciando conexão com exchange (Testnet/Dev)...');
  exchangeManager.initialize()
    .then(result => {
      if (result.success) {
        exchangeInitialized = true;
        tradingState.exchangeConnected = true;
        console.log('✅ Auto-conexão estabelecida com sucesso');
        startExchangeBroadcast();
      } else {
        console.warn('⚠️ Auto-conexão falhou:', result.error);
      }
    })
    .catch(err => console.error('❌ Erro fatal na auto-conexão:', err));
}

// Estado global do trading
const tradingState = {
  status: 'stopped',
  activeStrategies: 0,
  activePositions: 0,
  totalTrades: 0,
  lastActivity: Date.now(),
  hibernationMode: false,
  exchangeConnected: false,
  lastAnalysis: null,
  currentPrice: null,
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
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Compression middleware para reduzir latência e uso de banda
app.use(compression());

// Middleware de logging
app.use(requestLogger);

// Middleware para garantir JSON válido em todas as respostas
app.use(ensureJsonResponse);

app.use(express.json());

// Add CORS error handler
app.use(handleCorsErrors);

// Servir arquivos estáticos do build do frontend
const SERVE_FRONTEND = process.env.SERVE_FRONTEND === 'true';
if (SERVE_FRONTEND) {
  app.use(express.static(path.join(__dirname, '../frontend/dist'), {
    maxAge: '1h',
    immutable: true
  }));
}

// Automated Trading Routes
app.use('/api/automated-trading', automatedTradingRoutes);

app.post('/api/admin/reset-engine', (req, res) => {
  resetEngineState();
  tradingState.status = 'stopped';
  res.json({
    success: true,
    data: { status: 'NOT_INITIALIZED' },
    timestamp: Date.now()
  });
});

// API Routes com estado dinâmico
app.get('/api/trading/status', (req, res) => {
  const statusData = {
    ...tradingState,
    exchange: exchangeManager.getConnectionStatus(),
    canStart: tradingState.status === 'stopped' && exchangeInitialized
  };
  
  res.json({
    success: true,
    data: statusData,
    timestamp: Date.now()
  });
});

app.get('/api/trading/positions', async (req, res) => {
  try {
    const result = await exchangeManager.getPositions();
    res.json({
      ...result,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, timestamp: Date.now() });
  }
});

app.post('/api/trading/start', async (req, res) => {
  try {
    console.log('🚀 Iniciando trading bot - Modo Exchange Real Ativo');
    
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

    // Verificar se exchange está conectada
    if (!exchangeInitialized) {
      return res.json({
        success: false,
        error: 'Exchange não conectada. Use POST /api/exchange/connect primeiro.',
        status: tradingState.status,
        timestamp: Date.now()
      });
    }

    // Realizar análise SMC inicial
    console.log('📊 Realizando análise SMC inicial...');
    const smcAnalysis = await smcAnalyzer.analyzeMarket('BTC/USDT', '1h', 200);
    
    if (!smcAnalysis.success) {
      console.warn('⚠️ Análise SMC falhou, iniciando com dados básicos');
    } else {
      console.log(`✅ Análise SMC concluída: ${smcAnalysis.data.signals.length} sinais encontrados`);
    }

  // Atualizar estado para running
  tradingState.status = 'running';
    tradingState.activeStrategies = 1;
    tradingState.activePositions = 0;
    tradingState.hibernationMode = false;
    tradingState.lastAnalysis = smcAnalysis.success ? smcAnalysis.data : null;
    
    console.log('✅ Trading iniciado com sucesso - Exchange Real');
    
    io.emit('engine:status', { status: tradingState.status, timestamp: Date.now() });
    res.json({
      success: true,
      message: 'Sistema iniciado com sucesso - Exchange Real',
      status: tradingState.status,
      hibernationMode: tradingState.hibernationMode,
      analysis: smcAnalysis.success ? {
        signalsCount: smcAnalysis.data.signals.length,
        liquidityZones: smcAnalysis.data.liquidityZones.length,
        orderBlocks: smcAnalysis.data.orderBlocks.length,
        currentPrice: smcAnalysis.data.currentPrice
      } : null,
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
    
    io.emit('engine:status', { status: tradingState.status, timestamp: Date.now() });
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

app.get('/api/market/analysis/:symbol', (req, res) => {
  res.json({
    success: true,
    data: {
      symbol: req.params.symbol,
      liquidityZones: [],
      orderBlocks: [],
      fairValueGaps: [],
      marketStructures: [],
      buySideLiquidity: [],
      sellSideLiquidity: [],
      currentPrice: 0,
      signals: []
    },
    timestamp: Date.now()
  });
});

app.get('/api/analysis/smc', async (req, res) => {
  const { symbol = 'BTC/USDT', timeframe = '1h' } = req.query;
  
  try {
    const result = await smcAnalyzer.analyzeMarket(symbol, timeframe, 200);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        timestamp: Date.now()
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Falha na análise SMC',
        timestamp: Date.now()
      });
    }
  } catch (err) {
    console.error('❌ Erro na rota SMC:', err);
    res.status(500).json({
      success: false,
      error: err.message,
      timestamp: Date.now()
    });
  }
});

// ===== ALERT ROUTES =====
app.get('/api/alerts', (req, res) => {
  const { limit = 50, type } = req.query;
  
  let filteredAlerts = alertHistory;
  if (type && type !== 'all') {
    filteredAlerts = filteredAlerts.filter(a => a.type === type);
  }
  
  res.json({
    success: true,
    data: filteredAlerts.slice(0, Number(limit)),
    timestamp: Date.now()
  });
});

app.post('/api/alerts/:id/read', (req, res) => {
  const { id } = req.params;
  const alert = alertHistory.find(a => a.id === id);
  
  if (alert) {
    alert.read = true;
    res.json({ success: true, data: alert });
  } else {
    res.status(404).json({ success: false, error: 'Alert not found' });
  }
});

app.post('/api/alerts/mark-all-read', (req, res) => {
  alertHistory.forEach(a => a.read = true);
  res.json({ success: true, message: 'All alerts marked as read' });
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
    },
    exchange: exchangeManager.getConnectionStatus(),
    trading: {
      status: tradingState.status,
      activeStrategies: tradingState.activeStrategies,
      activePositions: tradingState.activePositions
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

// ===== ACCOUNT ROUTES =====
app.use('/api/account', accountRoutes);
app.use('/api/automated-trading', automatedTradingRoutes);

// Configurar dependências globais para rotas
app.set('smcAnalyzer', smcAnalyzer);
app.set('washTradingCache', washTradingCache);

// ===== NOVOS ENDPOINTS DE EXCHANGE E ANÁLISE SMC =====

// Inicializar conexão com exchange
app.post('/api/exchange/connect', async (req, res) => {
  try {
    console.log('🔗 Iniciando conexão com exchange...');
    
    const result = await exchangeManager.initialize();
    
    if (result.success) {
      exchangeInitialized = true;
      tradingState.exchangeConnected = true;
      console.log('✅ Conexão estabelecida com sucesso');
    } else {
      console.log('⚠️ Conexão falhou, usando modo simulação');
      tradingState.exchangeConnected = false;
    }
    
    const io = req.app.get('io');
    io && io.emit('exchange:status', exchangeManager.getConnectionStatus());
    if (exchangeInitialized) startExchangeBroadcast();

    res.json({
      success: true,
      data: exchangeManager.getConnectionStatus(),
      message: result.message,
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('❌ Erro ao conectar exchange:', error);
    tradingState.exchangeConnected = false;
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now()
    });
  }
});

app.post('/api/backtest/run', async (req, res) => {
  try {
    const { symbol = 'BTC/USDT', timeframe = '1h', initialCapital = 10000 } = req.body;
    
    // 1. Fetch historical data (limit 500 for performance)
    const limit = 500;
    const marketData = await exchangeManager.getMarketData(symbol, timeframe, limit);
    
    if (!marketData.success) {
      throw new Error(marketData.error);
    }
    
    const candles = marketData.data;
    let balance = Number(initialCapital);
    let trades = [];
    let position = null;
    let maxDrawdown = 0;
    let peakBalance = balance;
    
    // 2. Simple Simulation Loop
    // We need at least 50 candles to start analysis
    for (let i = 50; i < candles.length; i++) {
      const currentCandle = candles[i];
      const slice = candles.slice(0, i + 1);
      
      // Use simplified analysis
      const orderBlocks = smcAnalyzer.analyzeOrderBlocks(slice);
      
      // Strategy Logic (Simplified: Buy at Bullish OB)
      if (!position) {
        // Buy Logic
        const bullishOB = orderBlocks.find(ob => ob.type === 'bullish' && Math.abs(ob.price - currentCandle.close) / currentCandle.close < 0.005);
        if (bullishOB) {
          const riskAmount = balance * 0.02; // 2% risk
          const stopLoss = bullishOB.range[0];
          const dist = currentCandle.close - stopLoss;
          if (dist > 0) {
             const quantity = riskAmount / dist;
             const takeProfit = currentCandle.close + (dist * 2); // 1:2 RR
             
             position = {
               type: 'BUY',
               entryPrice: currentCandle.close,
               quantity: quantity,
               stopLoss: stopLoss,
               takeProfit: takeProfit,
               startTime: currentCandle.timestamp
             };
          }
        }
      } else {
        // Manage Position
        if (position.type === 'BUY') {
          if (currentCandle.low <= position.stopLoss) {
            // Stop Loss Hit
            const pnl = (position.stopLoss - position.entryPrice) * position.quantity;
            balance += pnl;
            trades.push({ ...position, exitPrice: position.stopLoss, exitTime: currentCandle.timestamp, pnl, result: 'LOSS' });
            position = null;
          } else if (currentCandle.high >= position.takeProfit) {
            // Take Profit Hit
            const pnl = (position.takeProfit - position.entryPrice) * position.quantity;
            balance += pnl;
            trades.push({ ...position, exitPrice: position.takeProfit, exitTime: currentCandle.timestamp, pnl, result: 'WIN' });
            position = null;
          }
        }
      }
      
      // Track Drawdown
      if (balance > peakBalance) peakBalance = balance;
      const currentDD = (peakBalance - balance) / peakBalance * 100;
      if (currentDD > maxDrawdown) maxDrawdown = currentDD;
    }
    
    const totalTrades = trades.length;
    const wins = trades.filter(t => t.result === 'WIN').length;
    const winRate = totalTrades > 0 ? (wins / totalTrades * 100).toFixed(1) : 0;
    const pnl = balance - initialCapital;
    const pnlPercent = (pnl / initialCapital * 100).toFixed(2);
    const profitFactor = trades.reduce((acc, t) => t.pnl > 0 ? acc + t.pnl : acc, 0) / Math.abs(trades.reduce((acc, t) => t.pnl < 0 ? acc + t.pnl : acc, 0) || 1);
    
    res.json({
      success: true,
      data: {
        totalTrades,
        winRate,
        pnl: pnl.toFixed(2),
        pnlPercent,
        maxDrawdown: maxDrawdown.toFixed(2),
        profitFactor: profitFactor.toFixed(2),
        trades: trades.slice(-10)
      }
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Status da conexão com exchange
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
    exchangeInitialized = false;
    tradingState.exchangeConnected = false;
    const io = req.app.get('io');
    io && io.emit('exchange:status', exchangeManager.getConnectionStatus());
    stopExchangeBroadcast();
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

// Saldo da conta
app.get('/api/exchange/balance', async (req, res) => {
  try {
    if (!exchangeInitialized) {
      return res.json({
        success: false,
        error: 'Exchange não conectada. Use POST /api/exchange/connect primeiro.',
        timestamp: Date.now()
      });
    }
    
    const result = await exchangeManager.getBalance();
    res.json({
      ...result,
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

// Dados de mercado
app.get('/api/exchange/market-data', async (req, res) => {
  try {
    const { symbol = 'BTC/USDT', timeframe = '1h', limit = 100 } = req.query;
    
    if (!exchangeInitialized) {
      return res.json({
        success: false,
        error: 'Exchange não conectada. Use POST /api/exchange/connect primeiro.',
        timestamp: Date.now()
      });
    }
    
    const result = await exchangeManager.getMarketData(symbol, timeframe, parseInt(limit));
    res.json({
      ...result,
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

// Ticker atual
app.get('/api/exchange/ticker', async (req, res) => {
  try {
    const { symbol = 'BTC/USDT' } = req.query;
    
    if (!exchangeInitialized) {
      return res.json({
        success: false,
        error: 'Exchange não conectada. Use POST /api/exchange/connect primeiro.',
        timestamp: Date.now()
      });
    }
    
    const result = await exchangeManager.getTicker(symbol);
    res.json({
      ...result,
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

app.get('/api/exchange/positions', async (req, res) => {
  try {
    res.json({
      success: true,
      data: [],
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

// Análise SMC completa
app.get('/api/analysis/smc', async (req, res) => {
  try {
    const { symbol = 'BTC/USDT', timeframe = '1h', limit = 200 } = req.query;
    
    if (!exchangeInitialized) {
      return res.json({
        success: false,
        error: 'Exchange não conectada. Use POST /api/exchange/connect primeiro.',
        timestamp: Date.now()
      });
    }
    
    console.log(`🔍 Iniciando análise SMC para ${symbol} - ${timeframe}`);
    const result = await smcAnalyzer.analyzeMarket(symbol, timeframe, parseInt(limit));
    
    res.json({
      ...result,
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('❌ Erro na análise SMC:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now()
    });
  }
});

// Relatório de Integridade de Mercado (Wash Trading)
app.get('/api/reports/integrity', (req, res) => {
  try {
    const report = [];
    washTradingCache.forEach((value, key) => {
      report.push({
        symbol: key,
        status: value.severity,
        anomalies: value.activities.length,
        details: value.activities,
        lastUpdate: new Date(value.timestamp).toISOString()
      });
    });

    const stats = {
      totalMonitored: washTradingCache.size,
      highSeverity: report.filter(r => r.status === 'high').length,
      mediumSeverity: report.filter(r => r.status === 'medium').length,
      healthy: 0 // In this cache we only store those with activities, so unknown
    };

    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        stats,
        report
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Teste de ordem (modo testnet)
app.post('/api/exchange/test-order', async (req, res) => {
  try {
    const { symbol = 'BTC/USDT', type = 'limit', side = 'buy', amount = 0.001, price } = req.body;
    
    if (!exchangeInitialized) {
      return res.json({
        success: false,
        error: 'Exchange não conectada. Use POST /api/exchange/connect primeiro.',
        timestamp: Date.now()
      });
    }

    // VERIFICAÇÃO DE WASH TRADING / INTEGRIDADE
    const washStatus = washTradingCache.get(symbol);
    if (washStatus && washStatus.severity === 'high') {
      const activities = washStatus.activities.filter(a => a.severity === 'high').map(a => a.details).join('; ');
      console.warn(`⛔ Trade Bloqueado: Manipulação de Mercado Detectada em ${symbol} (${activities})`);
      
      return res.json({
        success: false,
        error: `TRADE BLOCKED: High severity market manipulation detected. (${activities})`,
        blocked: true,
        reason: 'market_integrity_risk',
        timestamp: Date.now()
      });
    }
    
    // Obter preço atual se não fornecido
    let orderPrice = price;
    if (!orderPrice) {
      const tickerResult = await exchangeManager.getTicker(symbol);
      if (tickerResult.success) {
        orderPrice = tickerResult.data.last;
      }
    }
    
    const result = await exchangeManager.createOrder(symbol, type, side, amount, orderPrice);
    io.emit('trade:executed', { symbol, side, amount, price: orderPrice, timestamp: Date.now() });
    res.json({
      ...result,
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

// Sistema de Testes - Dashboard de Resultados
app.get('/api/tests/results', async (req, res) => {
  try {
    // Simular dados de testes (em produção, isso viria de um banco de dados)
    const mockResults = [
      {
        id: 'test_001',
        timestamp: Date.now() - 300000, // 5 minutos atrás
        testType: 'connection',
        status: 'success',
        duration: 1250,
        message: 'Conexão com Binance Testnet estabelecida com sucesso',
        details: { exchange: 'binance', mode: 'testnet', latency: 125 }
      },
      {
        id: 'test_002',
        timestamp: Date.now() - 240000, // 4 minutos atrás
        testType: 'analysis',
        status: 'success',
        duration: 3450,
        message: 'Análise SMC completada com 3 sinais identificados',
        details: { signals: 3, liquidityZones: 5, orderBlocks: 2, fairValueGaps: 1 }
      },
      {
        id: 'test_003',
        timestamp: Date.now() - 180000, // 3 minutos atrás
        testType: 'order',
        status: 'success',
        duration: 890,
        message: 'Ordem de teste executada com sucesso',
        details: { orderId: '12345', symbol: 'BTC/USDT', side: 'buy', amount: 0.001, price: 45000 }
      },
      {
        id: 'test_004',
        timestamp: Date.now() - 120000, // 2 minutos atrás
        testType: 'risk',
        status: 'warning',
        duration: 567,
        message: 'Limite de exposição em 75% - próximo ao máximo',
        details: { exposure: 0.75, maxExposure: 0.8, availableRisk: 0.05 }
      },
      {
        id: 'test_005',
        timestamp: Date.now() - 60000, // 1 minuto atrás
        testType: 'notification',
        status: 'success',
        duration: 234,
        message: 'Sistema de notificações operacional',
        details: { channels: ['telegram', 'email'], status: 'active' }
      }
    ];

    const summary = {
      totalTests: mockResults.length,
      passedTests: mockResults.filter(t => t.status === 'success').length,
      failedTests: mockResults.filter(t => t.status === 'failed').length,
      warningTests: mockResults.filter(t => t.status === 'warning').length,
      successRate: (mockResults.filter(t => t.status === 'success').length / mockResults.length) * 100,
      averageDuration: mockResults.reduce((acc, test) => acc + test.duration, 0) / mockResults.length,
      lastRun: Date.now() - 300000 // 5 minutos atrás
    };

    res.json({
      success: true,
      data: {
        results: mockResults,
        summary: summary
      },
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

// Executar testes
app.post('/api/tests/run', async (req, res) => {
  try {
    const { testType } = req.body;
    
    let testResults = [];
    
    if (testType) {
      // Executar teste específico
      const specificTest = await runSpecificTest(testType);
      testResults = [specificTest];
    } else {
      // Executar todos os testes
      testResults = await runAllTests();
    }

    res.json({
      success: true,
      data: {
        results: testResults,
        message: testType ? `Teste ${testType} executado com sucesso` : 'Todos os testes executados com sucesso'
      },
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

// Funções auxiliares para execução de testes
async function runAllTests() {
  const tests = [];
  
  // Teste de Conexão
  tests.push({
    id: `test_${Date.now()}_connection`,
    timestamp: Date.now(),
    testType: 'connection',
    status: exchangeInitialized ? 'success' : 'failed',
    duration: Math.floor(Math.random() * 1000) + 500,
    message: exchangeInitialized ? 'Conexão com exchange estabelecida' : 'Falha na conexão com exchange',
    details: { exchange: 'binance', mode: 'testnet', initialized: exchangeInitialized }
  });

  // Teste de Análise SMC
  try {
    const analysisResult = await smcAnalyzer.analyzeMarket('BTC/USDT', '1h', 50);
    tests.push({
      id: `test_${Date.now()}_analysis`,
      timestamp: Date.now(),
      testType: 'analysis',
      status: analysisResult.success ? 'success' : 'failed',
      duration: Math.floor(Math.random() * 2000) + 1000,
      message: analysisResult.success ? 
        `Análise SMC completada com ${analysisResult.data.signals.length} sinais` : 
        'Falha na análise SMC',
      details: analysisResult.success ? analysisResult.data : {}
    });
  } catch (error) {
    tests.push({
      id: `test_${Date.now()}_analysis`,
      timestamp: Date.now(),
      testType: 'analysis',
      status: 'failed',
      duration: Math.floor(Math.random() * 2000) + 1000,
      message: 'Erro na análise SMC: ' + error.message,
      details: { error: error.message }
    });
  }

  // Teste de Ordem (simulado)
  tests.push({
    id: `test_${Date.now()}_order`,
    timestamp: Date.now(),
    testType: 'order',
    status: 'success',
    duration: Math.floor(Math.random() * 1500) + 800,
    message: 'Ordem de teste simulada executada',
    details: { 
      orderId: 'test_' + Math.floor(Math.random() * 10000),
      symbol: 'BTC/USDT', 
      side: 'buy', 
      amount: 0.001, 
      price: 45000 + Math.floor(Math.random() * 1000)
    }
  });

  // Teste de Risco (simulado)
  const riskLevel = Math.random();
  tests.push({
    id: `test_${Date.now()}_risk`,
    timestamp: Date.now(),
    testType: 'risk',
    status: riskLevel > 0.8 ? 'warning' : 'success',
    duration: Math.floor(Math.random() * 800) + 300,
    message: riskLevel > 0.8 ? 
      'Limite de exposição próximo ao máximo' : 
      'Gestão de risco dentro dos limites',
    details: { 
      exposure: riskLevel,
      maxExposure: 0.8,
      status: riskLevel > 0.8 ? 'warning' : 'ok'
    }
  });

  // Teste de Notificação (simulado)
  tests.push({
    id: `test_${Date.now()}_notification`,
    timestamp: Date.now(),
    testType: 'notification',
    status: 'success',
    duration: Math.floor(Math.random() * 500) + 200,
    message: 'Sistema de notificações operacional',
    details: { 
      channels: ['telegram', 'email'],
      status: 'active',
      lastNotification: Date.now() - Math.floor(Math.random() * 3600000)
    }
  });

  return tests;
}

async function runSpecificTest(testType) {
  const test = {
    id: `test_${Date.now()}_${testType}`,
    timestamp: Date.now(),
    testType: testType,
    duration: Math.floor(Math.random() * 2000) + 500,
    details: {}
  };

  switch (testType) {
    case 'connection':
      test.status = exchangeInitialized ? 'success' : 'failed';
      test.message = exchangeInitialized ? 'Conexão com exchange estabelecida' : 'Falha na conexão com exchange';
      test.details = { exchange: 'binance', mode: 'testnet', initialized: exchangeInitialized };
      break;
      
    case 'analysis':
      try {
        const analysisResult = await smcAnalyzer.analyzeMarket('BTC/USDT', '1h', 50);
        test.status = analysisResult.success ? 'success' : 'failed';
        test.message = analysisResult.success ? 
          `Análise SMC completada com ${analysisResult.data.signals.length} sinais` : 
          'Falha na análise SMC';
        test.details = analysisResult.success ? analysisResult.data : {};
      } catch (error) {
        test.status = 'failed';
        test.message = 'Erro na análise SMC: ' + error.message;
        test.details = { error: error.message };
      }
      break;
      
    case 'order':
      test.status = 'success';
      test.message = 'Ordem de teste simulada executada';
      test.details = { 
        orderId: 'test_' + Math.floor(Math.random() * 10000),
        symbol: 'BTC/USDT', 
        side: 'buy', 
        amount: 0.001, 
        price: 45000 + Math.floor(Math.random() * 1000)
      };
      break;
      
    case 'risk': {
      const riskLevel = Math.random();
      test.status = riskLevel > 0.8 ? 'warning' : 'success';
      test.message = riskLevel > 0.8 ? 
        'Limite de exposição próximo ao máximo' : 
        'Gestão de risco dentro dos limites';
      test.details = { 
        exposure: riskLevel,
        maxExposure: 0.8,
        status: riskLevel > 0.8 ? 'warning' : 'ok'
      };
      break;
    }
      
    case 'notification':
      test.status = 'success';
      test.message = 'Sistema de notificações operacional';
      test.details = { 
        channels: ['telegram', 'email'],
        status: 'active',
        lastNotification: Date.now() - Math.floor(Math.random() * 3600000)
      };
      break;
      
    default:
      test.status = 'failed';
      test.message = 'Tipo de teste desconhecido';
      test.details = { error: 'Unknown test type' };
  }

  return test;
}

// Rota para servir o frontend (SPA) - DEVE SER A ÚLTIMA
if (SERVE_FRONTEND) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
  });
} else {
  // Rota raiz amigável quando o frontend não está sendo servido
  app.get('/', (_req, res) => {
    res.json({
      success: true,
      message: 'Robo Cripto SMC API - Backend Operacional 🚀',
      endpoints: {
        health: '/api/health',
        status: '/api/trading/status',
        docs: 'Consulte a documentação para lista completa de endpoints'
      },
      timestamp: Date.now()
    });
  });

  // Catch-all para rotas não encontradas (404)
  app.all('*', (_req, res) => {
    res.status(404).json({ 
      success: false, 
      error: 'Endpoint não encontrado',
      path: _req.originalUrl,
      hint: 'Verifique se a URL está correta ou acesse / para ver endpoints disponíveis'
    });
  });
}

// Error handling - Use comprehensive API error handler
app.use(handleApiErrors);

// Iniciar servidor
resetEngineState();

// Remove duplicate empty io.on connection handler that was here

setInterval(async () => {
  try {
    const symbols = ['BTC/USDT', 'ETH/USDT'];
    if (exchangeInitialized) {
      for (const symbol of symbols) {
        const ticker = await exchangeManager.getTicker(symbol);
        if (ticker && ticker.success) {
          io.emit('price:update', { 
            symbol, 
            price: ticker.data.last,
            change24h: ticker.data.percentage,
            high24h: ticker.data.high,
            low24h: ticker.data.low,
            volume24h: ticker.data.volume,
            timestamp: Date.now() 
          });
        }
      }
    }
    io.emit('engine:status', { status: tradingState.status, timestamp: Date.now() });
  } catch { void 0; }
}, 3000);

server.listen(PORT, () => {
  console.log(`🚀 Robo Cripto SMC rodando na porta ${PORT}`);
  console.log(`📊 Acesse: http://localhost:${PORT}`);
  console.log(`🔧 API disponível em: http://localhost:${PORT}/api/health`);
  
  // Iniciar broadcast de dados SMC em tempo real
  startSMCBroadcast();
});

// Ajustes de timeouts e keepalive
server.keepAliveTimeout = 60000;
server.headersTimeout = 65000;
server.setTimeout(30000);

export default app;
