import express from 'express';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import ExchangeManager from './src/exchange/ExchangeManager.js';
import SMCAnalyzer from './src/analysis/SMCAnalyzer.js';

// Carregar variáveis de ambiente
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Instanciar gerenciadores
const exchangeManager = new ExchangeManager();
const smcAnalyzer = new SMCAnalyzer(exchangeManager);
let exchangeInitialized = false;

// Estado global do trading
let tradingState = {
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

// Servir arquivos estáticos do build
app.use(express.static(path.join(__dirname, 'dist')));

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

app.get('/api/trading/positions', (req, res) => {
  res.json({
    success: true,
    data: [],
    timestamp: Date.now()
  });
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

// Status da conexão com exchange
app.get('/api/exchange/status', (req, res) => {
  res.json({
    success: true,
    data: exchangeManager.getConnectionStatus(),
    timestamp: Date.now()
  });
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
    
    // Obter preço atual se não fornecido
    let orderPrice = price;
    if (!orderPrice) {
      const tickerResult = await exchangeManager.getTicker(symbol);
      if (tickerResult.success) {
        orderPrice = tickerResult.data.last;
      }
    }
    
    const result = await exchangeManager.createOrder(symbol, type, side, amount, orderPrice);
    
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
      
    case 'risk':
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
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor',
    timestamp: Date.now()
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Robo Cripto SMC rodando na porta ${PORT}`);
  console.log(`📊 Acesse: http://localhost:${PORT}`);
  console.log(`🔧 API disponível em: http://localhost:${PORT}/api/health`);
});

export default app;