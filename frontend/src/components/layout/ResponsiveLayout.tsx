import { ReactNode } from 'react';
import HeaderBar from './HeaderBar';
import MobileNav from './MobileNav';
import Sidebar from './Sidebar';

interface ResponsiveLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
}

export default function ResponsiveLayout({ children, showHeader = true }: ResponsiveLayoutProps) {
  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header - only shown on mobile */}
        {showHeader && (
          <div className="md:hidden sticky top-0 z-40 w-full">
             <HeaderBar />
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 container mx-auto px-4 pb-20 md:pb-8 pt-4 md:pt-8 max-w-7xl overflow-x-hidden">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileNav />
      </div>
    </div>
  );
}
