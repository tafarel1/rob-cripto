import React from 'react';
import { useDashboard } from '@/contexts/DashboardContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DashboardIcon, 
  BotIcon, 
  LineChartIcon, 
  BellIcon, 
  SettingsIcon, 
  HelpIcon,
  WifiIcon,
  UserIcon,
  LayoutIcon,
  ChevronRightIcon,
  HomeIcon,
  PlayCircleIcon,
  StopCircleIcon,
  AlertOctagonIcon
} from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function UnifiedHeader() {
  const { activeMode, setMode, accountType, setAccountType, setSymbol, activeSymbol, robotStatus, activeStrategyName } = useDashboard();

  const handleWorkspaceChange = (value: string) => {
    switch (value) {
      case 'day-trading':
        setMode('smc');
        setSymbol('BTC/USDT');
        break;
      case 'swing':
        setMode('pro');
        setSymbol('ETH/USDT');
        break;
      case 'backtest':
        setMode('auto');
        break;
      case 'monitor':
        setMode('pro');
        // In a real app, we'd toggle list view or grid view here
        break;
    }
  };

  return (
    <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 flex items-center justify-between shrink-0 z-50 sticky top-0">
      {/* Left: Logo & Breadcrumbs & Modes */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 font-bold text-xl text-primary">
          <BotIcon className="w-6 h-6" />
          <span className="hidden sm:inline">RoboCrypto</span>
        </div>

        {/* Breadcrumbs (Contextual Navigation) */}
        <div className="hidden lg:flex items-center text-sm text-muted-foreground">
          <HomeIcon className="w-4 h-4 mr-1" />
          <ChevronRightIcon className="w-4 h-4 mx-1 opacity-50" />
          <span className="font-medium text-foreground capitalize">{activeMode === 'pro' ? 'Dashboard' : activeMode === 'auto' ? 'Auto Trading' : 'SMC Analysis'}</span>
          <ChevronRightIcon className="w-4 h-4 mx-1 opacity-50" />
          <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{activeSymbol}</span>
        </div>

        {/* Workspace Selector */}
        <div className="hidden xl:block w-36">
          <Select onValueChange={handleWorkspaceChange}>
            <SelectTrigger className="h-8 text-xs">
              <LayoutIcon className="w-3 h-3 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Workspace" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day-trading">Day Trading</SelectItem>
              <SelectItem value="swing">Swing Trader</SelectItem>
              <SelectItem value="backtest">Backtesting</SelectItem>
              <SelectItem value="monitor">Market Monitor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Pro Mode Quick Pair Toggle */}
        {activeMode === 'pro' && (
          <div className="hidden lg:block w-32">
            <Select value={activeSymbol} onValueChange={setSymbol}>
              <SelectTrigger className="h-8 text-xs border-dashed">
                <span className="font-mono font-medium">{activeSymbol}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BTC/USDT">BTC/USDT</SelectItem>
                <SelectItem value="ETH/USDT">ETH/USDT</SelectItem>
                <SelectItem value="SOL/USDT">SOL/USDT</SelectItem>
                <SelectItem value="XRP/USDT">XRP/USDT</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Robot Status Badge (Visible everywhere) */}
        {robotStatus !== 'idle' && (
          <div className="hidden md:flex items-center animate-in fade-in slide-in-from-top-2">
            <Badge 
              variant="outline" 
              className={cn(
                "gap-1.5 pl-1.5 pr-2.5 h-7",
                robotStatus === 'running' ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-600" :
                robotStatus === 'stopping' ? "border-amber-500/50 bg-amber-500/10 text-amber-600" :
                "border-red-500/50 bg-red-500/10 text-red-600"
              )}
            >
              {robotStatus === 'running' && <PlayCircleIcon className="w-3.5 h-3.5 animate-pulse" />}
              {robotStatus === 'stopping' && <StopCircleIcon className="w-3.5 h-3.5" />}
              {robotStatus === 'error' && <AlertOctagonIcon className="w-3.5 h-3.5" />}
              <span className="text-xs font-medium uppercase tracking-wider">
                {robotStatus}
                {activeStrategyName && ` - ${activeStrategyName}`}
              </span>
            </Badge>
          </div>
        )}

        <nav className="hidden md:flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
          <Button
            variant={activeMode === 'pro' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setMode('pro')}
            className={cn("gap-2 transition-all", activeMode === 'pro' && "bg-background shadow-sm")}
          >
            <DashboardIcon className="w-4 h-4" />
            Pro Dashboard
          </Button>
          <Button
            variant={activeMode === 'auto' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setMode('auto')}
            className={cn("gap-2 transition-all", activeMode === 'auto' && "bg-background shadow-sm")}
          >
            <BotIcon className="w-4 h-4" />
            Auto Trading
          </Button>
          <Button
            variant={activeMode === 'smc' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setMode('smc')}
            className={cn("gap-2 transition-all", activeMode === 'smc' && "bg-background shadow-sm")}
          >
            <LineChartIcon className="w-4 h-4" />
            SMC Analysis
          </Button>
        </nav>
      </div>

      {/* Right: Account, Status, Actions */}
      <div className="flex items-center gap-4">
        {/* Account Selector */}
        <div className="flex items-center bg-muted/50 rounded-full p-1 border">
          <button
            onClick={() => setAccountType('demo')}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-all",
              accountType === 'demo' ? "bg-blue-500 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Virtual $10k
          </button>
          <button
            onClick={() => setAccountType('real')}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-all",
              accountType === 'real' ? "bg-green-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Real Account
          </button>
        </div>

        {/* Status */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground">
          <WifiIcon className="w-3 h-3 text-green-500" />
          <span>24ms</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 relative">
            <BellIcon className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-background" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <HelpIcon className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <SettingsIcon className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 ml-2 rounded-full bg-primary/10">
            <UserIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
