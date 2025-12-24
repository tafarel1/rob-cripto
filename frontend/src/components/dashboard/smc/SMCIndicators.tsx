import React, { useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TargetIcon, LoaderIcon, ArrowRightIcon, ZapIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { useSMCAnalysis } from '@/hooks/useSMCAnalysis';
import { useCrossDashboardEvents } from '@/hooks/useCrossDashboardEvents';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { LiquidityRadar } from './LiquidityRadar';
import { StructureTimeline } from './StructureTimeline';
import { WashTradingRadar } from './WashTradingRadar';
import SMCAdvancedIndicators from './SMCAdvancedIndicators';

interface SMCIndicatorsProps {
  symbol?: string;
}

export function SMCIndicators({ symbol = 'BTC/USDT' }: SMCIndicatorsProps) {
  const { data, isLoading, error } = useSMCAnalysis({ symbol, refreshInterval: 30000 });
  const { dispatch } = useCrossDashboardEvents();
  const prevSignalsLength = useRef(0);
  const prevWashActivityLength = useRef(0);

  // Alert System Logic (Orange/Blue Tiers)
  useEffect(() => {
    // 1. SMC Signals Alerts
    if (data?.signals && data.signals.length > prevSignalsLength.current) {
      const newSignals = data.signals.slice(0, data.signals.length - prevSignalsLength.current);
      
      newSignals.forEach(signal => {
        if (signal.confidence > 0.8) {
          toast.warning(`Sinal Estratégico Detectado: ${signal.type} ${symbol}`, {
            description: `${signal.reason} (Confiança: ${(signal.confidence * 100).toFixed(0)}%)`,
            duration: 5000,
          });
        } else {
          toast.info(`Novo Sinal SMC: ${signal.type}`, {
            description: signal.reason,
            duration: 3000,
          });
        }
      });
      
      prevSignalsLength.current = data.signals.length;
    }

    // 2. Wash Trading Alerts
    if (data?.washTrading && data.washTrading.length > prevWashActivityLength.current) {
      const newActivities = data.washTrading.slice(0, data.washTrading.length - prevWashActivityLength.current);
      
      newActivities.forEach(activity => {
        if (activity.severity === 'high') {
          toast.error(`ALERTA DE MANIPULAÇÃO: ${symbol}`, {
            description: activity.details,
            duration: 8000,
          });
        }
      });
      prevWashActivityLength.current = data.washTrading.length;
    }
  }, [data?.signals, data?.washTrading, symbol]);

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoaderIcon className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-destructive text-sm">
        Erro ao carregar análise SMC: {error}
      </div>
    );
  }

  const signals = data?.signals || [];
  // Calculate current price from last candle if not explicitly provided
  const currentPrice = data?.currentPrice || (data?.candles && data.candles.length > 0 ? data.candles[data.candles.length - 1].close : 0);

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* 0. Wash Trading Radar (Integrity Monitor) */}
      <WashTradingRadar activities={data?.washTrading} />

      {/* 1. Liquidity Radar */}
      <LiquidityRadar zones={data?.liquidityZones || []} currentPrice={currentPrice} />

      {/* 1.5 Advanced SMC Indicators */}
      <SMCAdvancedIndicators data={data || null} />

      {/* 2. Recent Signals */}
      <Card className="flex-1 min-h-52 flex flex-col">
        <CardHeader className="py-3 px-4 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <TargetIcon className="w-4 h-4 text-primary" />
              SMC Signals
            </CardTitle>
            <Badge variant="outline" className="text-xxs gap-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success-500"></span>
              </span>
              Real-time
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1">
          <div 
            className="h-full overflow-y-auto"
            style={{ maxHeight: '60vh', scrollbarWidth: 'thin' }}
          >
            {signals.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                Nenhum sinal detectado no momento.
              </div>
            ) : (
              <div className="flex flex-col">
                {signals.map((signal, i) => (
                  <div 
                    key={i} 
                    className="flex items-center justify-between p-3 border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer group min-h-20"
                    style={{ breakInside: 'avoid' }}
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-xs font-bold px-1.5 py-0.5 rounded",
                          signal.type === 'BUY' && "bg-success-500/10 text-success-500",
                          signal.type === 'SELL' && "bg-danger-500/10 text-danger-500",
                        )}>
                          {signal.type}
                        </span>
                        <span className="text-xxs text-muted-foreground bg-secondary px-1 rounded">1h</span>
                      </div>
                      <span className="text-xxs text-muted-foreground">
                        {formatDistanceToNow(signal.timestamp, { addSuffix: true })}
                      </span>
                      
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-5 px-2 text-xxs gap-1 opacity-0 group-hover:opacity-100 transition-opacity -ml-2 w-fit justify-start text-primary hover:text-primary hover:bg-primary/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch('NAVIGATE_TO_TRADE', {
                            symbol: symbol,
                            type: signal.type === 'BUY' ? 'BULLISH' : 'BEARISH',
                            timeframe: '1h',
                            price: signal.entry,
                            score: signal.confidence * 100,
                            params: {
                              minLiquidityStrength: signal.confidence * 100,
                              minOrderBlockStrength: 80,
                              minFvgSize: 0.2
                            }
                          });
                          toast.success('Redirecionando para Trading', {
                            description: 'Configurando robô com parâmetros do sinal'
                          });
                        }}
                      >
                        <ZapIcon className="w-3 h-3" />
                        Auto Trade
                      </Button>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-medium">{signal.entry.toLocaleString()}</span>
                        <ArrowRightIcon className="w-3 h-3 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                      </div>
                      <span className={cn(
                        "text-xxs font-medium",
                        signal.confidence > 0.8 ? "text-warning-500" : "text-primary-500"
                      )}>
                        Conf: {(signal.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 3. Market Structure Timeline */}
      <StructureTimeline structures={data?.marketStructures || []} />
    </div>
  );
}
