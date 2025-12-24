import { useDashboard } from '@/contexts/DashboardContext';

export function useWidgetSettings<T>(widgetId: string, defaultSettings: T) {
  const { widgetSettings, updateWidgetSettings } = useDashboard();

  const settings = (widgetSettings[widgetId] as T) || defaultSettings;

  const setSettings = (newSettings: Partial<T>) => {
    updateWidgetSettings(widgetId, newSettings);
  };

  return [settings, setSettings] as const;
}
