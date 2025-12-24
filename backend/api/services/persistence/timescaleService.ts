import { MarketData, TradingSignal } from '../../../../shared/types';
import { Pool } from 'pg';

export class TimescaleService {
  private pool: Pool;
  private isConnected: boolean = false;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
    });
  }

  async connect() {
    try {
      await this.pool.connect();
      this.isConnected = true;
      console.log('✅ Connected to TimescaleDB');
      await this.initDB();
    } catch (error) {
      console.warn('⚠️ TimescaleDB connection failed (Running in memory-only mode):', error);
      this.isConnected = false;
    }
  }

  private async initDB() {
    if (!this.isConnected) return;
    
    // Create tables and hypertables if they don't exist
    // Note: In production, use migrations. This is for auto-init.
    const query = `
      CREATE TABLE IF NOT EXISTS market_data (
        time TIMESTAMPTZ NOT NULL,
        symbol TEXT NOT NULL,
        open DOUBLE PRECISION,
        high DOUBLE PRECISION,
        low DOUBLE PRECISION,
        close DOUBLE PRECISION,
        volume DOUBLE PRECISION
      );
      
      -- Convert to hypertable (TimescaleDB specific)
      -- We catch error in case it's already a hypertable or extension missing
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM timescaledb_information.hypertables WHERE hypertable_name = 'market_data') THEN
          PERFORM create_hypertable('market_data', 'time');
        END IF;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not create hypertable, standard table used';
      END
      $$;

      CREATE TABLE IF NOT EXISTS trading_signals (
        time TIMESTAMPTZ NOT NULL,
        symbol TEXT NOT NULL,
        type TEXT NOT NULL,
        price DOUBLE PRECISION,
        confidence DOUBLE PRECISION,
        reason TEXT,
        metadata JSONB
      );
    `;
    
    try {
      await this.pool.query(query);
    } catch (err) {
      console.error('Error initializing DB schema:', err);
    }
  }

  async saveMarketData(symbol: string, data: MarketData[]) {
    if (!this.isConnected) return;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      const insertQuery = `
        INSERT INTO market_data (time, symbol, open, high, low, close, volume)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT DO NOTHING
      `;

      for (const candle of data) {
        await client.query(insertQuery, [
          new Date(candle.timestamp),
          symbol,
          candle.open,
          candle.high,
          candle.low,
          candle.close,
          candle.volume
        ]);
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('Error saving market data:', e);
    } finally {
      client.release();
    }
  }

  async saveSignal(symbol: string, signal: TradingSignal) {
    if (!this.isConnected) return;

    try {
      await this.pool.query(
        `INSERT INTO trading_signals (time, symbol, type, price, confidence, reason, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          new Date(signal.timestamp),
          symbol,
          signal.type,
          signal.entryPrice,
          signal.confidence,
          signal.reason,
          JSON.stringify(signal)
        ]
      );
    } catch (e) {
      console.error('Error saving signal:', e);
    }
  }
}
