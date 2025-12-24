import type { MarketData, LiquidityZone, OrderBlock, FairValueGap, MarketStructure, SMCAnalysis, TradingSignal } from '../../../shared/types.ts';

export class SMCAnalyzer {
  private minLiquidityStrength: number = 0.7;
  private minOrderBlockStrength: number = 0.8;
  private minFvgSize: number = 0.002; // 0.2% minimum gap
  private useVolumeConfirmation: boolean = true;

  constructor(config?: {
    minLiquidityStrength?: number;
    minOrderBlockStrength?: number;
    minFvgSize?: number;
    useVolumeConfirmation?: boolean;
  }) {
    if (config) {
      this.minLiquidityStrength = config.minLiquidityStrength ?? this.minLiquidityStrength;
      this.minOrderBlockStrength = config.minOrderBlockStrength ?? this.minOrderBlockStrength;
      this.minFvgSize = config.minFvgSize ?? this.minFvgSize;
      this.useVolumeConfirmation = config.useVolumeConfirmation ?? this.useVolumeConfirmation;
    }
  }

  /**
   * Análise completa do mercado usando Smart Money Concepts
   */
  analyze(data: MarketData[]): SMCAnalysis {
    const liquidityZones = this.detectLiquidityZones(data);
    const orderBlocks = this.detectOrderBlocks(data);
    const fairValueGaps = this.detectFairValueGaps(data);
    const marketStructures = this.detectMarketStructures(data);
    const buySideLiquidity = this.detectBuySideLiquidity(data);
    const sellSideLiquidity = this.detectSellSideLiquidity(data);
    
    // Additional analysis
    const washTrading = this.detectWashTrading(data);
    const premiumDiscount = this.detectPremiumDiscountZones(data);
    const sessionLiquidity = this.detectSessionLiquidity(data);

    return {
      liquidityZones,
      orderBlocks,
      fairValueGaps,
      marketStructures,
      buySideLiquidity,
      sellSideLiquidity,
      washTrading,
      premiumDiscount,
      sessionLiquidity
    };
  }

  /**
   * Detecta Wash Trading e Anomalias de Volume
   */
  private detectWashTrading(data: MarketData[]): WashTradingActivity[] {
    const suspiciousActivities: WashTradingActivity[] = [];
    if (data.length < 20) return suspiciousActivities;
    
    const avgVolume = data.reduce((sum, c) => sum + c.volume, 0) / data.length;
    const recentCandles = data.slice(-10);
    
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

  /**
   * Análise de Premium/Discount Zones
   */
  private detectPremiumDiscountZones(data: MarketData[], lookback: number = 50): PremiumDiscountZone | null {
    const recentCandles = data.slice(-lookback);
    let highestHigh = -Infinity;
    let lowestLow = Infinity;
    
    recentCandles.forEach(c => {
      if (c.high > highestHigh) highestHigh = c.high;
      if (c.low < lowestLow) lowestLow = c.low;
    });
    
    // Evitar infinito se array vazio
    if (highestHigh === -Infinity || lowestLow === Infinity) return null;

    const equilibrium = (highestHigh + lowestLow) / 2;
    const currentPrice = data[data.length - 1].close;
    
    return {
      high: highestHigh,
      low: lowestLow,
      equilibrium: equilibrium,
      status: currentPrice > equilibrium ? 'PREMIUM' : 'DISCOUNT'
    };
  }

  /**
   * Análise de Liquidez de Sessão (Highs/Lows Diários)
   */
  private detectSessionLiquidity(data: MarketData[]): SessionLiquidity | null {
    if (!data.length) return null;

    const lastTimestamp = data[data.length - 1].timestamp;
    const oneDay = 24 * 60 * 60 * 1000;
    // Filtrar velas das últimas 24h
    const recentCandles = data.filter(c => c.timestamp > lastTimestamp - oneDay);

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
    // Converter de objeto de trabalho para o formato da interface SessionLiquidity
    // A interface SessionLiquidity deve ter chaves opcionais asia, london, newYork do tipo LiquidityZone?
    // Não, verifiquei shared/types.ts, a interface SessionLiquidity tem:
    // export interface SessionLiquidity { asia?: SessionRange; london?: SessionRange; newYork?: SessionRange; }
    // Onde SessionRange é { high: number; low: number; label: string; }
    
    const result: SessionLiquidity = {};
    if (sessions.asia.high > -Infinity) result.asia = sessions.asia;
    if (sessions.london.high > -Infinity) result.london = sessions.london;
    if (sessions.newYork.high > -Infinity) result.newYork = sessions.newYork;

    return Object.keys(result).length > 0 ? result : null;
  }

  /**
   * Detecta zonas de liquidez baseadas em swing highs/lows
   */
  private detectLiquidityZones(data: MarketData[]): LiquidityZone[] {
    const zones: LiquidityZone[] = [];
    const swingPoints = this.findSwingPoints(data);

    swingPoints.forEach(point => {
      const strength = this.calculateLiquidityStrength(data, point.index, point.type);
      
      if (strength >= this.minLiquidityStrength) {
        zones.push({
          type: point.type === 'high' ? 'high' : 'low',
          price: point.price,
          strength,
          timestamp: data[point.index].timestamp
        });
      }
    });

    return zones;
  }

  /**
   * Detecta Order Blocks baseados em velas de rejeição
   */
  private detectOrderBlocks(data: MarketData[]): OrderBlock[] {
    const blocks: OrderBlock[] = [];

    for (let i = 2; i < data.length; i++) {
      const prev1 = data[i - 1];
      const prev2 = data[i - 2];
      const current = data[i];

      // Bullish Order Block: vela de venda agressiva seguida de rejeição
      if (this.isBullishOrderBlock(prev2, prev1, current)) {
        blocks.push({
          type: 'bullish',
          price: prev1.low,
          startTime: prev2.timestamp,
          endTime: prev1.timestamp,
          strength: this.calculateOrderBlockStrength(prev1, current),
          mitigated: false
        });
      }

      // Bearish Order Block: vela de compra agressiva seguida de rejeição
      if (this.isBearishOrderBlock(prev2, prev1, current)) {
        blocks.push({
          type: 'bearish',
          price: prev1.high,
          startTime: prev2.timestamp,
          endTime: prev1.timestamp,
          strength: this.calculateOrderBlockStrength(prev1, current),
          mitigated: false
        });
      }
    }

    return blocks;
  }

  /**
   * Detecta Fair Value Gaps (FVGs)
   */
  private detectFairValueGaps(data: MarketData[]): FairValueGap[] {
    const gaps: FairValueGap[] = [];

    for (let i = 2; i < data.length; i++) {
      const prev1 = data[i - 1];
      const prev2 = data[i - 2];

      // FVG de alta: gap entre low da vela atual e high de duas velas atrás
      if (prev1.low > prev2.high) {
        const gapSize = (prev1.low - prev2.high) / prev2.high;
        
        if (gapSize >= this.minFvgSize) {
          gaps.push({
            top: prev1.low,
            bottom: prev2.high,
            midpoint: (prev1.low + prev2.high) / 2,
            timestamp: prev1.timestamp,
            filled: false
          });
        }
      }

      // FVG de baixa: gap entre high da vela atual e low de duas velas atrás
      if (prev1.high < prev2.low) {
        const gapSize = (prev2.low - prev1.high) / prev1.high;
        
        if (gapSize >= this.minFvgSize) {
          gaps.push({
            top: prev2.low,
            bottom: prev1.high,
            midpoint: (prev2.low + prev1.high) / 2,
            timestamp: prev1.timestamp,
            filled: false
          });
        }
      }
    }

    return gaps;
  }

  /**
   * Detecta estruturas de mercado (HH, HL, LH, LL, BOS, CHOCH)
   */
  private detectMarketStructures(data: MarketData[]): MarketStructure[] {
    const structures: MarketStructure[] = [];
    const swingPoints = this.findSwingPoints(data);

    for (let i = 1; i < swingPoints.length; i++) {
      const current = swingPoints[i];
      const previous = swingPoints[i - 1];

      if (current.type === 'high') {
        if (current.price > previous.price) {
          structures.push({
            type: 'HH',
            price: current.price,
            timestamp: data[current.index].timestamp,
            direction: 'bullish'
          });
        } else {
          structures.push({
            type: 'LH',
            price: current.price,
            timestamp: data[current.index].timestamp,
            direction: 'bearish'
          });
        }
      } else {
        if (current.price < previous.price) {
          structures.push({
            type: 'LL',
            price: current.price,
            timestamp: data[current.index].timestamp,
            direction: 'bearish'
          });
        } else {
          structures.push({
            type: 'HL',
            price: current.price,
            timestamp: data[current.index].timestamp,
            direction: 'bullish'
          });
        }
      }
    }

    // Detectar BOS e CHOCH
    const bosChoch = this.detectBOSAndCHOCH(structures);
    return [...structures, ...bosChoch];
  }

  /**
   * Detecta Break of Structure (BOS) e Change of Character (CHOCH)
   */
  private detectBOSAndCHOCH(structures: MarketStructure[]): MarketStructure[] {
    const bosChoch: MarketStructure[] = [];
    let lastHigh = 0;
    let lastLow = Infinity;
    let prevDirection: 'bullish' | 'bearish' | null = null;

    structures.forEach(structure => {
      if (prevDirection && structure.direction !== prevDirection) {
        bosChoch.push({
          type: 'CHOCH',
          price: structure.price,
          timestamp: structure.timestamp,
          direction: structure.direction
        });
      }
      if (structure.type === 'HH') {
        if (structure.price > lastHigh) {
          if (prevDirection === 'bearish') {
            bosChoch.push({
              type: 'CHOCH',
              price: structure.price,
              timestamp: structure.timestamp,
              direction: 'bullish'
            });
          }
          bosChoch.push({
            type: 'BOS',
            price: structure.price,
            timestamp: structure.timestamp,
            direction: 'bullish'
          });
        }
        lastHigh = structure.price;
        prevDirection = 'bullish';
      } else if (structure.type === 'LL') {
        if (structure.price < lastLow) {
          if (prevDirection === 'bullish') {
            bosChoch.push({
              type: 'CHOCH',
              price: structure.price,
              timestamp: structure.timestamp,
              direction: 'bearish'
            });
          }
          bosChoch.push({
            type: 'BOS',
            price: structure.price,
            timestamp: structure.timestamp,
            direction: 'bearish'
          });
        }
        lastLow = structure.price;
        prevDirection = 'bearish';
      } else {
        prevDirection = structure.direction;
      }
    });

    return bosChoch;
  }

  /**
   * Encontra pontos de swing (altos e baixos significativos)
   */
  private findSwingPoints(data: MarketData[]): Array<{ index: number; price: number; type: 'high' | 'low' }> {
    const points: Array<{ index: number; price: number; type: 'high' | 'low' }> = [];
    const window = 5; // Número de velas para considerar

    for (let i = window; i < data.length - window; i++) {
      const current = data[i];
      const isHigh = this.isSwingHigh(data, i, window);
      const isLow = this.isSwingLow(data, i, window);

      if (isHigh) {
        points.push({ index: i, price: current.high, type: 'high' });
      } else if (isLow) {
        points.push({ index: i, price: current.low, type: 'low' });
      }
    }

    return points;
  }

  /**
   * Verifica se é um swing high
   */
  private isSwingHigh(data: MarketData[], index: number, window: number): boolean {
    const current = data[index];
    for (let i = 1; i <= window; i++) {
      if (current.high <= data[index - i].high || current.high <= data[index + i].high) {
        return false;
      }
    }
    return true;
  }

  /**
   * Verifica se é um swing low
   */
  private isSwingLow(data: MarketData[], index: number, window: number): boolean {
    const current = data[index];
    for (let i = 1; i <= window; i++) {
      if (current.low >= data[index - i].low || current.low >= data[index + i].low) {
        return false;
      }
    }
    return true;
  }

  /**
   * Detecta Buy-Side Liquidity (altos anteriores)
   */
  private detectBuySideLiquidity(data: MarketData[]): number[] {
    const highs: number[] = [];
    const window = 20; // Últimas 20 velas
    const recentData = data.slice(-window);

    recentData.forEach(candle => {
      highs.push(candle.high);
    });

    return highs.sort((a, b) => b - a); // Ordenar do maior para o menor
  }

  /**
   * Detecta Sell-Side Liquidity (baixos anteriores)
   */
  private detectSellSideLiquidity(data: MarketData[]): number[] {
    const lows: number[] = [];
    const window = 20; // Últimas 20 velas
    const recentData = data.slice(-window);

    recentData.forEach(candle => {
      lows.push(candle.low);
    });

    return lows.sort((a, b) => a - b); // Ordenar do menor para o maior
  }

  /**
   * Verifica se é um Order Block de alta
   */
  private isBullishOrderBlock(prev2: MarketData, prev1: MarketData, current: MarketData): boolean {
    // Vela de venda agressiva (corpo grande para baixo)
    const bearishCandle = prev1.open > prev1.close && 
                          (prev1.open - prev1.close) > (prev1.high - prev1.low) * 0.6;
    
    // Rejeição na vela atual (preço sobe)
    const rejection = current.close > prev1.open;

    return bearishCandle && rejection;
  }

  /**
   * Verifica se é um Order Block de baixa
   */
  private isBearishOrderBlock(prev2: MarketData, prev1: MarketData, current: MarketData): boolean {
    // Vela de compra agressiva (corpo grande para cima)
    const bullishCandle = prev1.close > prev1.open && 
                          (prev1.close - prev1.open) > (prev1.high - prev1.low) * 0.6;
    
    // Rejeição na vela atual (preço desce)
    const rejection = current.close < prev1.open;

    return bullishCandle && rejection;
  }

  /**
   * Calcula a força de uma zona de liquidez
   */
  private calculateLiquidityStrength(data: MarketData[], index: number, type: 'high' | 'low'): number {
    const current = data[index];
    const lookback = 10;
    let touches = 0;
    let rejections = 0;

    for (let i = Math.max(0, index - lookback); i < index; i++) {
      const candle = data[i];
      if (type === 'high') {
        if (candle.high >= current.high * 0.999) touches++;
        if (candle.close < candle.open && candle.high >= current.high * 0.999) rejections++;
      } else {
        if (candle.low <= current.low * 1.001) touches++;
        if (candle.close > candle.open && candle.low <= current.low * 1.001) rejections++;
      }
    }

    return Math.min(1, (touches + rejections * 2) / lookback);
  }

  /**
   * Calcula a força de um Order Block
   */
  private calculateOrderBlockStrength(blockCandle: MarketData, currentCandle: MarketData): number {
    const bodySize = Math.abs(blockCandle.close - blockCandle.open);
    const totalRange = blockCandle.high - blockCandle.low;
    const bodyRatio = bodySize / totalRange;

    // Quanto maior o corpo da vela, mais forte o Order Block
    const strength = bodyRatio * 0.7 + (currentCandle.volume / blockCandle.volume) * 0.3;
    
    return Math.min(1, strength);
  }

  /**
   * Gera sinais de trading baseados na análise SMC
   * @param data Optional recent market data for volume confirmation
   */
  generateSignals(analysis: SMCAnalysis, currentPrice: number, timeframe: string, data?: MarketData[]): TradingSignal[] {
    const signals: TradingSignal[] = [];

    // Volume Confirmation Logic
    let volumeConfirmedBuy = true;
    let volumeConfirmedSell = true;

    if (this.useVolumeConfirmation && data && data.length > 20) {
      volumeConfirmedBuy = this.checkVolumeConfirmation(data, 'buy');
      volumeConfirmedSell = this.checkVolumeConfirmation(data, 'sell');
    }

    // Sinal de compra: preço em zona de liquidez baixa + Order Block de alta
    const buySignal = this.checkBuySignal(analysis, currentPrice);
    if (buySignal) {
      if (volumeConfirmedBuy) {
        signals.push({
          ...buySignal,
          timeframe,
          reason: buySignal.reason + (this.useVolumeConfirmation ? ' + Vol Confirmed' : '')
        });
      }
    }

    // Sinal de venda: preço em zona de liquidez alta + Order Block de baixa
    const sellSignal = this.checkSellSignal(analysis, currentPrice);
    if (sellSignal) {
      if (volumeConfirmedSell) {
        signals.push({
          ...sellSignal,
          timeframe,
          reason: sellSignal.reason + (this.useVolumeConfirmation ? ' + Vol Confirmed' : '')
        });
      }
    }

    return signals;
  }

  /**
   * Checks for volume anomalies indicating institutional interest.
   * Uses Relative Volume (RVOL) > 1.5 as a proxy.
   */
  private checkVolumeConfirmation(data: MarketData[], type: 'buy' | 'sell'): boolean {
    const lookback = 20;
    const recent = data.slice(-lookback);
    const currentCandle = recent[recent.length - 1];
    
    // Calculate Average Volume
    const avgVolume = recent.slice(0, -1).reduce((sum, c) => sum + c.volume, 0) / (lookback - 1);
    const rvol = currentCandle.volume / avgVolume;

    // Institutional footprint: High relative volume
    if (rvol < 1.5) return false;

    // Directional volume check
    if (type === 'buy') {
      // Expecting bullish candle or rejection candle with high volume
      return currentCandle.close >= currentCandle.open || 
             (currentCandle.close > currentCandle.low + (currentCandle.high - currentCandle.low) * 0.5);
    } else {
      // Expecting bearish candle or rejection candle with high volume
      return currentCandle.close <= currentCandle.open || 
             (currentCandle.close < currentCandle.high - (currentCandle.high - currentCandle.low) * 0.5);
    }
  }

  debugBOSCHOCH(structures: MarketStructure[]): MarketStructure[] {
    return this.detectBOSAndCHOCH(structures);
  }

  /**
   * Verifica sinal de compra
   */
  private checkBuySignal(analysis: SMCAnalysis, currentPrice: number): TradingSignal | null {
    // Procurar zona de liquidez baixa próxima
    const lowLiquidity = analysis.liquidityZones.find(zone => 
      zone.type === 'low' && 
      Math.abs(zone.price - currentPrice) / currentPrice < 0.01 && // Dentro de 1%
      zone.strength >= this.minLiquidityStrength
    );

    if (!lowLiquidity) return null;

    // Procurar Order Block de alta válido
    const bullishOB = analysis.orderBlocks.find(block => 
      block.type === 'bullish' &&
      !block.mitigated &&
      Math.abs(block.price - currentPrice) / currentPrice < 0.005 && // Dentro de 0.5%
      block.strength >= this.minOrderBlockStrength
    );

    if (!bullishOB) return null;

    // Calcular níveis de stop loss e take profit
    const stopLoss = lowLiquidity.price * 0.99; // 1% abaixo da liquidez
    const takeProfit1 = currentPrice * 1.02; // 2% acima
    const takeProfit2 = currentPrice * 1.04; // 4% acima

    return {
      type: 'BUY',
      entryPrice: currentPrice,
      stopLoss,
      takeProfit: [takeProfit1, takeProfit2],
      confidence: Math.min(1, (lowLiquidity.strength + bullishOB.strength) / 2),
      reason: `Liquidity Zone + Bullish Order Block`,
      timestamp: Date.now(),
      timeframe: '1h'
    };
  }

  /**
   * Verifica sinal de venda
   */
  private checkSellSignal(analysis: SMCAnalysis, currentPrice: number): TradingSignal | null {
    // Procurar zona de liquidez alta próxima
    const highLiquidity = analysis.liquidityZones.find(zone => 
      zone.type === 'high' && 
      Math.abs(zone.price - currentPrice) / currentPrice < 0.01 && // Dentro de 1%
      zone.strength >= this.minLiquidityStrength
    );

    if (!highLiquidity) return null;

    // Procurar Order Block de baixa válido
    const bearishOB = analysis.orderBlocks.find(block => 
      block.type === 'bearish' &&
      !block.mitigated &&
      Math.abs(block.price - currentPrice) / currentPrice < 0.005 && // Dentro de 0.5%
      block.strength >= this.minOrderBlockStrength
    );

    if (!bearishOB) return null;

    // Calcular níveis de stop loss e take profit
    const stopLoss = highLiquidity.price * 1.01; // 1% acima da liquidez
    const takeProfit1 = currentPrice * 0.98; // 2% abaixo
    const takeProfit2 = currentPrice * 0.96; // 4% abaixo

    return {
      type: 'SELL',
      entryPrice: currentPrice,
      stopLoss,
      takeProfit: [takeProfit1, takeProfit2],
      confidence: Math.min(1, (highLiquidity.strength + bearishOB.strength) / 2),
      reason: `Liquidity Zone + Bearish Order Block`,
      timestamp: Date.now(),
      timeframe: '1h'
    };
  }
}
