import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpRightIcon, ArrowDownRightIcon, TargetIcon, ActivityIcon, PercentIcon, ShieldAlertIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { HelpButton } from '../HelpButton';

interface MetricCardProps {
  label: string;
  value: string;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ElementType;
  color?: string;
}

function MetricCard({ label, value, subValue, trend, icon: Icon, color }: MetricCardProps) {
  return (
    <div className="bg-secondary/30 border border-border/50 rounded-lg p-3 flex flex-col justify-between hover:bg-secondary/50 transition-all duration-200 group">
      <div className="flex items-start justify-between">
        <div className={cn("p-2 rounded-md transition-colors", color)}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        {trend && (
          <div className={cn(
            "text-xxs px-1.5 py-0.5 rounded-full flex items-center gap-0.5 font-medium border",
            trend === 'up' ? "bg-success-50/50 text-success-600 border-success-100" : 
            trend === 'down' ? "bg-danger-50/50 text-danger-600 border-danger-100" : "bg-muted text-muted-foreground border-border"
          )}>
            {trend === 'up' ? <ArrowUpRightIcon className="h-3 w-3" /> : <ArrowDownRightIcon className="h-3 w-3" />}
            {subValue}
          </div>
        )}
      </div>
      <div className="mt-3">
        <p className="text-xs text-muted-foreground font-medium group-hover:text-foreground transition-colors">{label}</p>
        <p className="text-xl font-bold tracking-tight text-foreground">{value}</p>
      </div>
    </div>
  );
}

export function PerformanceMatrixWidget() {
  return (
    <Card className="h-full border shadow-sm bg-card">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2 text-foreground/80">
            <ActivityIcon className="h-4 w-4 text-primary" />
            Performance Matrix (30d)
          </div>
          <HelpButton 
            title="Performance Matrix"
            content="Key performance indicators for the last 30 days. Includes Win Rate, Profit Factor, Sharpe Ratio, and Max Drawdown."
            tutorialContent={
              <div className="space-y-2">
                <p><strong>Win Rate:</strong> Percentage of profitable trades. (&gt;50% is good)</p>
                <p><strong>Profit Factor:</strong> Gross Profit / Gross Loss. (&gt;1.5 is good)</p>
                <p><strong>Sharpe Ratio:</strong> Risk-adjusted return. (&gt;1.0 is acceptable, &gt;2.0 is excellent)</p>
                <p><strong>Max Drawdown:</strong> Largest peak-to-valley decline.</p>
              </div>
            }
            tipsContent={
              <ul className="list-disc pl-4 space-y-1">
                <li>Focus on increasing Profit Factor rather than just Win Rate.</li>
                <li>A high Win Rate with low Profit Factor means you take small profits but large losses.</li>
              </ul>
            }
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 flex sm:grid sm:grid-cols-2 gap-3 overflow-x-auto sm:overflow-visible snap-x sm:snap-none pb-4 sm:pb-4 scrollbar-hide">
        <div className="min-w-[160px] sm:min-w-0 snap-center w-[85%] sm:w-auto shrink-0">
          <MetricCard 
            label="Win Rate" 
            value="68.5%" 
            subValue="+2.4%" 
            trend="up" 
            icon={TargetIcon}
            color="bg-emerald-500"
          />
        </div>
        <div className="min-w-[160px] sm:min-w-0 snap-center w-[85%] sm:w-auto shrink-0">
          <MetricCard 
            label="Profit Factor" 
            value="2.14" 
            subValue="+0.12" 
            trend="up" 
            icon={PercentIcon}
            color="bg-blue-500"
          />
        </div>
        <div className="min-w-[160px] sm:min-w-0 snap-center w-[85%] sm:w-auto shrink-0">
          <MetricCard 
            label="Sharpe Ratio" 
            value="1.85" 
            subValue="-0.05" 
            trend="down" 
            icon={ActivityIcon}
            color="bg-purple-500"
          />
        </div>
        <div className="min-w-[160px] sm:min-w-0 snap-center w-[85%] sm:w-auto shrink-0">
          <MetricCard 
            label="Max Drawdown" 
            value="-4.2%" 
            subValue="Stable" 
            trend="neutral" 
            icon={ShieldAlertIcon}
            color="bg-amber-500"
          />
        </div>
      </CardContent>
    </Card>
  );
}
