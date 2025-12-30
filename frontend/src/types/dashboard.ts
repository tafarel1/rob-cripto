import React from 'react';

export interface Position {
  id: string;
  symbol: string;
  type: 'LONG' | 'SHORT';
  entryPrice: number;
  quantity: number;
  stopLoss: number;
  takeProfit: number[];
  status: 'OPEN' | 'CLOSED';
  openTime: number;
  unrealizedPnl?: number;
  currentPrice?: number;
}

export interface DashboardItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  colSpan: string;
}
