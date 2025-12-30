import React from 'react';
import { BarChart3Icon } from '@/components/ui/icons';

const ChartWidget = () => (
  <div className="h-full flex flex-col items-center justify-center bg-muted/20 rounded-md p-4 animate-pulse">
    <BarChart3Icon className="w-16 h-16 text-muted-foreground/50 mb-4" />
    <p className="text-sm text-muted-foreground">Gráfico Avançado (TradingView)</p>
    <p className="text-xs text-muted-foreground mt-2">Aguardando feed de dados...</p>
  </div>
);

export default ChartWidget;
