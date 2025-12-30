import { Link, useLocation } from 'react-router-dom';
import { HomeIcon, ActivityIcon, BotIcon, MenuIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

export default function MobileNav() {
  const location = useLocation();

  const navItems = [
    { icon: HomeIcon, label: 'Início', path: '/' },
    { icon: ActivityIcon, label: 'Conta Dual', path: '/dual-dashboard' },
    { icon: BotIcon, label: 'Auto Trading', path: '/automated-trading' },
    { icon: MenuIcon, label: 'Menu', path: '/menu' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border h-16 px-4 md:hidden z-50">
      <div className="flex justify-around items-center h-full">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="w-6 h-6" />
              <span className="text-xxs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
