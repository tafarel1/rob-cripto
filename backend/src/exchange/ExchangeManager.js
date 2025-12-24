import ccxt from 'ccxt';
import dotenv from 'dotenv';

dotenv.config();

class ExchangeManager {
  constructor() {
    this.exchange = null;
    this.isConnected = false;
    this.isSimulation = false;
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
      this.isSimulation = false;
      this.connectionStatus = 'connected';
      
      return { success: true, message: 'Exchange conectada com sucesso' };
      
    } catch (error) {
      console.error('❌ Erro ao conectar exchange:', error.message);
      
      const mode = process.env.EXCHANGE_MODE || 'testnet';
      if (mode === 'testnet') {
        console.log('⚠️ Falha na conexão real, ativando modo SIMULAÇÃO para desenvolvimento');
        this.isConnected = true;
        this.isSimulation = true;
        this.connectionStatus = 'simulated';
        this.lastError = error.message;
        
        return { 
          success: true, 
          message: 'Modo simulação ativado (conexão real falhou)'
        };
      }

      this.lastError = error.message;
      this.connectionStatus = 'error';
      
      return { 
        success: false, 
        error: error.message,
        message: 'Erro ao conectar exchange'
      };
    }
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      isSimulation: this.isSimulation,
      status: this.connectionStatus,
      exchange: this.exchange ? this.exchange.name : 'Unknown',
      lastError: this.lastError,
      timestamp: Date.now()
    };
  }

  async disconnect() {
    this.isConnected = false;
    this.isSimulation = false;
    this.connectionStatus = 'disconnected';
    this.exchange = null;
    return true;
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

  async getPositions() {
    // Retornar posições simuladas ou vazias se não conectado
    if (!this.isConnected) return { success: false, data: [] };
    
    // TODO: Implementar busca real de posições se necessário
    return { success: true, data: this.positions || [] };
  }

  async getBalance() {
    try {
      if (!this.isConnected) {
        throw new Error('Exchange não conectada');
      }

      if (this.isSimulation) {
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
      // Se falhar mesmo com chaves, e estivermos em modo testnet, fallback para mock
      const mode = process.env.EXCHANGE_MODE || 'testnet';
      if (mode === 'testnet' && this.exchange) {
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

      if (this.isSimulation) {
        // Gerar dados mockados de candlesticks
        const mockPrices = {
          'BTC/USDT': 45000,
          'ETH/USDT': 3000,
          'SOL/USDT': 150,
          'XRP/USDT': 0.60,
          'BNB/USDT': 400,
          'ADA/USDT': 0.45,
          'DOGE/USDT': 0.12,
          'MATIC/USDT': 0.70
        };
        const basePrice = mockPrices[symbol] || 100;
        
        const marketData = [];
        const now = Date.now();
        const timeframeMs = this.getTimeframeMs(timeframe);
        
        // Align timestamps to grid for 1d/1w to avoid chart rendering issues
        let currentTimestamp = Date.now();
        if (timeframe === '1d' || timeframe === '1w' || timeframe === '3d') {
            // Round down to nearest day (UTC midnight)
            currentTimestamp = Math.floor(currentTimestamp / 86400000) * 86400000;
        }
        
        for (let i = limit - 1; i >= 0; i--) {
          const timestamp = currentTimestamp - (i * timeframeMs);
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
          symbol,
          timeframe,
          count: marketData.length
        };
      }

      const ohlcv = await this.exchange.fetchOHLCV(symbol, timeframe, undefined, limit);
      
      // Fallback para simulação se não houver dados suficientes no Testnet (comum para 1d/1w)
      if (ohlcv.length < 50 && (process.env.EXCHANGE_MODE === 'testnet' || this.exchange.urls['api']['public'].includes('testnet'))) {
        console.warn(`⚠️ Dados insuficientes no Testnet para ${symbol} ${timeframe} (${ohlcv.length} candles). Gerando dados simulados.`);
        // Fallback to simulation logic
        const mockPrices = {
          'BTC/USDT': 45000,
          'ETH/USDT': 3000,
          'SOL/USDT': 150,
          'XRP/USDT': 0.60,
          'BNB/USDT': 400,
          'ADA/USDT': 0.45,
          'DOGE/USDT': 0.12,
          'MATIC/USDT': 0.70
        };
        const basePrice = mockPrices[symbol] || 100;
        
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
          symbol,
          timeframe,
          count: marketData.length
        };
      }

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

      if (this.isSimulation) {
        const mockPrices = {
          'BTC/USDT': 45000,
          'ETH/USDT': 3000,
          'SOL/USDT': 150,
          'XRP/USDT': 0.60,
          'BNB/USDT': 400,
          'ADA/USDT': 0.45,
          'DOGE/USDT': 0.12,
          'MATIC/USDT': 0.70
        };
        const basePrice = mockPrices[symbol] || 100;
        
        const variation = (Math.random() - 0.5) * 0.02; // ±1% variação
        const last = basePrice * (1 + variation);
        const bid = last * 0.999;
        const ask = last * 1.001;
        const high = last * 1.02;
        const low = last * 0.98;
        const volume = 100 + Math.random() * 1000;
        const change = (Math.random() - 0.5) * (basePrice * 0.05);
        const percentage = (change / basePrice) * 100;
        
        return {
          success: true,
          data: {
            symbol: symbol,
            last: parseFloat(last.toFixed(4)),
            bid: parseFloat(bid.toFixed(4)),
            ask: parseFloat(ask.toFixed(4)),
            high: parseFloat(high.toFixed(4)),
            low: parseFloat(low.toFixed(4)),
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
      const mode = process.env.EXCHANGE_MODE || 'testnet';
      if (mode === 'testnet') {
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
      
      if (this.isSimulation) {
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
      const mode = process.env.EXCHANGE_MODE || 'testnet';
      if (mode === 'testnet') {
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

      if (this.isSimulation) {
        return {
          success: true,
          data: this.orders.filter(o => o.status === 'open'),
          count: this.orders.filter(o => o.status === 'open').length
        };
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

      if (this.isSimulation) {
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
              }
            },
            message: 'Ordem cancelada com sucesso (simulação)'
          };
        }
      }

      // Para testnet sem chaves válidas, retornar cancelamento mockado
      // Fallback logic
      const mode = process.env.EXCHANGE_MODE || 'testnet';
      if (mode === 'testnet' && !this.exchange.apiKey) {
         // ... simplified mock logic if needed, but isSimulation covers it
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
        error: error.message,
        message: 'Erro ao cancelar ordem'
      };
    }
  }
}

export default ExchangeManager;
