import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ComposedChart, 
  Line, 
  Scatter,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { RefreshIcon, TrendingUpIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { HelpButton } from '../HelpButton';
import { useDashboard } from '@/contexts/DashboardContext';

// Mock data generator
const generateData = (days = 30) => {
  let equity = 10000;
  const data = [];
  for (let i = 0; i < days; i++) {
    const change = (Math.random() - 0.45) * 200; // Slight upward bias
    equity += change;
    const hasTrade = Math.random() > 0.8;
    data.push({
      date: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      equity: equity,
      benchmark: 10000 * (1 + (i * 0.005) + (Math.random() * 0.02)), // Fake benchmark (e.g. BTC)
      drawdown: change < 0 ? change : 0,
      trade: hasTrade ? equity : null,
      tradeType: hasTrade ? (change > 0 ? 'win' : 'loss') : null,
      tradeId: `trade-${i}`
    });
  }
  return data;
};

const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (!payload.trade) return null;
  
  return (
    <circle 
      cx={cx} 
      cy={cy} 
      r={4} 
      fill={payload.tradeType === 'win' ? 'hsl(var(--success-500))' : 'hsl(var(--danger-500))'} 
      stroke="hsl(var(--background))" 
      strokeWidth={1}
      className="cursor-pointer hover:r-6 transition-all"
    />
  );
};

export function EquityCurveWidget() {
  const { dispatchDashboardEvent } = useDashboard();
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [showBenchmark, setShowBenchmark] = useState(true);
  const [data] = useState(generateData(30));

  const currentEquity = data[data.length - 1].equity;
  const startEquity = data[0].equity;
  const pnl = currentEquity - startEquity;
  const pnlPercent = (pnl / startEquity) * 100;

  const handleTradeClick = (data: any) => {
    if (data && data.payload && data.payload.tradeId) {
      dispatchDashboardEvent({
        type: 'NAVIGATE_TO_SMC',
        payload: { 
          tradeId: data.payload.tradeId,
          date: data.payload.date,
          symbol: 'BTC/USDT' // Mock
        },
        source: 'pro'
      });
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium">Equity Curve</CardTitle>
            <HelpButton 
            title="Equity Curve"
            content="Shows your portfolio performance over time. Compare against BTC benchmark."
            tutorialContent={
              <div className="space-y-2">
                <p><strong>Equity Line:</strong> The main line shows your total account value.</p>
                <p><strong>Benchmark:</strong> Toggle the 'TrendingUp' icon to compare against BTC/S&P500.</p>
                <p><strong>Time Ranges:</strong> Use the 7d/30d/90d buttons to zoom in/out.</p>
              </div>
            }
            tipsContent={
              <ul className="list-disc pl-4 space-y-1">
                <li>A smooth upward curve indicates consistent returns with low volatility.</li>
                <li>Sharp drops indicate drawdowns - check your risk management settings.</li>
              </ul>
            }
          />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">${currentEquity.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            <span className={cn("text-xs font-medium", pnl >= 0 ? "text-success-500" : "text-danger-500")}>
              {pnl >= 0 ? "+" : ""}{pnlPercent.toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className="flex bg-muted rounded-md p-0.5 mr-2">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  "px-2 py-0.5 text-xxs rounded-sm transition-colors",
                  timeRange === range ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {range}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowBenchmark(!showBenchmark)}>
            <TrendingUpIcon className={cn("h-4 w-4", showBenchmark ? "text-primary" : "text-muted-foreground")} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <RefreshIcon className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-[200px] p-0 pb-4">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: '0.625rem', fill: 'hsl(var(--muted-foreground))' }} 
              axisLine={false}
              tickLine={false}
              minTickGap={30}
            />
            <YAxis 
              domain={['auto', 'auto']}
              tick={{ fontSize: '0.625rem', fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `$${value}`}
              width={40}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--popover))', 
                borderColor: 'hsl(var(--border))',
                borderRadius: 'var(--radius)',
                fontSize: '0.75rem'
              }}
              itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
            />
            {showBenchmark && (
              <Line 
                type="monotone" 
                dataKey="benchmark" 
                stroke="hsl(var(--muted-foreground))" 
                strokeWidth={1} 
                strokeDasharray="4 4"
                dot={false}
                activeDot={false}
              />
            )}
            <Line 
              type="monotone" 
              dataKey="equity" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2} 
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              fill="url(#colorEquity)"
            />
            <Scatter 
              dataKey="trade" 
              shape={<CustomDot />}
              onClick={handleTradeClick}
              cursor="pointer"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
