import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUpRightIcon, ArrowDownRightIcon, MinusIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

interface MetricBoxProps {
  label: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  icon?: React.ElementType;
  className?: string;
}

export function MetricBox({ label, value, trend, trendLabel, icon: Icon, className }: MetricBoxProps) {
  const isPositive = trend && trend > 0;
  const isNegative = trend && trend < 0;
  
  return (
    <Card className={cn("bg-card border-none shadow-sm", className)}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        </div>
        
        <div className="flex items-baseline gap-2">
          <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
          
          {trend !== undefined && (
            <div className={cn(
              "flex items-center text-xs font-medium px-1.5 py-0.5 rounded",
              isPositive ? "text-emerald-500 bg-emerald-500/10" : 
              isNegative ? "text-red-500 bg-red-500/10" : 
              "text-muted-foreground bg-muted"
            )}>
              {isPositive ? <ArrowUpRightIcon className="h-3 w-3 mr-1" /> : 
               isNegative ? <ArrowDownRightIcon className="h-3 w-3 mr-1" /> :
               <MinusIcon className="h-3 w-3 mr-1" />}
              {Math.abs(trend)}%
              {trendLabel && <span className="ml-1 opacity-70">{trendLabel}</span>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
