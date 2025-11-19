import { SMCAnalyzer } from './smcAnalyzer';
import { ExchangeService } from './exchangeService';
import { RiskManager } from './riskManager';
import { 
  MarketData, 
  TradingSignal, 
  TradePosition, 
  StrategyConfig, 
  SMCAnalysis,
  ExchangeConfig,
  RiskManagement 
} from '../../shared/types';
import { v4 as uuidv4 } from 'uuid';

export class TradingEngine {
  private smcAnalyzer: SMCAnalyzer;
  private exchangeService: ExchangeService;
  private riskManager: RiskManager;
  private strategies: Map<string, StrategyConfig> = new Map();
  private activePositions: Map<string, TradePosition> = new Map();
  private marketDataCache: Map<string, MarketData[]> = new Map();
  private isRunning: boolean = false;
  private analysisInterval: NodeJS.Timeout | null = null;
  private positionUpdateInterval: NodeJS.Timeout | null = null;

  constructor(
    exchangeConfigs: ExchangeConfig[],
    riskConfig: RiskManagement,
    initialBalance: number = 10000
  ) {
    this.smcAnalyzer = new SMCAnalyzer();
    this.exchangeService = new ExchangeService(exchangeConfigs);
    this.riskManager = new RiskManager(riskConfig, initialBalance);
  }

  /**
   * Inicializa o motor de trading
   */
  async initialize(): Promise<void> {
    console.log('Inicializando motor de trading...');
    
    // Testar conexão com exchanges
    for (const config of this.exchangeService['exchanges'].keys()) {
      const isConnected = await this.exchangeService.testConnection(config);
      console.log(`Exchange ${config}: ${isConnected ? 'Conectada' : 'Falha na conexão'}`);
    }

    // Carregar estratégias salvas
    await this.loadStrategies();
    
    console.log('Motor de trading inicializado com sucesso');
  }

  /**
   * Adiciona estratégia de trading
   */
  addStrategy(config: StrategyConfig): void {
    this.strategies.set(config.name, config);
    console.log(`Estratégia ${config.name} adicionada para ${config.symbol}`);
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
   * Analisa mercado para todas as estratégias ativas
   */
  private async analyzeMarket(): Promise<void> {
    if (!this.isRunning) return;

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

    // Configurar analisador SMC com parâmetros da estratégia
    this.smcAnalyzer = new SMCAnalyzer({
      minLiquidityStrength: smcParams.minLiquidityStrength,
      minOrderBlockStrength: smcParams.minOrderBlockStrength,
      minFvgSize: smcParams.minFvgSize
    });

    // Realizar análise SMC
    const analysis = this.smcAnalyzer.analyze(marketData);
    
    // Obter preço atual
    const ticker = await this.exchangeService.getTicker('binance', symbol);
    const currentPrice = ticker.last;

    // Gerar sinais
    const signals = this.smcAnalyzer.generateSignals(analysis, currentPrice, timeframe);

    // Processar sinais
    for (const signal of signals) {
      await this.processSignal(signal, config, analysis);
    }

    // Cache dos dados para análise posterior
    this.marketDataCache.set(`${symbol}_${timeframe}`, marketData);
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
      const orderResult = await this.exchangeService.createOrderWithStopLossAndTakeProfit(
        'binance',
        config.symbol,
        signal.type === 'BUY' ? 'buy' : 'sell',
        positionSize,
        entryPrice,
        stopLoss,
        takeProfit
      );

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
    const unrealizedPnl = position.type === 'LONG'
      ? (currentPrice - position.entryPrice) * position.quantity
      : (position.entryPrice - currentPrice) * position.quantity;

    // Verificar se deve ajustar stop loss para break-even
    const newStopLoss = this.riskManager.adjustStopLossToBreakEven(position, currentPrice);
    
    if (newStopLoss !== position.stopLoss) {
      console.log(`Ajustando stop loss para break-even: ${newStopLoss}`);
      // Atualizar stop loss na exchange (implementar)
      position.stopLoss = newStopLoss;
    }

    // Verificar saída parcial
    const profitLevels = [0.02, 0.04, 0.06]; // 2%, 4%, 6%
    const partialExit = this.riskManager.shouldTakePartialProfit(position, currentPrice, profitLevels);

    if (partialExit.shouldExit) {
      console.log(`Saindo parcialmente: ${partialExit.exitAmount} @ ${partialExit.exitPrice}`);
      // Executar saída parcial (implementar)
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
  }

  /**
   * Carrega estratégias salvas
   */
  private async loadStrategies(): Promise<void> {
    // Implementar carregamento do banco de dados
    console.log('Carregando estratégias salvas...');
  }

  /**
   * Obtém estatísticas do motor
   */
  getStats(): {
    activeStrategies: number;
    activePositions: number;
    totalTrades: number;
    riskStats: any;
    isRunning: boolean;
  } {
    return {
      activeStrategies: this.strategies.size,
      activePositions: this.activePositions.size,
      totalTrades: this.activePositions.size, // Implementar contador real
      riskStats: this.riskManager.getRiskStats(),
      isRunning: this.isRunning
    };
  }

  /**
   * Obtém posições ativas
   */
  getActivePositions(): TradePosition[] {
    return Array.from(this.activePositions.values());
  }

  /**
   * Obtém estratégias
   */
  getStrategies(): StrategyConfig[] {
    return Array.from(this.strategies.values());
  }
}