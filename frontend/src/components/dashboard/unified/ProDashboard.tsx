import React from 'react';
import { EquityCurveWidget } from './widgets/EquityCurveWidget';
import { PerformanceMatrixWidget } from './widgets/PerformanceMatrixWidget';
import { ExposureMonitorWidget } from './widgets/ExposureMonitorWidget';
import { EconomicCalendarWidget } from './widgets/EconomicCalendarWidget';
import { useWidgetState, WidgetState } from '@/hooks/useWidgetState';

// Need to make sure AssetDashboard is exported correctly. 
// It was 'export default' in the file read, so we import as default.
import AssetDashboardDefault from '@/components/assets/AssetDashboard';

const DEFAULT_WIDGETS: WidgetState[] = [
  { id: 'equity', isVisible: true, position: 0 },
  { id: 'performance', isVisible: true, position: 1 },
  { id: 'exposure', isVisible: true, position: 2 },
  { id: 'calendar', isVisible: true, position: 3 },
];

export function ProDashboard() {
  const { widgets } = useWidgetState('pro', DEFAULT_WIDGETS);

  const renderWidget = (id: string) => {
    switch (id) {
      case 'equity': return <EquityCurveWidget />;
      case 'performance': return <PerformanceMatrixWidget />;
      case 'exposure': return <ExposureMonitorWidget />;
      case 'calendar': return <EconomicCalendarWidget />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      {/* Top Widgets Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-[320px] flex-shrink-0">
        {widgets
          .filter(w => w.isVisible)
          .sort((a, b) => a.position - b.position)
          .map(w => (
            <div key={w.id} className="overflow-hidden h-full">
              {renderWidget(w.id)}
            </div>
          ))}
      </div>

      {/* Main Content - Asset Explorer */}
      <div className="flex-1 min-h-0 border rounded-lg overflow-hidden bg-card shadow-sm">
        <AssetDashboardDefault headless={true} />
      </div>
    </div>
  );
}
