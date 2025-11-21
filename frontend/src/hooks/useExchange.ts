import { useState, useEffect } from 'react';

interface ExchangeStatus {
  isConnected: boolean;
  exchange: string;
  status: 'connected' | 'disconnected' | 'error';
  lastUpdate: number;
}

interface Balance {
  success: boolean;
  data: {
    total?: { [key: string]: number };
    free?: { [key: string]: number };
    used?: { [key: string]: number };
  };
  error?: string;
}

interface Position {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  timestamp: number;
}

export function useExchange() {
  const [exchangeStatus, setExchangeStatus] = useState<ExchangeStatus | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchExchangeStatus();
    const interval = setInterval(fetchExchangeStatus, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchExchangeStatus = async () => {
    try {
      const response = await fetch('/api/exchange/status');
      const data = await response.json();
      
      if (data.success) {
        setExchangeStatus({
          isConnected: data.connected,
          exchange: data.exchange || 'binance',
          status: data.connected ? 'connected' : 'disconnected',
          lastUpdate: Date.now()
        });

        // Fetch balance if connected
        if (data.connected) {
          fetchBalance();
          fetchPositions();
        }
      }
    } catch (error) {
      console.error('Error fetching exchange status:', error);
      setExchangeStatus({
        isConnected: false,
        exchange: 'binance',
        status: 'error',
        lastUpdate: Date.now()
      });
    }
  };

  const fetchBalance = async () => {
    try {
      const response = await fetch('/api/exchange/balance');
      const data = await response.json();
      
      if (data.success) {
        setBalance(data);
      } else {
        setBalance({
          success: false,
          data: {},
          error: data.error || 'Failed to fetch balance'
        });
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
      setBalance({
        success: false,
        data: {},
        error: 'Network error'
      });
    }
  };

  const fetchPositions = async () => {
    try {
      const response = await fetch('/api/exchange/positions');
      const data = await response.json();
      
      if (data.success) {
        setPositions(data.data || []);
      } else {
        setPositions([]);
      }
    } catch (error) {
      console.error('Error fetching positions:', error);
      setPositions([]);
    }
  };

  const connect = async (apiKeys: { key: string; secret: string }) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/exchange/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiKeys),
      });
      
      const data = await response.json();
      
      if (data.success) {
        await fetchExchangeStatus();
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Connection failed' };
      }
    } catch (error) {
      console.error('Error connecting to exchange:', error);
      return { success: false, error: 'Network error' };
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/exchange/disconnect', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success) {
        setExchangeStatus({
          isConnected: false,
          exchange: 'binance',
          status: 'disconnected',
          lastUpdate: Date.now()
        });
        setBalance(null);
        setPositions([]);
      }
      
      return data;
    } catch (error) {
      console.error('Error disconnecting from exchange:', error);
      return { success: false, error: 'Network error' };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    exchangeStatus,
    balance,
    positions,
    isLoading,
    connect,
    disconnect,
    refresh: fetchExchangeStatus
  };
}