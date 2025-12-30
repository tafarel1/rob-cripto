import React, { ReactNode } from 'react';
import { UnifiedSidebar } from './UnifiedSidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { TutorialOverlay } from './TutorialOverlay';

interface UnifiedDashboardLayoutProps {
  children: ReactNode;
}

export function UnifiedDashboardLayout({ children }: UnifiedDashboardLayoutProps) {
  useKeyboardShortcuts();

  return (
    <div className="h-screen bg-background flex overflow-hidden font-sans">
      <TutorialOverlay />
      
      {/* Sidebar - Primary Navigation & Controls */}
      <UnifiedSidebar />
      
      {/* Main Content Area - Full width remaining */}
      <main className="flex-1 overflow-hidden relative bg-muted/5 flex flex-col h-full w-full">
        {children}
      </main>
      
      <MobileBottomNav />
    </div>
  );
}
