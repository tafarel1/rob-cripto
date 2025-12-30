import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { ThemeMode } from './SMCTheming';

export interface SMCTooltipData {
  x: number;
  y: number;
  items: Array<{
    label: string;
    value: string;
    color?: string;
    subValue?: string;
  }>;
}

export function SMCTooltip({ data, themeMode = 'professional_dark' }: { data: SMCTooltipData | null, themeMode?: ThemeMode }) {
  if (!data || data.items.length === 0) return null;

  const isLight = themeMode === 'light_analyst';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1, x: data.x + 20, y: data.y }}
      transition={{ duration: 0.1 }}
      className="absolute z-50 pointer-events-none"
      style={{ top: 0, left: 0 }}
    >
      <Card className={`p-3 backdrop-blur-md shadow-xl min-w-[180px] ${isLight ? 'bg-white/90 border-slate-200' : 'bg-slate-950/90 border-slate-800'}`}>
        <div className="space-y-2">
          {data.items.map((item, index) => (
            <div key={index} className={`flex flex-col gap-1 border-b last:border-0 pb-1 last:pb-0 ${isLight ? 'border-slate-200' : 'border-slate-800/50'}`}>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] uppercase tracking-wider font-semibold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{item.label}</span>
                {item.color && <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />}
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-sm font-mono font-medium ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>{item.value}</span>
              </div>
              {item.subValue && (
                <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>{item.subValue}</span>
              )}
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}
