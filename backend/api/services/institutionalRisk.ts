import { TradePosition, RiskManagement } from '../../../shared/types';
import { RiskManager } from './riskManager';

export interface StressScenario {
  name: string;
  priceShock: number; // e.g., -0.10 for -10%
  liquidityShock: number; // e.g., 0.5 for 50% liquidity reduction
  correlationSpike: boolean;
}

export interface RiskReport {
  currentVaR: number; // Value at Risk (amount)
  cVaR: number; // Conditional VaR (Expected Shortfall)
  stressTestResults: { scenario: string; projectedLoss: number }[];
  riskExposure: number;
}

export class InstitutionalRiskManager extends RiskManager {
  
  constructor(config: RiskManagement, initialBalance: number) {
    super(config, initialBalance);
  }

  /**
   * Calculates Value at Risk (VaR) using Historical Simulation
   * @param confidenceLevel Confidence level (e.g., 0.95 or 0.99)
   * @param horizon Time horizon in days
   */
  public calculateVaR(
    activePositions: TradePosition[], 
    marketHistory: number[], // Daily returns of the portfolio or asset
    confidenceLevel: number = 0.95
  ): number {
    if (activePositions.length === 0) return 0;
    if (marketHistory.length < 100) return 0; // Insufficient data

    // 1. Calculate portfolio value
    const portfolioValue = activePositions.reduce((sum, p) => sum + (p.quantity * p.entryPrice), 0);

    // 2. Sort historical returns
    const sortedReturns = [...marketHistory].sort((a, b) => a - b);

    // 3. Find the percentile return
    const index = Math.floor((1 - confidenceLevel) * sortedReturns.length);
    const varReturn = sortedReturns[index];

    // 4. Calculate monetary VaR
    return Math.abs(portfolioValue * varReturn);
  }

  /**
   * Calculates Conditional VaR (Expected Shortfall)
   * Average loss BEYOND the VaR threshold.
   */
  public calculateCVaR(
    activePositions: TradePosition[],
    marketHistory: number[],
    confidenceLevel: number = 0.95
  ): number {
    if (activePositions.length === 0) return 0;
    if (marketHistory.length < 100) return 0;

    const portfolioValue = activePositions.reduce((sum, p) => sum + (p.quantity * p.entryPrice), 0);
    const sortedReturns = [...marketHistory].sort((a, b) => a - b);
    const index = Math.floor((1 - confidenceLevel) * sortedReturns.length);
    
    // Average of returns worse than VaR
    const tailReturns = sortedReturns.slice(0, index);
    const avgTailReturn = tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length;

    return Math.abs(portfolioValue * avgTailReturn);
  }

  /**
   * Executes stress tests based on predefined crypto scenarios
   */
  public runStressTests(activePositions: TradePosition[]): { scenario: string; projectedLoss: number }[] {
    const scenarios: StressScenario[] = [
      { name: 'Flash Crash (-10%)', priceShock: -0.10, liquidityShock: 0.5, correlationSpike: true },
      { name: 'Crypto Winter (-30%)', priceShock: -0.30, liquidityShock: 0.2, correlationSpike: true },
      { name: 'Regulatory News (-5%)', priceShock: -0.05, liquidityShock: 0.8, correlationSpike: false },
      { name: 'Stablecoin Depeg', priceShock: -0.15, liquidityShock: 0.1, correlationSpike: true }
    ];

    return scenarios.map(scenario => {
      let totalLoss = 0;
      for (const pos of activePositions) {
        // Assume Long positions lose value directly proportional to shock
        if (pos.type === 'LONG') {
          // If shock is larger than stop loss, we might have slippage
          const effectiveExit = pos.entryPrice * (1 + scenario.priceShock);
          const pnl = (effectiveExit - pos.entryPrice) * pos.quantity;
          totalLoss += pnl; // pnl is negative
        } else {
          // Short positions might gain, but correlation spike might imply generalized market failure
          // For stress test, we assume worst case or correlation breakdown
          const effectiveExit = pos.entryPrice * (1 + scenario.priceShock);
          const pnl = (pos.entryPrice - effectiveExit) * pos.quantity;
          totalLoss += pnl;
        }
      }
      return {
        scenario: scenario.name,
        projectedLoss: totalLoss
      };
    });
  }
}
