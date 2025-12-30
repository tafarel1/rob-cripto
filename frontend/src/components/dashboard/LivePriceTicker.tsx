import React from 'react';
import { ArrowUpIcon, ArrowDownIcon, RefreshIcon, InfoIcon } from '@/components/ui/icons';
import { useLivePrice } from '@/hooks/useLivePrice';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LivePriceTickerProps {
  symbol?: string;
}

export function LivePriceTicker({ symbol = 'BTC/USDT' }: LivePriceTickerProps) {
  const { ticker, isLoading, error, isOffline, refetch } = useLivePrice(symbol);
  const prevPriceRef = React.useRef<number | null>(null);
  const [flash, setFlash] = React.useState<'up' | 'down' | null>(null);

  React.useEffect(() => {
    if (ticker?.price) {
      if (prevPriceRef.current !== null && prevPriceRef.current !== ticker.price) {
        setFlash(ticker.price > prevPriceRef.current ? 'up' : 'down');
      }
      prevPriceRef.current = ticker.price;
      const timer = setTimeout(() => setFlash(null), 1000);
      return () => clearTimeout(timer);
    }
  }, [ticker?.price]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="space-y-2 w-full">
          <Skeleton className="h-8 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-1/2 mx-auto" />
        </div>
      </div>
    );
  }

  if (error || !ticker) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <InfoIcon className="h-8 w-8 text-destructive mb-2" />
        <p className="text-sm font-medium text-destructive mb-2">
          {error || 'Dados indisponíveis'}
        </p>
        <Button variant="outline" size="sm" onClick={refetch} className="gap-2">
          <RefreshIcon className="h-3 w-3" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  const isPositive = ticker.change24h >= 0;
  const priceFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(ticker.price);

  const changeFormatted = `${isPositive ? '+' : ''}${ticker.change24h.toFixed(2)}%`;

  return (
    <div className="h-full flex flex-col justify-center p-4 relative overflow-hidden group hover:bg-accent/5 transition-colors duration-300">
      {/* Background decoration */}
      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-5 transition-colors duration-500 ${isPositive ? 'bg-green-500' : 'bg-red-500'}`} />
      
      {/* Flash Effect Overlay */}
      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0.2 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className={cn(
              "absolute inset-0 pointer-events-none z-0",
              flash === 'up' ? "bg-green-500/20" : "bg-red-500/20"
            )}
          />
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-2 z-10">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold group-hover:text-primary transition-colors">{ticker.symbol}</span>
          {isOffline && (
            <span className="text-xxs bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 rounded border border-yellow-500/20">
              Offline
            </span>
          )}
        </div>
        <div className={cn(
          "flex items-center gap-1 text-sm font-medium transition-colors duration-300",
          isPositive ? 'text-green-500' : 'text-red-500'
        )}>
          {isPositive ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />}
          {changeFormatted}
        </div>
      </div>

      <div className="relative z-10 mb-4">
        <motion.div
          key={ticker.price}
          initial={{ opacity: 0.5, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "text-3xl font-bold tracking-tight transition-colors duration-300",
            flash === 'up' && "text-green-500",
            flash === 'down' && "text-red-500"
          )}
        >
          {priceFormatted}
        </motion.div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground mt-auto z-10">
        <div className="space-y-1">
          <p>Máx 24h</p>
          <p className="font-medium text-foreground">
            ${ticker.high24h.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="space-y-1 text-right">
          <p>Min 24h</p>
          <p className="font-medium text-foreground">
            ${ticker.low24h.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="space-y-1 col-span-2 border-t pt-2 mt-2">
          <div className="flex justify-between">
            <span>Vol 24h</span>
            <span className="font-medium text-foreground">
              ${(ticker.volume24h / 1000000).toFixed(2)}M
            </span>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-2 right-2 text-xxs text-muted-foreground/50 z-10">
        Atualizado: {new Date(ticker.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}
