import { describe, it, expect } from 'vitest'
import { API_CONFIG } from '@/lib/config'

describe('API_CONFIG', () => {
  it('exposes baseURL and trading endpoints', () => {
    expect(API_CONFIG).toBeDefined()
    expect(API_CONFIG.endpoints.trading.smc).toBe('/api/smc')
    expect(typeof API_CONFIG.baseURL).toBe('string')
  })
})
