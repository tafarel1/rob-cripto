import React, { useState } from 'react';
import { useDashboard } from '@/contexts/DashboardContext';
import { Button } from '@/components/ui/button';
import { BarChartIcon, ZapIcon, OrderBlockIcon, MenuIcon, XIcon, SettingsIcon, HelpIcon, LogOutIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

export function MobileBottomNav() {
  const { activeMode, setMode } = useDashboard();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 bg-background/95 backdrop-blur z-[60] flex flex-col p-6 animate-in fade-in slide-in-from-bottom-10 md:hidden">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold">Menu</h2>
            <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(false)}>
              <XIcon className="h-6 w-6" />
            </Button>
          </div>

          <div className="space-y-4 flex-1">
            <Button variant="ghost" className="w-full justify-start text-lg" onClick={() => setIsMenuOpen(false)}>
              <SettingsIcon className="mr-3 h-5 w-5" /> Settings
            </Button>
            <Button variant="ghost" className="w-full justify-start text-lg" onClick={() => setIsMenuOpen(false)}>
              <HelpIcon className="mr-3 h-5 w-5" /> Help & Support
            </Button>
            <div className="h-px bg-border my-4" />
            <Button variant="ghost" className="w-full justify-start text-lg text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setIsMenuOpen(false)}>
              <LogOutIcon className="mr-3 h-5 w-5" /> Logout
            </Button>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t p-2 flex justify-around items-center z-50 pb-safe shadow-[0_-1px_10px_hsl(var(--foreground)/0.05)]">
        <Button 
          variant={activeMode === 'pro' && !isMenuOpen ? 'default' : 'ghost'}  
          size="sm" 
          className={cn("flex flex-col gap-1 h-auto py-2 px-4 rounded-xl", activeMode === 'pro' && !isMenuOpen ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
          onClick={() => { setMode('pro'); setIsMenuOpen(false); }}
        >
          <BarChartIcon className="h-5 w-5" />
          <span className="text-xxs font-medium">Pro</span>
        </Button>

        <Button 
          variant={activeMode === 'auto' && !isMenuOpen ? 'default' : 'ghost'} 
          size="sm" 
          className={cn("flex flex-col gap-1 h-auto py-2 px-4 rounded-xl", activeMode === 'auto' && !isMenuOpen ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
          onClick={() => { setMode('auto'); setIsMenuOpen(false); }}
        >
          <ZapIcon className="h-5 w-5" />
          <span className="text-xxs font-medium">Auto</span>
        </Button>

        <Button 
          variant={activeMode === 'smc' && !isMenuOpen ? 'default' : 'ghost'} 
          size="sm" 
          className={cn("flex flex-col gap-1 h-auto py-2 px-4 rounded-xl", activeMode === 'smc' && !isMenuOpen ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
          onClick={() => { setMode('smc'); setIsMenuOpen(false); }}
        >
          <OrderBlockIcon className="h-5 w-5" />
          <span className="text-xxs font-medium">SMC</span>
        </Button>

        <Button 
          variant={isMenuOpen ? 'default' : 'ghost'} 
          size="sm" 
          className={cn("flex flex-col gap-1 h-auto py-2 px-4 rounded-xl", isMenuOpen ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <MenuIcon className="h-5 w-5" />
          <span className="text-xxs font-medium">Menu</span>
        </Button>
      </div>
    </>
  );
}
