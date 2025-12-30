import React from 'react';
import { Position } from '@/types/dashboard';

interface PositionsWidgetProps {
  positions: Position[];
}

const PositionsWidget = ({ positions }: PositionsWidgetProps) => (
  <div className="h-full overflow-auto">
    {positions.length === 0 ? (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        Nenhuma posição aberta
      </div>
    ) : (
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
          <tr>
            <th className="px-2 py-1">Par</th>
            <th className="px-2 py-1">Lado</th>
            <th className="px-2 py-1">PNL</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((pos) => (
            <tr key={pos.id} className="border-b border-border/50">
              <td className="px-2 py-1 font-medium">{pos.symbol}</td>
              <td className={`px-2 py-1 ${pos.type === 'LONG' ? 'text-green-500' : 'text-red-500'}`}>
                {pos.type}
              </td>
              <td className={`px-2 py-1 ${pos.unrealizedPnl && pos.unrealizedPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {pos.unrealizedPnl ? `$${pos.unrealizedPnl.toFixed(2)}` : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);

export default PositionsWidget;