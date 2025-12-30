import React from 'react';
import { Asset } from '@/types/assets';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { StarIcon, TrendingUpIcon, TrendingDownIcon, BarChartIcon, SwapIcon, ZapIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

export interface AssetCardProps {
  asset: Asset;
  viewMode: 'card' | 'list' | 'compact';
  onToggleFavorite: (_id: string) => void;
  onToggleAutoTrade?: (_id: string, _enabled: boolean) => void;
  isSelected: boolean;
  onSelect: (_id: string, _multi: boolean) => void;
}

export function AssetCard({ asset, viewMode, onToggleFavorite, onToggleAutoTrade, isSelected, onSelect }: AssetCardProps) {
  const isPositive = asset.change24h >= 0;
  const colorClass = isPositive ? 'text-success-500' : 'text-danger-500';

  const handleClick = (e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      onSelect(asset.id, true);
    } else {
      // Normal click behavior - select only this asset (or details)
      onSelect(asset.id, false);
    }
  };

  // Simple Sparkline SVG
  const Sparkline = () => {
    const min = Math.min(...asset.chartData);
    const max = Math.max(...asset.chartData);
    const range = max - min || 1;
    const points = asset.chartData.map((val, i) => {
      const x = (i / (asset.chartData.length - 1)) * 60;
      const y = 20 - ((val - min) / range) * 20;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width="60" height="20" className="overflow-visible opacity-50">
        <polyline
          points={points}
          fill="none"
          stroke={isPositive ? 'hsl(var(--success-500))' : 'hsl(var(--danger-500))'}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  if (viewMode === 'compact') {
    return (
      <div 
        className={cn(
          "flex items-center justify-between p-2 border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer group",
          isSelected && "bg-accent hover:bg-accent/80"
        )}
        onClick={handleClick}
      >
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-yellow-400"
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(asset.id); }}
          >
            <StarIcon className={cn("w-4 h-4", asset.isFavorite && "fill-yellow-400 text-yellow-400")} />
          </Button>
          <span className="font-medium text-sm w-20">{asset.symbol}</span>
          <Badge variant="outline" className="text-xxs h-5">{asset.category}</Badge>
          {onToggleAutoTrade && (
            <div className="flex items-center gap-2 ml-2" onClick={(e) => e.stopPropagation()}>
              <Switch 
                checked={asset.isAutoTrading} 
                onCheckedChange={(checked) => onToggleAutoTrade(asset.id, checked)}
                className="scale-75"
              />
              {asset.isAutoTrading && <ZapIcon className="w-3 h-3 text-yellow-500 animate-pulse" />}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <span className="font-mono text-sm">${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span className={cn("font-mono text-sm w-16 text-right", colorClass)}>
            {isPositive ? '+' : ''}{asset.change24h.toFixed(2)}%
          </span>
          <div className="w-28 hidden sm:block text-right text-xs text-muted-foreground">
            Vol: ${(asset.volume / 1000000).toFixed(1)}M
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <Card 
        className={cn(
          "hover:shadow-md transition-all duration-200 border-l-4 cursor-pointer", 
          isSelected && "ring-2 ring-primary bg-accent/10"
        )}
        style={{ borderLeftColor: isPositive ? 'hsl(var(--success-500))' : 'hsl(var(--danger-500))' }}
        onClick={handleClick}
      >
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
             <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-yellow-400"
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(asset.id); }}
              >
                <StarIcon className={cn("w-5 h-5", asset.isFavorite && "fill-yellow-400 text-yellow-400")} />
              </Button>
              
              <div className="flex flex-col min-w-28">
                <div className="flex items-center gap-2">
                  <span className="font-bold">{asset.symbol}</span>
                  <Badge variant="secondary" className="text-xxs">{asset.category}</Badge>
                </div>
                <span className="text-xs text-muted-foreground">{asset.name}</span>
              </div>

              <div className="flex flex-col items-end min-w-28">
                <span className="font-mono font-medium">${asset.price.toLocaleString()}</span>
                <span className={cn("text-xs flex items-center gap-1", colorClass)}>
                   {isPositive ? <TrendingUpIcon className="w-3 h-3" /> : <TrendingDownIcon className="w-3 h-3" />}
                   {Math.abs(asset.change24h).toFixed(2)}%
                </span>
              </div>

              <div className="hidden md:flex flex-col items-end min-w-32 text-sm">
                <span className="text-muted-foreground text-xs">Volume (24h)</span>
                <span className="font-mono">${(asset.volume / 1000000).toLocaleString()}M</span>
              </div>

              <div className="hidden lg:block w-32">
                 <Sparkline />
              </div>
          </div>

          <div className="flex items-center gap-2 ml-4 border-l pl-4">
             <Button size="sm" variant="outline" className="h-8 w-8 p-0" title="View Chart">
                <BarChartIcon className="w-4 h-4" />
             </Button>
             <Button size="sm" className="h-8 w-8 p-0" title="Trade">
                <SwapIcon className="w-4 h-4" />
             </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default: Card Mode
  return (
    <Card 
      className={cn(
        "group hover:-translate-y-1 hover:shadow-lg transition-all duration-200 relative overflow-hidden cursor-pointer",
        isSelected && "ring-2 ring-primary bg-accent/10 translate-y-[-4px] shadow-lg"
      )}
      onClick={handleClick}
    >
      <div className={cn("absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity z-10")}>
         <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 bg-background/80 backdrop-blur-sm shadow-sm hover:text-yellow-400 rounded-full"
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(asset.id); }}
          >
            <StarIcon className={cn("w-4 h-4", asset.isFavorite && "fill-yellow-400 text-yellow-400")} />
          </Button>
      </div>

      <CardContent className="p-4 pt-5">
        <div className="flex justify-between items-start mb-3">
           <div className="flex flex-col">
             <div className="flex items-center gap-2">
               <span className="font-bold text-lg">{asset.symbol}</span>
               {asset.isFavorite && <StarIcon className="w-3 h-3 fill-yellow-400 text-yellow-400 block sm:hidden" />}
             </div>
             <Badge variant="outline" className="w-fit text-xxs mt-1">{asset.category}</Badge>
           </div>
           <div className="text-right">
             <div className="font-mono font-bold">${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
             <div className={cn("text-xs font-medium flex items-center justify-end gap-1", colorClass)}>
                {isPositive ? <TrendingUpIcon className="w-3 h-3" /> : <TrendingDownIcon className="w-3 h-3" />}
                {Math.abs(asset.change24h).toFixed(2)}%
             </div>
           </div>
        </div>

        <div className="flex items-center justify-between mb-4">
           <div className="text-xs text-muted-foreground">
             <div>Vol: ${(asset.volume / 1000000000).toFixed(2)}B</div>
             <div>Cap: ${(asset.marketCap / 1000000000).toFixed(2)}B</div>
           </div>
           <Sparkline />
        </div>

        <div className="grid grid-cols-2 gap-2 mt-auto">
          <Button variant="outline" size="sm" className="w-full h-8 text-xs">
            <BarChartIcon className="w-3 h-3 mr-1" /> Chart
          </Button>
          <Button size="sm" className="w-full h-8 text-xs bg-primary hover:bg-primary/90">
            <SwapIcon className="w-3 h-3 mr-1" /> Trade
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
