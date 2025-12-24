import React from 'react';
import { SMCMainChart } from '@/components/dashboard/smc/SMCMainChart';
import { useDashboard } from '@/contexts/DashboardContext';
import { useUX } from '@/contexts/UXContext';
import { Button } from '@/components/ui/button';
import { MaximizeIcon, MinimizeIcon, BarChart3Icon } from '@/components/ui/icons';
import { UnifiedCardHeader, UnifiedCardTitle, UnifiedCardContent } from '@/components/ui/unified-card';

export function MainChartPanel() {
  const { activeSymbol, setSymbol, isRightPanelOpen, toggleRightPanel, isSidebarOpen, toggleSidebar } = useDashboard();
  const { setFocusZone, isFocusMode } = useUX();
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    // If going fullscreen, we could technically just hide the sidebars,
    // or use the 'Focus Zone' concept to maximize the chart visually.
    // For now, let's just toggle sidebars as the original behavior, but also set Focus Zone.
    
    if (!isFullscreen) {
        setFocusZone('chart');
        if (isRightPanelOpen) toggleRightPanel();
        if (isSidebarOpen) toggleSidebar();
    } else {
        setFocusZone(null); // Clear focus zone
        // Only restore if they were closed by this action (simplified for now)
        if (!isRightPanelOpen) toggleRightPanel();
        if (!isSidebarOpen) toggleSidebar();
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <UnifiedCardHeader>
         <UnifiedCardTitle className="flex items-center gap-2">
            <BarChart3Icon className="w-4 h-4 text-primary" />
            <span className="font-mono">{activeSymbol}</span>
            <span className="text-muted-foreground font-normal text-xs ml-2">SMC Analysis</span>
         </UnifiedCardTitle>
         <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleFullscreen}>
                {isFullscreen ? <MinimizeIcon className="h-4 w-4" /> : <MaximizeIcon className="h-4 w-4" />}
            </Button>
         </div>
      </UnifiedCardHeader>
      
      <div className="flex-1 overflow-hidden relative bg-card">
        <SMCMainChart symbol={activeSymbol} onSymbolChange={setSymbol} />
      </div>
    </div>
  );
}
