
class SMCAnalyzer {
  constructor(exchangeManager) {
    this.exchange = exchangeManager;
    this.marketData = [];
    this.liquidityZones = [];
    this.orderBlocks = [];
    this.fairValueGaps = [];
    this.marketStructures = [];
    this.signals = [];
  }

  // Análise de Liquidez (Buy Side / Sell Side)
  analyzeLiquidityZones(candles, lookback = 50) {
    const recentCandles = candles.slice(-lookback);
    const liquidityZones = [];
    
    // Identificar zonas de liquidez baseadas em altos e baixos significativos
    for (let i = 2; i < recentCandles.length - 2; i++) {
      const current = recentCandles[i];
      const prev1 = recentCandles[i - 1];
      const prev2 = recentCandles[i - 2];
      const next1 = recentCandles[i + 1];
      const next2 = recentCandles[i + 2];
      
      // Alta liquidez (swing high)
      if (current.high > prev1.high && current.high > prev2.high && 
          current.high > next1.high && current.high > next2.high) {
        liquidityZones.push({
          type: 'sell_side',
          price: current.high,
          strength: this.calculateLiquidityStrength(current, recentCandles),
          timestamp: current.timestamp,
          volume: current.volume
        });
      }
      
      // Baixa liquidez (swing low)
      if (current.low < prev1.low && current.low < prev2.low && 
          current.low < next1.low && current.low < next2.low) {
        liquidityZones.push({
          type: 'buy_side',
          price: current.low,
          strength: this.calculateLiquidityStrength(current, recentCandles),
          timestamp: current.timestamp,
          volume: current.volume
        });
      }
    }
    
    return liquidityZones;
  }

  calculateLiquidityStrength(candle, candles) {
    // Calcular força baseada em volume e range
    const avgVolume = candles.reduce((sum, c) => sum + c.volume, 0) / candles.length;
    const volumeRatio = candle.volume / avgVolume;
    const range = candle.high - candle.low;
    const avgRange = candles.reduce((sum, c) => sum + (c.high - c.low), 0) / candles.length;
    const rangeRatio = range / avgRange;
    
    return Math.min((volumeRatio + rangeRatio) / 2, 1.0);
  }

  // Análise de Order Blocks
  analyzeOrderBlocks(candles, lookback = 100) {
    const orderBlocks = [];
    const recentCandles = candles.slice(-lookback);
    
    for (let i = 3; i < recentCandles.length - 3; i++) {
      const current = recentCandles[i];
      const prevCandles = recentCandles.slice(Math.max(0, i - 10), i);
      const nextCandles = recentCandles.slice(i + 1, Math.min(recentCandles.length, i + 11));
      
      // Order Block de venda (bearish)
      if (this.isBearishOrderBlock(current, prevCandles, nextCandles)) {
        orderBlocks.push({
          type: 'bearish',
          price: current.open,
          range: [current.low, current.high],
          strength: this.calculateOrderBlockStrength(current, nextCandles, 'bearish'),
          timestamp: current.timestamp,
          volume: current.volume
        });
      }
      
      // Order Block de compra (bullish)
      if (this.isBullishOrderBlock(current, prevCandles, nextCandles)) {
        orderBlocks.push({
          type: 'bullish',
          price: current.open,
          range: [current.low, current.high],
          strength: this.calculateOrderBlockStrength(current, nextCandles, 'bullish'),
          timestamp: current.timestamp,
          volume: current.volume
        });
      }
    }
    
    return orderBlocks;
  }

  isBearishOrderBlock(candle, prevCandles, nextCandles) {
    // Verificar se é um candle de venda com força
    const isBearish = candle.close < candle.open;
    const hasMomentum = Math.abs(candle.close - candle.open) > (candle.high - candle.low) * 0.6;
    const breaksStructure = this.breaksMarketStructure(candle, nextCandles, 'bearish');
    
    return isBearish && hasMomentum && breaksStructure;
  }

  isBullishOrderBlock(candle, prevCandles, nextCandles) {
    // Verificar se é um candle de compra com força
    const isBullish = candle.close > candle.open;
    const hasMomentum = Math.abs(candle.close - candle.open) > (candle.high - candle.low) * 0.6;
    const breaksStructure = this.breaksMarketStructure(candle, nextCandles, 'bullish');
    
    return isBullish && hasMomentum && breaksStructure;
  }

  breaksMarketStructure(candle, nextCandles, direction) {
    // Verificar se quebra a estrutura de mercado
    if (direction === 'bearish') {
      return nextCandles.some(next => next.low < candle.low);
    } else {
      return nextCandles.some(next => next.high > candle.high);
    }
  }

  calculateOrderBlockStrength(candle, nextCandles, type) {
    // Calcular força baseada em quantos candles subsequentes respeitam o OB
    const respectingCandles = nextCandles.filter(next => {
      if (type === 'bearish') {
        return next.high < candle.high && next.close < candle.open;
      } else {
        return next.low > candle.low && next.close > candle.open;
      }
    });
    
    return respectingCandles.length / nextCandles.length;
  }

  // Análise de Fair Value Gaps (FVGs)
  analyzeFairValueGaps(candles) {
    const fvgs = [];
    
    for (let i = 1; i < candles.length - 1; i++) {
      const prev = candles[i - 1];
      const current = candles[i];
      const next = candles[i + 1];
      
      // FVG de alta (bullish)
      if (current.low > prev.high && next.low > current.high) {
        fvgs.push({
          type: 'bullish',
          price: current.high,
          range: [current.high, next.low],
          strength: this.calculateFVGStrength(current, prev, next),
          timestamp: current.timestamp
        });
      }
      
      // FVG de baixa (bearish)
      if (current.high < prev.low && next.high < current.low) {
        fvgs.push({
          type: 'bearish',
          price: current.low,
          range: [next.high, current.low],
          strength: this.calculateFVGStrength(current, prev, next),
          timestamp: current.timestamp
        });
      }
    }
    
    return fvgs;
  }

  calculateFVGStrength(current, prev, next) {
    // Calcular força baseada no tamanho do gap
    const gapSize = Math.abs(current.high - prev.low);
    const avgRange = (prev.high - prev.low + next.high - next.low) / 2;
    return Math.min(gapSize / avgRange, 1.0);
  }

  // Análise de Estrutura de Mercado
  analyzeMarketStructure(candles) {
    const structures = [];
    let trend = 'neutral';
    let higherHighs = 0;
    let higherLows = 0;
    let lowerHighs = 0;
    let lowerLows = 0;
    
    for (let i = 2; i < candles.length - 2; i++) {
      const current = candles[i];
      const prev = candles[i - 1];
      
      // Identificar altos e baixos
      const isHigherHigh = current.high > prev.high;
      const isHigherLow = current.low > prev.low;
      const isLowerHigh = current.high < prev.high;
      const isLowerLow = current.low < prev.low;
      
      if (isHigherHigh) higherHighs++;
      if (isHigherLow) higherLows++;
      if (isLowerHigh) lowerHighs++;
      if (isLowerLow) lowerLows++;
      
      // Determinar tendência
      if (higherHighs > lowerHighs && higherLows > lowerLows) {
        trend = 'bullish';
      } else if (lowerHighs > higherHighs && lowerLows > higherLows) {
        trend = 'bearish';
      } else {
        trend = 'neutral';
      }
      
      structures.push({
        trend,
        higherHighs,
        higherLows,
        lowerHighs,
        lowerLows,
        timestamp: current.timestamp
      });
    }
    
    return structures;
  }

  // Gerar sinais de trading baseados na análise SMC
  generateSignals(analysis) {
    const signals = [];
    
    // Refinamento Market Analyst: Stops e TPs baseados em estrutura, não % fixo
    
    // Sinais baseados em zonas de liquidez
    analysis.liquidityZones.forEach(zone => {
      if (zone.strength > 0.6) { // Ajuste de threshold
        const atr = zone.price * 0.01; // Fallback para ATR simulado (1%)
        
        signals.push({
          type: zone.type === 'buy_side' ? 'BUY' : 'SELL',
          entry: zone.price,
          // Market Analyst: Stop deve proteger abaixo da zona
          stopLoss: zone.type === 'buy_side' ? zone.price - (atr * 1.5) : zone.price + (atr * 1.5),
          // Market Analyst: Risk/Reward mínimo de 1:2
          takeProfit: zone.type === 'buy_side' 
            ? [zone.price + (atr * 3), zone.price + (atr * 5)] 
            : [zone.price - (atr * 3), zone.price - (atr * 5)],
          confidence: zone.strength,
          reason: `Zona de liquidez ${zone.type} (Z-Score Strength)`,
          timestamp: zone.timestamp
        });
      }
    });
    
    // Sinais baseados em order blocks
    analysis.orderBlocks.forEach(ob => {
      if (ob.strength > 0.6) {
        const blockHeight = Math.abs(ob.range[1] - ob.range[0]);
        
        signals.push({
          type: ob.type === 'bullish' ? 'BUY' : 'SELL',
          entry: ob.price,
          // Market Analyst: Stop logo após o Order Block
          stopLoss: ob.type === 'bullish' ? ob.range[0] - (blockHeight * 0.5) : ob.range[1] + (blockHeight * 0.5),
          takeProfit: ob.type === 'bullish' 
            ? [ob.price + (blockHeight * 3), ob.price + (blockHeight * 5)] 
            : [ob.price - (blockHeight * 3), ob.price - (blockHeight * 5)],
          confidence: ob.strength,
          reason: `Order block ${ob.type} validado`,
          timestamp: ob.timestamp
        });
      }
    });
    
    // Sinais baseados em FVGs
    analysis.fairValueGaps.forEach(fvg => {
      if (fvg.strength > 0.5) {
        signals.push({
          type: fvg.type === 'bullish' ? 'BUY' : 'SELL',
          entry: fvg.price,
          stopLoss: fvg.range[0],
          takeProfit: fvg.type === 'bullish' ? [fvg.range[1]] : [fvg.range[0]],
          confidence: fvg.strength,
          reason: `Fair Value Gap ${fvg.type} identificado`,
          timestamp: fvg.timestamp
        });
      }
    });
    
    // Ordenar por confiança e remover duplicatas
    return signals
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5); // Limitar a 5 sinais
  }

  // Detecção de Wash Trading e Anomalias
  analyzeWashTrading(candles) {
    const suspiciousActivities = [];
    if (candles.length < 20) return suspiciousActivities;
    
    const avgVolume = candles.reduce((sum, c) => sum + c.volume, 0) / candles.length;
    const recentCandles = candles.slice(-10);
    
    recentCandles.forEach(candle => {
      // 1. Volume Spike (> 5x média)
      if (candle.volume > avgVolume * 5) {
        suspiciousActivities.push({
          type: 'volume_spike',
          timestamp: candle.timestamp,
          details: `Volume ${Math.round(candle.volume / avgVolume)}x maior que a média`,
          severity: 'high'
        });
      }
      
      // 2. Doji com volume alto (Potencial churn/wash)
      const bodySize = Math.abs(candle.open - candle.close);
      const totalRange = candle.high - candle.low;
      if (bodySize < totalRange * 0.1 && candle.volume > avgVolume * 2) {
        suspiciousActivities.push({
          type: 'high_vol_doji',
          timestamp: candle.timestamp,
          details: 'Indecisão extrema com alto volume (potencial churn)',
          severity: 'medium'
        });
      }
    });
    
    return suspiciousActivities;
  }

  // Análise de Premium/Discount Zones
  analyzePremiumDiscountZones(candles, lookback = 50) {
    const recentCandles = candles.slice(-lookback);
    let highestHigh = -Infinity;
    let lowestLow = Infinity;
    
    recentCandles.forEach(c => {
      if (c.high > highestHigh) highestHigh = c.high;
      if (c.low < lowestLow) lowestLow = c.low;
    });
    
    // Evitar infinito se array vazio
    if (highestHigh === -Infinity || lowestLow === Infinity) return null;

    const equilibrium = (highestHigh + lowestLow) / 2;
    const currentPrice = candles[candles.length - 1].close;
    
    return {
      high: highestHigh,
      low: lowestLow,
      equilibrium: equilibrium,
      status: currentPrice > equilibrium ? 'PREMIUM' : 'DISCOUNT'
    };
  }

  // Análise de Liquidez de Sessão (Highs/Lows Diários)
  analyzeSessionLiquidity(candles) {
    if (!candles.length) return null;

    const lastTimestamp = candles[candles.length - 1].timestamp;
    const oneDay = 24 * 60 * 60 * 1000;
    // Filtrar velas das últimas 24h apenas para timeframes intraday
    // Para timeframes diário (1d) ou semanal (1w), não faz sentido filtrar últimas 24h da mesma forma
    // Se timeframe for diário ou maior, podemos pular a análise de sessões intraday ou adaptá-la
    
    // Assumindo que velas diárias/semanais têm gap entre timestamps maior que 1 dia
    const timeDiff = candles[1].timestamp - candles[0].timestamp;
    const isIntraday = timeDiff < 24 * 60 * 60 * 1000;

    if (!isIntraday) {
        return null; // Não calcular sessões intraday para gráficos diários/semanais
    }

    const recentCandles = candles.filter(c => c.timestamp > lastTimestamp - oneDay);

    const sessions = {
      asia: { high: -Infinity, low: Infinity, label: 'Asia' },
      london: { high: -Infinity, low: Infinity, label: 'London' },
      newYork: { high: -Infinity, low: Infinity, label: 'NY' }
    };

    recentCandles.forEach(c => {
      const date = new Date(c.timestamp);
      const hour = date.getUTCHours();
      
      // Asia: 00-08 UTC (Aprox)
      if (hour >= 0 && hour < 8) {
        if (c.high > sessions.asia.high) sessions.asia.high = c.high;
        if (c.low < sessions.asia.low) sessions.asia.low = c.low;
      }
      
      // London: 07-15 UTC
      if (hour >= 7 && hour < 15) {
        if (c.high > sessions.london.high) sessions.london.high = c.high;
        if (c.low < sessions.london.low) sessions.london.low = c.low;
      }
      
      // NY: 12-20 UTC
      if (hour >= 12 && hour < 20) {
        if (c.high > sessions.newYork.high) sessions.newYork.high = c.high;
        if (c.low < sessions.newYork.low) sessions.newYork.low = c.low;
      }
    });

    // Limpar sessões sem dados
    const result = {};
    Object.keys(sessions).forEach(key => {
      if (sessions[key].high > -Infinity) {
        result[key] = sessions[key];
      }
    });

    return result;
  }

  // Análise completa do mercado
  async analyzeMarket(symbol = 'BTC/USDT', timeframe = '1h', limit = 200) {
    try {
      console.log(`📊 Iniciando análise SMC para ${symbol} - ${timeframe}`);
      
      // Buscar dados de mercado
      const marketDataResult = await this.exchange.getMarketData(symbol, timeframe, limit);
      
      if (!marketDataResult.success) {
        throw new Error(marketDataResult.error);
      }
      
      const candles = marketDataResult.data;
      
      if (candles.length < 50) {
        throw new Error('Dados insuficientes para análise SMC');
      }
      
      // Realizar análises
      const analysis = {
        liquidityZones: this.analyzeLiquidityZones(candles),
        orderBlocks: this.analyzeOrderBlocks(candles),
        fairValueGaps: this.analyzeFairValueGaps(candles),
        marketStructures: this.analyzeMarketStructure(candles),
        washTrading: this.analyzeWashTrading(candles),
        premiumDiscount: this.analyzePremiumDiscountZones(candles),
        sessionLiquidity: this.analyzeSessionLiquidity(candles),
        candles: candles // Retornar todas as velas para o gráfico
      };
      
      // Gerar sinais
      analysis.signals = this.generateSignals(analysis);
      
      // Adicionar informações do ticker atual
      const tickerResult = await this.exchange.getTicker(symbol);
      if (tickerResult.success) {
        analysis.currentPrice = tickerResult.data.last;
        analysis.ticker = tickerResult.data;
      }
      
      console.log(`✅ Análise SMC concluída: ${analysis.signals.length} sinais encontrados`);
      
      return {
        success: true,
        data: analysis,
        symbol,
        timeframe,
        timestamp: Date.now()
      };
      
    } catch (error) {
      console.error('❌ Erro na análise SMC:', error.message);
      
      return {
        success: false,
        error: error.message,
        symbol,
        timeframe
      };
    }
  }
}

export default SMCAnalyzer;
