import { useEffect } from 'react';
import { useDashboard, DashboardEvent } from '@/contexts/DashboardContext';
import { toast } from 'sonner';

type EventHandler = (_event: DashboardEvent) => void;

class BrowserEventEmitter {
  private listeners: Record<string, Function[]> = {};
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private maxListeners: number = 10;

  on(event: string, listener: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
    return this;
  }

  off(event: string, listener: Function) {
    if (!this.listeners[event]) return this;
    this.listeners[event] = this.listeners[event].filter(l => l !== listener);
    return this;
  }

  emit(event: string, ...args: any[]) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(listener => listener(...args));
    }
    return true;
  }

  setMaxListeners(n: number) {
    this.maxListeners = n;
    return this;
  }
}

const eventBus = new BrowserEventEmitter();
eventBus.setMaxListeners(20);

export function useCrossDashboardEvents(handler?: EventHandler) {
  const { lastEvent, dispatchDashboardEvent, setMode, setSymbol, setTimeframe } = useDashboard();

  // Sync Context events to EventBus
  useEffect(() => {
    if (lastEvent) {
      eventBus.emit(lastEvent.type, lastEvent);
      eventBus.emit('*', lastEvent);
    }
  }, [lastEvent]);

  useEffect(() => {
    if (lastEvent && handler) {
      handler(lastEvent);
    }

    // Default system-wide handlers
    if (lastEvent) {
      handleGlobalEvents(lastEvent);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastEvent, handler]);

  const subscribe = (type: DashboardEvent['type'], callback: EventHandler) => {
    eventBus.on(type, callback);
    return () => {
      eventBus.off(type, callback);
    };
  };

  const dispatch = (type: DashboardEvent['type'], payload: any) => {
    // We dispatch to Context, which then updates lastEvent, which then triggers the bus
    dispatchDashboardEvent({ type, payload, source: 'system' });
  };

  const handleGlobalEvents = (event: DashboardEvent) => {
    // Global notification for high priority events
    if (event.type === 'RISK_ALERT') {
      toast.error(`Risk Alert: ${event.payload.message}`, {
        duration: 5000,
        description: `Source: ${event.source}`
      });
    }

    if (event.type === 'TRADE_EXECUTED') {
      toast.success(`Trade Executed: ${event.payload.symbol} ${event.payload.side}`, {
        description: `Price: ${event.payload.price}`
      });
    }

    // Navigation handlers
    if (event.type === 'NAVIGATE_TO_TRADE') {
      if (event.payload.symbol) setSymbol(event.payload.symbol);
      if (event.payload.timeframe) setTimeframe(event.payload.timeframe);
      setMode('auto');
      toast.info(`Configuring trade for ${event.payload.symbol}`);
    }
  };

  return {
    dispatch,
    subscribe,
    lastEvent
  };
}
