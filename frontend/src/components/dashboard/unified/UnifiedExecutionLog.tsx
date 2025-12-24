import React, { useEffect, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDashboard, DashboardEvent } from '@/contexts/DashboardContext';
import { format } from 'date-fns';
import { TerminalIcon, AlertTriangleIcon, ActivityIcon, CheckCircleIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { UnifiedCardHeader, UnifiedCardTitle, UnifiedCardContent } from '@/components/ui/unified-card';

interface LogEntry {
  id: string;
  timestamp: number;
  type: 'TRADE' | 'SIGNAL' | 'SYSTEM' | 'ERROR';
  message: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details?: any;
  side?: 'BUY' | 'SELL';
}

export function UnifiedExecutionLog({ className }: { className?: string }) {
  const { lastEvent } = useDashboard();
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Simulate initial logs
  useEffect(() => {
    setLogs([
      {
        id: '1',
        timestamp: Date.now() - 1000 * 60 * 5,
        type: 'SYSTEM',
        message: 'Trading Engine Initialized',
        details: { version: '2.0.0' }
      },
      {
        id: '2',
        timestamp: Date.now() - 1000 * 60 * 2,
        type: 'SIGNAL',
        message: 'SMC Bullish Signal Detected (BTC/USDT)',
        details: { confidence: 0.85 }
      }
    ]);
  }, []);

  useEffect(() => {
    if (lastEvent) {
      const newLog: LogEntry = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: lastEvent.timestamp,
        type: mapEventType(lastEvent.type),
        message: formatEventMessage(lastEvent),
        details: lastEvent.payload,
        side: 'side' in lastEvent.payload ? (lastEvent.payload as any).side : undefined
      };
      
      setLogs(prev => [newLog, ...prev].slice(0, 50)); // Keep last 50
    }
  }, [lastEvent]);

  const mapEventType = (type: DashboardEvent['type']): LogEntry['type'] => {
    switch (type) {
      case 'TRADE_EXECUTED': return 'TRADE';
      case 'SIGNAL_DETECTED': return 'SIGNAL';
      case 'RISK_ALERT': return 'ERROR'; // or SYSTEM
      default: return 'SYSTEM';
    }
  };

  const formatEventMessage = (event: DashboardEvent): string => {
    switch (event.type) {
      case 'TRADE_EXECUTED':
        return `Order Executed: ${event.payload.symbol} ${event.payload.side} @ ${event.payload.price}`;
      case 'SIGNAL_DETECTED':
        return `Signal: ${event.payload.type} on ${event.payload.symbol}`;
      case 'RISK_ALERT':
        return `Risk Alert: ${event.payload.message}`;
      case 'NAVIGATE_TO_TRADE':
        return `Navigation: Switch to Trading Mode for ${event.payload.symbol}`;
      default:
        return event.type;
    }
  };

  const getIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'TRADE': return <CheckCircleIcon className="w-3 h-3 text-success-500" />;
      case 'SIGNAL': return <ActivityIcon className="w-3 h-3 text-primary" />;
      case 'ERROR': return <AlertTriangleIcon className="w-3 h-3 text-destructive" />;
      default: return <TerminalIcon className="w-3 h-3 text-muted-foreground" />;
    }
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <UnifiedCardHeader>
        <UnifiedCardTitle className="flex items-center gap-2">
          <TerminalIcon className="w-3.5 h-3.5 text-muted-foreground" />
          System Log
        </UnifiedCardTitle>
      </UnifiedCardHeader>
      
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="flex flex-col p-2 gap-1 font-mono">
            {logs.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-4">
                No logs available
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 text-[10px] sm:text-xs p-1.5 hover:bg-muted/50 rounded transition-colors group border-l-2 border-transparent hover:border-primary/20">
                  <span className="text-muted-foreground shrink-0 w-16 opacity-70">
                    {format(log.timestamp, 'HH:mm:ss')}
                  </span>
                  <div className="shrink-0 mt-0.5">
                    {getIcon(log.type)}
                  </div>
                  <span className={cn(
                    "break-all",
                    log.type === 'ERROR' ? "text-destructive" : "text-foreground"
                  )}>
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
