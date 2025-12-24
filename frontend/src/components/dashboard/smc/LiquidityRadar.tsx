import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadarIcon, ArrowUpIcon, ArrowDownIcon } from '@/components/ui/icons';
import { LiquidityZone } from '@/types/smc';

interface LiquidityRadarProps {
  zones: LiquidityZone[];
  currentPrice: number;
}

export function LiquidityRadar({ zones, currentPrice }: LiquidityRadarProps) {
  // Sort zones by price
  const sortedZones = [...zones].sort((a, b) => b.price - a.price);
  
  // Separate into Sell-side (Above price) and Buy-side (Below price)
  const sellSide = sortedZones.filter(z => z.type === 'sell_side' && z.price > currentPrice).slice(-3); // Closest 3 above
  const buySide = sortedZones.filter(z => z.type === 'buy_side' && z.price < currentPrice).slice(0, 3); // Closest 3 below

  return (
    <Card className="flex-1 flex flex-col min-h-0">
      <CardHeader className="py-3 px-4 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <RadarIcon className="w-4 h-4 text-purple-500" />
            Liquidity Radar
          </CardTitle>
          <Badge variant="outline" className="text-xxs">
            {zones.length} Pools
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-1 flex flex-col gap-4 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        {/* Sell Side Liquidity (Resistance) */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1 text-xs text-red-400 font-medium">
            <ArrowDownIcon className="w-3 h-3" /> Sell-Side Liquidity (SSL)
          </div>
          {sellSide.length === 0 ? (
             <div className="text-xxs text-muted-foreground text-center py-2">No active pools above</div>
          ) : (
            sellSide.map((zone, i) => (
              <div key={i} className="flex flex-col gap-1">
                <div className="flex justify-between text-xxs">
                  <span className="font-mono">${zone.price.toLocaleString()}</span>
                  <span className="text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis max-w-[80px] text-right" title={`Vol: ${zone.volume}`}>Vol: {zone.volume}</span>
                </div>
                <Progress value={zone.strength * 100} className="h-1.5 bg-red-950/50" indicatorClassName="bg-red-500" />
              </div>
            ))
          )}
        </div>

        {/* Current Price Indicator */}
        <div className="flex items-center justify-center py-1 sticky top-0 bg-background/80 backdrop-blur-sm z-10">
          <div className="bg-accent/50 px-3 py-1 rounded-full text-xs font-mono border border-border/50">
            ${currentPrice.toLocaleString()}
          </div>
        </div>

        {/* Buy Side Liquidity (Support) */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
            <ArrowUpIcon className="w-3 h-3" /> Buy-Side Liquidity (BSL)
          </div>
          {buySide.length === 0 ? (
             <div className="text-xxs text-muted-foreground text-center py-2">No active pools below</div>
          ) : (
            buySide.map((zone, i) => (
              <div key={i} className="flex flex-col gap-1">
                <div className="flex justify-between text-xxs">
                  <span className="font-mono">${zone.price.toLocaleString()}</span>
                  <span className="text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis max-w-[80px] text-right" title={`Vol: ${zone.volume}`}>Vol: {zone.volume}</span>
                </div>
                <Progress value={zone.strength * 100} className="h-1.5 bg-emerald-950/50" indicatorClassName="bg-emerald-500" />
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
