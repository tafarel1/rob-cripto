import React, { useState } from 'react';
import { useDashboard } from '@/contexts/DashboardContext';
import { useSocket } from '@/contexts/SocketContext';
import { WifiIcon, WifiOffIcon, ActivityIcon, ClockIcon, DatabaseIcon, ShieldIcon, TerminalIcon, ChevronUpIcon, ChevronDownIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { UnifiedExecutionLog } from './UnifiedExecutionLog';

export function UnifiedStatusBar() {
  const { activeSymbol, activeTimeframe, accountType } = useDashboard();
  const { isConnected, latency } = useSocket();
  const [showLog, setShowLog] = useState(false);

  return (
    <>
      {/* Execution Log Overlay */}
      {showLog && (
        <div className="fixed bottom-6 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t shadow-[0_-4px_6px_-1px_hsl(var(--foreground)/0.1)] animate-in slide-in-from-bottom-2 duration-200">
           <UnifiedExecutionLog className="h-64 rounded-none border-x-0 border-b-0 border-t-0" />
        </div>
      )}

      <div className="h-6 bg-muted/40 border-t flex items-center justify-between px-3 text-xxs md:text-xs text-muted-foreground select-none relative z-50">
        {/* Left: Context Info */}
        <div className="flex items-center gap-4">
          <div 
            className={cn(
              "flex items-center gap-1.5 px-2 -ml-2 h-6 cursor-pointer hover:bg-muted/80 transition-colors",
              showLog && "bg-muted text-foreground"
            )}
            onClick={() => setShowLog(!showLog)}
          >
            <TerminalIcon className="h-3 w-3" />
            <span className="font-medium hidden sm:inline">System Logs</span>
            {showLog ? <ChevronDownIcon className="h-3 w-3" /> : <ChevronUpIcon className="h-3 w-3" />}
          </div>

          <div className="w-px h-3 bg-border" />

          <div className="flex items-center gap-1.5">
            <ActivityIcon className="h-3 w-3" />
            <span className="font-medium">{activeSymbol}</span>
            <span className="text-muted-foreground/50">|</span>
            <span>{activeTimeframe}</span>
          </div>
          
          <div className="hidden md:flex items-center gap-1.5">
            <ShieldIcon className="h-3 w-3" />
            <span className={cn(
              "capitalize font-medium",
              accountType === 'real' ? "text-orange-500" : "text-blue-500"
            )}>
              {accountType} Mode
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1.5">
            <DatabaseIcon className="h-3 w-3" />
            <span>v2.4.1</span>
          </div>
        </div>

        {/* Right: System Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <ClockIcon className="h-3 w-3" />
            <span>{new Date().toLocaleTimeString()}</span>
          </div>

          <div className="flex items-center gap-1.5" title={`Latency: ${latency}ms`}>
            {isConnected ? (
              <>
                <WifiIcon className="h-3 w-3 text-emerald-500" />
                <span className="text-emerald-500 font-medium">Connected</span>
                <span className="text-muted-foreground/50 hidden sm:inline">({latency}ms)</span>
              </>
            ) : (
              <>
                <WifiOffIcon className="h-3 w-3 text-red-500" />
                <span className="text-red-500 font-medium">Disconnected</span>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
