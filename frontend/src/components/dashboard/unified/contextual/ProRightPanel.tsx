import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshIcon, DownloadIcon, PieChartIcon, TrendingUpIcon, NewspaperIcon } from '@/components/ui/icons';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAccountManager } from '@/components/account/useAccountManager';
import { useDashboard } from '@/contexts/DashboardContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface NewsItem {
  id: number;
  source: string;
  time: string;
  content: string;
  type?: 'news' | 'alert';
}

const INITIAL_NEWS: NewsItem[] = [
  { id: 1, source: 'CryptoDaily', time: '2m ago', content: 'Bitcoin breaks major resistance level at $45k as institutional inflows surge to record highs.', type: 'news' },
  { id: 2, source: 'CoinTelegraph', time: '15m ago', content: 'Ethereum network upgrade scheduled for next month promises 50% gas fee reduction.', type: 'news' },
  { id: 3, source: 'Bloomberg', time: '1h ago', content: 'SEC approves new crypto ETF applications, signaling broader market acceptance.', type: 'news' },
  { id: 4, source: 'SMC Bot', time: '2h ago', content: 'System automatically rebalanced portfolio to maintain 40/30/30 allocation.', type: 'alert' },
  { id: 5, source: 'Analysis', time: '3h ago', content: 'Weekly close above 200 EMA suggests strong bullish continuation for major alts.', type: 'news' },
];

export function ProRightPanel() {
  const { virtualAccount, realAccount, currentMode } = useAccountManager();
  const { lastEvent } = useDashboard();
  const [balance, setBalance] = useState(0);
  const [newsItems, setNewsItems] = useState<NewsItem[]>(INITIAL_NEWS);

  useEffect(() => {
    const account = currentMode === 'VIRTUAL' ? virtualAccount : realAccount;
    setBalance(account.balance || 0);
  }, [currentMode, virtualAccount, realAccount]);

  // Listen for cross-dashboard events to update timeline
  useEffect(() => {
    if (!lastEvent) return;

    if (lastEvent.source === 'smc' && lastEvent.type === 'NAVIGATE_TO_TRADE') {
      const newItem: NewsItem = {
        id: Date.now(),
        source: 'SMC Alert',
        time: 'Just now',
        content: `Signal Detected & Actioned: ${lastEvent.payload.type || 'Unknown'} on ${lastEvent.payload.symbol || 'Unknown'}`,
        type: 'alert'
      };
      setNewsItems(prev => [newItem, ...prev]);
    }
    if (lastEvent.type === 'SIGNAL_DETECTED' && lastEvent.source === 'smc') {
      const newItem: NewsItem = {
        id: Date.now(),
        source: 'SMC Detection',
        time: 'Just now',
        content: `New Signal: ${lastEvent.payload.type} on ${lastEvent.payload.symbol} (${lastEvent.payload.reason || 'SMC'})`,
        type: 'alert'
      };
      setNewsItems(prev => [newItem, ...prev]);
    }
  }, [lastEvent]);

  const handleRebalance = () => {
    toast.info('Rebalanceamento iniciado', {
      description: 'Calculando ordens para ajustar exposição...'
    });
    setTimeout(() => {
      toast.success('Sugestão de Rebalanceamento', {
        description: 'Vender 0.1 BTC -> Comprar 15 SOL'
      });
    }, 1500);
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Portfolio Snapshot */}
      <Card>
        <CardHeader className="p-3 pb-1">
          <CardTitle className="text-xs font-medium flex items-center gap-2">
            <PieChartIcon className="w-3 h-3" /> Portfolio Snapshot
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Total Value</span>
              <span className="font-bold">${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">24h Change</span>
              <span className="text-emerald-500 font-medium">+$2,491 (2.04%)</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden flex mt-2">
              <div className="h-full bg-orange-500 w-[45%]" />
              <div className="h-full bg-blue-500 w-[30%]" />
              <div className="h-full bg-purple-500 w-[15%]" />
              <div className="h-full bg-green-500 w-[10%]" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="p-3 pb-1">
          <CardTitle className="text-xs font-medium flex items-center gap-2">
            <TrendingUpIcon className="w-3 h-3" /> Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleRebalance}>
            <RefreshIcon className="mr-2 h-3 w-3" /> Rebalance
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs">
            <DownloadIcon className="mr-2 h-3 w-3" /> Export CSV
          </Button>
        </CardContent>
      </Card>

      {/* News Feed */}
      <div className="flex-1 min-h-0 flex flex-col">
        <h3 className="text-xs font-semibold mb-2 flex items-center gap-2 px-1">
          <NewspaperIcon className="w-3 h-3" /> Latest News
        </h3>
        <ScrollArea className="flex-1 pr-2">
          <div className="space-y-2">
            {newsItems.map((item) => (
              <div key={item.id} className={cn(
                "bg-muted/30 p-2 rounded text-xs hover:bg-muted/50 transition-colors cursor-pointer border border-transparent hover:border-border",
                item.type === 'alert' && "bg-blue-500/10 border-blue-500/20"
              )}>
                <div className="flex justify-between items-start mb-1">
                  <span className={cn(
                    "font-bold",
                    item.type === 'alert' ? "text-blue-500" : "text-primary"
                  )}>{item.source}</span>
                  <span className="text-muted-foreground text-xxs">{item.time}</span>
                </div>
                <p className="line-clamp-2 leading-snug">
                  {item.content}
                </p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
