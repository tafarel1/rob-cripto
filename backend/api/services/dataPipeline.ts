import * as fs from 'fs';
import * as path from 'path';
import { MarketData } from '../../../shared/types';
import { nativeBridge } from './nativeBridge';
import { EventEmitter } from 'events';

export class MarketDataPipeline extends EventEmitter {
  private dataDir: string;
  private isStreaming: boolean = false;
  private currentCandles: Map<string, MarketData> = new Map();

  constructor() {
    super();
    this.dataDir = path.join(process.cwd(), 'data', 'market');
    this.ensureDataDir();
    this.setupRustBridge();
  }

  private ensureDataDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  private setupRustBridge() {
    // Listen for real-time market data from Rust
    nativeBridge.on('market_data', (data: any) => {
        this.processRealtimeData(data);
    });
  }

  public async startStream(symbols: string[] = ['btcusdt', 'ethusdt']) {
      if (this.isStreaming) return;
      
      try {
          // Send command to Rust to start WebSocket stream
          // Note: In a real scenario, we might pass specific symbols
          await nativeBridge.executeRustTask('start_market_stream', { symbols });
          this.isStreaming = true;
          console.log('[DataPipeline] Started High-Performance Market Stream via Rust');
      } catch (error) {
          console.error('[DataPipeline] Failed to start market stream:', error);
      }
  }

  private processRealtimeData(raw: any) {
      // Handle Binance WebSocket Payload format
      // e: event type, s: symbol, p: price, etc.
      
      // We are interested in 'kline' (candlestick) updates for OHLCV
      // But currently Rust sends 'aggTrade' mostly. 
      // If we receive 'kline' (from kline stream), we process it.
      // If we receive 'aggTrade', we might just emit price updates.

      if (raw.e === 'kline') {
          const k = raw.k;
          const candle: MarketData = {
              timestamp: k.t,
              open: parseFloat(k.o),
              high: parseFloat(k.h),
              low: parseFloat(k.l),
              close: parseFloat(k.c),
              volume: parseFloat(k.v),
              symbol: raw.s
          };

          // Update internal cache
          this.currentCandles.set(raw.s, candle);
          
          // Emit normalized event for TradingEngine
          this.emit('candle_update', candle);
      } else if (raw.e === 'aggTrade') {
          // Lightweight price update
          this.emit('price_update', {
              symbol: raw.s,
              price: parseFloat(raw.p),
              quantity: parseFloat(raw.q),
              timestamp: raw.T
          });
      }
  }

  /**
   * Loads OHLCV data from a CSV file.
   * Expected CSV format: timestamp,open,high,low,close,volume
   */
  public async loadFromCSV(filename: string): Promise<MarketData[]> {
    const filePath = path.join(this.dataDir, filename);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = await fs.promises.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    const data: MarketData[] = [];

    // Skip header if exists (simple check for non-numeric first char)
    let startIdx = 0;
    if (isNaN(parseInt(lines[0][0]))) {
      startIdx = 1;
    }

    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const [ts, o, h, l, c, v] = line.split(',');
      
      data.push({
        timestamp: parseInt(ts) || new Date(ts).getTime(),
        open: parseFloat(o),
        high: parseFloat(h),
        low: parseFloat(l),
        close: parseFloat(c),
        volume: parseFloat(v),
        symbol: 'UNKNOWN' // Usually defined by filename
      });
    }

    // Sort by timestamp just in case
    return data.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Normalizes data (handles missing candles via interpolation).
   */
  public normalizeData(data: MarketData[], intervalMs: number = 60000): MarketData[] {
    if (data.length < 2) return data;

    const normalized: MarketData[] = [];
    normalized.push(data[0]);

    for (let i = 1; i < data.length; i++) {
      const prev = normalized[normalized.length - 1];
      const curr = data[i];
      const diff = curr.timestamp - prev.timestamp;

      if (diff > intervalMs * 1.5) {
        // Gap detected
        const missingCount = Math.floor(diff / intervalMs) - 1;
        if (missingCount > 0) {
          // Linear interpolation
          for (let j = 1; j <= missingCount; j++) {
            const ratio = j / (missingCount + 1);
            normalized.push({
              timestamp: prev.timestamp + (intervalMs * j),
              open: prev.close + (curr.open - prev.close) * ratio,
              high: Math.max(prev.close, curr.open), // Simplified
              low: Math.min(prev.close, curr.open),  // Simplified
              close: prev.close + (curr.close - prev.close) * ratio,
              volume: 0, // No volume in gap
              symbol: curr.symbol
            });
          }
        }
      }
      normalized.push(curr);
    }
    return normalized;
  }
  
  public async saveToCSV(filename: string, data: MarketData[]) {
      const header = "timestamp,open,high,low,close,volume\n";
      const rows = data.map(d => `${d.timestamp},${d.open},${d.high},${d.low},${d.close},${d.volume}`).join('\n');
      await fs.promises.writeFile(path.join(this.dataDir, filename), header + rows);
  }
}
