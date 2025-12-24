use crate::smc::types::{Candle, FairValueGap, OrderBlock, SMCAnalysis, Trend};

pub struct SMCCalculator;

impl SMCCalculator {
    pub fn new() -> Self {
        Self
    }

    pub fn analyze(&self, candles: &[Candle]) -> SMCAnalysis {
        if candles.len() < 3 {
            return SMCAnalysis {
                order_blocks: vec![],
                fvgs: vec![],
                trend: Trend::Ranging,
            };
        }

        let order_blocks = self.detect_order_blocks(candles);
        let fvgs = self.detect_fvgs(candles);
        let trend = self.detect_trend(candles);

        SMCAnalysis {
            order_blocks,
            fvgs,
            trend,
        }
    }

    fn detect_trend(&self, candles: &[Candle]) -> Trend {
        // Simple MA logic for now or structure based
        let len = candles.len();
        if candles[len-1].close > candles[len-1].open {
            Trend::Bullish
        } else {
            Trend::Bearish
        }
    }

    fn detect_fvgs(&self, candles: &[Candle]) -> Vec<FairValueGap> {
        let mut fvgs = Vec::new();
        
        for i in 2..candles.len() {
            let prev2 = &candles[i-2]; // Candle A
            let _prev1 = &candles[i-1]; // Candle B
            let current = &candles[i];  // Candle C
            
            // Bullish FVG: High of A < Low of C
            if prev2.high < current.low {
                fvgs.push(FairValueGap {
                    trend: Trend::Bullish,
                    top: current.low,
                    bottom: prev2.high,
                    filled: false,
                    candle_index: i-1,
                });
            }
            
            // Bearish FVG: Low of A > High of C
            if prev2.low > current.high {
                fvgs.push(FairValueGap {
                    trend: Trend::Bearish,
                    top: prev2.low,
                    bottom: current.high,
                    filled: false,
                    candle_index: i-1,
                });
            }
        }
        
        fvgs
    }

    fn detect_order_blocks(&self, candles: &[Candle]) -> Vec<OrderBlock> {
        let mut obs = Vec::new();
        
        // Simplified detection: 
        // Bullish OB: Last bearish candle before a strong move up (breaking structure or FVG)
        // Bearish OB: Last bullish candle before a strong move down
        
        for i in 2..candles.len()-1 {
            let current = &candles[i];
            let next = &candles[i+1];
            
            // Potential Bullish OB
            if current.close < current.open { // Bearish Candle
                if next.close > next.open && next.close > current.high { // Engulfing-ish
                     obs.push(OrderBlock {
                        trend: Trend::Bullish,
                        top: current.high,
                        bottom: current.low,
                        mitigation: false,
                        candle_index: i,
                        strength: 0.8,
                     });
                }
            }
            
            // Potential Bearish OB
            if current.close > current.open { // Bullish Candle
                if next.close < next.open && next.close < current.low { // Engulfing-ish
                     obs.push(OrderBlock {
                        trend: Trend::Bearish,
                        top: current.high,
                        bottom: current.low,
                        mitigation: false,
                        candle_index: i,
                        strength: 0.8,
                     });
                }
            }
        }
        
        obs
    }
}
