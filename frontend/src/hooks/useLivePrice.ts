import { useState, useEffect, useCallback, useRef } from 'react';
import { API_CONFIG } from '@/lib/config';
import { useSocket, PriceUpdateEvent } from '@/hooks/useSocket';

export interface TickerData {
  symbol: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  timestamp: number;
}

export function useLivePrice(symbol: string = 'BTC/USDT') {
  const [ticker, setTicker] = useState<TickerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const lastUpdateRef = useRef<number>(0);
  const hasDataRef = useRef(false);

  // Fetch data via HTTP
  const fetchPrice = useCallback(async () => {
    try {
      const response = await fetch(`${API_CONFIG.baseURL}/api/exchange/ticker?symbol=${encodeURIComponent(symbol)}`);
      const result = await response.json();

      if (result.success && result.data) {
        const data = result.data;
        // Map API response to TickerData
        const newTicker = {
          symbol: data.symbol,
          price: data.last,
          change24h: data.percentage, // Using percentage
          high24h: data.high,
          low24h: data.low,
          volume24h: data.volume,
          timestamp: data.timestamp || Date.now()
        };
        setTicker(newTicker);
        lastUpdateRef.current = Date.now();
        hasDataRef.current = true;
        setIsOffline(false);
        setError(null);
      } else {
        // Only set error if we don't have data yet or if it's a persistent failure
        if (!hasDataRef.current) setError(result.error || 'Failed to fetch price');
      }
    } catch (err) {
      console.error('Error fetching price:', err);
      setIsOffline(true);
      if (!hasDataRef.current) setError('Network error');
    } finally {
      setIsLoading(false);
    }
  }, [symbol]);

  // Handle WebSocket updates
  const handlePriceUpdate = useCallback((event: PriceUpdateEvent) => {
    if (event.symbol === symbol) {
      setTicker({
        symbol: event.symbol,
        price: event.price,
        change24h: event.change24h,
        high24h: event.high24h,
        low24h: event.low24h,
        volume24h: event.volume24h,
        timestamp: event.timestamp
      });
      lastUpdateRef.current = Date.now();
      hasDataRef.current = true;
      setIsOffline(false);
      setIsLoading(false);
    }
  }, [symbol]);

  // Connect to WebSocket
  useSocket(
    undefined,
    undefined,
    undefined,
    undefined,
    handlePriceUpdate
  );

  // Initial fetch and Polling fallback
  useEffect(() => {
    fetchPrice();

    const intervalId = setInterval(() => {
      // If no update in last 5 seconds, poll
      if (Date.now() - lastUpdateRef.current > 5000) {
        fetchPrice();
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [fetchPrice]);

  return { ticker, isLoading, error, isOffline, refetch: fetchPrice };
}
