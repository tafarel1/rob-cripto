import { Link } from 'react-router-dom';
import { Bot } from 'lucide-react';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function HeaderBar({ rightItems }: { rightItems?: React.ReactNode }) {
  return (
    <div className="bg-card shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-foreground flex items-center">
                <Bot className="w-8 h-8 mr-3 text-blue-600" />
                Robô Cripto
              </h1>
            </div>
            <nav className="ml-6 flex items-center space-x-6" role="navigation" aria-label="Navegação principal">
              <Link to="/" className="hover:text-blue-500 transition-colors">Início</Link>
              <Link to="/dual-dashboard" className="hover:text-blue-500 transition-colors">Conta Dual</Link>
              <Link to="/automated-trading" className="hover:text-blue-500 transition-colors">Trading Automático</Link>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            {rightItems}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  );
}

