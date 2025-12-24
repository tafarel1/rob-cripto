import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { XIcon, PlayIcon, BarChartIcon } from '@/components/ui/icons';

interface BacktestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BacktestResult {
  pnl: number;
  pnlPercent: number;
  winRate: number;
  totalTrades: number;
  maxDrawdown: number;
  profitFactor: number;
}

export function BacktestModal({ isOpen, onClose }: BacktestModalProps) {
  const [capital, setCapital] = useState('10000');
  const [period, setPeriod] = useState('1m');
  const [strategy, setStrategy] = useState('smc_basic');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<BacktestResult | null>(null);

  if (!isOpen) return null;

  const handleRun = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/backtest/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: 'BTC/USDT', // Hardcoded for now, should come from context
          timeframe: '1h',
          initialCapital: Number(capital),
          strategy
        })
      });
      const data = await response.json();
      if (data.success) {
        setResults(data.data);
      } else {
        console.error('Backtest failed:', data.error);
      }
    } catch (err) {
      console.error('Backtest error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-[600px] max-h-[90vh] overflow-y-auto shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <BarChartIcon className="w-5 h-5 text-primary" />
            Backtest Simulation
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <XIcon className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Initial Capital (USDT)</Label>
              <Input 
                type="number" 
                value={capital} 
                onChange={(e) => setCapital(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>Period</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1w">Last Week</SelectItem>
                  <SelectItem value="1m">Last Month</SelectItem>
                  <SelectItem value="3m">Last 3 Months</SelectItem>
                  <SelectItem value="1y">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1 md:col-span-2 space-y-2">
              <Label>Strategy</Label>
              <Select value={strategy} onValueChange={setStrategy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="smc_basic">SMC Basic (Order Blocks)</SelectItem>
                  <SelectItem value="smc_pro">SMC Pro (Liquidity + FVG)</SelectItem>
                  <SelectItem value="ict_silver_bullet">ICT Silver Bullet</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {results && (
            <div className="bg-muted/30 p-4 rounded-lg space-y-4 border animate-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Simulation Results</h3>
                <span className="text-xs text-muted-foreground">Strategy: {strategy}</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-background rounded-md border shadow-sm">
                  <div className="text-xs text-muted-foreground mb-1">Net PnL</div>
                  <div className={`text-xl font-bold ${results.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {results.pnl >= 0 ? '+' : ''}{results.pnl.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                  </div>
                  <div className="text-xxs text-muted-foreground">
                    ({results.pnlPercent}%)
                  </div>
                </div>
                <div className="p-3 bg-background rounded-md border shadow-sm">
                  <div className="text-xs text-muted-foreground mb-1">Win Rate</div>
                  <div className="text-xl font-bold text-blue-500">
                    {results.winRate}%
                  </div>
                  <div className="text-xxs text-muted-foreground">
                    {results.totalTrades} trades
                  </div>
                </div>
                <div className="p-3 bg-background rounded-md border shadow-sm">
                  <div className="text-xs text-muted-foreground mb-1">Max DD</div>
                  <div className="text-xl font-bold text-red-500">
                    -{results.maxDrawdown}%
                  </div>
                  <div className="text-xxs text-muted-foreground">
                    PF: {results.profitFactor}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t pt-4">
          <Button className="w-full" onClick={handleRun} disabled={isLoading} size="lg">
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Running Simulation...
              </span>
            ) : (
              <>
                <PlayIcon className="w-4 h-4 mr-2" />
                Run Backtest
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
