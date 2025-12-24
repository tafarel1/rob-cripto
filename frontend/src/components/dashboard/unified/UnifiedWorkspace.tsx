import React, { useEffect, useState } from 'react';
import { MainChartPanel } from './panels/MainChartPanel';
import { MetricsPanel } from './panels/MetricsPanel';
import { UnifiedExecutionLog } from './UnifiedExecutionLog';
import { useDashboard } from '@/contexts/DashboardContext';
import { useUX } from '@/contexts/UXContext';
import { cn } from '@/lib/utils';
import { UnifiedCard } from '@/components/ui/unified-card';

export function UnifiedWorkspace() {
  const { isRightPanelOpen, activeMode } = useDashboard();
  const { density, setFocusZone } = useUX();
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isDesktop = width >= 768;
  const isXl = width >= 1200;

  // Grid Configuration based on Density
  const getGridConfig = () => {
    const gaps = { high: '8px', balanced: '12px', low: '16px' };
    const metricsWidth = { high: '320px', balanced: '350px', low: '400px' };
    const logsHeight = { high: '180px', balanced: '220px', low: '260px' };

    return {
      gap: gaps[density],
      metrics: metricsWidth[density],
      logs: logsHeight[density],
    };
  };

  const config = getGridConfig();

  // Simplified Grid: Sidebar is external now.
  // Layout: Main Chart (center) + Metrics (right) + Logs (bottom)
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    height: '100%',
    width: '100%',
    padding: config.gap,
    gap: config.gap,
    gridTemplateAreas: `
      "main metrics"
      "logs logs"
    `,
    gridTemplateColumns: `1fr ${isRightPanelOpen && isXl ? config.metrics : '0px'}`,
    gridTemplateRows: `1fr ${config.logs}`,
    overflow: 'hidden',
    backgroundColor: 'hsl(var(--background))', 
  };

  // Mouse Handlers
  const handleMouseEnter = (zone: 'actions' | 'chart' | 'monitoring' | null) => {
    setFocusZone(zone);
  };

  const handleMouseLeave = () => {
     setFocusZone(null);
  };

  return (
    <div style={gridStyle} className="transition-all duration-300 ease-in-out h-full">
      
      {/* Center Panel: Main Chart (Chart Zone) */}
      <UnifiedCard 
        style={{ gridArea: 'main' }} 
        className="flex flex-col min-w-0 relative overflow-hidden h-full"
        elevation="md"
        zone="chart"
        onMouseEnter={() => handleMouseEnter('chart')}
        onMouseLeave={handleMouseLeave}
      >
        <MainChartPanel />
      </UnifiedCard>

      {/* Right Panel: Pro Metrics (Monitoring Zone) */}
      <UnifiedCard 
        style={{ gridArea: 'metrics' }} 
        className={cn(
          "flex-col overflow-hidden h-full transition-all duration-300",
          (!isRightPanelOpen || !isXl) && "hidden border-none p-0"
        )}
        elevation="sm"
        zone="monitoring"
        onMouseEnter={() => handleMouseEnter('monitoring')}
        onMouseLeave={handleMouseLeave}
      >
        <MetricsPanel />
      </UnifiedCard>

      {/* Bottom Panel: Execution Logs */}
      <UnifiedCard 
        style={{ gridArea: 'logs' }}
        className="flex-col overflow-hidden h-full"
        elevation="flat"
        zone="monitoring"
        onMouseEnter={() => handleMouseEnter('monitoring')}
        onMouseLeave={handleMouseLeave}
      >
        <UnifiedExecutionLog />
      </UnifiedCard>
    </div>
  );
}
