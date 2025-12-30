import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NetworkIcon, ArrowUpRightIcon, ArrowDownRightIcon, MinusIcon } from '@/components/ui/icons';
import { MarketStructure } from '@/types/smc';
import { formatDistanceToNow } from 'date-fns';

interface StructureTimelineProps {
  structures: MarketStructure[];
}

export function StructureTimeline({ structures }: StructureTimelineProps) {
  // Sort by timestamp descending
  const sorted = [...structures].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);

  return (
    <Card className="flex-1 flex flex-col min-h-[160px]">
      <CardHeader className="py-3 px-4 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <NetworkIcon className="w-4 h-4 text-blue-500" />
            Market Structure
          </CardTitle>
          <Badge variant="outline" className="text-xxs">
            {structures.length > 0 ? structures[0].trend.toUpperCase() : 'NEUTRAL'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
        {sorted.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">
            No structure data available.
          </div>
        ) : (
          <div className="flex p-4 gap-3 min-w-max">
            {sorted.map((item, i) => (
              <div key={i} className="flex flex-col gap-2 p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors w-[140px] shrink-0 snap-start">
                <div className="flex items-center justify-between">
                  <div className={`p-1.5 rounded-full ${
                    item.trend === 'bullish' ? 'bg-emerald-500/10 text-emerald-500' :
                    item.trend === 'bearish' ? 'bg-red-500/10 text-red-500' :
                    'bg-gray-500/10 text-gray-500'
                  }`}>
                    {item.trend === 'bullish' ? <ArrowUpRightIcon className="w-3.5 h-3.5" /> :
                     item.trend === 'bearish' ? <ArrowDownRightIcon className="w-3.5 h-3.5" /> :
                     <MinusIcon className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-xxs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                  </span>
                </div>
                
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold truncate" title={item.trend === 'bullish' || item.trend === 'bearish' ? 'BOS (Break of Structure)' : 'Consolidation'}>
                    {item.trend === 'bullish' ? 'BOS' : 
                     item.trend === 'bearish' ? 'BOS' : 'Consolidation'}
                  </span>
                  <div className="flex flex-col text-xxs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>H:</span>
                      <span className="font-mono">{item.higherHighs > 0 ? item.higherHighs.toFixed(2) : '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>L:</span>
                      <span className="font-mono">{item.lowerLows > 0 ? item.lowerLows.toFixed(2) : '-'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
