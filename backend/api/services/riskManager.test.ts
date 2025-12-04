import { describe, it, expect } from 'vitest'
import { RiskManager } from './riskManager'
import type { RiskManagement, TradingSignal, TradePosition } from '../../../shared/types'

const baseConfig: RiskManagement = {
  maxRiskPerTrade: 2,
  maxDailyLoss: 5,
  maxPositions: 5,
  riskRewardRatio: 2,
  positionSizingMethod: 'fixed'
}

const sampleSignal: TradingSignal = {
  type: 'BUY',
  entryPrice: 100,
  stopLoss: 95,
  takeProfit: [110],
  confidence: 0.7,
  reason: 'test',
  timestamp: Date.now(),
  timeframe: '1h'
}

describe('RiskManager', () => {
  it('calculatePositionSize returns > 0 when can trade', () => {
    const rm = new RiskManager(baseConfig, 10000)
    const size = rm.calculatePositionSize(100, 95, sampleSignal)
    expect(size).toBeGreaterThan(0)
  })

  it('canTrade returns false when max positions reached', () => {
    const rm = new RiskManager(baseConfig, 10000)
    const pos: TradePosition = {
      id: 'p1', symbol: 'BTC/USDT', type: 'LONG', entryPrice: 100, quantity: 1,
      stopLoss: 95, takeProfit: [110], status: 'OPEN', openTime: Date.now(), fees: 0
    }
    for (let i = 0; i < baseConfig.maxPositions; i++) {
      rm.registerPosition({ ...pos, id: `p${i}` })
    }
    expect(rm.canTrade()).toBe(false)
    const size = rm.calculatePositionSize(100, 95, sampleSignal)
    expect(size).toBe(0)
  })

  it('calculateVolatility returns 0 for insufficient data', () => {
    const rm = new RiskManager(baseConfig, 10000)
    const vol = rm.calculateVolatility([], 14)
    expect(vol).toBe(0)
  })
})
