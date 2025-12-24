import { describe, it, expect } from 'vitest'
import { normalizeExchangeStatus, normalizeBalance } from '@/hooks/exchange-utils'

describe('exchange utils', () => {
  it('normalizeExchangeStatus maps connected status', () => {
    const res = normalizeExchangeStatus({ isConnected: true, exchange: 'bybit' }, 123)
    expect(res.isConnected).toBe(true)
    expect(res.status).toBe('connected')
    expect(res.exchange).toBe('bybit')
    expect(res.lastUpdate).toBe(123)
  })

  it('normalizeExchangeStatus maps disconnected and error status', () => {
    const d = normalizeExchangeStatus({ isConnected: false }, 1)
    expect(d.status).toBe('disconnected')
    const e = normalizeExchangeStatus({ isConnected: false, status: 'error' }, 2)
    expect(e.status).toBe('error')
  })

  it('normalizeBalance returns structured data on success', () => {
    const res = normalizeBalance({ success: true, data: { total: { BTC: 1 } } })
    expect(res.success).toBe(true)
    expect(res.data.total!.BTC).toBe(1)
  })

  it('normalizeBalance returns error on failure', () => {
    const res = normalizeBalance({ success: false, error: 'x' })
    expect(res.success).toBe(false)
    expect(res.error).toBe('x')
  })
})
