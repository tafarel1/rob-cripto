import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LayersIcon, SettingsIcon } from '@/components/ui/icons';
import { RefreshCw, Moon, Sun, Terminal, Play, Pause, SkipForward, SkipBack, FastForward } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeMode } from './SMCTheming';

export interface SMCFloatingControlsProps {
  layerVisibility: {
    liquidity: boolean;
    orderBlocks: boolean;
    fvg: boolean;
    structure: boolean;
    premiumDiscount: boolean;
    sessions: boolean;
  };
  layerOpacity: {
    liquidity: number;
    orderBlocks: number;
    fvg: number;
    structure: number;
    premiumDiscount: number;
    sessions: number;
  };
  onToggleLayer: (layer: string) => void;
  onChangeOpacity: (layer: string, value: number) => void;
  analysisMode: 'quick' | 'deep' | 'backtest';
  onModeChange: (mode: 'quick' | 'deep' | 'backtest') => void;
  currentTheme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  expanded: boolean;
  onToggleExpand: () => void;
  
  // Replay Props
  isReplaying: boolean;
  onToggleReplay: () => void;
  replaySpeed: number;
  onReplaySpeedChange: (speed: number) => void;
  onReplayStep: (direction: 'forward' | 'backward') => void;
}

export function SMCFloatingControls({
  layerVisibility,
  layerOpacity,
  onToggleLayer,
  onChangeOpacity,
  analysisMode,
  onModeChange,
  currentTheme,
  onThemeChange,
  expanded,
  onToggleExpand,
  isReplaying,
  onToggleReplay,
  replaySpeed,
  onReplaySpeedChange,
  onReplayStep
}: SMCFloatingControlsProps) {
  
  const layers = [
    { id: 'liquidity', label: 'Liquidity Zones', color: 'bg-blue-500' },
    { id: 'orderBlocks', label: 'Order Blocks', color: 'bg-purple-500' },
    { id: 'fvg', label: 'Fair Value Gaps', color: 'bg-yellow-500' },
    { id: 'structure', label: 'Market Structure', color: 'bg-slate-500' },
    { id: 'premiumDiscount', label: 'Premium/Discount', color: 'bg-green-500' },
    { id: 'sessions', label: 'Session Liquidity', color: 'bg-orange-500' },
  ];

  return (
    <motion.div 
      initial={false}
      animate={{ width: expanded ? 320 : 48, height: expanded ? 'auto' : 48 }}
      className="absolute bottom-4 right-4 z-20"
    >
      <Card className="border-slate-800 bg-slate-950/90 backdrop-blur-md shadow-2xl overflow-hidden flex flex-col h-full">
        {/* Header / Toggle Button */}
        <div className="flex items-center justify-between p-3 border-b border-slate-800/50">
          {expanded && (
             <div className="flex items-center gap-2">
               <LayersIcon className="w-4 h-4 text-primary" />
               <span className="text-sm font-semibold">Chart Layers</span>
             </div>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 ml-auto" 
            onClick={onToggleExpand}
            title={expanded ? "Collapse" : "Expand Controls"}
          >
            {expanded ? <SettingsIcon className="w-4 h-4" /> : <LayersIcon className="w-4 h-4" />}
          </Button>
        </div>

        {/* Content */}
        <AnimatePresence>
          {expanded && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4 space-y-6"
            >
              {/* Mode Selector */}
              <div className="space-y-2">
                <Label className="text-xs text-slate-400">Analysis Mode</Label>
                <Select value={analysisMode} onValueChange={(v: any) => onModeChange(v)}>
                  <SelectTrigger className="h-8 text-xs bg-slate-900 border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quick">⚡ Quick Scan</SelectItem>
                    <SelectItem value="deep">🔍 Deep Analysis</SelectItem>
                    <SelectItem value="backtest">⏪ Backtesting</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Replay Controls - Only in Backtest Mode */}
              <AnimatePresence>
                {analysisMode === 'backtest' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-2 bg-slate-900/50 p-2 rounded-md border border-slate-800"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-white"
                        onClick={() => onReplayStep('backward')}
                        title="Step Back"
                      >
                        <SkipBack className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant={isReplaying ? "destructive" : "default"}
                        size="icon"
                        className={`h-8 w-8 ${isReplaying ? '' : 'bg-primary text-primary-foreground'}`}
                        onClick={onToggleReplay}
                        title={isReplaying ? "Pause" : "Play"}
                      >
                        {isReplaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-white"
                        onClick={() => onReplayStep('forward')}
                        title="Step Forward"
                      >
                        <SkipForward className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2 px-1">
                      <FastForward className="w-3 h-3 text-slate-500" />
                      <Slider
                        value={[replaySpeed]}
                        min={100}
                        max={2000}
                        step={100}
                        // Invert logic: Lower value = Faster speed (interval ms)
                        // But for UI, Right = Faster. So we need to map.
                        // Let's pass raw interval ms for now and handle mapping if needed.
                        // Actually, let's treat `replaySpeed` as multiplier (1x, 2x, etc) or just interval ms inverted?
                        // Let's stick to simple: Left (Slow) -> Right (Fast)
                        // Range: 2000ms (Slow) -> 100ms (Fast)
                        onValueChange={(vals) => onReplaySpeedChange(vals[0])}
                        className="flex-1"
                      />
                      <span className="text-[10px] text-slate-400 w-8 text-right">
                        {Math.round(2000 / replaySpeed)}x
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Theme Selector */}
              <div className="space-y-2">
                <Label className="text-xs text-slate-400">Visual Theme</Label>
                <div className="flex gap-1 bg-slate-900 p-1 rounded-md border border-slate-700">
                  {[
                    { id: 'professional_dark', icon: Moon, label: 'Dark' },
                    { id: 'light_analyst', icon: Sun, label: 'Light' },
                    { id: 'terminal_classic', icon: Terminal, label: 'Term' },
                  ].map((theme) => (
                    <Button
                      key={theme.id}
                      variant={currentTheme === theme.id ? 'secondary' : 'ghost'}
                      size="sm"
                      className={`flex-1 h-7 text-[10px] ${currentTheme === theme.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                      onClick={() => onThemeChange(theme.id as ThemeMode)}
                      title={theme.label}
                    >
                      <theme.icon className="w-3 h-3 mr-1" />
                      {theme.label}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator className="bg-slate-800/50" />

              {/* Layers List */}
              <div className="space-y-4">
                <Label className="text-xs text-slate-400">Visibility & Opacity</Label>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {layers.map(layer => (
                    <div key={layer.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${layer.color}`} />
                          <span className="text-xs font-medium">{layer.label}</span>
                        </div>
                        <Switch 
                          checked={layerVisibility[layer.id as keyof typeof layerVisibility]}
                          onCheckedChange={() => onToggleLayer(layer.id)}
                          className="scale-75"
                        />
                      </div>
                      
                      {/* Opacity Slider - Only visible if layer is active */}
                      <AnimatePresence>
                        {layerVisibility[layer.id as keyof typeof layerVisibility] && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="pl-4 pr-1"
                          >
                            <Slider 
                              value={[layerOpacity[layer.id as keyof typeof layerOpacity] * 100]}
                              min={10}
                              max={100}
                              step={10}
                              onValueChange={(vals) => onChangeOpacity(layer.id, vals[0] / 100)}
                              className="py-2"
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
