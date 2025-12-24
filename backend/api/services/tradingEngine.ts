import { WorkerManager } from './workerManager.js';
import { ExchangeService } from './exchangeService.js';
import { InstitutionalRiskManager } from './institutionalRisk.js';
import { TimescaleService } from './persistence/timescaleService.js';
import { NotificationService } from './notificationService.js';
import { StrategyMonitor } from './strategyMonitor.js';
import { HedgingManager } from './hedgingManager.js';
import { AlternativeDataService } from './alternativeDataService.js';
import { MarketDataPipeline } from './dataPipeline.js';
import { 
  MarketData, 
  TradingSignal, 
  TradePosition, 
  StrategyConfig, 
  SMCAnalysis,
  ExchangeConfig,
  RiskManagement,
  RiskStats,
  HedgingConfig,
  AlternativeMetrics
} from '../../../shared/types.js';
import { v4 as uuidv4 } from 'uuid';

export class TradingEngine {
  private workerManager: WorkerManager;
  private exchangeService: ExchangeService;
  private riskManager: InstitutionalRiskManager;
  private dbService: TimescaleService;
  private notificationService: NotificationService;
  private strategyMonitor: StrategyMonitor;
  private hedgingManager: HedgingManager;
  private alternativeDataService: AlternativeDataService;
  private dataPipeline: MarketDataPipeline;
  private strategies: Map<string, StrategyConfig> = new Map();
  private activePositions: Map<string, TradePosition> = new Map();
  private marketDataCache: Map<string, MarketData[]> = new Map();
  private isRunning: boolean = false;
  private systemPaused: boolean = false;
  private analysisInterval: NodeJS.Timeout | null = null;
  private positionUpdateInterval: NodeJS.Timeout | null = null;

  constructor(
    exchangeConfigs: ExchangeConfig[],
    riskConfig: RiskManagement,
    initialBalance: number = 10000,
    dbConnectionString: string = process.env.DATABASE_URL || 'postgres://user:pass@localhost:5432/robocrypto'
  ) {
    this.workerManager = new WorkerManager();
    this.exchangeService = new ExchangeService(exchangeConfigs);
    this.riskManager = new InstitutionalRiskManager(riskConfig, initialBalance);
    this.dbService = new TimescaleService(dbConnectionString);
    this.notificationService = new NotificationService();
    this.strategyMonitor = new StrategyMonitor(this.notificationService);
    this.alternativeDataService = new AlternativeDataService(this.exchangeService);
    this.dataPipeline = new MarketDataPipeline();
    
    // Default Hedging Config
    const hedgingConfig: HedgingConfig = {
      enabled: process.env.ENABLE_HEDGING === 'true',
      hedgeExchange: process.env.HEDGE_EXCHANGE || 'binance',
      hedgeSymbol: process.env.HEDGE_SYMBOL || 'BTC/USDT',
      maxDeltaExposure: parseFloat(process.env.HEDGE_MAX_DELTA || '1000'),
      targetDelta: 0,
      checkInterval: 60000 // 1 min
    };
    this.hedgingManager = new HedgingManager(hedgingConfig, this.exchangeService, this.notificationService);

    // Connect Strategy Monitor Volatility to Hedging Manager
    this.strategyMonitor.on('volatility', (volatility: number) => {
      this.hedgingManager.updateMarketVolatility(volatility);
    });

    // Listen for Strategy Drift (System-wide for now)
    this.strategyMonitor.on('drift', (data: any) => {
        this.handleStrategyDrift(data);
    });

    // Listen for Market Regime Changes
    this.strategyMonitor.on('regime', (data: any) => {
        this.handleMarketRegimeChange(data);
    });
    
    // Attempt DB connection (non-blocking)
    // this.dbService.connect(); // Moved to initialize()

    this.setupDataListeners();
  }

  public async initialize(): Promise<void> {
    console.log('Inicializando motor de trading...');
    
    // Connect DB
    await this.dbService.connect();

    // Start High-Speed Data Stream
    await this.dataPipeline.startStream();

    // Testar conexão com exchanges
    for (const config of this.exchangeService['exchanges'].keys()) {
      const isConnected = await this.exchangeService.testConnection(config);
      console.log(`Exchange ${config}: ${isConnected ? 'Conectada' : 'Falha na conexão'}`);
    }

    // Carregar estratégias salvas
    await this.loadStrategies();
    
    console.log('Motor de trading inicializado com sucesso');
  }

  public addStrategy(strategy: StrategyConfig): void {
    if (!strategy.name) {
      strategy.name = `Strategy-${Date.now()}`;
    }
    this.strategies.set(strategy.name, strategy);
    console.log(`Estratégia adicionada: ${strategy.name} (${strategy.symbol})`);
  }

  public async getStats(): Promise<any> {
    const workerStats = await this.workerManager.getAllWorkerMetrics();
    return {
      activePositions: this.activePositions.size,
      isRunning: this.isRunning,
      systemPaused: this.systemPaused,
      hedgingPosition: this.hedgingManager.getCurrentHedgePosition(),
      riskMetrics: this.riskManager.getRiskStats(),
      workerStats
    };
  }

  public getStrategies(): StrategyConfig[] {
    return Array.from(this.strategies.values());
  }

  public getActivePositions(): TradePosition[] {
    return Array.from(this.activePositions.values());
  }

  public reset(options: { preserveSettings: boolean, initialBalance?: number }): any {
    this.stop();
    this.activePositions.clear();
    this.marketDataCache.clear();
    
    if (!options.preserveSettings) {
        this.strategies.clear();
    }
    
    return this.getStats();
  }

  private setupDataListeners() {
      this.dataPipeline.on('price_update', (update) => {
          // Real-time updates!
          // We can use this to update position PnL immediately
          // or trigger high-frequency logic
          
          // Example: Update Monitor metrics
          this.strategyMonitor.updateMetrics(update.price);
      });
  }

  /**
   * Remove estratégia
   */
  removeStrategy(strategyName: string): void {
    this.strategies.delete(strategyName);
    console.log(`Estratégia ${strategyName} removida`);
  }

  /**
   * Inicia execução automática
   */
  start(): void {
    if (this.isRunning) {
      console.log('Motor já está em execução');
      return;
    }

    this.isRunning = true;
    console.log('Iniciando execução automática do motor de trading');

    // Análise de mercado a cada 5 minutos
    this.analysisInterval = setInterval(() => {
      this.analyzeMarket();
    }, 5 * 60 * 1000);

    // Atualização de posições a cada 30 segundos
    this.positionUpdateInterval = setInterval(() => {
      this.updatePositions();
    }, 30 * 1000);

    // Executar análise imediatamente
    this.analyzeMarket();
  }

  /**
   * Para execução automática
   */
  stop(): void {
    this.isRunning = false;
    
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }

    if (this.positionUpdateInterval) {
      clearInterval(this.positionUpdateInterval);
      this.positionUpdateInterval = null;
    }

    console.log('Motor de trading parado');
  }

  /**
   * Handle Strategy Drift Detection
   */
  private handleStrategyDrift(data: any) {
      console.warn(`[TradingEngine] Strategy Drift Detected:`, data);
      
      if (data.detected && data.severity === 'HIGH') {
          console.error('[TradingEngine] CRITICAL DRIFT - Pausing System');
          this.systemPaused = true;
          this.notificationService.send(`CRITICAL: Strategy Drift Detected. Trading Paused. Z-Score: ${data.details.z_score}`);
      }
  }

  /**
   * Handle Market Regime Change
   */
  private handleMarketRegimeChange(data: any) {
      console.log(`[TradingEngine] Market Regime Change: ${data.current}`);
      
      // Adapt strategies based on regime
      // For now, we just log and check for extreme volatility
      if (data.current.includes('EXTREME')) {
          console.warn('[TradingEngine] Extreme Volatility Regime - Pausing System');
          this.systemPaused = true;
          this.notificationService.send(`WARNING: Extreme Market Volatility (${data.current}). Trading Paused.`);
      } else if (this.systemPaused && !data.current.includes('EXTREME')) {
          // Auto-resume if volatility drops? 
          // Maybe safer to require manual resume, but for now let's log suggestion
          console.log('[TradingEngine] Volatility normalized. System remains paused until manual reset or implemented auto-resume.');
      }
  }

  /**
   * Analisa mercado para todas as estratégias ativas
   */
  private async analyzeMarket(): Promise<void> {
    if (!this.isRunning) return;

    if (this.systemPaused) {
        console.warn('Trading Paused due to System Alert (Drift/Risk). Skipping analysis.');
        return;
    }

    console.log('Analisando mercado...');

    for (const [strategyName, config] of this.strategies) {
      if (!config.enabled) continue;

      try {
        await this.analyzeStrategy(config);
      } catch (error) {
        console.error(`Erro ao analisar estratégia ${strategyName}:`, error);
      }
    }
  }

  /**
   * Analisa estratégia específica
   */
  private async analyzeStrategy(config: StrategyConfig): Promise<void> {
    const { symbol, timeframe, smcParams } = config;

    // Obter dados de mercado
    const marketData = await this.exchangeService.getMarketData(
      'binance', // Pode ser configurável
      symbol,
      timeframe,
      100
    );

    // Realizar análise SMC via Worker
    const analysis = await this.workerManager.executeAnalysis(symbol, marketData, config);
    
    // Obter preço atual
    const ticker = await this.exchangeService.getTicker('binance', symbol);
    const currentPrice = ticker.last;

    // Monitor Strategy Health (Regime Detection)
    this.strategyMonitor.updateMetrics(currentPrice);

    // Get Alternative Data (Task 3)
    let altMetrics: AlternativeMetrics | undefined;
    try {
        altMetrics = await this.alternativeDataService.getAlternativeMetrics(symbol);
    } catch (err) {
        console.warn(`Could not fetch alt data for ${symbol}:`, err);
    }

    // Gerar sinais via Worker
    const signals = await this.workerManager.generateSignals(
        symbol, 
        analysis, 
        currentPrice, 
        timeframe, 
        marketData, 
        config
    );

    // Processar sinais
    for (const signal of signals) {
      if (altMetrics) {
        this.refineSignalWithAlternativeData(signal, altMetrics);
      }
      await this.processSignal(signal, config, analysis);
    }

    // Cache dos dados para análise posterior
    this.marketDataCache.set(`${symbol}_${timeframe}`, marketData);
    
    // Async DB Save (Fire and forget)
    this.dbService.saveMarketData(symbol, marketData).catch(err => {
        console.warn(`Failed to persist market data for ${symbol}: ${err.message}`);
    });
  }

  /**
   * Refina sinal usando dados alternativos
   */
  private refineSignalWithAlternativeData(signal: TradingSignal, metrics: AlternativeMetrics) {
    let scoreModifier = 0;
    const sentimentScore = metrics.sentiment.reduce((acc, s) => acc + s.score, 0) / (metrics.sentiment.length || 1);
    
    // Sentiment Logic
    // Positive Sentiment supports BUY
    if (signal.type === 'BUY' && sentimentScore > 0.3) scoreModifier += 0.1;
    // Negative Sentiment supports SELL
    if (signal.type === 'SELL' && sentimentScore < -0.3) scoreModifier += 0.1;
    
    // Derivatives Logic (Funding Rate)
    // High Positive Funding (>0.01%) -> Crowded Longs -> Potential Reversal Down -> Boost SELL
    if (metrics.derivatives.fundingRate > 0.0001 && signal.type === 'SELL') scoreModifier += 0.1;
    // High Negative Funding (<-0.01%) -> Crowded Shorts -> Potential Reversal Up -> Boost BUY
    if (metrics.derivatives.fundingRate < -0.0001 && signal.type === 'BUY') scoreModifier += 0.1;

    signal.confidence = Math.min(0.99, Math.max(0.1, signal.confidence + scoreModifier));
    
    if (Math.abs(scoreModifier) > 0.01) {
        signal.reason += ` [AltData: ${scoreModifier > 0 ? '+' : ''}${scoreModifier.toFixed(2)}]`;
    }
  }

  /**
   * Processa sinal de trading
   */
  private async processSignal(
    signal: TradingSignal, 
    config: StrategyConfig, 
    analysis: SMCAnalysis
  ): Promise<void> {
    // Validar sinal com gestão de risco
    const validation = this.riskManager.validateSignal(signal);
    
    if (!validation.isValid) {
      console.log(`Sinal rejeitado: ${validation.reason}`);
      return;
    }

    // --- Institutional Risk Check (VaR) ---
    // Calculate VaR before entering a new trade
    // We need historical data for this. Using cached data if available.
    const cachedData = this.marketDataCache.get(`${config.symbol}_${config.timeframe}`);
    if (cachedData && cachedData.length > 100) {
      const returns = cachedData.slice(1).map((c, i) => (c.close - cachedData[i].close) / cachedData[i].close);
      const currentPositions = Array.from(this.activePositions.values());
      const currentVaR = this.riskManager.calculateVaR(currentPositions, returns);
      
      // If current VaR + estimated new trade risk > Max Daily Loss threshold (as proxy for capital limit)
      // This is a simplified check. In reality, we'd add the new trade to the portfolio and recalc VaR.
      const riskConfig = this.riskManager.getConfiguration();
      const balance = this.riskManager.getAccountBalance();
      const maxAllowedVaR = riskConfig.maxDailyLoss * (balance / 100);
      
      if (currentVaR > maxAllowedVaR) {
        console.warn(`Sinal rejeitado: VaR (${currentVaR.toFixed(2)}) excede limite de risco (${maxAllowedVaR.toFixed(2)})`);
        return;
      }
    }
    // --------------------------------------

    // Usar preços ajustados se necessário
    const entryPrice = signal.entryPrice;
    const stopLoss = validation.adjustedStopLoss || signal.stopLoss;
    const takeProfit = validation.adjustedTakeProfit || signal.takeProfit;

    // Calcular tamanho da posição
    const positionSize = this.riskManager.calculatePositionSize(
      entryPrice,
      stopLoss,
      signal
    );

    if (positionSize === 0) {
      console.log('Tamanho da posição zero, sinal ignorado');
      return;
    }

    // Criar posição
    const position: TradePosition = {
      id: uuidv4(),
      symbol: config.symbol,
      type: signal.type === 'BUY' ? 'LONG' : 'SHORT',
      entryPrice,
      quantity: positionSize,
      stopLoss,
      takeProfit,
      status: 'OPEN',
      openTime: Date.now(),
      fees: 0
    };

    // Executar ordem na exchange
    try {
      let _orderResult;
      
      // Algorithmic Execution Decision
      // If position size > threshold (e.g., $100k or specific quantity), use Algo
      const positionValue = positionSize * entryPrice;
      const ALGO_THRESHOLD = 50000; // Example: $50k

      if (positionValue > ALGO_THRESHOLD) {
        console.log(`Large order detected ($${positionValue.toFixed(2)}). Engaging TWAP.`);
        // Execute over 60 minutes in 12 slices (every 5 mins)
        // Note: This is async and might not return immediately with a single order ID
        // For simplicity in this loop, we await it, but in HFT this would be spun off
        await this.exchangeService.executeTWAP(
           'binance',
           config.symbol,
           signal.type === 'BUY' ? 'buy' : 'sell',
           positionSize,
           60, // duration minutes
           12  // slices
        );
        // We'd need to aggregate results for the 'position' object
      } else {
        // Standard Execution
        _orderResult = await this.exchangeService.createOrderWithStopLossAndTakeProfit(
          'binance',
          config.symbol,
          signal.type === 'BUY' ? 'buy' : 'sell',
          positionSize,
          entryPrice,
          stopLoss,
          takeProfit // Pass the full array of TPs
        );
      }

      // Persist Signal
      this.dbService.saveSignal(config.symbol, signal).catch(console.error);

      // Registrar posição
      this.riskManager.registerPosition(position);
      this.activePositions.set(position.id, position);

      console.log(`Posição criada: ${position.id} - ${signal.type} ${config.symbol} @ ${entryPrice}`);
      
      // Notificar (pode ser implementado posteriormente)
      this.notifyTrade(signal, position, analysis);

    } catch (error) {
      console.error('Erro ao executar ordem:', error);
    }
  }

  /**
   * Atualiza posições ativas
   */
  private async updatePositions(): Promise<void> {
    if (!this.isRunning) return;

    console.log('Atualizando posições...');

    // Check Portfolio Hedging
    try {
      await this.hedgingManager.evaluatePortfolio(Array.from(this.activePositions.values()));
    } catch (error) {
      console.error('Erro na avaliação de hedging:', error);
    }

    for (const [positionId, position] of this.activePositions) {
      if (position.status !== 'OPEN') continue;

      try {
        await this.updatePosition(position);
      } catch (error) {
        console.error(`Erro ao atualizar posição ${positionId}:`, error);
      }
    }
  }

  /**
   * Atualiza posição específica
   */
  private async updatePosition(position: TradePosition): Promise<void> {
    // Obter preço atual
    const ticker = await this.exchangeService.getTicker('binance', position.symbol);
    const currentPrice = ticker.last;

    // Calcular PnL não realizado
    const _unrealizedPnl = position.type === 'LONG'
      ? (currentPrice - position.entryPrice) * position.quantity
      : (position.entryPrice - currentPrice) * position.quantity;

    // Verificar se deve ajustar stop loss para break-even
    const newStopLoss = this.riskManager.adjustStopLossToBreakEven(position, currentPrice);
    
    if (newStopLoss !== position.stopLoss) {
      console.log(`Ajustando stop loss para break-even: ${newStopLoss}`);
      try {
        const side = position.type === 'LONG' ? 'sell' : 'buy';
        const updatedOrder = await this.exchangeService.updateStopLoss(
            'binance',
            position.symbol,
            side,
            position.quantity,
            newStopLoss,
            position.stopLossOrderId
        );
        position.stopLoss = newStopLoss;
        position.stopLossOrderId = updatedOrder.id;
        console.log(`Stop loss atualizado na exchange. Novo ID: ${updatedOrder.id}`);
      } catch (error) {
        console.error(`Falha ao atualizar stop loss na exchange:`, error);
      }
    }

    // Verificar saída parcial
    const profitLevels = [0.02, 0.04, 0.06]; // 2%, 4%, 6%
    const partialExit = this.riskManager.shouldTakePartialProfit(position, currentPrice, profitLevels);

    if (partialExit.shouldExit && partialExit.exitAmount > 0) {
      console.log(`Saindo parcialmente: ${partialExit.exitAmount} @ ${partialExit.exitPrice}`);
      try {
        const side = position.type === 'LONG' ? 'sell' : 'buy';
        // Executar saída parcial a mercado
        const exitOrder = await this.exchangeService.createMarketOrder(
            'binance',
            position.symbol,
            side,
            partialExit.exitAmount
        );

        // Atualizar posição
        const pnl = position.type === 'LONG' 
            ? (partialExit.exitPrice - position.entryPrice) * partialExit.exitAmount
            : (position.entryPrice - partialExit.exitPrice) * partialExit.exitAmount;
        
        position.quantity -= partialExit.exitAmount;
        position.realizedPnl = (position.realizedPnl || 0) + pnl;
        
        // Update triggered levels
        if (!position.triggeredTpLevels) position.triggeredTpLevels = [];
        if (partialExit.levelIndex !== undefined) {
            position.triggeredTpLevels.push(partialExit.levelIndex);
        }

        console.log(`Saída parcial executada. PnL realizado nesta fatia: ${pnl.toFixed(2)}`);
        
        // Se a posição ficar zerada ou muito pequena, fechar completamente
        if (position.quantity <= 0.00001) { // Threshold pequeno arbitrário
            await this.closePosition(position, 'Fechamento residual após saída parcial');
        }

      } catch (error) {
        console.error(`Falha ao executar saída parcial:`, error);
      }
    }

    // Verificar se posição deve ser fechada
    const shouldClose = this.shouldClosePosition(position, currentPrice);
    
    if (shouldClose.shouldClose) {
      await this.closePosition(position, shouldClose.reason);
    }

    // Atualizar cache
    this.activePositions.set(position.id, position);
  }

  /**
   * Verifica se posição deve ser fechada
   */
  private shouldClosePosition(position: TradePosition, currentPrice: number): {
    shouldClose: boolean;
    reason: string;
  } {
    // Stop loss acionado
    if (position.type === 'LONG' && currentPrice <= position.stopLoss) {
      return { shouldClose: true, reason: 'Stop loss acionado' };
    }
    
    if (position.type === 'SHORT' && currentPrice >= position.stopLoss) {
      return { shouldClose: true, reason: 'Stop loss acionado' };
    }

    // Take profit acionado
    for (const tp of position.takeProfit) {
      if (position.type === 'LONG' && currentPrice >= tp) {
        return { shouldClose: true, reason: `Take profit atingido: ${tp}` };
      }
      
      if (position.type === 'SHORT' && currentPrice <= tp) {
        return { shouldClose: true, reason: `Take profit atingido: ${tp}` };
      }
    }

    // Verificar horário (fechar antes de fim de semana, etc.)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hour = now.getHours();

    // Fechar posições antes do fim de semana (sexta após 18h)
    if (dayOfWeek === 5 && hour >= 18) {
      return { shouldClose: true, reason: 'Fechamento por fim de semana' };
    }

    return { shouldClose: false, reason: '' };
  }

  /**
   * Fecha posição
   */
  private async closePosition(position: TradePosition, reason: string): Promise<void> {
    console.log(`Fechando posição ${position.id}: ${reason}`);

    try {
      // Calcular PnL realizado
      const ticker = await this.exchangeService.getTicker('binance', position.symbol);
      const currentPrice = ticker.last;

      const realizedPnl = position.type === 'LONG'
        ? (currentPrice - position.entryPrice) * position.quantity - position.fees
        : (position.entryPrice - currentPrice) * position.quantity - position.fees;

      // Atualizar gestão de risco
      this.riskManager.updatePosition(position.id, realizedPnl, 'CLOSED');

      // Atualizar posição
      position.status = 'CLOSED';
      position.closeTime = Date.now();
      position.realizedPnl = realizedPnl;

      // Update Strategy Monitor with Return % for Drift Detection
      const returnPct = realizedPnl / (position.entryPrice * position.quantity);
      this.strategyMonitor.updateMetrics(currentPrice, returnPct);
      this.notificationService.notifyPositionClosed(position, reason);

      // Remover das posições ativas
      this.activePositions.delete(position.id);

      console.log(`Posição ${position.id} fechada com PnL: ${realizedPnl.toFixed(4)}`);

    } catch (error) {
      console.error(`Erro ao fechar posição ${position.id}:`, error);
    }
  }

  /**
   * Notifica sobre trades
   */
  private notifyTrade(signal: TradingSignal, position: TradePosition, analysis: SMCAnalysis): void {
    // Implementar notificações (Telegram, Email, etc.)
    console.log(`=== NOVO TRADE ===`);
    console.log(`Sinal: ${signal.type}`);
    console.log(`Symbol: ${position.symbol}`);
    console.log(`Preço: ${signal.entryPrice}`);
    console.log(`Stop Loss: ${position.stopLoss}`);
    console.log(`Take Profit: ${position.takeProfit.join(', ')}`);
    console.log(`Confiança: ${(signal.confidence * 100).toFixed(1)}%`);
    console.log(`Razão: ${signal.reason}`);
    console.log(`Liquidez: ${analysis.liquidityZones.length} zonas`);
    console.log(`Order Blocks: ${analysis.orderBlocks.length} blocos`);
    console.log(`================`);

    this.notificationService.notifySignal(signal, analysis);
    this.notificationService.notifyPosition(position, signal);
  }

  /**
   * Carrega estratégias salvas
   */
  private async loadStrategies(): Promise<void> {
    // Implementar carregamento do banco de dados
    console.log('Carregando estratégias salvas...');
  }
}
