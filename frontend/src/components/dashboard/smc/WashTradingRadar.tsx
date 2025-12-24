import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldAlertIcon, AlertTriangleIcon, CheckCircleIcon } from '@/components/ui/icons';
import { WashTradingActivity } from '@/types/smc';
import { formatDistanceToNow } from 'date-fns';

interface WashTradingRadarProps {
  activities?: WashTradingActivity[];
}

export function WashTradingRadar({ activities = [] }: WashTradingRadarProps) {
  const hasHighSeverity = activities.some(a => a.severity === 'high');
  const hasMediumSeverity = activities.some(a => a.severity === 'medium');

  const statusColor = hasHighSeverity ? 'text-red-500' : hasMediumSeverity ? 'text-orange-500' : 'text-emerald-500';
  const StatusIcon = hasHighSeverity ? ShieldAlertIcon : hasMediumSeverity ? AlertTriangleIcon : CheckCircleIcon;
  const statusText = hasHighSeverity ? 'Manipulação Detectada' : hasMediumSeverity ? 'Atividade Suspeita' : 'Mercado Íntegro';

  return (
    <Card className="border-l-4 border-l-primary mb-4">
      <CardHeader className="py-2 px-3 pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-bold uppercase flex items-center gap-2">
            <ShieldAlertIcon className="w-3 h-3" />
            Integridade do Mercado
          </CardTitle>
          <div className={`flex items-center gap-1 text-xs font-bold ${statusColor}`}>
            <StatusIcon className="w-3 h-3" />
            <span>{statusText}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        {activities.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-2">
            Nenhuma anomalia de volume detectada.
          </div>
        ) : (
          <div className="space-y-2">
            {activities.slice(0, 3).map((activity, idx) => (
              <div key={idx} className="flex flex-col gap-1 bg-muted/30 p-2 rounded border border-muted">
                <div className="flex justify-between items-center">
                  <Badge variant={activity.severity === 'high' ? 'destructive' : 'secondary'} className="text-xxs h-4 px-1">
                    {activity.type === 'volume_spike' ? 'VOL SPIKE' : 'DOJI CHURN'}
                  </Badge>
                  <span className="text-xxs text-muted-foreground">
                    {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                  </span>
                </div>
                <span className="text-xxs font-medium leading-tight">
                  {activity.details}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
