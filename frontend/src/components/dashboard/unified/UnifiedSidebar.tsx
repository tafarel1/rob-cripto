import React, { useState } from 'react';
import { useDashboard, DashboardMode } from '@/contexts/DashboardContext';
import { useUX } from '@/contexts/UXContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AutomatedTradingConfig from '@/components/trading/AutomatedTradingConfig';
import { 
  BarChartIcon, 
  ActivityIcon, 
  ZapIcon, 
  SettingsIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  HomeIcon,
  ClockIcon,
  BookIcon,
  BotIcon,
  PlayCircleIcon,
  StopCircleIcon,
  AlertOctagonIcon,
  SunIcon,
  MoonIcon,
  MonitorIcon,
  UserIcon,
  LogOutIcon,
  WalletIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@/components/ui/icons';

// Types for navigation structure
type NavItem = {
  id: string;
  label: string;
  icon: React.ElementType;
  mode?: DashboardMode; // If clicking sets a specific mode
  action?: () => void;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

export function UnifiedSidebar() {
  const { 
    activeMode, 
    setMode, 
    isSidebarOpen, 
    toggleSidebar, 
    activeSymbol, 
    setSymbol,
    accountType,
    setAccountType,
    robotStatus,
    setRobotStatus
  } = useDashboard();
  
  const { density, setDensity, theme, setTheme } = useUX();
  
  // Local state for collapsible sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'navigation': true,
    'trading': true,
    'settings': false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const getRobotStatusColor = () => {
    switch (robotStatus) {
      case 'running': return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
      case 'stopping': return "text-amber-500 bg-amber-500/10 border-amber-500/20";
      case 'error': return "text-red-500 bg-red-500/10 border-red-500/20";
      default: return "text-muted-foreground bg-secondary border-transparent";
    }
  };

  return (
    <aside 
      className={cn(
        "flex flex-col border-r bg-background/95 backdrop-blur z-50 h-screen transition-all duration-300 shadow-xl",
        isSidebarOpen ? "w-72" : "w-20"
      )}
    >
      {/* Header / Logo */}
      <div className="h-16 flex items-center px-4 border-b shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <BotIcon className="w-6 h-6 text-primary" />
          </div>
          {isSidebarOpen && (
            <div className="flex flex-col animate-in fade-in duration-300">
              <span className="font-bold text-lg leading-none">RoboCrypto</span>
              <span className="text-[10px] text-muted-foreground font-medium tracking-wider">AI TRADING SYSTEM</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Scrollable Content */}
      <ScrollArea className="flex-1 py-4">
        <div className="px-3 space-y-6">
          
          {/* Account & Market Selection */}
          <div className="space-y-3">
            {isSidebarOpen ? (
              <>
                <div className="bg-muted/30 p-3 rounded-lg border border-border/50 space-y-3">
                  {/* Account Selector */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Account Type</Label>
                    <div className="flex bg-background rounded-md p-1 border">
                      <button
                        onClick={() => setAccountType('demo')}
                        className={cn(
                          "flex-1 text-xs py-1.5 rounded-sm font-medium transition-all",
                          accountType === 'demo' ? "bg-blue-500 text-white shadow-sm" : "text-muted-foreground hover:bg-muted"
                        )}
                      >
                        Demo
                      </button>
                      <button
                        onClick={() => setAccountType('real')}
                        className={cn(
                          "flex-1 text-xs py-1.5 rounded-sm font-medium transition-all",
                          accountType === 'real' ? "bg-green-600 text-white shadow-sm" : "text-muted-foreground hover:bg-muted"
                        )}
                      >
                        Real
                      </button>
                    </div>
                  </div>

                  {/* Pair Selector */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Trading Pair</Label>
                    <Select value={activeSymbol} onValueChange={setSymbol}>
                      <SelectTrigger className="h-9 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BTC/USDT">BTC/USDT</SelectItem>
                        <SelectItem value="ETH/USDT">ETH/USDT</SelectItem>
                        <SelectItem value="SOL/USDT">SOL/USDT</SelectItem>
                        <SelectItem value="BNB/USDT">BNB/USDT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            ) : (
              // Collapsed View for Account/Market
              <div className="flex flex-col gap-2 items-center">
                <Button variant="ghost" size="icon" className={cn("rounded-full", accountType === 'real' ? "text-green-600 bg-green-100" : "text-blue-500 bg-blue-100")}>
                  <WalletIcon className="w-5 h-5" />
                </Button>
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold border">
                  {activeSymbol.split('/')[0]}
                </div>
              </div>
            )}
          </div>

          <Separator className="opacity-50" />

          {/* Trading Controls (Robot) */}
          <div className="space-y-1">
            {isSidebarOpen ? (
              <div className="bg-muted/30 rounded-lg border border-border/50 overflow-hidden">
                <button 
                  onClick={() => toggleSection('trading')}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2 font-medium text-sm">
                    <ZapIcon className="w-4 h-4 text-amber-500" />
                    <span>Robot Controls</span>
                  </div>
                  {expandedSections['trading'] ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                </button>
                
                {expandedSections['trading'] && (
                  <div className="p-3 pt-0 space-y-4 animate-in slide-in-from-top-2 duration-200">
                    {/* Status Badge */}
                    <div className={cn("flex items-center justify-center gap-2 py-2 rounded-md border text-sm font-medium", getRobotStatusColor())}>
                      {robotStatus === 'running' ? <PlayCircleIcon className="w-4 h-4 animate-pulse" /> : 
                       robotStatus === 'error' ? <AlertOctagonIcon className="w-4 h-4" /> : 
                       <StopCircleIcon className="w-4 h-4" />}
                      <span className="uppercase">{robotStatus}</span>
                    </div>

                    {/* Start/Stop Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        size="sm" 
                        variant={robotStatus === 'running' ? "outline" : "default"}
                        className={cn(robotStatus !== 'running' && "bg-emerald-600 hover:bg-emerald-700")}
                        onClick={() => setRobotStatus('running')}
                        disabled={robotStatus === 'running'}
                      >
                        Start
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        disabled={robotStatus === 'idle'}
                        onClick={() => setRobotStatus('idle')}
                      >
                        Stop
                      </Button>
                    </div>

                    <Separator className="my-2" />

                    {/* Strategy Config */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="secondary" size="sm" className="w-full justify-start text-xs border shadow-sm h-8">
                          <SettingsIcon className="w-3.5 h-3.5 mr-2" />
                          Configure Strategies
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="sr-only">Automated Trading Configuration</DialogTitle>
                        </DialogHeader>
                        <AutomatedTradingConfig />
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </div>
            ) : (
              // Collapsed Robot Icon
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn("w-full h-10", robotStatus === 'running' && "text-emerald-500")}
                onClick={toggleSidebar}
              >
                <ZapIcon className="w-5 h-5" />
              </Button>
            )}
          </div>

          {/* Interface Settings */}
          <div className="space-y-1">
            {isSidebarOpen ? (
              <div className="bg-muted/30 rounded-lg border border-border/50 overflow-hidden">
                <button 
                  onClick={() => toggleSection('settings')}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2 font-medium text-sm">
                    <SettingsIcon className="w-4 h-4 text-muted-foreground" />
                    <span>Interface</span>
                  </div>
                  {expandedSections['settings'] ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                </button>

                {expandedSections['settings'] && (
                  <div className="p-3 pt-0 space-y-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-normal">Theme</Label>
                      <div className="flex items-center bg-background border rounded-full p-0.5">
                        <button 
                          onClick={() => setTheme('light')}
                          className={cn("p-1.5 rounded-full transition-all", theme === 'light' && "bg-muted shadow-sm")}
                        >
                          <SunIcon className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => setTheme('dark')}
                          className={cn("p-1.5 rounded-full transition-all", theme === 'dark' && "bg-muted shadow-sm")}
                        >
                          <MoonIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Density</span>
                        <span className="capitalize">{density}</span>
                      </div>
                      <div className="flex bg-background border rounded-md p-1 gap-1">
                        {(['low', 'balanced', 'high'] as const).map((d) => (
                          <button
                            key={d}
                            onClick={() => setDensity(d)}
                            className={cn(
                              "flex-1 text-[10px] py-1 rounded-sm uppercase transition-all",
                              density === d ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground hover:bg-muted"
                            )}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
               <Button variant="ghost" size="icon" className="w-full h-10" onClick={toggleSidebar}>
                <SettingsIcon className="w-5 h-5" />
              </Button>
            )}
          </div>

        </div>
      </ScrollArea>

      {/* Footer / User Info */}
      <div className="p-4 border-t bg-muted/20 shrink-0">
        {isSidebarOpen ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-primary/50 flex items-center justify-center text-primary-foreground shadow-sm">
              <UserIcon className="w-5 h-5" />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">Admin User</p>
              <p className="text-xs text-muted-foreground truncate">V2.0.1 • Pro Plan</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
              <LogOutIcon className="w-4 h-4" />
            </Button>
          </div>
        ) : (
           <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-primary/50 flex items-center justify-center text-primary-foreground shadow-sm">
              <UserIcon className="w-4 h-4" />
            </div>
          </div>
        )}
      </div>

      {/* Collapse Toggle (Absolute or Bottom) */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 bg-background border shadow-md rounded-full p-1 hover:bg-muted transition-colors z-50"
      >
        {isSidebarOpen ? <ChevronLeftIcon className="w-3 h-3" /> : <ChevronRightIcon className="w-3 h-3" />}
      </button>

    </aside>
  );
}
