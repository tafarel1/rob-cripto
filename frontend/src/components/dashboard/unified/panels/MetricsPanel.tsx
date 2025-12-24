import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ActivityIcon, ListIcon, BarChart3Icon, SettingsIcon } from '@/components/ui/icons';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { EquityCurveWidget } from '@/components/dashboard/unified/widgets/EquityCurveWidget';
import { PerformanceMatrixWidget } from '@/components/dashboard/unified/widgets/PerformanceMatrixWidget';
import PositionsWidget from '@/components/dashboard/widgets/PositionsWidget';
import StatsWidget from '@/components/dashboard/widgets/StatsWidget';
import { useSocket } from '@/hooks/useSocket';
import { useUX } from '@/contexts/UXContext';
import { UnifiedCard, UnifiedCardHeader, UnifiedCardTitle, UnifiedCardContent } from '@/components/ui/unified-card';
import { cn } from '@/lib/utils';
import { useDashboard } from '@/contexts/DashboardContext';

export function MetricsPanel() {
  const [positions, setPositions] = useState([]);
  const [balance, setBalance] = useState(null);
  const [engineStatus, setEngineStatus] = useState(null);
  const { expertise, setExpertise } = useUX();
  const { activeMode } = useDashboard();

  useSocket(
    (status) => status && setEngineStatus(status),
    undefined, 
    (bal) => bal && bal.success && setBalance(bal.data),
    (pos) => pos && pos.success && Array.isArray(pos.data) && setPositions(pos.data)
  );

  const cycleExpertise = () => {
    const levels: ('beginner' | 'trader' | 'pro')[] = ['beginner', 'trader', 'pro'];
    const next = levels[(levels.indexOf(expertise) + 1) % levels.length];
    setExpertise(next);
  };

  return (
    <div className="flex flex-col h-full">
       <UnifiedCardHeader>
        <UnifiedCardTitle className="flex items-center gap-2">
          <ActivityIcon className="w-4 h-4 text-primary" />
          Metrics
        </UnifiedCardTitle>
        <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={cycleExpertise}
          className="h-6 text-[10px] px-2 uppercase tracking-wider font-mono"
        >
          {expertise}
        </Button>
        </div>
      </UnifiedCardHeader>

      <ScrollArea className="flex-1">
        <UnifiedCardContent className="space-y-4">
          {/* L1: Critical Stats (Always Visible) */}
          <div className="space-y-4">
            <StatsWidget balance={balance} engineStatus={engineStatus} />
          </div>

          {/* L2: Active Positions (Trader & Pro) */}
          {expertise !== 'beginner' && (
             <div className="space-y-2 animate-fade-in">
               <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
                 <ListIcon className="w-3 h-3" /> Active Positions
               </div>
               <div className="border rounded-md overflow-hidden bg-card">
                  <PositionsWidget positions={positions} />
               </div>
             </div>
          )}

          {/* L3: Performance & Analysis (Pro Only) */}
          {expertise === 'pro' && (
             <Tabs defaultValue="equity" className="w-full animate-fade-in pt-2">
               <TabsList className="grid w-full grid-cols-2 mb-4 h-8">
                 <TabsTrigger value="equity" className="text-xs">Equity</TabsTrigger>
                 <TabsTrigger value="matrix" className="text-xs">Matrix</TabsTrigger>
               </TabsList>
               
               <TabsContent value="equity" className="h-48 rounded-lg border overflow-hidden bg-card">
                  <EquityCurveWidget />
               </TabsContent>
               
               <TabsContent value="matrix" className="h-48 rounded-lg border overflow-hidden bg-card">
                  <PerformanceMatrixWidget />
               </TabsContent>
             </Tabs>
          )}

          {/* Upsell for Beginner */}
          {expertise === 'beginner' && (
            <div className="text-center py-8 text-muted-foreground text-xs">
              <p>Simple mode active.</p>
              <Button variant="link" size="sm" onClick={() => setExpertise('trader')} className="text-xs">
                Show Positions
              </Button>
            </div>
          )}
        </UnifiedCardContent>
      </ScrollArea>
    </div>
  );
}
