import { useState, useEffect, useCallback } from 'react';
import { API_CONFIG } from '@/lib/config';
import { normalizeExchangeStatus, normalizeBalance } from '@/hooks/exchange-utils'
import { useSocket } from '@/hooks/useSocket'

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

  const fetchBalance = useCallback(async () => {
    try {
      const response = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoints.exchange.balance}`);
      const data = await response.json();
      setBalance(normalizeBalance(data))
    } catch {
      setBalance({ success: false, data: {}, error: 'Network error' });
    }
  }, []);

  const fetchPositions = useCallback(async () => {
    try {
      const response = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoints.exchange.positions}`);
      const data = await response.json();
      if (data.success) {
        setPositions(data.data || []);
      } else {
        setPositions([]);
      }
    } catch {
      setPositions([]);
    }
  }, []);

  const fetchExchangeStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoints.exchange.status}`);
      const data = await response.json();
      if (data.success) {
        const sRaw = data.data || {}
        const normalized = normalizeExchangeStatus(sRaw, Date.now())
        setExchangeStatus(normalized)
        if (normalized.isConnected) {
          fetchBalance();
          fetchPositions();
        }
      }
    } catch {
      setExchangeStatus({ isConnected: false, exchange: 'binance', status: 'error', lastUpdate: Date.now() });
    }
  }, [fetchBalance, fetchPositions]);

  useEffect(() => {
    fetchExchangeStatus();
    const interval = setInterval(fetchExchangeStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchExchangeStatus]);

  

  const connect = async (apiKeys: { key: string; secret: string }) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoints.exchange.connect}`, {
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
      const response = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoints.exchange.disconnect}`, {
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

  useSocket(
    (evt: Partial<{ isConnected: boolean; exchange: string; status: string }>) => {
      const normalized = normalizeExchangeStatus(evt, Date.now())
      setExchangeStatus(normalized)
      if (normalized.isConnected) {
        fetchBalance();
        fetchPositions();
      }
    },
    () => {
      fetchBalance();
      fetchPositions();
    },
    (balEvt) => {
      setBalance(normalizeBalance(balEvt))
    },
    (posEvt) => {
      const payload = posEvt as { data?: unknown }
      const data = (payload as { data?: Position[] }).data
      setPositions(Array.isArray(data) ? data! : [])
    }
  )

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
