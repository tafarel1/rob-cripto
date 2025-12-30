import { Link } from 'react-router-dom';
import { UserIcon, SettingsIcon, HelpIcon, LogOutIcon, ChevronRightIcon, DashboardIcon, CoinsIcon } from '@/components/ui/icons';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function Menu() {
  const menuItems = [
    { icon: DashboardIcon, label: 'Pro Dashboard', path: '/pro' },
    { icon: CoinsIcon, label: 'Lista de Ativos', path: '/assets' },
    { icon: UserIcon, label: 'Perfil', path: '/profile' },
    { icon: SettingsIcon, label: 'Configurações', path: '/settings' },
    { icon: HelpIcon, label: 'Ajuda & Suporte', path: '/help' },
  ];

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Menu</h1>

      {/* User Profile Summary */}
      <Card>
        <CardContent className="p-4 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-bold text-xl">
            U
          </div>
          <div>
            <h3 className="font-medium text-foreground">Usuário Demo</h3>
            <p className="text-sm text-muted-foreground">demo@robocripto.com</p>
          </div>
        </CardContent>
      </Card>

      {/* Menu Items */}
      <div className="space-y-2">
        {menuItems.map((item, index) => (
          <Link key={index} to={item.path}>
            <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border hover:bg-accent transition-colors">
              <div className="flex items-center space-x-3">
                <item.icon className="w-5 h-5" />
                <span className="font-medium text-foreground">{item.label}</span>
              </div>
              <ChevronRightIcon className="w-4 h-4" />
            </div>
          </Link>
        ))}
      </div>

      {/* Theme Toggle */}
      <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
        <span className="font-medium text-foreground">Tema</span>
        <ThemeToggle />
      </div>

      {/* Logout */}
      <Button variant="destructive" className="w-full mt-8">
        <LogOutIcon className="w-4 h-4 mr-2 text-current" />
        Sair
      </Button>
    </div>
  );
}
