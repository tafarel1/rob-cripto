import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { CpuIcon, ShieldAlertIcon, ZapIcon, RadioIcon, AlertOctagonIcon } from '@/components/ui/icons';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useDashboard } from '@/contexts/DashboardContext';
import { useCrossDashboardEvents } from '@/hooks/useCrossDashboardEvents';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useWidgetSettings } from '@/hooks/useWidgetSettings';

import { SignalPayload, RiskAlertPayload } from '@/types/events';

interface LocalSignal extends SignalPayload {
  // Add any UI specific properties if needed
  timestamp: number;
}

export function TradingRightPanel() {
  const { robotStatus, setRobotStatus, activeStrategyName, dispatchDashboardEvent } = useDashboard();
  const { subscribe, dispatch } = useCrossDashboardEvents();
  const [recentSignals, setRecentSignals] = useState<SignalPayload[]>([]);
  const [showEmergencyDialog, setShowEmergencyDialog] = useState(false);
  const [riskSettings, setRiskSettings] = useWidgetSettings('trading_panel_risk', { maxRiskPerTrade: 1.5, maxDailyLoss: 5.0 });
  const [systemStats, setSystemStats] = useState({ cpu: 24, memory: 45, latency: 124 });

  useEffect(() => {
    // Simulate live system stats
    if (robotStatus === 'running') {
      const interval = setInterval(() => {
        setSystemStats(prev => ({
          cpu: Math.min(100, Math.max(10, prev.cpu + (Math.random() * 10 - 5))),
          memory: Math.min(100, Math.max(20, prev.memory + (Math.random() * 5 - 2))),
          latency: Math.max(50, prev.latency + (Math.random() * 20 - 10))
        }));
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [robotStatus]);

  const handleTradeSignal = useCallback((signal: SignalPayload) => {
    dispatch('NAVIGATE_TO_TRADE', {
      symbol: signal.symbol,
      type: signal.type,
      timeframe: signal.timeframe || '1h',
      price: 0, // SignalPayload might not have price
      score: (signal.confidence || 0.8) * 100,
      params: {
        minLiquidityStrength: (signal.confidence || 0.8) * 100,
        minOrderBlockStrength: 80,
        minFvgSize: 0.2
      }
    });
    toast.success('Configuring strategy...');
  }, [dispatch]);

  useEffect(() => {
    // Subscribe to new signals
    const unsubscribe = subscribe('SIGNAL_DETECTED', (event) => {
      const payload = event.payload as SignalPayload;
      setRecentSignals(prev => [payload, ...prev].slice(0, 5));
      toast.info(`New Signal: ${payload.symbol}`, {
        action: {
          label: 'Trade',
          onClick: () => handleTradeSignal(payload)
        }
      });
    });
    return unsubscribe;
  }, [subscribe, handleTradeSignal]);

  const handleRiskChange = (key: 'maxRiskPerTrade' | 'maxDailyLoss', value: number[]) => {
    setRiskSettings({ [key]: value[0] });
  };

  const commitRiskSettings = () => {
    dispatchDashboardEvent({
      type: 'RISK_ALERT',
      payload: { 
        severity: 'medium',
        message: 'Risk settings updated manually',
        code: 'RISK_UPDATE',
        timestamp: Date.now()
      },
      source: 'auto'
    });
    toast.success('Risk settings updated');
  };

  const handleEmergencyStop = () => {
    setRobotStatus('stopping');
    dispatchDashboardEvent({
      type: 'SYSTEM_STATUS',
      payload: { status: 'EMERGENCY STOP TRIGGERED' },
      source: 'system'
    });
    toast.error('EMERGENCY STOP INITIATED', {
      description: 'Halting all trading activities and cancelling orders.'
    });
    setShowEmergencyDialog(false);
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Bot Status */}
      <Card>
        <CardHeader className="p-3 pb-1">
          <CardTitle className="text-xs font-medium flex items-center gap-2">
            <CpuIcon className="w-3 h-3" /> System Status
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Status</span>
            <Badge variant={robotStatus === 'running' ? 'default' : 'secondary'} className={robotStatus === 'running' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}>
              {robotStatus.toUpperCase()}
            </Badge>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xxs text-muted-foreground">
              <span>CPU Load</span>
              <span>{systemStats.cpu.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div 
                className={cn("h-full transition-all duration-500", systemStats.cpu > 80 ? "bg-red-500" : "bg-blue-500")} 
                style={{ width: `${systemStats.cpu}%` }} 
              />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xxs text-muted-foreground">
              <span>Memory</span>
              <span>{systemStats.memory.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div 
                className={cn("h-full transition-all duration-500", systemStats.memory > 80 ? "bg-red-500" : "bg-purple-500")} 
                style={{ width: `${systemStats.memory}%` }} 
              />
            </div>
          </div>
          <div className="flex justify-between items-center text-xxs text-muted-foreground pt-1 border-t border-border/50">
            <span>Latency</span>
            <span className={cn("font-mono", systemStats.latency < 150 ? "text-emerald-500" : "text-amber-500")}>
              {Math.round(systemStats.latency)}ms
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Detected Signals Feed */}
      {recentSignals.length > 0 && (
        <Card className="animate-in fade-in slide-in-from-right-4">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium flex items-center gap-2 text-blue-500">
              <RadioIcon className="w-3 h-3 animate-pulse" /> Live Signals
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            {recentSignals.map((signal, i) => (
              <div key={i} className="bg-secondary/50 p-2 rounded flex items-center justify-between">
                <div>
                  <div className="text-xxs font-bold">{signal.symbol}</div>
                  <div className={cn("text-xxs", signal.type === 'BULLISH' ? "text-emerald-500" : "text-red-500")}>
                    {signal.type} @ {signal.price || 'MKT'}
                  </div>
                </div>
                <Button size="sm" variant="outline" className="h-6 text-xxs" onClick={() => handleTradeSignal(signal)}>
                  Trade
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Risk Controls */}
      <Card>
        <CardHeader className="p-3 pb-1">
          <CardTitle className="text-xs font-medium flex items-center gap-2">
            <ShieldAlertIcon className="w-3 h-3" /> Risk Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>Max Risk / Trade</span>
              <span className="font-bold">{riskSettings.maxRiskPerTrade}%</span>
            </div>
            <Slider 
              value={[riskSettings.maxRiskPerTrade]} 
              onValueChange={(v) => handleRiskChange('maxRiskPerTrade', v)}
              onValueCommit={commitRiskSettings}
              max={5} 
              step={0.1} 
              className="h-4" 
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>Max Daily Loss</span>
              <span className="font-bold">{riskSettings.maxDailyLoss}%</span>
            </div>
            <Slider 
              value={[riskSettings.maxDailyLoss]} 
              onValueChange={(v) => handleRiskChange('maxDailyLoss', v)}
              onValueCommit={commitRiskSettings}
              max={10} 
              step={0.5} 
              className="h-4" 
            />
          </div>
        </CardContent>
      </Card>

      {/* Active Strategies */}
      <div className="flex-1 min-h-0 flex flex-col">
        <h3 className="text-xs font-semibold mb-2 flex items-center gap-2 px-1">
          <ZapIcon className="w-3 h-3" /> Active Strategies
        </h3>
        <ScrollArea className="flex-1 pr-2">
          <div className="space-y-2">
            {[
              { name: 'BTC Scalper', pnl: '+1.2%', status: 'active' },
              { name: 'ETH Swing', pnl: '-0.4%', status: 'waiting' },
              { name: 'SOL Momentum', pnl: '+3.5%', status: 'active' },
              ...(activeStrategyName ? [{ name: activeStrategyName, pnl: '0.0%', status: 'active' }] : [])
            ].map((strategy, i) => (
              <div key={i} className="bg-muted/30 p-2 rounded text-xs flex items-center justify-between border border-transparent hover:border-border">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${strategy.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  <span className="font-medium">{strategy.name}</span>
                </div>
                <span className={strategy.pnl.startsWith('+') ? 'text-emerald-500' : 'text-red-500'}>
                  {strategy.pnl}
                </span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Emergency Panel */}
      <Button 
        variant="destructive" 
        className="w-full h-8 text-xs font-bold"
        onClick={() => setShowEmergencyDialog(true)}
      >
        EMERGENCY STOP
      </Button>

      <Dialog open={showEmergencyDialog} onOpenChange={setShowEmergencyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertOctagonIcon className="h-5 w-5" /> EMERGENCY STOP
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to trigger the emergency stop? This will immediately halt all trading algorithms and attempt to cancel all open orders.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmergencyDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleEmergencyStop}>CONFIRM STOP</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
