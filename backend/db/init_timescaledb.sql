-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Market Data Table (OHLCV)
CREATE TABLE IF NOT EXISTS market_data (
    time TIMESTAMPTZ NOT NULL,
    symbol TEXT NOT NULL,
    open DOUBLE PRECISION NOT NULL,
    high DOUBLE PRECISION NOT NULL,
    low DOUBLE PRECISION NOT NULL,
    close DOUBLE PRECISION NOT NULL,
    volume DOUBLE PRECISION NOT NULL,
    
    -- Additional Analysis Fields
    rsi DOUBLE PRECISION,
    atr DOUBLE PRECISION,
    
    CONSTRAINT market_data_pkey PRIMARY KEY (time, symbol)
);

-- Convert to Hypertable (Partition by time)
SELECT create_hypertable('market_data', 'time', if_not_exists => TRUE);

-- Compression Policy (Optimize storage for old data)
ALTER TABLE market_data SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'symbol'
);

SELECT add_compression_policy('market_data', INTERVAL '7 days');

-- Trading Signals Table
CREATE TABLE IF NOT EXISTS trading_signals (
    id SERIAL,
    time TIMESTAMPTZ NOT NULL,
    symbol TEXT NOT NULL,
    type TEXT NOT NULL, -- BUY/SELL
    price DOUBLE PRECISION NOT NULL,
    stop_loss DOUBLE PRECISION,
    take_profit DOUBLE PRECISION[],
    confidence DOUBLE PRECISION,
    reason TEXT,
    
    -- Metadata (JSONB for flexibility)
    analysis_snapshot JSONB,
    
    CONSTRAINT trading_signals_pkey PRIMARY KEY (time, symbol, type)
);

SELECT create_hypertable('trading_signals', 'time', if_not_exists => TRUE);

-- Indexes for fast lookup
CREATE INDEX ON market_data (symbol, time DESC);
CREATE INDEX ON trading_signals (symbol, time DESC);
