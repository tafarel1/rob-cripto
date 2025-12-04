import { Router, type Request, type Response } from 'express';
import { TradingEngine } from '../services/tradingEngine';
import { ExchangeService } from '../services/exchangeService';
import { SMCAnalyzer } from '../services/smcAnalyzer';
import { RiskManager } from '../services/riskManager';
import { ApiResponse, StrategyConfig, ExchangeConfig, RiskManagement, RiskStats, TradePosition, SMCAnalysis, TradingSignal, MarketData } from '../../../shared/types';

const router = Router();

// Instâncias dos serviços (serão inicializadas com configurações)
let tradingEngine: TradingEngine | null = null;
let exchangeService: ExchangeService | null = null;
let smcAnalyzer: SMCAnalyzer | null = null;
let riskManager: RiskManager | null = null;

/**
 * Inicializa serviços com configurações
 */
function initializeServices() {
  // Configurações padrão (podem vir do banco de dados ou arquivo de config)
  const exchangeConfigs: ExchangeConfig[] = [
    {
      name: 'binance',
      apiKey: process.env.BINANCE_API_KEY || '',
      apiSecret: process.env.BINANCE_SECRET || '',
      testnet: process.env.NODE_ENV === 'development'
    }
  ];

  const riskConfig: RiskManagement = {
    maxRiskPerTrade: 2, // 2% por trade
    maxDailyLoss: 5, // 5% por dia
    maxPositions: 5, // Máximo 5 posições simultâneas
    riskRewardRatio: 2, // Mínimo 1:2
    positionSizingMethod: 'fixed'
  };

  exchangeService = new ExchangeService(exchangeConfigs);
  smcAnalyzer = new SMCAnalyzer();
  riskManager = new RiskManager(riskConfig);
  tradingEngine = new TradingEngine(exchangeConfigs, riskConfig);
}

/**
 * GET /api/trading/status
 * Obtém status do sistema de trading
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    if (!tradingEngine) {
      initializeServices();
    }

    const stats = tradingEngine!.getStats();
    type StatusData = {
      status: 'running' | 'stopped';
      activeStrategies: number;
      activePositions: number;
      totalTrades: number;
      riskStats: RiskStats;
    };
    const response: ApiResponse<StatusData> = {
      success: true,
      data: {
        status: stats.isRunning ? 'running' : 'stopped',
        activeStrategies: stats.activeStrategies,
        activePositions: stats.activePositions,
        totalTrades: stats.totalTrades,
        riskStats: stats.riskStats
      },
      timestamp: Date.now()
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse<undefined> = {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: Date.now()
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/trading/start
 * Inicia o motor de trading
 */
router.post('/start', async (req: Request, res: Response) => {
  try {
    if (!tradingEngine) {
      initializeServices();
      await tradingEngine!.initialize();
    }

    tradingEngine!.start();
    
    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: 'Motor de trading iniciado' },
      timestamp: Date.now()
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse<undefined> = {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: Date.now()
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/trading/stop
 * Para o motor de trading
 */
router.post('/stop', async (req: Request, res: Response) => {
  try {
    if (!tradingEngine) {
      const response: ApiResponse<undefined> = {
        success: false,
        error: 'Motor não inicializado',
        timestamp: Date.now()
      };
      return res.status(400).json(response);
    }

    tradingEngine!.stop();
    
    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: 'Motor de trading parado' },
      timestamp: Date.now()
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse<undefined> = {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: Date.now()
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/trading/positions
 * Obtém posições ativas
 */
router.get('/positions', async (req: Request, res: Response) => {
  try {
    if (!tradingEngine) {
      const response: ApiResponse<undefined> = {
        success: false,
        error: 'Motor não inicializado',
        timestamp: Date.now()
      };
      return res.status(400).json(response);
    }

    const positions = tradingEngine!.getActivePositions();
    const response: ApiResponse<TradePosition[]> = {
      success: true,
      data: positions,
      timestamp: Date.now()
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse<undefined> = {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: Date.now()
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/trading/positions/:id/close
 * Fecha posição específica
 */
router.post('/positions/:id/close', async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    
    // Implementar fechamento de posição
    // tradingEngine!.closePosition(id);
    
    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: `Posição ${id} fechada` },
      timestamp: Date.now()
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse<undefined> = {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: Date.now()
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/trading/strategies
 * Obtém estratégias configuradas
 */
router.get('/strategies', async (req: Request, res: Response) => {
  try {
    if (!tradingEngine) {
      const response: ApiResponse<undefined> = {
        success: false,
        error: 'Motor não inicializado',
        timestamp: Date.now()
      };
      return res.status(400).json(response);
    }

    const strategies = tradingEngine!.getStrategies();
    const response: ApiResponse<StrategyConfig[]> = {
      success: true,
      data: strategies,
      timestamp: Date.now()
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse<undefined> = {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: Date.now()
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/trading/strategies
 * Adiciona nova estratégia
 */
router.post('/strategies', async (req: Request, res: Response) => {
  try {
    const strategyConfig = req.body as StrategyConfig;
    
    if (!tradingEngine) {
      initializeServices();
    }

    tradingEngine!.addStrategy(strategyConfig);
    
    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: 'Estratégia adicionada' },
      timestamp: Date.now()
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse<undefined> = {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: Date.now()
    };
    res.status(500).json(response);
  }
});

/**
 * DELETE /api/trading/strategies/:name
 * Remove estratégia
 */
router.delete('/strategies/:name', async (req: Request, res: Response) => {
  try {
    const { name } = req.params as { name: string };
    
    if (!tradingEngine) {
      const response: ApiResponse<undefined> = {
        success: false,
        error: 'Motor não inicializado',
        timestamp: Date.now()
      };
      return res.status(400).json(response);
    }

    tradingEngine!.removeStrategy(name);
    
    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: `Estratégia ${name} removida` },
      timestamp: Date.now()
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse<undefined> = {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: Date.now()
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/trading/market-data/:symbol
 * Obtém dados de mercado para análise
 */
router.get('/market-data/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params as { symbol: string };
    const query = req.query as { timeframe?: string; limit?: string };
    const timeframe = query.timeframe ?? '1h';
    const limitStr = query.limit ?? '100';
    
    if (!exchangeService) {
      initializeServices();
    }

    const marketData = await exchangeService!.getMarketData(
      'binance',
      symbol,
      timeframe,
      parseInt(limitStr)
    );
    const response: ApiResponse<MarketData[]> = {
      success: true,
      data: marketData,
      timestamp: Date.now()
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse<undefined> = {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: Date.now()
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/trading/analyze
 * Realiza análise SMC de mercado
 */
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const body = req.body as { symbol: string; timeframe?: string; limit?: number };
    const { symbol, timeframe = '1h', limit = 100 } = body;
    
    if (!smcAnalyzer || !exchangeService) {
      initializeServices();
    }

    // Obter dados de mercado
    const marketData = await exchangeService!.getMarketData('binance', symbol, timeframe, limit);
    
    // Realizar análise SMC
    const analysis = smcAnalyzer!.analyze(marketData);
    
    // Obter preço atual
    const ticker = await exchangeService!.getTicker('binance', symbol);
    
    // Gerar sinais
    const signals = smcAnalyzer!.generateSignals(analysis, ticker.last, timeframe);
    type AnalyzeData = {
      analysis: SMCAnalysis;
      signals: TradingSignal[];
      currentPrice: number;
      timestamp: number;
    };
    const response: ApiResponse<AnalyzeData> = {
      success: true,
      data: {
        analysis,
        signals,
        currentPrice: ticker.last,
        timestamp: Date.now()
      },
      timestamp: Date.now()
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse<undefined> = {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: Date.now()
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/trading/exchanges
 * Obtém lista de exchanges disponíveis
 */
router.get('/exchanges', async (req: Request, res: Response) => {
  try {
    const exchanges = ['binance', 'bybit', 'okx', 'kucoin'];
    const response: ApiResponse<string[]> = {
      success: true,
      data: exchanges,
      timestamp: Date.now()
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse<undefined> = {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: Date.now()
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/trading/symbols/:exchange
 * Obtém símbolos disponíveis na exchange
 */
router.get('/symbols/:exchange', async (req: Request, res: Response) => {
  try {
    const { exchange } = req.params as { exchange: string };
    
    if (!exchangeService) {
      initializeServices();
    }

    const symbols = await exchangeService!.getSymbols(exchange);
    const response: ApiResponse<string[]> = {
      success: true,
      data: symbols,
      timestamp: Date.now()
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse<undefined> = {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: Date.now()
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/trading/risk-stats
 * Obtém estatísticas de risco
 */
router.get('/risk-stats', async (req: Request, res: Response) => {
  try {
    if (!riskManager) {
      initializeServices();
    }

    const stats = riskManager!.getRiskStats();
    const response: ApiResponse<RiskStats> = {
      success: true,
      data: stats,
      timestamp: Date.now()
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse<undefined> = {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: Date.now()
    };
    res.status(500).json(response);
  }
});

export default router;
