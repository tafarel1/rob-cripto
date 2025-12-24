export class SimpleTradingEngine {
  constructor(exchangeConfigs, riskConfig, initialBalance = 10000, smcAnalyzer = null, washTradingCache = null) {
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
    this.smcAnalyzer = smcAnalyzer;
    this.washTradingCache = washTradingCache;
  }

  async initialize() {
    console.log('🚀 Inicializando motor de trading (Confluência SMC)...');
    
    // Simular conexão com exchanges
    for (const config of this.exchangeConfigs) {
      console.log(`✅ Exchange ${config.name} configurada (modo demo)`);
    }
    
    if (this.smcAnalyzer) {
      console.log('✅ SMC Analyzer conectado');
    } else {
      console.warn('⚠️ SMC Analyzer não conectado - usando simulação');
    }

    if (this.washTradingCache) {
      console.log('✅ Wash Trading Protection ativado');
    }
    
    console.log('✅ Motor de trading inicializado');
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
    }, 60 * 1000); // 1 minuto (Real-time checks)

    this.positionUpdateInterval = setInterval(() => {
      this.updatePositions();
    }, 10 * 1000); // 10 segundos

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

    console.log('📊 Analisando mercado (SMC Scan)...');

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
    const { symbol, timeframe } = config;

    try {
      // 1. Verificação de Wash Trading (Integridade)
      if (this.washTradingCache) {
        const washStatus = this.washTradingCache.get(symbol);
        if (washStatus && washStatus.severity === 'high') {
          console.warn(`🛡️ BLOCKED: Manipulação detectada em ${symbol}. Estratégia pausada.`);
          return;
        }
      }

      // 2. Obter Dados SMC Reais
      let analysis;
      let currentPrice;

      if (this.smcAnalyzer) {
        // Usar Analyzer Real
        const result = await this.smcAnalyzer.analyzeMarket(symbol, timeframe, 100);
        if (!result.success) throw new Error(result.error);
        analysis = result.data;
        // Obter preço atual do último candle
        const lastCandle = analysis.candles[analysis.candles.length - 1];
        currentPrice = lastCandle.close;
      } else {
        // Fallback para Simulação (se analyzer não estiver disponível)
        currentPrice = 45000 + (Math.random() - 0.5) * 2000;
        analysis = this.simulateSMCAnalysis(currentPrice, symbol);
      }
      
      // 3. Gerar Sinais com Lógica de Confluência
      const signals = this.generateSignals(analysis, currentPrice, config);

      // 4. Processar Sinais
      for (const signal of signals) {
        await this.processSignal(signal, config, analysis);
      }
      
    } catch (error) {
      console.error(`❌ Erro na análise de ${symbol}:`, error.message);
    }
  }

  simulateSMCAnalysis(currentPrice, symbol) {
    // Fallback apenas para garantir que não quebra se smcAnalyzer falhar
    return {
      liquidityZones: [],
      orderBlocks: [],
      fairValueGaps: [],
      marketStructures: [],
      premiumDiscount: { status: 'DISCOUNT', high: currentPrice * 1.05, low: currentPrice * 0.95, equilibrium: currentPrice }, // Mock seguro
      currentPrice,
      symbol,
      timestamp: Date.now()
    };
  }

  generateSignals(analysis, currentPrice, config) {
    const signals = [];
    
    // === ESTRATÉGIA DE CONFLUÊNCIA SMC ===
    
    // 1. Order Blocks (OB)
    // Procurar OBs ativos próximos ao preço atual
    const activeOBs = analysis.orderBlocks || [];
    const nearbyOB = activeOBs.find(ob => {
      // Preço dentro ou muito próximo do OB (0.1% tolerancia)
      const upper = Math.max(ob.range[0], ob.range[1]);
      const lower = Math.min(ob.range[0], ob.range[1]);
      const tolerance = currentPrice * 0.001;
      return currentPrice <= (upper + tolerance) && currentPrice >= (lower - tolerance);
    });

    // 2. Fair Value Gaps (FVG)
    // Procurar FVGs não preenchidos próximos
    const activeFVGs = analysis.fairValueGaps || [];
    const nearbyFVG = activeFVGs.find(fvg => {
      // FVG que atua como suporte (bullish) ou resistência (bearish)
      const upper = Math.max(fvg.range[0], fvg.range[1]);
      const lower = Math.min(fvg.range[0], fvg.range[1]);
      return currentPrice >= lower && currentPrice <= upper;
    });

    // 3. Avaliação de Setup
    if (nearbyOB) {
      const type = nearbyOB.type === 'bullish' ? 'BUY' : 'SELL';
      let confidence = nearbyOB.strength || 0.5;
      let reasons = [`Order Block ${nearbyOB.type}`];

      // Confluência: FVG
      if (nearbyFVG && ((type === 'BUY' && nearbyFVG.type === 'bullish') || (type === 'SELL' && nearbyFVG.type === 'bearish'))) {
        confidence += 0.2;
        reasons.push('FVG Confluence');
      }

      // Confluência: Estrutura de Mercado (se disponível)
      if (analysis.marketStructures && analysis.marketStructures.length > 0) {
        const lastStructure = analysis.marketStructures[analysis.marketStructures.length - 1];
        if ((type === 'BUY' && lastStructure.type === 'BOS_BULL') || (type === 'SELL' && lastStructure.type === 'BOS_BEAR')) {
          confidence += 0.15;
          reasons.push('Trend Continuation (BOS)');
        }
      }

      // Confluência: Premium/Discount Zones
      if (analysis.premiumDiscount) {
        const { status } = analysis.premiumDiscount;
        // Regra de Ouro SMC: Comprar no Discount, Vender no Premium
        if ((type === 'BUY' && status === 'DISCOUNT') || (type === 'SELL' && status === 'PREMIUM')) {
          confidence += 0.15;
          reasons.push(`Zone (${status})`);
        } else {
          // Penalizar trades contra a lógica P/D
          confidence -= 0.2;
        }
      }

      // Filtro de Qualidade
      if (confidence >= 0.7) { // Mínimo 70% de confluência
        // const stopLossDist = config.riskParams?.stopLossDistance || 0.02; // Unused
        const takeProfitDist = config.riskParams?.takeProfitDistance || 0.04;

        // Refinamento de Stop Loss usando o OB
        const obLimit = type === 'BUY' ? Math.min(nearbyOB.range[0], nearbyOB.range[1]) : Math.max(nearbyOB.range[0], nearbyOB.range[1]);
        const dynamicSL = type === 'BUY' ? obLimit * 0.998 : obLimit * 1.002; // Leve buffer

        const signal = {
          type,
          symbol: analysis.symbol || config.symbol,
          entryPrice: currentPrice,
          stopLoss: dynamicSL, // Stop Técnico
          takeProfit: type === 'BUY' ? currentPrice * (1 + takeProfitDist) : currentPrice * (1 - takeProfitDist),
          confidence: Math.min(confidence, 0.99),
          reason: reasons.join(' + '),
          timeframe: config.timeframe,
          timestamp: Date.now()
        };
        
        signals.push(signal);
      }
    }
    
    return signals;
  }

  async processSignal(signal, config, analysis) {
    // Verificar limites de risco
    if (this.maxDailyLossReached) return;
    if (this.activePositions.size >= this.riskConfig.maxOpenPositions) return;

    // Verificar exposição total
    const totalExposure = this.calculateTotalExposure();
    const maxExposure = this.currentBalance * this.riskConfig.maxRiskPerTrade * this.riskConfig.maxOpenPositions;
    
    if (totalExposure >= maxExposure) return;

    // Evitar sinais duplicados recentes (Debounce)
    const lastTrade = Array.from(this.activePositions.values()).reverse().find(p => p.symbol === signal.symbol);
    if (lastTrade && (Date.now() - lastTrade.openTime < 5 * 60 * 1000)) {
      return; // Ignorar sinais muito frequentes no mesmo par
    }

    console.log(`🎯 CONFLUÊNCIA DETECTADA: ${signal.type} ${config.symbol} @ ${signal.entryPrice.toFixed(2)} (${signal.reason})`);
    
    // Calcular Position Size baseado no Risco
    const riskPerTrade = this.currentBalance * (config.riskParams?.maxRiskPerTrade || 0.01);
    const riskPerShare = Math.abs(signal.entryPrice - signal.stopLoss);
    const quantity = riskPerShare > 0 ? (riskPerTrade / riskPerShare) : 0;

    // Criar posição simulada (Demo Execution)
    const position = {
      id: Math.random().toString(36).substr(2, 9),
      symbol: config.symbol,
      type: signal.type === 'BUY' ? 'LONG' : 'SHORT',
      entryPrice: signal.entryPrice,
      quantity: quantity,
      stopLoss: signal.stopLoss,
      takeProfit: signal.takeProfit,
      status: 'OPEN',
      openTime: Date.now(),
      fees: quantity * signal.entryPrice * 0.001,
      pnl: 0
    };

    // Registrar posição
    this.activePositions.set(position.id, position);
    this.dailyTrades++;

    // Notificar sobre o trade
    this.notifyTrade(signal, position, analysis);
  }

  notifyTrade(signal, position, _analysis) {
    console.log(`
=== 🔔 NOVO TRADE (SMC CONFLUENCE) ===`);
    console.log(`📊 Sinal: ${signal.type}`);
    console.log(`💰 Symbol: ${position.symbol}`);
    console.log(`💵 Entrada: $${position.entryPrice.toFixed(2)}`);
    console.log(`🛑 Stop: $${position.stopLoss.toFixed(2)}`);
    console.log(`🎯 Alvo: $${position.takeProfit.toFixed(2)}`);
    console.log(`⚡ Confiança: ${(signal.confidence * 100).toFixed(1)}%`);
    console.log(`📝 Motivo: ${signal.reason}`);
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

    // console.log('🔄 Monitorando posições...'); // Reduzir log spam

    for (const position of this.activePositions.values()) {
      if (position.status !== 'OPEN') continue;

      // Simulação simples de preço (Em produção real, usaríamos ticker updates)
      // Aqui vamos apenas assumir que o preço não muda drasticamente na demo sem feed real
      // Se tivessemos acesso ao exchangeManager aqui, usariamos getTicker
    }
  }
}
