
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
    
    // Sinais baseados em zonas de liquidez
    analysis.liquidityZones.forEach(zone => {
      if (zone.strength > 0.7) {
        signals.push({
          type: zone.type === 'buy_side' ? 'BUY' : 'SELL',
          entry: zone.price,
          stopLoss: zone.type === 'buy_side' ? zone.price * 0.98 : zone.price * 1.02,
          takeProfit: zone.type === 'buy_side' ? [zone.price * 1.03, zone.price * 1.05] : [zone.price * 0.97, zone.price * 0.95],
          confidence: zone.strength,
          reason: `Zona de liquidez ${zone.type} identificada`,
          timestamp: zone.timestamp
        });
      }
    });
    
    // Sinais baseados em order blocks
    analysis.orderBlocks.forEach(ob => {
      if (ob.strength > 0.6) {
        signals.push({
          type: ob.type === 'bullish' ? 'BUY' : 'SELL',
          entry: ob.price,
          stopLoss: ob.type === 'bullish' ? ob.range[0] : ob.range[1],
          takeProfit: ob.type === 'bullish' ? [ob.price * 1.04, ob.price * 1.07] : [ob.price * 0.96, ob.price * 0.93],
          confidence: ob.strength,
          reason: `Order block ${ob.type} identificado`,
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
        candles: candles.slice(-20) // Últimas 20 velas para referência
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
