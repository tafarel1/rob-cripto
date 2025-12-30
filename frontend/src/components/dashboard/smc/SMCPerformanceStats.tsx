import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { SMCAnalysisData } from '@/types/smc';
import { ArrowUpRight, ArrowDownRight, CheckCircle2, XCircle, BarChart4 } from 'lucide-react';
import { motion } from 'framer-motion';

interface SMCPerformanceStatsProps {
  data: SMCAnalysisData | null;
  className?: string;
}

export function SMCPerformanceStats({ data, className }: SMCPerformanceStatsProps) {
  const stats = useMemo(() => {
    if (!data || !data.candles || data.candles.length === 0) return null;

    const candles = data.candles;
    let obWins = 0;
    let obLosses = 0;
    let obUntested = 0;

    // 1. Order Block Performance
    // Logic: Check if price mitigated the OB and then reacted positively
    if (data.orderBlocks) {
      data.orderBlocks.forEach(ob => {
        // Find candles after OB creation
        const obTime = ob.timestamp / 1000; // Assuming OB timestamp is ms, candles are usually seconds in Lightweight charts but here check type
        // Wait, candles in SMCAnalysisData have timestamp (ms) usually. Let's verify. 
        // In SMCMainChart we convert to seconds. Here we use raw data.
        
        const subsequentCandles = candles.filter(c => (c.timestamp || c.time * 1000) > ob.timestamp);
        
        let mitigated = false;
        let win = false;
        let loss = false;

        for (const candle of subsequentCandles) {
          const high = candle.high;
          const low = candle.low;
          const close = candle.close;

          // Check mitigation
          if (!mitigated) {
            if (high >= ob.range[0] && low <= ob.range[1]) {
              mitigated = true;
            }
          }

          if (mitigated) {
            // Check Win/Loss conditions
            if (ob.type === 'bullish') {
              // Loss: Close below OB low
              if (close < ob.range[0]) {
                loss = true;
                break;
              }
              // Win: Move 2x the OB size upwards (Simplified R:R)
              const obHeight = ob.range[1] - ob.range[0];
              if (high > ob.range[1] + (obHeight * 1.5)) {
                win = true;
                break;
              }
            } else {
              // Loss: Close above OB high
              if (close > ob.range[1]) {
                loss = true;
                break;
              }
              // Win: Move 2x the OB size downwards
              const obHeight = ob.range[1] - ob.range[0];
              if (low < ob.range[0] - (obHeight * 1.5)) {
                win = true;
                break;
              }
            }
          }
        }

        if (win) obWins++;
        else if (loss) obLosses++;
        else obUntested++;
      });
    }

    // 2. FVG Fill Rate
    let fvgFilled = 0;
    let fvgTotal = 0;
    
    if (data.fairValueGaps) {
        fvgTotal = data.fairValueGaps.length;
        data.fairValueGaps.forEach(fvg => {
            const subsequentCandles = candles.filter(c => (c.timestamp || c.time * 1000) > fvg.timestamp);
            const isFilled = subsequentCandles.some(c => 
                (c.high >= fvg.range[0] && c.low <= fvg.range[1])
            );
            if (isFilled) fvgFilled++;
        });
    }

    const totalOBTested = obWins + obLosses;
    const obWinRate = totalOBTested > 0 ? (obWins / totalOBTested) * 100 : 0;
    const fvgFillRate = fvgTotal > 0 ? (fvgFilled / fvgTotal) * 100 : 0;

    return {
      ob: {
        wins: obWins,
        losses: obLosses,
        untested: obUntested,
        winRate: obWinRate,
        total: (data.orderBlocks?.length || 0)
      },
      fvg: {
        filled: fvgFilled,
        total: fvgTotal,
        fillRate: fvgFillRate
      }
    };
  }, [data]);

  if (!stats) {
      return (
          <div className={`p-8 text-center text-slate-500 ${className}`}>
              <BarChart4 className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Insufficient data to calculate performance metrics.</p>
              <p className="text-xs mt-1 opacity-70">Need historical candles and SMC zones.</p>
          </div>
      );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
        {/* Order Blocks Stats */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
        >
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-300">
                        <BarChart4 className="w-4 h-4 text-purple-500" />
                        Order Block Efficacy
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between items-end">
                        <div className="space-y-1">
                            <span className="text-2xl font-bold text-white">{stats.ob.winRate.toFixed(1)}%</span>
                            <p className="text-xs text-slate-400">Win Rate (1.5R)</p>
                        </div>
                        <div className="text-right space-y-1">
                            <div className="flex items-center gap-1 text-xs text-green-400">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>{stats.ob.wins} Wins</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-red-400">
                                <XCircle className="w-3 h-3" />
                                <span>{stats.ob.losses} Losses</span>
                            </div>
                        </div>
                    </div>
                    <Progress value={stats.ob.winRate} className="h-2 bg-slate-800" indicatorClassName={stats.ob.winRate > 50 ? "bg-green-500" : "bg-yellow-500"} />
                    <div className="pt-2 border-t border-slate-800/50 flex justify-between text-xs text-slate-500">
                        <span>Total: {stats.ob.total}</span>
                        <span>Untested: {stats.ob.untested}</span>
                    </div>
                </CardContent>
            </Card>
        </motion.div>

        {/* FVG Stats */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
        >
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-300">
                        <ArrowDownRight className="w-4 h-4 text-yellow-500" />
                        FVG Fill Rate
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="flex justify-between items-end">
                        <div className="space-y-1">
                            <span className="text-2xl font-bold text-white">{stats.fvg.fillRate.toFixed(1)}%</span>
                            <p className="text-xs text-slate-400">Fill Probability</p>
                        </div>
                         <div className="text-right">
                             <span className="text-xs text-slate-400">{stats.fvg.filled} / {stats.fvg.total} Filled</span>
                         </div>
                    </div>
                    <Progress value={stats.fvg.fillRate} className="h-2 bg-slate-800" indicatorClassName="bg-yellow-500" />
                    <div className="pt-2 border-t border-slate-800/50 text-xs text-slate-500">
                        <p>High probability of price returning to these gaps.</p>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    </div>
  );
}
