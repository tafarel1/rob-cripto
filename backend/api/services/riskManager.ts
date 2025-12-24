import { RiskManagement, TradePosition, TradingSignal, MarketData } from '../../../shared/types';

export class RiskManager {
  private config: RiskManagement;
  private dailyLoss: number = 0;
  private dailyTrades: number = 0;
  private maxDailyLossReached: boolean = false;
  private openPositions: TradePosition[] = [];
  private accountBalance: number = 10000; // Saldo inicial padrão

  constructor(config: RiskManagement, initialBalance: number = 10000) {
    this.config = config;
    this.accountBalance = initialBalance;
    this.resetDailyLimits();
  }

  public getConfiguration(): RiskManagement {
    return this.config;
  }

  public getAccountBalance(): number {
    return this.accountBalance;
  }

  /**
   * Calcula o tamanho da posição baseado no risco
   */
  calculatePositionSize(
    entryPrice: number,
    stopLoss: number,
    signal: TradingSignal,
    currentBalance?: number
  ): number {
    if (currentBalance) {
      this.accountBalance = currentBalance;
    }

    // Verificar limites diários
    if (!this.canTrade()) {
      return 0;
    }

    const balance = this.accountBalance;
    const riskAmount = balance * (this.config.maxRiskPerTrade / 100);
    const stopLossDistance = Math.abs(entryPrice - stopLoss) / entryPrice;

    if (stopLossDistance === 0) {
      return 0;
    }

    let positionSize: number;

    switch (this.config.positionSizingMethod) {
      case 'fixed':
        positionSize = riskAmount / stopLossDistance;
        break;
      case 'percentage':
        positionSize = (balance * 0.02) / entryPrice; // 2% do saldo
        break;
      case 'kelly':
        positionSize = this.calculateKellyCriterion(signal, riskAmount, stopLossDistance);
        break;
      default:
        positionSize = riskAmount / stopLossDistance;
    }

    // Limitar pelo risco máximo por trade
    const maxPositionSize = riskAmount / stopLossDistance;
    positionSize = Math.min(positionSize, maxPositionSize);

    // Verificar número máximo de posições
    if (this.openPositions.length >= this.config.maxPositions) {
      return 0;
    }

    return Math.max(0, positionSize);
  }

  /**
   * Calcula critério de Kelly para sizing de posição
   */
  private calculateKellyCriterion(
    signal: TradingSignal,
    riskAmount: number,
    stopLossDistance: number
  ): number {
    const winRate = signal.confidence * 0.8; // Ajustar confiança para win rate estimado
    const avgWin = signal.takeProfit[0] / signal.entryPrice - 1;
    const avgLoss = stopLossDistance;

    if (avgLoss === 0) return 0;

    const kelly = (winRate * avgWin - (1 - winRate) * avgLoss) / avgLoss;
    
    // Usar metade de Kelly para reduzir volatilidade
    const kellyFraction = Math.max(0, Math.min(0.25, kelly * 0.5));
    
    return (this.accountBalance * kellyFraction) / signal.entryPrice;
  }

  /**
   * Valida sinal de trading contra regras de risco
   */
  validateSignal(signal: TradingSignal): {
    isValid: boolean;
    reason?: string;
    adjustedStopLoss?: number;
    adjustedTakeProfit?: number[];
  } {
    // Verificar se pode trade
    if (!this.canTrade()) {
      return {
        isValid: false,
        reason: 'Limite diário atingido'
      };
    }

    // Verificar risk-reward ratio mínimo
    const risk = Math.abs(signal.entryPrice - signal.stopLoss);
    const reward = Math.abs(signal.takeProfit[0] - signal.entryPrice);
    const riskRewardRatio = reward / risk;

    if (riskRewardRatio < this.config.riskRewardRatio) {
      return {
        isValid: false,
        reason: `Risk-reward ratio ${riskRewardRatio.toFixed(2)} abaixo do mínimo ${this.config.riskRewardRatio}`
      };
    }

    // Ajustar stop loss dinamicamente se necessário
    let adjustedStopLoss = signal.stopLoss;
    const adjustedTakeProfit = [...signal.takeProfit];

    // Verificar se stop loss é muito próximo (menos de 0.5%)
    const minStopDistance = signal.entryPrice * 0.005;
    if (risk < minStopDistance) {
      adjustedStopLoss = signal.type === 'BUY' 
        ? signal.entryPrice - minStopDistance
        : signal.entryPrice + minStopDistance;
    }

    // Ajustar take profit para manter risk-reward ratio
    const newRisk = Math.abs(signal.entryPrice - adjustedStopLoss);
    const requiredReward = newRisk * this.config.riskRewardRatio;
    
    adjustedTakeProfit[0] = signal.type === 'BUY'
      ? signal.entryPrice + requiredReward
      : signal.entryPrice - requiredReward;

    return {
      isValid: true,
      adjustedStopLoss,
      adjustedTakeProfit
    };
  }

  /**
   * Verifica se pode abrir nova posição
   */
  canTrade(): boolean {
    if (this.maxDailyLossReached) {
      return false;
    }

    if (this.openPositions.length >= this.config.maxPositions) {
      return false;
    }

    return true;
  }

  /**
   * Registra nova posição
   */
  registerPosition(position: TradePosition): void {
    this.openPositions.push(position);
    this.dailyTrades++;
  }

  /**
   * Atualiza posição (fechamento parcial ou total)
   */
  updatePosition(positionId: string, realizedPnl: number, status: 'CLOSED' | 'PARTIALLY_CLOSED'): void {
    const position = this.openPositions.find(p => p.id === positionId);
    if (position) {
      position.realizedPnl = (position.realizedPnl || 0) + realizedPnl;
      position.status = status;

      // Atualizar perda diária
      if (realizedPnl < 0) {
        this.dailyLoss += Math.abs(realizedPnl);
        this.checkDailyLimits();
      }

      // Remover posição se fechada
      if (status === 'CLOSED') {
        this.openPositions = this.openPositions.filter(p => p.id !== positionId);
      }
    }
  }

  /**
   * Ajusta stop loss para break-even
   */
  adjustStopLossToBreakEven(position: TradePosition, currentPrice: number): number {
    const breakEvenPrice = position.type === 'LONG' 
      ? position.entryPrice + (position.fees / position.quantity)
      : position.entryPrice - (position.fees / position.quantity);

    // Só ajustar se estiver em profit suficiente
    const profitThreshold = position.entryPrice * 0.01; // 1% de profit
    const currentProfit = Math.abs(currentPrice - position.entryPrice) * position.quantity;

    if (currentProfit >= profitThreshold) {
      return breakEvenPrice;
    }

    return position.stopLoss;
  }

  /**
   * Calcula volatilidade (ATR) para ajustar stops
   */
  calculateVolatility(data: MarketData[], period: number = 14): number {
    if (data.length < period + 1) {
      return 0;
    }

    const trueRanges: number[] = [];

    for (let i = 1; i < data.length; i++) {
      const current = data[i];
      const previous = data[i - 1];

      const tr1 = current.high - current.low;
      const tr2 = Math.abs(current.high - previous.close);
      const tr3 = Math.abs(current.low - previous.close);

      trueRanges.push(Math.max(tr1, tr2, tr3));
    }

    // Calcular ATR (média móvel dos true ranges)
    const atr = trueRanges.slice(-period).reduce((sum, tr) => sum + tr, 0) / period;
    
    // Retornar ATR como percentual do preço de fechamento
    const currentClose = data[data.length - 1].close;
    return atr / currentClose;
  }

  /**
   * Ajusta stop loss baseado em volatilidade
   */
  adjustStopLossByVolatility(
    entryPrice: number,
    initialStopLoss: number,
    volatility: number,
    positionType: 'LONG' | 'SHORT'
  ): number {
    const volatilityMultiplier = 1.5; // Multiplicador de volatilidade
    const volatilityAdjustment = entryPrice * volatility * volatilityMultiplier;

    if (positionType === 'LONG') {
      return Math.min(initialStopLoss, entryPrice - volatilityAdjustment);
    } else {
      return Math.max(initialStopLoss, entryPrice + volatilityAdjustment);
    }
  }

  /**
   * Verifica se deve sair parcialmente da posição
   */
  shouldTakePartialProfit(
    position: TradePosition,
    currentPrice: number,
    profitLevels: number[]
  ): {
    shouldExit: boolean;
    exitAmount: number;
    exitPrice: number;
    levelIndex?: number;
  } {
    const currentProfit = position.type === 'LONG'
      ? (currentPrice - position.entryPrice) / position.entryPrice
      : (position.entryPrice - currentPrice) / position.entryPrice;

    // Verificar se atingiu algum nível de take profit
    for (let i = 0; i < profitLevels.length; i++) {
      // Skip if already triggered
      if (position.triggeredTpLevels?.includes(i)) continue;

      if (currentProfit >= profitLevels[i]) {
        // Sair com 50% da posição no primeiro nível, 30% no segundo, 20% no terceiro
        const exitPercentages = [0.5, 0.3, 0.2];
        const exitAmount = position.quantity * (exitPercentages[i] || 0.2);

        return {
          shouldExit: true,
          exitAmount,
          exitPrice: currentPrice,
          levelIndex: i
        };
      }
    }

    return {
      shouldExit: false,
      exitAmount: 0,
      exitPrice: 0
    };
  }

  /**
   * Verifica limites diários
   */
  private checkDailyLimits(): void {
    const maxDailyLossAmount = this.accountBalance * (this.config.maxDailyLoss / 100);
    
    if (this.dailyLoss >= maxDailyLossAmount) {
      this.maxDailyLossReached = true;
    }
  }

  /**
   * Reseta limites diários
   */
  resetDailyLimits(): void {
    this.dailyLoss = 0;
    this.dailyTrades = 0;
    this.maxDailyLossReached = false;
  }

  /**
   * Obtém estatísticas de risco
   */
  getRiskStats(): {
    dailyLoss: number;
    dailyTrades: number;
    maxDailyLossReached: boolean;
    openPositions: number;
    maxPositions: number;
    accountBalance: number;
    riskExposure: number;
    availableRisk: number;
  } {
    const riskExposure = this.openPositions.reduce((total, position) => {
      const positionValue = position.quantity * position.entryPrice;
      return total + positionValue;
    }, 0);

    const availableRisk = Math.max(0, (this.accountBalance * (this.config.maxDailyLoss / 100)) - this.dailyLoss);

    return {
      dailyLoss: this.dailyLoss,
      dailyTrades: this.dailyTrades,
      maxDailyLossReached: this.maxDailyLossReached,
      openPositions: this.openPositions.length,
      maxPositions: this.config.maxPositions,
      accountBalance: this.accountBalance,
      riskExposure,
      availableRisk
    };
  }

  /**
   * Atualiza saldo da conta
   */
  updateAccountBalance(newBalance: number): void {
    this.accountBalance = newBalance;
  }

  /**
   * Define configuração de risco
   */
  setRiskConfig(config: RiskManagement): void {
    this.config = config;
  }

  /**
   * Valida exposição total
   */
  validateTotalExposure(): boolean {
    const totalExposure = this.openPositions.reduce((total, position) => {
      const positionValue = position.quantity * position.entryPrice;
      return total + positionValue;
    }, 0);

    const maxExposure = this.accountBalance * 0.8; // Máximo 80% do saldo em exposição
    
    return totalExposure <= maxExposure;
  }

  /**
   * Calcula drawdown atual
   */
  calculateDrawdown(peakBalance: number): number {
    if (peakBalance === 0) return 0;
    return ((peakBalance - this.accountBalance) / peakBalance) * 100;
  }

  /**
   * Verifica se atingiu stop de proteção
   */
  checkProtectionStop(peakBalance: number): boolean {
    const drawdown = this.calculateDrawdown(peakBalance);
    return drawdown >= 10; // Stop se drawdown atingir 10%
  }
}
