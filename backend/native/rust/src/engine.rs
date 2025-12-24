use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct MarketData {
    pub symbol: String,
    pub timestamp: i64,
    pub open: f64,
    pub high: f64,
    pub low: f64,
    pub close: f64,
    pub volume: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct Fvg {
    pub top: f64,
    pub bottom: f64,
    pub direction: String, // "BULLISH" or "BEARISH"
    pub timestamp: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct OrderBlock {
    pub top: f64,
    pub bottom: f64,
    pub direction: String,
    pub timestamp: i64,
    pub volume_confirmed: bool,
}

pub struct SmcEngine {
    // History per symbol
    history: std::collections::HashMap<String, Vec<MarketData>>,
}

impl SmcEngine {
    pub fn new() -> Self {
        SmcEngine {
            history: std::collections::HashMap::new(),
        }
    }

    pub fn process_data(&mut self, data: MarketData) {
        let symbol = data.symbol.clone();
        let history = self.history.entry(symbol).or_insert(Vec::new());
        history.push(data);

        // Keep only last 1000 candles for optimization
        if history.len() > 1000 {
            history.remove(0);
        }

        // Run analysis
        self.analyze_structure(&symbol);
    }

    fn analyze_structure(&self, symbol: &str) {
        if let Some(data) = self.history.get(symbol) {
            if data.len() < 3 { return; }
            
            // Check for FVG
            // Bearish FVG: Low of candle i-2 > High of candle i
            // Bullish FVG: High of candle i-2 < Low of candle i
            let i = data.len() - 1; // current candle (forming) or last closed
            // We usually look at closed candles, so i-1, i-2, i-3
            if i < 3 { return; }

            let c1 = &data[i-1]; // Most recent closed
            let c2 = &data[i-2];
            let c3 = &data[i-3];

            // Bullish FVG
            if c3.high < c1.low {
                // Gap exists
                let _fvg = Fvg {
                    top: c1.low,
                    bottom: c3.high,
                    direction: "BULLISH".to_string(),
                    timestamp: c2.timestamp,
                };
                // In a real system, we'd emit this event
                // println!("Detected Bullish FVG on {}: {:?}", symbol, fvg);
            }

            // Bearish FVG
            if c3.low > c1.high {
                let _fvg = Fvg {
                    top: c3.low,
                    bottom: c1.high,
                    direction: "BEARISH".to_string(),
                    timestamp: c2.timestamp,
                };
                // println!("Detected Bearish FVG on {}: {:?}", symbol, fvg);
            }
        }
    }
}
