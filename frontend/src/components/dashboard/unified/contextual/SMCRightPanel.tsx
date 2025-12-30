import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { RadarIcon, HistoryIcon, BarChartIcon, PlayCircleIcon } from '@/components/ui/icons';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDashboard } from '@/contexts/DashboardContext';
import { BacktestModal } from '@/components/dashboard/smc/BacktestModal';
import { useState } from 'react';

export function SMCRightPanel() {
  const { activeSymbol, dispatchDashboardEvent } = useDashboard();
  const [showBacktest, setShowBacktest] = useState(false);

  const handleQuickBacktest = () => {
    setShowBacktest(true);
    dispatchDashboardEvent({
      type: 'SYSTEM_STATUS',
      payload: { status: `Opened quick backtest for ${activeSymbol}` },
      source: 'smc'
    });
  };

  const handleTradeSignal = (type: string) => {
    dispatchDashboardEvent({
      type: 'NAVIGATE_TO_TRADE',
      payload: { 
        symbol: activeSymbol, 
        timeframe: '15m',
        type: type === 'Bullish OB' || type === 'FVG Retest' ? 'BULLISH' : 'BEARISH',
        price: 0, // In real app, get current price
        score: 85,
        params: {
          minLiquidityStrength: 75,
          minOrderBlockStrength: 80,
          minFvgSize: 0.2
        }
      },
      source: 'smc'
    });
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Detection Settings */}
      <Card>
        <CardHeader className="p-3 pb-1">
          <CardTitle className="text-xs font-medium flex items-center gap-2">
            <RadarIcon className="w-3 h-3" /> Detection Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Order Blocks</span>
            <Switch defaultChecked className="scale-75 origin-right" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">FVG (Gaps)</span>
            <Switch defaultChecked className="scale-75 origin-right" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Liquidity Sweeps</span>
            <Switch className="scale-75 origin-right" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Break of Structure</span>
            <Switch defaultChecked className="scale-75 origin-right" />
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full h-7 text-xs mt-2"
            onClick={() => dispatchDashboardEvent({
              type: 'NAVIGATE_TO_TRADE', // Use NAVIGATE_TO_TRADE to switch to config tab, but with a flag to apply settings
              payload: { 
                action: 'APPLY_SETTINGS',
                symbol: activeSymbol,
                params: {
                  minLiquidityStrength: 75, // Simulated new values
                  minOrderBlockStrength: 85,
                  minFvgSize: 0.25
                }
              },
              source: 'smc'
            })}
          >
            Apply to Auto Strategies
          </Button>
        </CardContent>
      </Card>

      {/* Asset Details */}
      <Card>
        <CardHeader className="p-3 pb-1">
          <CardTitle className="text-xs font-medium flex items-center gap-2">
            <BarChartIcon className="w-3 h-3" /> {activeSymbol} Details
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">24h Vol</span>
            <span className="font-mono">$1.2B</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Orderbook Imbalance</span>
            <span className="text-emerald-500 font-medium">+12% (Buys)</span>
          </div>
          <Button 
            variant="secondary" 
            size="sm" 
            className="w-full h-7 text-xs mt-2"
            onClick={handleQuickBacktest}
          >
            <PlayCircleIcon className="mr-1.5 h-3 w-3" /> Quick Backtest
          </Button>
        </CardContent>
      </Card>

      {/* Signal History */}
      <div className="flex-1 min-h-0 flex flex-col">
        <h3 className="text-xs font-semibold mb-2 flex items-center gap-2 px-1">
          <HistoryIcon className="w-3 h-3" /> Signal History
        </h3>
        <ScrollArea className="flex-1 pr-2">
          <div className="space-y-2">
            {[
              { type: 'Bullish OB', time: '14:30', conf: 'High', action: 'BULLISH' },
              { type: 'FVG Retest', time: '13:15', conf: 'Med', action: 'BULLISH' },
              { type: 'Bearish BOS', time: '11:45', conf: 'High', action: 'BEARISH' },
            ].map((signal, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/40 hover:bg-muted/60 transition-colors group">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      signal.action === 'BULLISH' ? 'bg-emerald-500' : 'bg-rose-500'
                    }`} />
                    <span className="text-xs font-medium">{signal.type}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xxs text-muted-foreground">
                    <span>{signal.time}</span>
                    <span>•</span>
                    <span>{signal.conf} Conf</span>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleTradeSignal(signal.type)}
                  title="Auto Trade this Signal"
                >
                  <PlayCircleIcon className="h-3.5 w-3.5 text-primary" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
      {/* Backtest Modal */}
      <BacktestModal 
        isOpen={showBacktest} 
        onClose={() => setShowBacktest(false)} 
      />
    </div>
  );
}
