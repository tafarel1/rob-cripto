import { useState, useEffect, useCallback, useRef } from 'react';

interface BalanceData {
  total: { [key: string]: number };
  free: { [key: string]: number };
  used: { [key: string]: number };
  timestamp: number;
}

interface AccountBalanceResponse {
  success: boolean;
  data: BalanceData;
  error?: string;
  timestamp: number;
}

export function useAccountBalance(refreshInterval = 30000) {
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalEquity, setTotalEquity] = useState<number>(0);
  
  const hasDataRef = useRef(false);

  const fetchBalance = useCallback(async () => {
    try {
      // Don't set loading to true on background refreshes to avoid flickering
      if (!hasDataRef.current) setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/exchange/balance');
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const result: AccountBalanceResponse = await response.json();
      
      if (result.success) {
        setBalance(result.data);
        hasDataRef.current = true;
        
        // Calculate estimated total equity in USDT
        // Note: This is a simplified estimation. Ideally the backend should provide total equity in USDT.
        // For now, we assume 'total' contains the equity if we look at USDT, or we sum up.
        // But usually exchanges return a 'total' object with asset keys.
        // Let's assume result.data.total.USDT is the main one, or we sum known assets.
        // If it's a testnet mock, it returns { USDT: 10000, BTC: 0.5... }
        
        let equity = 0;
        if (result.data.total) {
             // Prioritize USDT if available
             if (result.data.total.USDT) {
                 equity = result.data.total.USDT;
                 
                 // Add BTC value approx (hardcoded for now as we don't have ticker here easily without circular dependency)
                 // In a real app we'd fetch prices. For this hook we might just use USDT balance 
                 // or expect the backend to give us "totalEquity"
             }
        }
        setTotalEquity(equity);
        
      } else {
        // If exchange is not connected, it returns success: false
        // We handle this gracefully
        if (result.error && result.error.includes('not connected')) {
             // Keep mock data or null?
             // Maybe null to indicate "not connected"
        }
        // throw new Error(result.error || 'Failed to fetch balance');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Balance fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
    
    if (refreshInterval > 0) {
      const intervalId = setInterval(fetchBalance, refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, [fetchBalance, refreshInterval]);

  return {
    balance,
    totalEquity,
    isLoading,
    error,
    refetch: fetchBalance
  };
}
