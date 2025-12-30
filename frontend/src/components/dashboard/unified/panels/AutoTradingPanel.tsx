import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import AutomatedTradingConfig from '@/components/trading/AutomatedTradingConfig';
import { ZapIcon, PlayIcon, StopCircleIcon, SettingsIcon, LayoutGridIcon, MonitorIcon } from '@/components/ui/icons';
import { useDashboard } from '@/contexts/DashboardContext';
import { useUX } from '@/contexts/UXContext';
import { UnifiedCardHeader, UnifiedCardTitle, UnifiedCardContent } from '@/components/ui/unified-card';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function AutoTradingPanel() {
  const { robotStatus, setRobotStatus } = useDashboard();
  const { density, setDensity, expertise, setExpertise } = useUX();
  const isRunning = robotStatus === 'running';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <UnifiedCardHeader>
        <UnifiedCardTitle className="flex items-center gap-2">
          <ZapIcon className={cn("w-4 h-4 transition-colors", isRunning ? "text-primary animate-pulse" : "text-muted-foreground")} />
          Auto Trading
        </UnifiedCardTitle>
        <div className={cn("w-2 h-2 rounded-full transition-all duration-500", isRunning ? "bg-success-500 shadow-[0_0_8px_hsl(var(--success-500))]" : "bg-muted-foreground/30")} />
      </UnifiedCardHeader>

      {/* Main Controls (L1 Priority) */}
      <UnifiedCardContent className="border-b bg-muted/5 shrink-0 space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
           <span className="font-mono uppercase tracking-wider text-[10px]">Engine Status</span>
           <span className={cn("font-bold font-mono tracking-wide", isRunning ? "text-success-500" : "text-muted-foreground")}>
             {isRunning ? 'RUNNING' : 'STOPPED'}
           </span>
        </div>
        
        <Button 
          className={cn("w-full gap-2 shadow-sm transition-all h-10 text-sm font-semibold", isRunning ? "hover:bg-destructive/90 bg-destructive" : "hover:bg-primary/90 bg-primary")}
          size="sm"
          onClick={() => setRobotStatus(isRunning ? 'idle' : 'running')}
        >
          {isRunning ? (
            <>
              <StopCircleIcon className="w-4 h-4" /> STOP ENGINE
            </>
          ) : (
            <>
              <PlayIcon className="w-4 h-4" /> START ENGINE
            </>
          )}
        </Button>
      </UnifiedCardContent>

      {/* Configuration Area */}
      <ScrollArea className="flex-1">
        <UnifiedCardContent className="space-y-6">
          
          {/* Strategy Config */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
               <SettingsIcon className="w-3 h-3" /> Strategy Config
            </div>
            <AutomatedTradingConfig mode="compact" />
          </div>

          {/* UX Settings (L4 Context) */}
          <div className="space-y-3 pt-4 border-t border-border/50">
            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
               <MonitorIcon className="w-3 h-3" /> Interface Settings
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground">Density</label>
                <Select value={density} onValueChange={(v: any) => setDensity(v)}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="balanced">Balanced</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground">Expertise</label>
                <Select value={expertise} onValueChange={(v: any) => setExpertise(v)}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="trader">Trader</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

        </UnifiedCardContent>
      </ScrollArea>
    </div>
  );
}
