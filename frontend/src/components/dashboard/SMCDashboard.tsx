import React, { useState, useEffect } from 'react';
import { SMCTopBar } from './smc/SMCTopBar';
import { SMCIndicators } from './smc/SMCIndicators';
import { SMCMainChart } from './smc/SMCMainChart';
import { SMCControls } from './smc/SMCControls';
import { BacktestModal } from './smc/BacktestModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChartIcon, ActivityIcon, Settings2Icon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { useAccountBalance } from '@/hooks/useAccountBalance';
import { toast } from 'sonner';
import { useDashboard } from '@/contexts/DashboardContext';

export default function SMCDashboard({ headless = false, accountType: propAccountType }: { headless?: boolean; accountType?: 'demo' | 'real' }) {
  // Use global dashboard context for state synchronization
  const { activeSymbol: symbol, setSymbol, accountType: contextAccountType, setAccountType } = useDashboard();
  
  // Prefer context account type if available, fallback to prop
  const currentAccountType = contextAccountType || propAccountType || 'demo';
  const isRealMode = currentAccountType === 'real';

  const [isConnected, setIsConnected] = useState(true); // Mocked for now
  const { totalEquity } = useAccountBalance();
  const [drawdown] = useState(0.5); // Mocked drawdown
  const [isBacktestOpen, setIsBacktestOpen] = useState(false);

  // Red Alert System (Critical Events)
  useEffect(() => {
    // 1. Connection Loss
    if (!isConnected) {
      toast.error("CRITICAL: Connection Lost", {
        description: "Exchange connection severed. Trading halted.",
        duration: Infinity, // Persistent until resolved
        action: {
          label: "Reconnect",
          onClick: () => setIsConnected(true),
        },
      });
    }

    // 2. High Drawdown
    if (drawdown > 5) {
      toast.error("CRITICAL: High Drawdown Alert", {
        description: `Drawdown exceeded 5% limit (Current: ${drawdown}%). Risk protocols activated.`,
        duration: 10000,
      });
    }
  }, [isConnected, drawdown]);

  const handlePanic = () => {
    console.log("PANIC BUTTON PRESSED");
    toast.error("PANIC PROTOCOL ACTIVATED", {
      description: "All positions closed. Trading suspended.",
      duration: 5000,
    });
    setIsConnected(false); // Simulate connection cut
  };

  return (
    <div className={cn("flex flex-col h-full min-h-[500px] bg-background overflow-hidden", !headless && "rounded-lg border shadow-sm")}>
      {/* Level 1: Top Bar */}
      {!headless && (
        <SMCTopBar 
          equity={totalEquity || 10450.25} 
          pnl={2.45} 
          drawdown={drawdown} 
          isConnected={isConnected} 
          isRealMode={isRealMode}
          symbol={symbol}
          onPanic={handlePanic}
          onToggleMode={(checked) => setAccountType(checked ? 'real' : 'demo')}
          onSymbolChange={setSymbol}
        />
      )}

      {/* Desktop/Tablet Layout (Hidden on Mobile) */}
      <div className="hidden md:grid md:grid-cols-12 flex-1 overflow-hidden">
        {/* Zone A: Indicators (Left Column) */}
        {/* Tablet: 4/12 (33%), Desktop: 3/12 (25%) */}
        <div className="md:col-span-4 lg:col-span-3 border-r bg-card/50 p-4 overflow-y-auto" style={{ contain: 'content' }}>
          <SMCIndicators symbol={symbol} />
        </div>

        {/* Zone B: Main Chart (Center Column) */}
        {/* Tablet: 8/12 (66%), Desktop: 7/12 (58%) */}
        <div className="md:col-span-8 lg:col-span-7 flex flex-col p-4 overflow-hidden relative border-r" style={{ contain: 'size' }}>
          <SMCMainChart symbol={symbol} onSymbolChange={setSymbol} />
        </div>

        {/* Zone C: Controls (Right Column - Desktop Only) */}
        {/* Hidden on Tablet, Visible on Desktop (2/12 -> 16.6% or adjusted) */}
        {/* Let's adjust for 3 columns: 3 (25%) + 7 (58.3%) + 2 (16.6%) = 12 */}
        <div className="hidden lg:flex lg:col-span-2 flex-col bg-card/50 p-4 overflow-hidden" style={{ contain: 'content' }}>
          <SMCControls onBacktest={() => setIsBacktestOpen(true)} />
        </div>
      </div>

      {/* Mobile Layout (Visible only on Mobile) */}
      <div className="md:hidden flex-1 flex flex-col overflow-hidden">
        <Tabs defaultValue="chart" className="flex-1 flex flex-col">
          <div className="flex-1 overflow-hidden">
            <TabsContent value="chart" className="h-full m-0 p-2 data-[state=active]:flex flex-col">
              <SMCMainChart symbol={symbol} onSymbolChange={setSymbol} />
            </TabsContent>
            <TabsContent value="signals" className="h-full m-0 p-4 overflow-y-auto data-[state=active]:flex flex-col">
              <SMCIndicators symbol={symbol} />
            </TabsContent>
            <TabsContent value="control" className="h-full m-0 p-4 overflow-y-auto data-[state=active]:flex flex-col">
              <SMCControls onBacktest={() => setIsBacktestOpen(true)} />
            </TabsContent>
          </div>

          <TabsList className="grid w-full grid-cols-3 h-14 rounded-none border-t bg-background">
            <TabsTrigger value="chart" className="flex flex-col gap-1 h-full data-[state=active]:bg-accent/50 rounded-none border-t-2 border-transparent data-[state=active]:border-primary transition-all">
              <ActivityIcon className="w-5 h-5" />
              <span className="text-xxs">Chart</span>
            </TabsTrigger>
            <TabsTrigger value="signals" className="flex flex-col gap-1 h-full data-[state=active]:bg-accent/50 rounded-none border-t-2 border-transparent data-[state=active]:border-primary transition-all">
              <BarChartIcon className="w-5 h-5" />
              <span className="text-xxs">Signals</span>
            </TabsTrigger>
            <TabsTrigger value="control" className="flex flex-col gap-1 h-full data-[state=active]:bg-accent/50 rounded-none border-t-2 border-transparent data-[state=active]:border-primary transition-all">
              <Settings2Icon className="w-5 h-5" />
              <span className="text-xxs">Control</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Modals */}
      <BacktestModal isOpen={isBacktestOpen} onClose={() => setIsBacktestOpen(false)} />
    </div>
  );
}
