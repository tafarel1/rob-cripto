import React, { createContext, useContext, useState, ReactNode } from 'react';
import { DashboardEvent } from '@/types/events';

export type DashboardMode = 'pro' | 'auto' | 'smc';
export type AccountType = 'demo' | 'real';
export type RobotStatus = 'idle' | 'running' | 'stopping' | 'error';

// Exporting DashboardEvent from types to maintain backward compatibility if imported from here
export type { DashboardEvent } from '@/types/events';

interface DashboardState {
  activeMode: DashboardMode;
  activeSymbol: string;
  activeTimeframe: string;
  accountType: AccountType;
  isSidebarOpen: boolean;
  isRightPanelOpen: boolean;
  robotStatus: RobotStatus;
  activeStrategyName?: string;
  lastEvent: DashboardEvent | null;
  widgetSettings: Record<string, unknown>; // Safer than any
}

interface DashboardContextType extends DashboardState {
  setMode(_mode: DashboardMode): void;
  setSymbol(_symbol: string): void;
  setTimeframe(_timeframe: string): void;
  setAccountType(_type: AccountType): void;
  toggleSidebar(): void;
  toggleRightPanel(): void;
  setRobotStatus(_status: RobotStatus): void;
  setActiveStrategyName(_name: string | undefined): void;
  dispatchDashboardEvent(_event: Omit<DashboardEvent, 'timestamp'>): void;
  updateWidgetSettings(widgetId: string, settings: Record<string, unknown>): void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const SESSION_KEY = 'dashboard_session';

  // Helper to load initial state
  const loadSession = () => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  };
  const session = loadSession();

  const [activeMode, setActiveMode] = useState<DashboardMode>(session?.activeMode || 'pro');
  const [activeSymbol, setActiveSymbol] = useState(session?.context?.symbol || 'BTC/USDT');
  const [activeTimeframe, setActiveTimeframe] = useState(session?.context?.timeframe || '1h');
  const [accountType, setAccountType] = useState<AccountType>('demo');
  const [robotStatus, setRobotStatus] = useState<RobotStatus>('idle');
  const [activeStrategyName, setActiveStrategyName] = useState<string | undefined>(undefined);
  const [lastEvent, setLastEvent] = useState<DashboardEvent | null>(null);
  const [widgetSettings, setWidgetSettings] = useState<Record<string, unknown>>(session?.widgetSettings || {});

  // Persist session changes
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      const existingSession = saved ? JSON.parse(saved) : {};

      const newSession = {
        ...existingSession,
        activeMode,
        context: {
          symbol: activeSymbol,
          timeframe: activeTimeframe
        },
        widgetSettings, // Save widget settings
        lastSaved: Date.now()
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
    } catch (e) {
      console.error('Failed to save dashboard session', e);
    }
  }, [activeMode, activeSymbol, activeTimeframe, widgetSettings]);
  
  // Persistent layout state
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('dashboard_sidebar_open');
    return saved !== null ? JSON.parse(saved) : true;
  });
  
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(() => {
    const saved = localStorage.getItem('dashboard_right_panel_open');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => {
      const newValue = !prev;
      localStorage.setItem('dashboard_sidebar_open', JSON.stringify(newValue));
      return newValue;
    });
  };

  const toggleRightPanel = () => {
    setIsRightPanelOpen(prev => {
      const newValue = !prev;
      localStorage.setItem('dashboard_right_panel_open', JSON.stringify(newValue));
      return newValue;
    });
  };

  const dispatchDashboardEvent = (event: Omit<DashboardEvent, 'timestamp'>) => {
    const fullEvent = {
      ...event,
      timestamp: Date.now(),
    } as DashboardEvent;
    
    setLastEvent(fullEvent);
    // You could also emit this to a global event bus or analytics here
    console.log('[Dashboard Event]', fullEvent);
  };

  const updateWidgetSettings = (widgetId: string, settings: Record<string, unknown>) => {
    setWidgetSettings(prev => ({
      ...prev,
      [widgetId]: {
        ...(prev[widgetId] as Record<string, unknown> || {}),
        ...settings
      }
    }));
  };

  const value = {
    activeMode,
    activeSymbol,
    activeTimeframe,
    accountType,
    isSidebarOpen,
    isRightPanelOpen,
    robotStatus,
    activeStrategyName,
    lastEvent,
    widgetSettings,
    setMode: setActiveMode,
    setSymbol: setActiveSymbol,
    setTimeframe: setActiveTimeframe,
    setAccountType,
    toggleSidebar,
    toggleRightPanel,
    setRobotStatus,
    setActiveStrategyName,
    dispatchDashboardEvent,
    updateWidgetSettings
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}
// eslint-disable-next-line react-refresh/only-export-components
export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}
