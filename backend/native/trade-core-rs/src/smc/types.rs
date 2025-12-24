use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct Candle {
    pub open: f64,
    pub high: f64,
    pub low: f64,
    pub close: f64,
    pub volume: f64,
    pub timestamp: i64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum Trend {
    Bullish,
    Bearish,
    Ranging,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderBlock {
    pub trend: Trend,
    pub top: f64,
    pub bottom: f64,
    pub mitigation: bool,
    pub candle_index: usize,
    pub strength: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FairValueGap {
    pub trend: Trend,
    pub top: f64,
    pub bottom: f64,
    pub filled: bool,
    pub candle_index: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SMCAnalysis {
    pub order_blocks: Vec<OrderBlock>,
    pub fvgs: Vec<FairValueGap>,
    pub trend: Trend,
}
