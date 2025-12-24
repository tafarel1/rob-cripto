import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BotIcon, ChevronRightIcon } from '@/components/ui/icons';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function HeaderBar({ rightItems }: { rightItems?: React.ReactNode }) {
  const location = useLocation();

  const getBreadcrumbs = () => {
    const path = location.pathname;
    const crumbs = [{ label: 'Robô', path: '/' }];

    if (path === '/') return crumbs;

    if (path === '/pro') crumbs.push({ label: 'Pro Dashboard', path: '/pro' });
    else if (path === '/automated-trading') crumbs.push({ label: 'Auto Trading', path: '/automated-trading' });
    else if (path === '/dual-dashboard') crumbs.push({ label: 'Conta Dual', path: '/dual-dashboard' });
    else if (path === '/smc') crumbs.push({ label: 'SMC Dashboard', path: '/smc' });
    else if (path === '/menu') crumbs.push({ label: 'Menu', path: '/menu' });
    else {
      // Fallback for unknown paths
      const segments = path.split('/').filter(Boolean);
      segments.forEach(segment => {
        crumbs.push({ label: segment.charAt(0).toUpperCase() + segment.slice(1), path: '#' });
      });
    }

    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="bg-card shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center overflow-hidden">
            <div className="flex-shrink-0 mr-4">
              <Link to="/" className="flex items-center">
                <BotIcon className="w-8 h-8 text-primary" />
              </Link>
            </div>
            
            {/* Mobile Breadcrumbs */}
            <nav className="flex md:hidden items-center text-sm font-medium text-muted-foreground overflow-x-auto whitespace-nowrap mask-linear-fade">
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <ChevronRightIcon className="w-4 h-4 mx-1 flex-shrink-0" />}
                  <Link 
                    to={crumb.path}  
                    className={`${index === breadcrumbs.length - 1 ? 'text-foreground font-semibold' : 'hover:text-foreground transition-colors'}`}
                  >
                    {crumb.label}
                  </Link>
                </React.Fragment>
              ))}
            </nav>

            {/* Desktop Nav - Hidden on mobile as we use bottom nav */}
            <nav className="hidden md:flex ml-6 items-center space-x-6" role="navigation" aria-label="Navegação principal">
              <Link to="/" className="hover:text-primary transition-colors">Início</Link>
              <Link to="/dual-dashboard" className="hover:text-primary transition-colors">Conta Dual</Link>
              <Link to="/automated-trading" className="hover:text-primary transition-colors">Trading Automático</Link>
              <Link to="/pro" className="hover:text-primary transition-colors font-semibold text-primary">Pro Dashboard</Link>
            </nav>
          </div>

          <div className="flex items-center space-x-4 flex-shrink-0">
            {rightItems}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  );
}

