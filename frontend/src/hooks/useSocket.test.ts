import { describe, it, expect, beforeEach, vi } from 'vitest'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { useSocket } from '@/hooks/useSocket'

const handlers: Record<string, (_: unknown) => void> = {}
 
 vi.mock('socket.io-client', () => {
   return {
     io: () => ({
       on: (event: string, cb: (_: unknown) => void) => { handlers[event] = cb },
      off: (event: string) => { delete handlers[event] },
      disconnect: () => {},
    })
  }
})

vi.mock('@/lib/config', () => ({
  API_CONFIG: {
    baseURL: 'http://localhost:3000',
    endpoints: { exchange: {} }
  }
}))

function delay(ms = 0) { return new Promise(r => setTimeout(r, ms)) }

describe('useSocket', () => {
  beforeEach(() => {
    for (const k of Object.keys(handlers)) delete handlers[k]
  })

  it('invoca callbacks para engine:status e trade:executed', async () => {
    let engineStatus: unknown = null
    let tradePayload: unknown = null

    function Harness() {
      useSocket(
        (evt) => { engineStatus = evt },
        (evt) => { tradePayload = evt }
      )
      return null
    }

    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    root.render(React.createElement(Harness))
    // aguardar registro de handlers
    for (let i = 0; i < 10 && !handlers['engine:status']; i++) {
      await delay(10)
    }

    handlers['engine:status']?.({ status: 'RUNNING', timestamp: Date.now() })
    handlers['trade:executed']?.({ symbol: 'BTC/USDT', side: 'buy', amount: 0.001, price: 50000, timestamp: Date.now() })
    await delay(0)

    const es = engineStatus as { status?: string }
    const tp = tradePayload as { symbol?: string }
    expect(es.status).toBe('RUNNING')
    expect(tp.symbol).toBe('BTC/USDT')

    root.unmount()
  })

  it('invoca callbacks para exchange:balance e exchange:positions', async () => {
    let balanceEvt: unknown = null
    let positionsEvt: unknown = null

    function Harness() {
      useSocket(
        undefined,
        undefined,
        (evt) => { balanceEvt = evt },
        (evt) => { positionsEvt = evt }
      )
      return null
    }

    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    root.render(React.createElement(Harness))
    await delay(10)

    handlers['exchange:balance']?.({ success: true, data: { free: { BTC: 0.1 } }, timestamp: Date.now() })
    handlers['exchange:positions']?.({ success: true, data: [{ id: 'p1' }] })
    await delay(0)

    const be = balanceEvt as { success?: boolean }
    const pe = positionsEvt as { data?: unknown[] }
    expect(be.success).toBe(true)
    expect(Array.isArray(pe.data) ? pe.data.length : 0).toBe(1)

    root.unmount()
  })
})
