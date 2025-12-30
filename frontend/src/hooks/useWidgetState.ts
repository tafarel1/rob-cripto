import { useState, useEffect } from 'react';

export interface WidgetState {
  id: string;
  isVisible: boolean;
  position: number;
  settings?: Record<string, unknown>;
}

export function useWidgetState(mode: 'pro' | 'trading' | 'smc', defaultWidgets: WidgetState[]) {
  const SESSION_KEY = 'dashboard_session';
  
  const [widgets, setWidgets] = useState<WidgetState[]>(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        const session = JSON.parse(saved);
        if (session.layout && session.layout[mode]) {
          return session.layout[mode];
        }
      }
    } catch (e) {
      console.error('Error loading widget state', e);
    }
    return defaultWidgets;
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      const session = saved ? JSON.parse(saved) : {};
      
      const newSession = {
        ...session,
        layout: {
          ...(session.layout || {}),
          [mode]: widgets
        }
      };
      
      localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
    } catch (e) {
      console.error('Error saving widget state', e);
    }
  }, [widgets, mode]);

  const toggleWidget = (id: string) => {
    setWidgets(prev => prev.map(w => 
      w.id === id ? { ...w, isVisible: !w.isVisible } : w
    ));
  };

  const updateWidgetSettings = (id: string, settings: Record<string, unknown>) => {
    setWidgets(prev => prev.map(w => 
      w.id === id ? { ...w, settings: { ...w.settings, ...settings } } : w
    ));
  };

  const reorderWidgets = (newOrder: string[]) => {
    setWidgets(prev => {
      const widgetMap = new Map(prev.map(w => [w.id, w]));
      return newOrder.map((id, index) => {
        const w = widgetMap.get(id);
        return w ? { ...w, position: index } : null;
      }).filter(Boolean) as WidgetState[];
    });
  };

  return {
    widgets,
    toggleWidget,
    updateWidgetSettings,
    reorderWidgets
  };
}
