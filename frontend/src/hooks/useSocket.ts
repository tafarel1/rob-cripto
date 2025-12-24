import { useEffect } from 'react'
import { Socket } from 'socket.io-client'
import { useSocket as useSocketContext } from '@/contexts/SocketContext'

export type EngineStatusEvent = { status: string; timestamp: number }
export type TradeExecutedEvent = { symbol: string; side: string; amount: number; price: number; timestamp: number }

export type BalanceEvent = { success: boolean; data?: { total?: Record<string, number>; free?: Record<string, number>; used?: Record<string, number> }; error?: string; timestamp?: number }
export type PositionsEvent = { success: boolean; data: unknown[]; timestamp?: number }
export type PriceUpdateEvent = { 
  symbol: string; 
  price: number; 
  change24h: number; 
  high24h: number; 
  low24h: number; 
  volume24h: number; 
  timestamp: number 
}

export type EngineStatusHandler = (_: EngineStatusEvent) => void;
export type TradeExecutedHandler = (_: TradeExecutedEvent) => void;
export type BalanceHandler = (_: BalanceEvent) => void;
export type PositionsHandler = (_: PositionsEvent) => void;
export type PriceUpdateHandler = (_: PriceUpdateEvent) => void;

export function useSocket(
  onEngineStatus?: EngineStatusHandler,
  onTradeExecuted?: TradeExecutedHandler,
  onBalance?: BalanceHandler,
  onPositions?: PositionsHandler,
  onPriceUpdate?: PriceUpdateHandler
) {
  const { socket } = useSocketContext();

  useEffect(() => {
    if (!socket) return;

    if (onEngineStatus) {
      socket.on('engine:status', onEngineStatus)
    }
    if (onTradeExecuted) {
      socket.on('trade:executed', onTradeExecuted)
    }
    if (onBalance) {
      socket.on('exchange:balance', onBalance)
    }
    if (onPositions) {
      socket.on('exchange:positions', onPositions)
    }
    if (onPriceUpdate) {
      socket.on('price:update', onPriceUpdate)
    }

    return () => {
      if (onEngineStatus) socket.off('engine:status', onEngineStatus)
      if (onTradeExecuted) socket.off('trade:executed', onTradeExecuted)
      if (onBalance) socket.off('exchange:balance', onBalance)
      if (onPositions) socket.off('exchange:positions', onPositions)
      if (onPriceUpdate) socket.off('price:update', onPriceUpdate)
    }
  }, [socket, onEngineStatus, onTradeExecuted, onBalance, onPositions, onPriceUpdate])

  return { socket }
}
