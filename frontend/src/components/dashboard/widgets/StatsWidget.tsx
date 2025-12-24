import React from 'react';
import { Badge } from '@/components/ui/badge';
import { BalanceEvent, EngineStatusEvent } from '@/hooks/useSocket';

interface StatsWidgetProps {
  balance: BalanceEvent['data'] | null;
  engineStatus: EngineStatusEvent | null;
}

const StatsWidget = ({ balance, engineStatus }: StatsWidgetProps) => (
  <div className="grid grid-cols-2 gap-4 h-full place-content-center">
    <div className="text-center">
      <p className="text-xs text-muted-foreground">Saldo Total</p>
      <p className="text-xl font-bold text-primary">
        {balance?.total?.USDT ? `$${balance.total.USDT.toFixed(2)}` : '---'}
      </p>
    </div>
    <div className="text-center">
      <p className="text-xs text-muted-foreground">Status Motor</p>
      <div className="flex justify-center mt-1">
        <Badge variant={engineStatus?.status === 'RUNNING' ? 'default' : 'destructive'}>
          {engineStatus?.status || 'Desconectado'}
        </Badge>
      </div>
    </div>
  </div>
);

export default StatsWidget;