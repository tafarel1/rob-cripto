import { describe, it, expect } from 'vitest'
import { TradingEngine } from './tradingEngine'
import type { TradePosition, RiskManagement } from '../../../shared/types'

const riskConfig: RiskManagement = {
  maxRiskPerTrade: 1,
  maxDailyLoss: 3,
  maxPositions: 3,
  riskRewardRatio: 2,
  positionSizingMethod: 'fixed',
}

describe('TradingEngine', () => {
  it('getStats returns structure with running=false and risk stats', async () => {
    const engine = new TradingEngine([], riskConfig, 10000)
    const stats = await engine.getStats()
    expect(typeof stats.activePositions).toBe('number')
    expect(stats.isRunning).toBe(false)
    expect(stats.riskStats.maxPositions).toBe(riskConfig.maxPositions)
  })

  it('shouldClosePosition triggers by stop loss and take profit', () => {
    const engine = new TradingEngine([], riskConfig, 10000)
    const base: Omit<TradePosition, 'id' | 'status' | 'openTime' | 'fees'> = {
      symbol: 'BTC/USDT',
      type: 'LONG',
      entryPrice: 100,
      quantity: 1,
      stopLoss: 95,
      takeProfit: [110],
    }
    const pos: TradePosition = { ...base, id: 'p1', status: 'OPEN', openTime: Date.now(), fees: 0 }

    const api = engine as unknown as {
      shouldClosePosition: (p: TradePosition, price: number) => { shouldClose: boolean; reason: string }
    }

    const bySL = api.shouldClosePosition(pos, 95)
    expect(bySL.shouldClose).toBe(true)

    const byTP = api.shouldClosePosition({ ...pos, stopLoss: 80, takeProfit: [101] }, 101)
    expect(byTP.shouldClose).toBe(true)
  })
})
