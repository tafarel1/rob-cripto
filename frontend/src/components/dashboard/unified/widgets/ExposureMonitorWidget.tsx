import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChartIcon, AlertTriangleIcon, RefreshIcon, MaximizeIcon } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { HelpButton } from '../HelpButton';
import { useAccountManager } from '@/components/account/useAccountManager';
import { API_CONFIG } from '@/lib/config';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface AssetExposure {
  symbol: string;
  value: number; // in USD
  percentage: number;
  limit: number;
}

export function ExposureMonitorWidget() {
  const { virtualAccount, realAccount, currentMode } = useAccountManager();
  const [exposure, setExposure] = useState<AssetExposure[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  
  // Gesture state
  const touchStartY = useRef<number>(0);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const fetchExposure = async () => {
    setIsLoading(true);
    try {
      // In a real app, this would fetch from a portfolio API
      // Here we'll simulate based on account balance and robot positions
      const response = await fetch(`${API_CONFIG.baseURL}/api/automated-trading/status`);
      const data = await response.json();
      
      const account = currentMode === 'VIRTUAL' ? virtualAccount : realAccount;
      const totalBalance = account.balance || 10000;
      
      let calculatedExposure: AssetExposure[] = [];
      let usedValue = 0;

      if (data.success && data.data.activePositions) {
        calculatedExposure = data.data.activePositions.map((pos: any) => {
          const value = (pos.quantity || 0) * (pos.currentPrice || pos.entryPrice || 0);
          usedValue += value;
          return {
            symbol: pos.symbol.split('/')[0],
            value: value,
            percentage: (value / totalBalance) * 100,
            limit: 20 // Default limit
          };
        });
      }

      // Add mock holdings if no robot positions (to show Pro mode features)
      if (calculatedExposure.length === 0) {
        calculatedExposure = [
          { symbol: 'BTC', value: totalBalance * 0.45, percentage: 45, limit: 50 },
          { symbol: 'ETH', value: totalBalance * 0.30, percentage: 30, limit: 30 },
          { symbol: 'SOL', value: totalBalance * 0.15, percentage: 15, limit: 15 },
        ];
        usedValue = totalBalance * 0.90;
      }

      // Add remaining as USDT
      const usdtValue = Math.max(0, totalBalance - usedValue);
      calculatedExposure.push({
        symbol: 'USDT',
        value: usdtValue,
        percentage: (usdtValue / totalBalance) * 100,
        limit: 100
      });

      setExposure(calculatedExposure.sort((a, b) => b.percentage - a.percentage));
    } catch (error) {
      console.error('Failed to fetch exposure', error);
      // Fallback to mock
      setExposure([
        { symbol: 'BTC', value: 45000, percentage: 45, limit: 50 },
        { symbol: 'ETH', value: 30000, percentage: 30, limit: 30 },
        { symbol: 'USDT', value: 25000, percentage: 25, limit: 100 },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExposure();
    const interval = setInterval(fetchExposure, 10000);
    return () => clearInterval(interval);
  }, [currentMode, virtualAccount, realAccount]);

  const handleRebalance = () => {
    toast.info('Rebalanceamento iniciado', {
      description: 'Calculando ordens para ajustar exposição...'
    });
    // Simulate API call
    setTimeout(() => {
      toast.success('Sugestão de Rebalanceamento', {
        description: 'Vender 0.1 BTC -> Comprar 15 SOL'
      });
    }, 1500);
  };

  // Gesture Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    // Swipe down start
    touchStartY.current = e.touches[0].clientY;

    // Two-finger tap
    if (e.touches.length === 2) {
      setIsMaximized(prev => !prev);
      toast.info(isMaximized ? 'Minimized' : 'Maximized');
      return;
    }

    // Long press
    longPressTimer.current = setTimeout(() => {
      setShowOptions(true);
      // Vibrate if available
      if (navigator.vibrate) navigator.vibrate(50);
    }, 800); // 800ms for long press
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    // Clear long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    // Swipe down detection
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchEndY - touchStartY.current;
    
    // Threshold for swipe down (e.g., 100px)
    if (diff > 100 && window.scrollY === 0) { // Ensure we are at top of scroll
       fetchExposure();
       toast.success('Refreshing data...');
    }
  };

  const handleTouchMove = () => {
    // If moving, cancel long press
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const WidgetContent = () => (
    <>
       {/* Mobile List View */}
       <div className="md:hidden space-y-4">
        {exposure.map((asset) => {
          const isOverLimit = asset.percentage >= asset.limit;
          const isNearLimit = asset.percentage >= asset.limit * 0.9 && !isOverLimit;
          
          return (
            <div key={asset.symbol} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold">{asset.symbol}</span>
                  {isOverLimit && (
                    <span className="text-danger-500 flex items-center gap-1 text-xxs bg-danger-500/10 px-1 rounded">
                      <AlertTriangleIcon className="h-3 w-3" /> Over Limit
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">${asset.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  <span className={cn(
                    "font-medium w-9 text-right",
                    isOverLimit ? "text-danger-500" : isNearLimit ? "text-amber-500" : "text-success-500"
                  )}>
                    {asset.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="relative h-2 w-full bg-secondary rounded-full overflow-hidden">
                 <div 
                   className={cn(
                     "h-full rounded-full transition-all duration-500",
                     isOverLimit ? "bg-danger-500" : isNearLimit ? "bg-amber-500" : "bg-success-500"
                   )}
                   style={{ width: `${Math.min(asset.percentage, 100)}%` }}
                 />
                 {/* Limit Marker */}
                 <div 
                   className="absolute top-0 bottom-0 w-0.5 bg-foreground/30 z-10"
                   style={{ left: `${Math.min(asset.limit, 100)}%` }}
                   title={`Limit: ${asset.limit}%`}
                 />
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Heatmap View */}
      <div className="hidden md:flex flex-wrap w-full h-full gap-1 content-start">
         {exposure.map((asset) => {
            const isOverLimit = asset.percentage >= asset.limit;
            const isNearLimit = asset.percentage >= asset.limit * 0.9 && !isOverLimit;
            
            // Calculate color intensity based on percentage relative to limit? 
            // Or just status colors. Let's use status colors with opacity.
            const bgColor = isOverLimit ? 'bg-danger-500' : isNearLimit ? 'bg-amber-500' : 'bg-success-500';
            
            return (
              <div 
                key={asset.symbol}
                className={cn(
                  "relative p-3 rounded-md transition-all hover:scale-[1.02] cursor-pointer flex flex-col justify-between overflow-hidden",
                  bgColor,
                  "text-white"
                )}
                style={{ 
                  width: `calc(${Math.max(asset.percentage, 10)}% - 4px)`, // Minimum 10% width for visibility
                  flexGrow: 1,
                  minHeight: '80px'
                }}
                title={`${asset.symbol}: ${asset.percentage.toFixed(1)}% (Limit: ${asset.limit}%)`}
              >
                <div className="flex justify-between items-start z-10 relative">
                   <span className="font-bold text-lg drop-shadow-md">{asset.symbol}</span>
                   {isOverLimit && <AlertTriangleIcon className="h-4 w-4 text-white drop-shadow-md" />}
                </div>
                <div className="z-10 relative">
                   <div className="text-xs opacity-90">${asset.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                   <div className="font-mono text-lg font-bold drop-shadow-md">{asset.percentage.toFixed(1)}%</div>
                </div>
                {/* Background Pattern or Gradient could go here */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-black/10 pointer-events-none" />
              </div>
            );
         })}
      </div>
    </>
  );

  if (isMaximized) {
    return (
      <Dialog open={isMaximized} onOpenChange={setIsMaximized}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] flex flex-col h-full">
          <DialogHeader>
            <DialogTitle>Exposure Monitor (Maximized)</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-4">
            <WidgetContent />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
    <Card 
      className="h-full overflow-hidden flex flex-col touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
    >
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PieChartIcon className="h-4 w-4 text-primary" />
            Exposure Monitor
          </div>
          <div className="flex items-center gap-1">
             <Button variant="ghost" size="icon" className="h-6 w-6 md:hidden" onClick={() => setIsMaximized(true)}>
                <MaximizeIcon className="h-3 w-3" />
             </Button>
             <Button variant="ghost" size="icon" className="h-6 w-6" onClick={fetchExposure}>
                <RefreshIcon className={cn("h-3 w-3", isLoading && "animate-spin")} />
             </Button>
             <HelpButton 
              title="Exposure Monitor"
              content="Monitors your asset allocation against defined limits. Shows alerts if exposure exceeds safety thresholds."
              tutorialContent={
                <div className="space-y-2">
                  <p><strong>Heatmap:</strong> Visual representation of your portfolio allocation. Larger blocks mean higher exposure.</p>
                  <p><strong>Limits:</strong> Defined in Risk Settings. Default is max 20% per asset.</p>
                  <p><strong>Alerts:</strong> <span className="text-yellow-600">Yellow</span> means warning (80% limit), <span className="text-red-600">Red</span> means critical (limit exceeded).</p>
                  <p className="md:hidden text-xs text-muted-foreground pt-2">
                    <strong>Gestures:</strong> Swipe down to refresh • Two-finger tap to maximize • Long press for options
                  </p>
                </div>
              }
              tipsContent={
                <ul className="list-disc pl-4 space-y-1">
                  <li>Diversify to reduce single-asset risk.</li>
                  <li>Check correlations in the 'Analysis' tab to avoid hidden exposure.</li>
                  <li>Use 'Auto-Rebalance' in Risk Settings to automatically adjust positions.</li>
                </ul>
              }
              troubleshootingContent={
                <div className="space-y-2">
                  <p><strong>Exposure too high?</strong> Manually reduce position size or enable auto-hedging.</p>
                  <p><strong>Data not updating?</strong> Check your exchange connection in the sidebar.</p>
                </div>
              }
            />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4 flex-1 overflow-y-auto">
        <WidgetContent />
        
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full text-xs mt-2" 
          onClick={handleRebalance}
        >
          <RefreshIcon className="mr-2 h-3 w-3" /> 
          Analyze & Rebalance
        </Button>
      </CardContent>
    </Card>

    {/* Options Dialog (Long Press) */}
    <Dialog open={showOptions} onOpenChange={setShowOptions}>
        <DialogContent className="w-[300px]">
          <DialogHeader>
            <DialogTitle>Widget Options</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => { setShowOptions(false); fetchExposure(); }}>
              <RefreshIcon className="mr-2 h-4 w-4" /> Refresh Data
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => { setShowOptions(false); setIsMaximized(true); }}>
              <MaximizeIcon className="mr-2 h-4 w-4" /> Maximize
            </Button>
            <Button variant="outline" className="w-full justify-start text-red-500 hover:text-red-600" onClick={() => setShowOptions(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
    </Dialog>
    </>
  );
}
