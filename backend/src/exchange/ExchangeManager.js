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
            defaultType: 'spot', // Mudar para spot trading
            testnet: true
          }
        });
      } else {
        // Produção - usar chaves reais
        this.exchange = new ccxt.binance({
          apiKey: process.env.BINANCE_API_KEY,
          secret: process.env.BINANCE_SECRET_KEY,
          options: {
            defaultType: 'spot' // Mudar para spot trading
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

      // Para testnet sem chaves válidas, retornar dados mockados
      const isTestMode = !this.exchange.apiKey || this.exchange.apiKey === 'your_testnet_api_key' || this.exchange.apiKey === 'testnet_api_key_here';
      
      if (isTestMode) {
        return {
          success: true,
          data: {
            total: { USDT: 10000, BTC: 0.5, ETH: 5 },
            free: { USDT: 8000, BTC: 0.3, ETH: 3 },
            used: { USDT: 2000, BTC: 0.2, ETH: 2 },
            timestamp: Date.now()
          }
        };
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
      // Se falhar mesmo com chaves, retornar dados mockados para demonstração
      if (this.exchange && (!this.exchange.apiKey || this.exchange.apiKey === 'your_testnet_api_key' || this.exchange.apiKey === 'testnet_api_key_here')) {
        return {
          success: true,
          data: {
            total: { USDT: 10000, BTC: 0.5, ETH: 5 },
            free: { USDT: 8000, BTC: 0.3, ETH: 3 },
            used: { USDT: 2000, BTC: 0.2, ETH: 2 },
            timestamp: Date.now()
          }
        };
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  getTimeframeMs(timeframe) {
    const timeframes = {
      '1m': 60000,
      '3m': 180000,
      '5m': 300000,
      '15m': 900000,
      '30m': 1800000,
      '1h': 3600000,
      '2h': 7200000,
      '4h': 14400000,
      '6h': 21600000,
      '8h': 28800000,
      '12h': 43200000,
      '1d': 86400000,
      '3d': 259200000,
      '1w': 604800000,
      '1M': 2628000000
    };
    return timeframes[timeframe] || 3600000; // Default para 1h
  }

  async getMarketData(symbol = 'BTC/USDT', timeframe = '1h', limit = 100) {
    try {
      if (!this.isConnected) {
        throw new Error('Exchange não conectada');
      }

      // Para testnet sem chaves válidas, retornar dados mockados
      const isTestMode = !this.exchange.apiKey || this.exchange.apiKey === 'your_testnet_api_key' || this.exchange.apiKey === 'testnet_api_key_here';
      
      if (isTestMode) {
        // Gerar dados mockados de candlesticks
        const basePrice = 45000;
        const marketData = [];
        const now = Date.now();
        const timeframeMs = this.getTimeframeMs(timeframe);
        
        for (let i = limit - 1; i >= 0; i--) {
          const timestamp = now - (i * timeframeMs);
          const variation = (Math.random() - 0.5) * 0.02; // ±1% variação
          const open = basePrice * (1 + variation);
          const close = open * (1 + (Math.random() - 0.5) * 0.01);
          const high = Math.max(open, close) * (1 + Math.random() * 0.005);
          const low = Math.min(open, close) * (1 - Math.random() * 0.005);
          const volume = 100 + Math.random() * 500;
          
          marketData.push({
            timestamp,
            open: parseFloat(open.toFixed(2)),
            high: parseFloat(high.toFixed(2)),
            low: parseFloat(low.toFixed(2)),
            close: parseFloat(close.toFixed(2)),
            volume: parseFloat(volume.toFixed(6))
          });
        }
        
        return {
          success: true,
          data: marketData,
          timestamp: Date.now()
        };
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

      // Para testnet sem chaves válidas, retornar dados mockados
      const isTestMode = !this.exchange.apiKey || this.exchange.apiKey === 'your_testnet_api_key';
      
      if (isTestMode) {
        const basePrice = symbol.includes('BTC') ? 45000 : symbol.includes('ETH') ? 3000 : 100;
        const variation = (Math.random() - 0.5) * 0.02; // ±1% variação
        const last = basePrice * (1 + variation);
        const bid = last * 0.999;
        const ask = last * 1.001;
        const high = last * 1.02;
        const low = last * 0.98;
        const volume = 100 + Math.random() * 1000;
        const change = (Math.random() - 0.5) * 200;
        const percentage = (change / basePrice) * 100;
        
        return {
          success: true,
          data: {
            symbol: symbol,
            last: parseFloat(last.toFixed(2)),
            bid: parseFloat(bid.toFixed(2)),
            ask: parseFloat(ask.toFixed(2)),
            high: parseFloat(high.toFixed(2)),
            low: parseFloat(low.toFixed(2)),
            volume: parseFloat(volume.toFixed(6)),
            change: parseFloat(change.toFixed(2)),
            percentage: parseFloat(percentage.toFixed(2)),
            timestamp: Date.now()
          }
        };
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
      // Se falhar mesmo com chaves, retornar dados mockados para demonstração
      if (this.exchange && (!this.exchange.apiKey || this.exchange.apiKey === 'your_testnet_api_key')) {
        const basePrice = symbol.includes('BTC') ? 45000 : symbol.includes('ETH') ? 3000 : 100;
        const variation = (Math.random() - 0.5) * 0.02;
        const last = basePrice * (1 + variation);
        
        return {
          success: true,
          data: {
            symbol: symbol,
            last: parseFloat(last.toFixed(2)),
            bid: parseFloat((last * 0.999).toFixed(2)),
            ask: parseFloat((last * 1.001).toFixed(2)),
            high: parseFloat((last * 1.02).toFixed(2)),
            low: parseFloat((last * 0.98).toFixed(2)),
            volume: parseFloat((100 + Math.random() * 1000).toFixed(6)),
            change: parseFloat(((Math.random() - 0.5) * 200).toFixed(2)),
            percentage: parseFloat((((Math.random() - 0.5) * 200) / basePrice * 100).toFixed(2)),
            timestamp: Date.now()
          }
        };
      }
      
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
      
      // Para testnet sem chaves válidas, retornar ordem mockada
      const isTestMode = !this.exchange.apiKey || 
                        this.exchange.apiKey === 'your_testnet_api_key' || 
                        this.exchange.apiKey === 'your_binance_testnet_key' ||
                        this.exchange.apiKey.includes('your_');
      
      if (isTestMode) {
        const orderId = 'mock-order-' + Date.now();
        const currentPrice = price || (symbol.includes('BTC') ? 45000 : symbol.includes('ETH') ? 3000 : 100);
        const orderPrice = type === 'market' ? currentPrice : price;
        
        const mockOrder = {
          id: orderId,
          clientOrderId: orderId,
          timestamp: Date.now(),
          datetime: new Date().toISOString(),
          lastTradeTimestamp: Date.now(),
          symbol: symbol,
          type: type,
          side: side,
          price: parseFloat(orderPrice.toFixed(2)),
          amount: parseFloat(amount.toFixed(6)),
          cost: parseFloat((amount * orderPrice).toFixed(2)),
          average: parseFloat(orderPrice.toFixed(2)),
          filled: parseFloat(amount.toFixed(6)),
          remaining: 0,
          status: 'closed',
          fee: {
            cost: parseFloat((amount * orderPrice * 0.001).toFixed(2)),
            currency: symbol.split('/')[1]
          },
          trades: [],
          info: {
            orderId: orderId,
            clientOrderId: orderId,
            transactTime: Date.now(),
            price: orderPrice.toFixed(2),
            origQty: amount.toFixed(6),
            executedQty: amount.toFixed(6),
            status: 'FILLED',
            side: side.toUpperCase(),
            type: type.toUpperCase()
          }
        };
        
        this.orders.push(mockOrder);
        
        return {
          success: true,
          data: mockOrder,
          message: 'Ordem mockada criada com sucesso'
        };
      }
      
      const order = await this.exchange.createOrder(symbol, type, side, amount, price, params);
      
      this.orders.push(order);
      
      return {
        success: true,
        data: order,
        message: 'Ordem criada com sucesso'
      };
    } catch (error) {
      // Se falhar mesmo com chaves, retornar ordem mockada para demonstração
      if (this.exchange && (!this.exchange.apiKey || 
          this.exchange.apiKey === 'your_testnet_api_key' || 
          this.exchange.apiKey === 'your_binance_testnet_key' ||
          this.exchange.apiKey === 'testnet_api_key_here' ||
          this.exchange.apiKey.includes('your_') ||
          this.exchange.apiKey.includes('testnet') ||
          this.exchange.apiKey.includes('example'))) {
        const orderId = 'mock-order-' + Date.now();
        const currentPrice = price || (symbol.includes('BTC') ? 45000 : symbol.includes('ETH') ? 3000 : 100);
        const orderPrice = type === 'market' ? currentPrice : price;
        
        const mockOrder = {
          id: orderId,
          clientOrderId: orderId,
          timestamp: Date.now(),
          datetime: new Date().toISOString(),
          lastTradeTimestamp: Date.now(),
          symbol: symbol,
          type: type,
          side: side,
          price: parseFloat(orderPrice.toFixed(2)),
          amount: parseFloat(amount.toFixed(6)),
          cost: parseFloat((amount * orderPrice).toFixed(2)),
          average: parseFloat(orderPrice.toFixed(2)),
          filled: parseFloat(amount.toFixed(6)),
          remaining: 0,
          status: 'closed',
          fee: {
            cost: parseFloat((amount * orderPrice * 0.001).toFixed(2)),
            currency: symbol.split('/')[1]
          },
          trades: [],
          info: {
            orderId: orderId,
            clientOrderId: orderId,
            transactTime: Date.now(),
            price: orderPrice.toFixed(2),
            origQty: amount.toFixed(6),
            executedQty: amount.toFixed(6),
            status: 'FILLED',
            side: side.toUpperCase(),
            type: type.toUpperCase()
          }
        };
        
        this.orders.push(mockOrder);
        
        return {
          success: true,
          data: mockOrder,
          message: 'Ordem mockada criada com sucesso'
        };
      }
      
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

      // Para testnet sem chaves válidas, retornar cancelamento mockado
      const isTestMode = !this.exchange.apiKey || this.exchange.apiKey === 'your_testnet_api_key';
      
      if (isTestMode) {
        // Encontrar a ordem nos registros mockados
        const orderIndex = this.orders.findIndex(order => order.id === orderId);
        
        if (orderIndex !== -1) {
          // Atualizar status da ordem para cancelada
          this.orders[orderIndex].status = 'canceled';
          this.orders[orderIndex].remaining = this.orders[orderIndex].filled;
          this.orders[orderIndex].filled = 0;
          
          return {
            success: true,
            data: {
              id: orderId,
              symbol: symbol || this.orders[orderIndex].symbol,
              status: 'canceled',
              timestamp: Date.now(),
              info: {
                orderId: orderId,
                status: 'CANCELED',
                transactTime: Date.now()
              }
            },
            message: 'Ordem mockada cancelada com sucesso'
          };
        } else {
          // Se não encontrar a ordem, criar um cancelamento mockado mesmo assim
          return {
            success: true,
            data: {
              id: orderId,
              symbol: symbol || 'BTC/USDT',
              status: 'canceled',
              timestamp: Date.now(),
              info: {
                orderId: orderId,
                status: 'CANCELED',
                transactTime: Date.now()
              }
            },
            message: 'Ordem mockada cancelada com sucesso'
          };
        }
      }

      const result = await this.exchange.cancelOrder(orderId, symbol);
      
      return {
        success: true,
        data: result,
        message: 'Ordem cancelada com sucesso'
      };
    } catch (error) {
      // Se falhar mesmo com chaves, retornar cancelamento mockado para demonstração
      if (this.exchange && (!this.exchange.apiKey || this.exchange.apiKey === 'your_testnet_api_key')) {
        return {
          success: true,
          data: {
            id: orderId,
            symbol: symbol || 'BTC/USDT',
            status: 'canceled',
            timestamp: Date.now(),
            info: {
              orderId: orderId,
              status: 'CANCELED',
              transactTime: Date.now()
            }
          },
          message: 'Ordem mockada cancelada com sucesso'
        };
      }
      
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

  async disconnect() {
    this.exchange = null;
    this.isConnected = false;
    this.connectionStatus = 'disconnected';
    this.lastError = null;
    this.balance = null;
    this.positions = [];
    this.orders = [];
    return { success: true };
  }
}

export default ExchangeManager;
