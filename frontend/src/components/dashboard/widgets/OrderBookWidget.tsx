import React from 'react';

const OrderBookWidget = () => (
  <div className="h-full flex flex-col gap-2 p-2">
    <div className="text-xs text-center text-muted-foreground mb-2">Simulação (Feed indisponível)</div>
    {[...Array(8)].map((_, i) => (
      <div key={i} className="flex justify-between text-xs">
        <span className="text-red-500">{(45000 + i * 10).toFixed(2)}</span>
        <span className="text-muted-foreground">{(Math.random() * 2).toFixed(4)}</span>
        <span className="text-blue-500">{(44000 - i * 10).toFixed(2)}</span>
      </div>
    ))}
  </div>
);

export default OrderBookWidget;