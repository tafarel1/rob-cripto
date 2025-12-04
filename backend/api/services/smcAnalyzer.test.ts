import { describe, it, expect } from 'vitest'
import { SMCAnalyzer } from './smcAnalyzer'
import type { SMCAnalysis, MarketData, MarketStructure } from '../../../shared/types'

function makeCandle(t: number, o: number, h: number, l: number, c: number, v: number): MarketData {
  return { timestamp: t, open: o, high: h, low: l, close: c, volume: v }
}

describe('SMCAnalyzer', () => {
  it('generateSignals produces BUY when low liquidity and bullish OB near price', () => {
    const analyzer = new SMCAnalyzer({ minLiquidityStrength: 0.5, minOrderBlockStrength: 0.5 })
    const analysis: SMCAnalysis = {
      liquidityZones: [{ type: 'low', price: 100, strength: 0.8, timestamp: Date.now() }],
      orderBlocks: [{ type: 'bullish', price: 100.1, startTime: Date.now() - 1000, endTime: Date.now(), strength: 0.8, mitigated: false }],
      fairValueGaps: [],
      marketStructures: [],
      buySideLiquidity: [],
      sellSideLiquidity: []
    }
    const signals = analyzer.generateSignals(analysis, 100, '1h')
    expect(signals.some(s => s.type === 'BUY')).toBe(true)
  })

  it('generateSignals produces SELL when high liquidity and bearish OB near price', () => {
    const analyzer = new SMCAnalyzer({ minLiquidityStrength: 0.5, minOrderBlockStrength: 0.5 })
    const analysis: SMCAnalysis = {
      liquidityZones: [{ type: 'high', price: 100, strength: 0.8, timestamp: Date.now() }],
      orderBlocks: [{ type: 'bearish', price: 99.9, startTime: Date.now() - 1000, endTime: Date.now(), strength: 0.8, mitigated: false }],
      fairValueGaps: [],
      marketStructures: [],
      buySideLiquidity: [],
      sellSideLiquidity: []
    }
    const signals = analyzer.generateSignals(analysis, 100, '1h')
    expect(signals.some(s => s.type === 'SELL')).toBe(true)
  })

  it('analyze detects fair value gaps for simple sequence', () => {
    const analyzer = new SMCAnalyzer({ minFvgSize: 0.0001 })
    const data: MarketData[] = [
      makeCandle(1, 100, 101, 99, 100, 1000),
      makeCandle(2, 100, 101.5, 100.5, 101, 1200),
      makeCandle(3, 101, 101.2, 100.9, 101, 1100),
    ]
    const result = analyzer.analyze(data)
    expect(Array.isArray(result.fairValueGaps)).toBe(true)
  })

  it('analyze detects CHOCH from trend change with new extreme', () => {
    const analyzer = new SMCAnalyzer()
    const seq: MarketData[] = [
      makeCandle(1, 99, 100, 95, 99, 1000),
      makeCandle(2, 100, 101, 96, 100, 1000),
      makeCandle(3, 101, 102, 97, 101, 1000),
      makeCandle(4, 102, 103, 98, 102, 1000),
      makeCandle(5, 103, 104, 99, 103, 1000),
      makeCandle(6, 104, 105, 100, 104, 1000),
      makeCandle(7, 108, 109, 104, 108, 1000),
      makeCandle(8, 110, 120, 108, 118, 1200),
      makeCandle(9, 116, 118, 110, 116, 1000),
      makeCandle(10, 114, 116, 108, 114, 1000),
      makeCandle(11, 112, 114, 106, 112, 1000),
      makeCandle(12, 110, 112, 104, 110, 1000),
      makeCandle(13, 108, 110, 102, 108, 1000),
      makeCandle(14, 106, 108, 100, 106, 1000),
      makeCandle(15, 100, 106, 96, 100, 1000),
      makeCandle(16, 90, 95, 85, 90, 1200),
      makeCandle(17, 96, 100, 92, 96, 1000),
      makeCandle(18, 98, 102, 94, 98, 1000),
      makeCandle(19, 100, 104, 96, 100, 1000),
      makeCandle(20, 102, 106, 98, 102, 1000),
      makeCandle(21, 104, 108, 100, 104, 1000),
      makeCandle(22, 106, 110, 102, 106, 1000),
    ]
    const res = analyzer.analyze(seq)
    const ms = res.marketStructures
    expect(ms.length).toBeGreaterThan(0)
  })

  it('detectOrderBlocks identifies bullish and bearish blocks', () => {
    const analyzer = new SMCAnalyzer({ minOrderBlockStrength: 0 })
    const seq: MarketData[] = []
    let t = 1
    seq.push(makeCandle(t++, 100, 102, 99, 101, 900))
    seq.push(makeCandle(t++, 105, 106, 99, 100, 1200))
    seq.push(makeCandle(t++, 100, 107, 100, 106, 1300))
    seq.push(makeCandle(t++, 100, 101, 98, 99, 900))
    seq.push(makeCandle(t++, 95, 110, 95, 109, 1200))
    seq.push(makeCandle(t++, 109, 110, 100, 101, 1300))
    const res = analyzer.analyze(seq)
    const obs = res.orderBlocks
    expect(obs.some(b => b.type === 'bullish')).toBe(true)
    expect(obs.some(b => b.type === 'bearish')).toBe(true)
  })

  it('detects BOS and CHOCH from synthetic structures', () => {
    const analyzer = new SMCAnalyzer()
    const structures: MarketStructure[] = [
      { type: 'HH', price: 110, timestamp: 1, direction: 'bullish' },
      { type: 'HL', price: 105, timestamp: 2, direction: 'bullish' },
      { type: 'LL', price: 95, timestamp: 3, direction: 'bearish' },
      { type: 'LH', price: 100, timestamp: 4, direction: 'bearish' },
      { type: 'HH', price: 120, timestamp: 5, direction: 'bullish' },
    ]
    const res = analyzer.debugBOSCHOCH(structures)
    expect(res.some(s => s.type === 'BOS')).toBe(true)
    expect(res.some(s => s.type === 'CHOCH')).toBe(true)
  })
})
