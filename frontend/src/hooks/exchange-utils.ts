export type NormalizedExchangeStatus = {
  isConnected: boolean
  exchange: string
  status: 'connected' | 'disconnected' | 'error'
  lastUpdate: number
}

export function normalizeExchangeStatus(
  s: Partial<{ isConnected: boolean; exchange: string; status: string }>,
  now: number,
): NormalizedExchangeStatus {
  const connected = !!s.isConnected
  const status: 'connected' | 'disconnected' | 'error' = connected
    ? 'connected'
    : s.status === 'error'
    ? 'error'
    : 'disconnected'
  return {
    isConnected: connected,
    exchange: s.exchange || 'binance',
    status,
    lastUpdate: now,
  }
}

export type NormalizedBalance = {
  success: boolean
  data: {
    total?: Record<string, number>
    free?: Record<string, number>
    used?: Record<string, number>
  }
  error?: string
}

export function normalizeBalance(res: unknown): NormalizedBalance {
  type Success = { success: true; data?: { total?: Record<string, number>; free?: Record<string, number>; used?: Record<string, number> } }
  type Failure = { success: false; error?: unknown }
  const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null
  const isSuccess = (x: unknown): x is Success => isObj(x) && x['success'] === true
  const isFailure = (x: unknown): x is Failure => isObj(x) && x['success'] === false

  if (isSuccess(res)) {
    const data = isObj(res.data) ? res.data : {}
    return {
      success: true,
      data: {
        total: isObj(data.total) ? (data.total as Record<string, number>) : {},
        free: isObj(data.free) ? (data.free as Record<string, number>) : {},
        used: isObj(data.used) ? (data.used as Record<string, number>) : {},
      },
    }
  }
  const err = isFailure(res) && res.error !== undefined ? res.error : 'Failed to fetch balance'
  return { success: false, data: {}, error: String(err) }
}
