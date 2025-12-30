import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Droplets, Layers } from 'lucide-react';

export interface SMCZoneAlert {
  type: 'Order Block' | 'FVG' | 'Liquidity' | 'Structure';
  side: 'Bullish' | 'Bearish' | 'Neutral';
  price: number;
  label: string;
}

interface SMCVisualAlertProps {
  alert: SMCZoneAlert | null;
}

export function SMCVisualAlert({ alert }: SMCVisualAlertProps) {
  return (
    <AnimatePresence>
      {alert && (
        <motion.div
          initial={{ y: -20, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -20, opacity: 0, scale: 0.95 }}
          className={`absolute top-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2 rounded-full border backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.3)]
            ${alert.side === 'Bullish' 
              ? 'bg-green-950/40 border-green-500/30 text-green-400' 
              : alert.side === 'Bearish'
                ? 'bg-red-950/40 border-red-500/30 text-red-400'
                : 'bg-slate-900/40 border-slate-500/30 text-slate-400'
            }
          `}
        >
          <div className="relative flex items-center justify-center">
            {alert.type === 'Liquidity' ? <Droplets className="w-5 h-5" /> :
             alert.type === 'Order Block' ? <Layers className="w-5 h-5" /> :
             alert.side === 'Bullish' ? <TrendingUp className="w-5 h-5" /> : 
             <TrendingDown className="w-5 h-5" />}
            
            {/* Pulse Effect */}
            <motion.div
              animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
              className={`absolute inset-0 rounded-full ${
                alert.side === 'Bullish' ? 'bg-green-500' : 
                alert.side === 'Bearish' ? 'bg-red-500' : 'bg-slate-500'
              }`}
            />
          </div>

          <div className="flex flex-col leading-tight">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{alert.type} DETECTED</span>
            <span className="text-sm font-semibold whitespace-nowrap">{alert.label}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
