export const API_CONFIG = {
  baseURL: import.meta.env.PROD 
    ? 'https://traerobocriptoxeol.vercel.app' 
    : '',
  endpoints: {
    exchange: {
      status: '/api/exchange/status',
      balance: '/api/exchange/balance',
      positions: '/api/exchange/positions',
      connect: '/api/exchange/connect',
      disconnect: '/api/exchange/disconnect'
    },
    trading: {
      balance: '/api/balance',
      positions: '/api/positions',
      orders: '/api/orders',
      trades: '/api/trades',
      performance: '/api/performance',
      settings: '/api/settings',
      trade: '/api/trade',
      emergencyStop: '/api/emergency-stop',
      market: '/api/market',
      smc: '/api/smc'
    }
  }
};