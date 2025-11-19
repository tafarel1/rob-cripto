import ccxt from 'ccxt';
import dotenv from 'dotenv';

dotenv.config();

class ExchangeManager {
  constructor() {
    this.exchange = null;
    this.isConnected = false;
    this.connectionStatus = 'disconnected';
    this.lastError = null;
    this.balance = null;
    this.positions = [];
    this.orders = [];
  }

  async initialize() {
    try {
      const mode = process.env.EXCHANGE_MODE || 'testnet';
      
      if (mode === 'testnet') {
        // Configuração Binance Testnet
        this.exchange = new ccxt.binance({
          apiKey: process.env.BINANCE_TESTNET_API_KEY,
          secret: process.env.BINANCE_TESTNET_SECRET_KEY,
          urls: {
            api: {
              public: 'https://testnet.binance.vision/api',
              private: 'https://testnet.binance.vision/api',
            }
          },
          options: {
            defaultType: 'future',
            testnet: true
          }
        });
      } else {
        // Produção - usar chaves reais
        this.exchange = new ccxt.binance({
          apiKey: process.env.BINANCE_API_KEY,
          secret: process.env.BINANCE_SECRET_KEY,
          options: {
            defaultType: 'future'
          }
        });
      }

      // Testar conexão
      await this.testConnection();
      
      console.log(`✅ Exchange conectada: ${mode === 'testnet' ? 'Binance Testnet' : 'Binance Produção'}`);
      this.isConnected = true;
      this.connectionStatus = 'connected';
      
      return { success: true, message: 'Exchange conectada com sucesso' };
      
    } catch (error) {
      console.error('❌ Erro ao conectar exchange:', error.message);
      this.lastError = error.message;
      this.connectionStatus = 'error';
      
      return { 
        success: false, 
        error: error.message,
        message: 'Erro ao conectar exchange - usando modo simulação'
      };
    }
  }

  async testConnection() {
    try {
      // Testar conexão buscando informações básicas
      const time = await this.exchange.fetchTime();
      const symbols = await this.exchange.fetchMarkets();
      
      console.log(`⏰ Horário do servidor: ${new Date(time).toISOString()}`);
      console.log(`📊 Mercados disponíveis: ${symbols.length}`);
      
      return true;
    } catch (error) {
      throw new Error(`Falha no teste de conexão: ${error.message}`);
    }
  }

  async getBalance() {
    try {
      if (!this.isConnected) {
        throw new Error('Exchange não conectada');
      }

      const balance = await this.exchange.fetchBalance();
      this.balance = balance;
      
      return {
        success: true,
        data: {
          total: balance.total,
          free: balance.free,
          used: balance.used,
          timestamp: Date.now()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getMarketData(symbol = 'BTC/USDT', timeframe = '1h', limit = 100) {
    try {
      if (!this.isConnected) {
        throw new Error('Exchange não conectada');
      }

      const ohlcv = await this.exchange.fetchOHLCV(symbol, timeframe, undefined, limit);
      
      // Converter para formato mais amigável
      const marketData = ohlcv.map(candle => ({
        timestamp: candle[0],
        open: candle[1],
        high: candle[2],
        low: candle[3],
        close: candle[4],
        volume: candle[5]
      }));

      return {
        success: true,
        data: marketData,
        symbol,
        timeframe,
        count: marketData.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getTicker(symbol = 'BTC/USDT') {
    try {
      if (!this.isConnected) {
        throw new Error('Exchange não conectada');
      }

      const ticker = await this.exchange.fetchTicker(symbol);
      
      return {
        success: true,
        data: {
          symbol: ticker.symbol,
          last: ticker.last,
          bid: ticker.bid,
          ask: ticker.ask,
          high: ticker.high,
          low: ticker.low,
          volume: ticker.baseVolume,
          change: ticker.change,
          percentage: ticker.percentage,
          timestamp: ticker.timestamp
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async createOrder(symbol, type, side, amount, price = undefined, params = {}) {
    try {
      if (!this.isConnected) {
        throw new Error('Exchange não conectada');
      }

      console.log(`📈 Criando ordem: ${side} ${type} ${amount} ${symbol} @ ${price || 'market'}`);
      
      const order = await this.exchange.createOrder(symbol, type, side, amount, price, params);
      
      this.orders.push(order);
      
      return {
        success: true,
        data: order,
        message: 'Ordem criada com sucesso'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Erro ao criar ordem'
      };
    }
  }

  async getOpenOrders(symbol = undefined) {
    try {
      if (!this.isConnected) {
        throw new Error('Exchange não conectada');
      }

      const orders = await this.exchange.fetchOpenOrders(symbol);
      
      return {
        success: true,
        data: orders,
        count: orders.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async cancelOrder(orderId, symbol = undefined) {
    try {
      if (!this.isConnected) {
        throw new Error('Exchange não conectada');
      }

      const result = await this.exchange.cancelOrder(orderId, symbol);
      
      return {
        success: true,
        data: result,
        message: 'Ordem cancelada com sucesso'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      status: this.connectionStatus,
      lastError: this.lastError,
      exchange: this.exchange ? this.exchange.name : null,
      mode: process.env.EXCHANGE_MODE || 'testnet'
    };
  }

  getOrders() {
    return {
      success: true,
      data: this.orders,
      count: this.orders.length
    };
  }
}

export default ExchangeManager;