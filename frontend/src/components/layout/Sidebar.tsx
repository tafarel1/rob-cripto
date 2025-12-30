import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HomeIcon, ActivityIcon, BotIcon, DashboardIcon, CoinsIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function Sidebar() {
  const location = useLocation();

  const navItems = [
    { icon: HomeIcon, label: 'Início', path: '/' },
    { icon: ActivityIcon, label: 'Conta Dual', path: '/dual-dashboard' },
    { icon: BotIcon, label: 'Auto Trading', path: '/automated-trading' },
    { icon: DashboardIcon, label: 'Pro Dashboard', path: '/pro' },
    { icon: ActivityIcon, label: 'SMC Dashboard', path: '/smc' },
    { icon: CoinsIcon, label: 'Ativos', path: '/assets' },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-card border-r border-border h-screen sticky top-0 left-0 z-50">
      <div className="p-4 border-b border-border h-16 flex items-center">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary">
          <BotIcon className="w-8 h-8" />
          <span>Robô Cripto</span>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Tema</span>
          <ThemeToggle />
        </div>
        <div className="text-xs text-center text-muted-foreground">
          v1.0.0 Pro
        </div>
      </div>
    </aside>
  );
}
