import React from 'react';
import { useDashboard } from '@/contexts/DashboardContext';
import { Button } from '@/components/ui/button';
import { XIcon } from '@/components/ui/icons';
import { ProRightPanel } from './contextual/ProRightPanel';
import { TradingRightPanel } from './contextual/TradingRightPanel';
import { SMCRightPanel } from './contextual/SMCRightPanel';
import { UnifiedExecutionLog } from './UnifiedExecutionLog';

export function UnifiedRightPanel() {
  const { activeMode, isRightPanelOpen, toggleRightPanel } = useDashboard();

  if (!isRightPanelOpen) return null;

  return (
    <aside className="w-80 border-l bg-background/50 backdrop-blur h-[calc(100vh-3.5rem)] sticky top-14 flex flex-col z-40 hidden xl:flex">
      <div className="flex items-center justify-between p-4 border-b shrink-0">
        <h3 className="font-semibold text-sm">
          {activeMode === 'pro' && 'Market Insights'}
          {activeMode === 'auto' && 'Bot Performance'}
          {activeMode === 'smc' && 'Signal Scanner'}
        </h3>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={toggleRightPanel}>
          <XIcon className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto min-h-0">
        {activeMode === 'pro' && <ProRightPanel />}
        {activeMode === 'auto' && <TradingRightPanel />}
        {activeMode === 'smc' && <SMCRightPanel />}
      </div>

      <div className="p-4 border-t bg-muted/10 shrink-0">
        <UnifiedExecutionLog className="h-48" />
      </div>
    </aside>
  );
}
