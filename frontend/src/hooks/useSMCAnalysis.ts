import { useState, useEffect, useCallback, useRef } from 'react';
import { SMCAnalysisResponse, SMCAnalysisData } from '@/types/smc';
import { useSocket } from '@/contexts/SocketContext';

interface UseSMCAnalysisOptions {
  symbol?: string;
  timeframe?: string;
  refreshInterval?: number;
}

export function useSMCAnalysis({ 
  symbol = 'BTC/USDT', 
  timeframe = '1h', 
  refreshInterval = 60000 
}: UseSMCAnalysisOptions = {}) {
  const [data, setData] = useState<SMCAnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(0);
  
  const hasDataRef = useRef(false);
  const { socket, isConnected } = useSocket();

  const fetchData = useCallback(async () => {
    try {
      // Don't show loading spinner on background refreshes if we already have data
      if (!hasDataRef.current) setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/analysis/smc?symbol=${encodeURIComponent(symbol)}&timeframe=${timeframe}`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const result: SMCAnalysisResponse = await response.json();
      
      if (result.success) {
        setData(result.data);
        setLastUpdated(result.timestamp);
        hasDataRef.current = true;
      } else {
        throw new Error(result.error || 'Falha na análise SMC');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('SMC Analysis fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [symbol, timeframe]);

  // Initial fetch and Fallback polling
  useEffect(() => {
    fetchData();
    
    if (refreshInterval > 0) {
      const intervalId = setInterval(fetchData, refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, [fetchData, refreshInterval]);

  // WebSocket Subscription
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleUpdate = (update: { symbol: string; timeframe: string; data: SMCAnalysisData }) => {
      // Only update if it matches our current symbol/timeframe (if backend supports filtering)
      // Or if the update contains symbol info
      if (update && update.symbol === symbol && update.timeframe === timeframe) {
         setData(update.data);
         setLastUpdated(Date.now());
         hasDataRef.current = true;
      }
    };

    // Request subscription to specific room/topic if backend architecture supports it
    socket.emit('subscribe:smc', { symbol, timeframe });
    
    socket.on('smc:update', handleUpdate);

    return () => {
      socket.off('smc:update', handleUpdate);
      socket.emit('unsubscribe:smc', { symbol, timeframe });
    };
  }, [socket, isConnected, symbol, timeframe]);

  return {
    data,
    isLoading,
    error,
    lastUpdated,
    refetch: fetchData
  };
}
