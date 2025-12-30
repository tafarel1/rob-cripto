import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { WifiIcon, WifiOffIcon, ShieldAlertIcon, WalletIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface SMCTopBarProps {
  equity: number;
  pnl: number;
  drawdown: number;
  isConnected: boolean;
  isRealMode: boolean;
  symbol: string;
  onPanic: () => void;
  onToggleMode: (_mode: boolean) => void;
  onSymbolChange: (_symbol: string) => void;
}

export function SMCTopBar({ 
  equity, 
  pnl, 
  drawdown, 
  isConnected, 
  isRealMode,
  symbol,
  onPanic,
  onToggleMode,
  onSymbolChange
}: SMCTopBarProps) {
  return (
    <div className="w-full bg-card border-b p-4 flex flex-col md:flex-row items-center justify-between gap-4">
      {/* Left: Equity & Status */}
      <div 
        className="grid gap-6 w-full md:w-auto" 
        style={{ 
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          containerType: 'inline-size'
        }}
      >
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Equity</span>
          <div className="flex items-center gap-2">
            <WalletIcon className="w-4 h-4 text-primary" />
            <span 
              className="text-xl font-bold tracking-tight whitespace-nowrap"
              style={{ fontFeatureSettings: '"tnum"', wordBreak: 'keep-all' }}
            >
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(equity)}
            </span>
            <Badge variant={pnl >= 0 ? "default" : "destructive"} className="ml-2">
              {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}%
            </Badge>
          </div>
        </div>

        <div className="flex flex-col border-l pl-6 md:border-none md:pl-0">
           <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Drawdown</span>
           <span 
             className={cn(
               "text-sm font-bold",
               drawdown > 5 ? "text-destructive" : "text-muted-foreground"
             )}
             style={{ fontFeatureSettings: '"tnum"' }}
           >
             {drawdown.toFixed(2)}%
           </span>
        </div>
      </div>

      {/* Center Left: Symbol Selector */}
      <div className="flex items-center gap-2">
        <Select value={symbol} onValueChange={onSymbolChange}>
          <SelectTrigger className="w-36 font-bold">
            <SelectValue placeholder="Select Pair" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="BTC/USDT">BTC/USDT</SelectItem>
            <SelectItem value="ETH/USDT">ETH/USDT</SelectItem>
            <SelectItem value="SOL/USDT">SOL/USDT</SelectItem>
            <SelectItem value="BNB/USDT">BNB/USDT</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Center Right: Mode Toggle */}
      <div className="flex items-center gap-3 bg-muted/30 p-1.5 rounded-lg border border-border/50">
        <span className={cn("text-xs font-bold px-2", !isRealMode ? "text-primary" : "text-muted-foreground")}>VIRTUAL</span>
        <Switch 
          checked={isRealMode}
          onCheckedChange={onToggleMode}
          className="data-[state=checked]:bg-destructive"
        />
        <span className={cn("text-xs font-bold px-2", isRealMode ? "text-destructive" : "text-muted-foreground")}>REAL</span>
      </div>

      {/* Right: Actions & Panic */}
      <div className="flex items-center gap-4 w-full md:w-auto justify-end">
        <div className="flex items-center gap-2">
          {isConnected ? (
            <div className="flex items-center gap-1.5 text-xs text-success-500 font-medium bg-success-500/10 px-2 py-1 rounded">
              <WifiIcon className="w-3 h-3" />
              CONNECTED
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-destructive font-medium bg-destructive/10 px-2 py-1 rounded">
              <WifiOffIcon className="w-3 h-3" />
              DISCONNECTED
            </div>
          )}
        </div>

        <Button 
          variant="destructive" 
          size="sm" 
          onClick={onPanic}
          className="gap-2 font-bold shadow-lg shadow-destructive/20 hover:shadow-destructive/40 transition-all"
        >
          <ShieldAlertIcon className="w-4 h-4" />
          PANIC CLOSE
        </Button>
      </div>
    </div>
  );
}
