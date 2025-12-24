import { useEffect } from 'react';
import { useDashboard } from '@/contexts/DashboardContext';
import { toast } from 'sonner';

export function useKeyboardShortcuts() {
  const { setMode, toggleSidebar, toggleRightPanel, isSidebarOpen, isRightPanelOpen } = useDashboard();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      // Mode Switching (Alt + 1, 2, 3)
      if (event.altKey && !event.ctrlKey && !event.shiftKey) {
        if (event.key === '1') {
          event.preventDefault();
          setMode('pro');
          toast('Switched to Pro Dashboard', { icon: '📊' });
        } else if (event.key === '2') {
          event.preventDefault();
          setMode('auto');
          toast('Switched to Auto Trading', { icon: '🤖' });
        } else if (event.key === '3') {
          event.preventDefault();
          setMode('smc');
          toast('Switched to SMC Analysis', { icon: '🔍' });
        } else if (event.key.toLowerCase() === 's') {
          // Toggle Sidebars (Alt + S)
          event.preventDefault();
          const shouldClose = isSidebarOpen || isRightPanelOpen;
          if (shouldClose) {
            if (isSidebarOpen) toggleSidebar();
            if (isRightPanelOpen) toggleRightPanel();
            toast('Focus Mode On', { icon: '🎯' });
          } else {
            toggleSidebar();
            toggleRightPanel();
            toast('Sidebars Restored', { icon: '👀' });
          }
        }
      }

      // New Alert (Ctrl + Shift + A)
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        toast('New Alert Dialog', { description: 'Feature coming soon...' });
        // TODO: Open actual alert modal
      }

      // Fullscreen (F11) - Browser usually handles this, but we can enforce element fullscreen if needed.
      // We'll let the browser handle standard F11, but maybe add a custom one for just the content area if requested?
      // User said "Fullscreen gráfico: F11", which implies the chart or the app.
      // Standard F11 is fine for full app.
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setMode, toggleSidebar, toggleRightPanel, isSidebarOpen, isRightPanelOpen]);
}
