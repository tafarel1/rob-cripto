export class SimpleTradingEngine {
  constructor(exchangeConfigs, riskConfig, initialBalance = 10000) {
    this.exchangeConfigs = exchangeConfigs;
    this.riskConfig = riskConfig;
    this.strategies = new Map();
    this.activePositions = new Map();
    this.isRunning = false;
    this.initialBalance = initialBalance;
    this.currentBalance = initialBalance;
    this.dailyTrades = 0;
    this.dailyPnl = 0;
    this.maxDailyLossReached = false;
  }

  async initialize() {
    console.log('🚀 Inicializando motor de trading simplificado...');
    
    // Simular conexão com exchanges
    for (const config of this.exchangeConfigs) {
      console.log(`✅ Exchange ${config.name} configurada (modo demo)`);
    }
    
    console.log('✅ Motor de trading simplificado inicializado');
  }

  addStrategy(strategyConfig) {
    this.strategies.set(strategyConfig.name, strategyConfig);
    console.log(`📋 Estratégia adicionada: ${strategyConfig.name}`);
  }

  removeStrategy(strategyName) {
    this.strategies.delete(strategyName);
    console.log(`🗑️ Estratégia removida: ${strategyName}`);
  }

  start() {
    if (this.isRunning) {
      console.log('⚠️ Motor já está em execução');
      return;
    }

    this.isRunning = true;
    console.log('🟢 Iniciando execução automática do motor de trading');

    // Configurar intervalos de análise
    this.analysisInterval = setInterval(() => {
      this.analyzeMarket();
    }, 2 * 60 * 1000); // 2 minutos para demonstração

    this.positionUpdateInterval = setInterval(() => {
      this.updatePositions();
    }, 30 * 1000); // 30 segundos

    // Executar análise imediata
    this.analyzeMarket();
  }

  stop() {
    this.isRunning = false;
    
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }

    if (this.positionUpdateInterval) {
      clearInterval(this.positionUpdateInterval);
      this.positionUpdateInterval = null;
    }

    console.log('🔴 Motor de trading parado');
  }

  async analyzeMarket() {
    if (!this.isRunning) return;

    console.log('📊 Analisando mercado...');

    for (const [strategyName, config] of this.strategies) {
      if (!config.enabled) continue;

      try {
        await this.analyzeStrategy(config);
      } catch (error) {
        console.error(`❌ Erro ao analisar estratégia ${strategyName}:`, error);
      }
    }
  }

  async analyzeStrategy(config) {
    const { symbol, timeframe, smcParams } = config;

    try {
      console.log(`🔍 Analisando ${symbol} no timeframe ${timeframe}...`);
      
      // Simular análise SMC
      const currentPrice = 45000 + (Math.random() - 0.5) * 2000; // Preço simulado BTC
      const analysis = this.simulateSMCAnalysis(currentPrice, symbol);
      
      // Gerar sinais baseados na análise
      const signals = this.generateSignals(analysis, currentPrice, config);

      // Processar sinais
      for (const signal of signals) {
        await this.processSignal(signal, config, analysis);
      }

      console.log(`✅ Análise concluída para ${symbol}: ${signals.length} sinais`);
      
    } catch (error) {
      console.error(`❌ Erro na análise de ${symbol}:`, error.message);
    }
  }

  simulateSMCAnalysis(currentPrice, symbol) {
    // Simular análise Smart Money Concepts
    const liquidityZones = [];
    const orderBlocks = [];
    const fairValueGaps = [];
    
    // Gerar zonas de liquidez simuladas
    for (let i = 0; i < 3; i++) {
      liquidityZones.push({
        price: currentPrice + (Math.random() - 0.5) * 1000,
        strength: Math.random(),
        type: Math.random() > 0.5 ? 'support' : 'resistance'
      });
    }

    // Gerar order blocks simulados
    for (let i = 0; i < 2; i++) {
      orderBlocks.push({
        price: currentPrice + (Math.random() - 0.5) * 800,
        strength: Math.random(),
        type: Math.random() > 0.5 ? 'bullish' : 'bearish'
      });
    }

    // Gerar Fair Value Gaps simulados
    if (Math.random() > 0.7) {
      fairValueGaps.push({
        price: currentPrice + (Math.random() - 0.5) * 500,
        size: Math.random() * 0.01,
        type: 'imbalance'
      });
    }

    return {
      liquidityZones,
      orderBlocks,
      fairValueGaps,
      currentPrice,
      symbol,
      timestamp: Date.now()
    };
  }

  generateSignals(analysis, currentPrice, config) {
    const signals = [];
    
    // Gerar sinais baseados na análise SMC simulada
    const signalProbability = 0.3; // 30% chance de sinal
    
    if (Math.random() < signalProbability) {
      const signalType = Math.random() > 0.5 ? 'BUY' : 'SELL';
      const confidence = 0.6 + Math.random() * 0.3; // 60-90% confiança
      
      const signal = {
        type: signalType,
        symbol: analysis.symbol,
        entryPrice: currentPrice,
        stopLoss: signalType === 'BUY' 
          ? currentPrice * (1 - this.riskConfig.stopLossDistance)
          : currentPrice * (1 + this.riskConfig.stopLossDistance),
        takeProfit: signalType === 'BUY'
          ? currentPrice * (1 + this.riskConfig.takeProfitDistance)
          : currentPrice * (1 - this.riskConfig.takeProfitDistance),
        confidence: confidence,
        reason: this.generateSignalReason(analysis, signalType),
        timeframe: '15m',
        timestamp: Date.now()
      };
      
      signals.push(signal);
    }
    
    return signals;
  }

  generateSignalReason(analysis, signalType) {
    const reasons = [
      'Liquidity zone breakout',
      'Order block rejection',
      'Fair value gap fill',
      'Market structure shift',
      'Premium/discount zone'
    ];
    
    return reasons[Math.floor(Math.random() * reasons.length)];
  }

  async processSignal(signal, config, analysis) {
    // Verificar limites de risco
    if (this.maxDailyLossReached) {
      console.log('⚠️ Limite de perda diária atingido - sinal ignorado');
      return;
    }

    if (this.activePositions.size >= this.riskConfig.maxOpenPositions) {
      console.log('⚠️ Máximo de posições abertas atingido - sinal ignorado');
      return;
    }

    // Verificar exposição total
    const totalExposure = this.calculateTotalExposure();
    const maxExposure = this.currentBalance * this.riskConfig.maxRiskPerTrade * this.riskConfig.maxOpenPositions;
    
    if (totalExposure >= maxExposure) {
      console.log('⚠️ Exposição máxima atingida - sinal ignorado');
      return;
    }

    console.log(`🎯 Sinal válido detectado: ${signal.type} ${config.symbol} @ ${signal.entryPrice.toFixed(2)}`);
    
    // Criar posição simulada
    const position = {
      id: Math.random().toString(36).substr(2, 9),
      symbol: config.symbol,
      type: signal.type === 'BUY' ? 'LONG' : 'SHORT',
      entryPrice: signal.entryPrice,
      quantity: 0.001, // 0.001 BTC para demonstração
      stopLoss: signal.stopLoss,
      takeProfit: signal.takeProfit,
      status: 'OPEN',
      openTime: Date.now(),
      fees: 0.1 // Taxa simulada
    };

    // Registrar posição
    this.activePositions.set(position.id, position);
    this.dailyTrades++;

    console.log(`✅ Posição criada: ${position.id} - ${signal.type} ${config.symbol}`);
    console.log(`📊 Quantidade: ${position.quantity} BTC`);
    console.log(`🛑 Stop Loss: $${position.stopLoss.toFixed(2)}`);
    console.log(`🎯 Take Profit: $${position.takeProfit.toFixed(2)}`);
    
    // Notificar sobre o trade
    this.notifyTrade(signal, position, analysis);
  }

  notifyTrade(signal, position, analysis) {
    console.log(`
=== 🔔 NOVO TRADE AUTOMÁTICO ===`);
    console.log(`📊 Sinal: ${signal.type}`);
    console.log(`💰 Symbol: ${position.symbol}`);
    console.log(`💵 Preço de Entrada: $${position.entryPrice.toFixed(2)}`);
    console.log(`🛑 Stop Loss: $${position.stopLoss.toFixed(2)}`);
    console.log(`🎯 Take Profit: $${position.takeProfit.toFixed(2)}`);
    console.log(`📈 Confiança: ${(signal.confidence * 100).toFixed(1)}%`);
    console.log(`📝 Razão: ${signal.reason}`);
    console.log(`🏊 Liquidez: ${analysis.liquidityZones.length} zonas`);
    console.log(`📦 Order Blocks: ${analysis.orderBlocks.length} blocos`);
    console.log(`📍 Posições Ativas: ${this.activePositions.size}`);
    console.log(`💰 Saldo Atual: $${this.currentBalance.toFixed(2)}`);
    console.log(`=====================================\n`);
  }

  calculateTotalExposure() {
    let totalExposure = 0;
    for (const position of this.activePositions.values()) {
      totalExposure += position.entryPrice * position.quantity;
    }
    return totalExposure;
  }

  updatePositions() {
    if (!this.isRunning) return;

    console.log('🔄 Atualizando posições...');

    for (const [positionId, position] of this.activePositions) {
      if (position.status !== 'OPEN') continue;

      try {
        this.updatePosition(position);
      } catch (error) {
        console.error(`❌ Erro ao atualizar posição ${positionId}:`, error);
      }
    }
  }

  updatePosition(position) {
    // Simular atualização de preço com variação realista
    const priceVariation = (Math.random() - 0.5) * 0.02; // ±1% variação
    const currentPrice = position.entryPrice * (1 + priceVariation);

    // Calcular PnL não realizado
    const unrealizedPnl = position.type === 'LONG'
      ? (currentPrice - position.entryPrice) * position.quantity
      : (position.entryPrice - currentPrice) * position.quantity;

    // Verificar se deve fechar a posição
    const shouldClose = this.shouldClosePosition(position, currentPrice);
    
    if (shouldClose.shouldClose) {
      this.closePosition(position, shouldClose.reason, currentPrice);
    }

    // Atualizar cache
    this.activePositions.set(position.id, position);
  }

  shouldClosePosition(position, currentPrice) {
    // Stop loss acionado
    if (position.type === 'LONG' && currentPrice <= position.stopLoss) {
      return { shouldClose: true, reason: 'Stop loss acionado' };
    }
    
    if (position.type === 'SHORT' && currentPrice >= position.stopLoss) {
      return { shouldClose: true, reason: 'Stop loss acionado' };
    }

    // Take profit acionado
    if (position.type === 'LONG' && currentPrice >= position.takeProfit) {
      return { shouldClose: true, reason: 'Take profit atingido' };
    }
    
    if (position.type === 'SHORT' && currentPrice <= position.takeProfit) {
      return { shouldClose: true, reason: 'Take profit atingido' };
    }

    // Verificar limite de perda diária
    if (this.dailyPnl <= -this.riskConfig.maxDailyLoss * this.initialBalance) {
      return { shouldClose: true, reason: 'Limite de perda diária atingido' };
    }

    return { shouldClose: false, reason: '' };
  }

  closePosition(position, reason, currentPrice) {
    console.log(`🔒 Fechando posição ${position.id}: ${reason}`);

    try {
      // Calcular PnL realizado
      const realizedPnl = position.type === 'LONG'
        ? (currentPrice - position.entryPrice) * position.quantity - position.fees
        : (position.entryPrice - currentPrice) * position.quantity - position.fees;

      // Atualizar gestão de risco
      this.dailyPnl += realizedPnl;
      this.currentBalance += realizedPnl;

      // Verificar se atingiu limite de perda diária
      if (this.dailyPnl <= -this.riskConfig.maxDailyLoss * this.initialBalance) {
        this.maxDailyLossReached = true;
        console.log('🚨 LIMITE DE PERDA DIÁRIA ATINGIDO!');
      }

      // Atualizar posição
      position.status = 'CLOSED';
      position.closeTime = Date.now();
      position.realizedPnl = realizedPnl;
      position.closePrice = currentPrice;

      // Remover das posições ativas
      this.activePositions.delete(position.id);

      console.log(`💰 Posição ${position.id} fechada com PnL: ${realizedPnl.toFixed(4)} USDT`);
      console.log(`💵 Saldo atual: $${this.currentBalance.toFixed(2)} USDT`);
      console.log(`📊 PnL Diário: $${this.dailyPnl.toFixed(2)} USDT`);

    } catch (error) {
      console.error(`❌ Erro ao fechar posição ${position.id}:`, error);
    }
  }

  getStats() {
    return {
      activeStrategies: this.strategies.size,
      activePositions: this.activePositions.size,
      totalTrades: this.dailyTrades,
      currentBalance: this.currentBalance,
      initialBalance: this.initialBalance,
      totalPnl: this.currentBalance - this.initialBalance,
      dailyPnl: this.dailyPnl,
      dailyTrades: this.dailyTrades,
      maxDailyLossReached: this.maxDailyLossReached,
      totalExposure: this.calculateTotalExposure(),
      isRunning: this.isRunning
    };
  }

  getActivePositions() {
    return Array.from(this.activePositions.values());
  }

  getStrategies() {
    return Array.from(this.strategies.values());
  }

  emergencyStop() {
    console.log('🚨 EMERGÊNCIA ATIVADA! Parando todas as operações...');
    
    this.stop();
    
    const positionsToClose = this.getActivePositions();
    
    positionsToClose.forEach(position => {
      if (position.status === 'OPEN') {
        this.closePosition(position, 'Emergência - Parada forçada', position.entryPrice);
      }
    });

    console.log(`🛑 ${positionsToClose.length} posições fechadas por emergência`);
    return positionsToClose;
  }
}