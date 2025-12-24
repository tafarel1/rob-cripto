import * as ccxt from 'ccxt';
import { ExchangeConfig, MarketData, ExchangeOrder } from '../../../shared/types';

export class ExchangeService {
  private exchanges: Map<string, ccxt.Exchange> = new Map();

  constructor(configs: ExchangeConfig[]) {
    this.initializeExchanges(configs);
  }

  /**
   * Inicializa as exchanges com as configurações fornecidas
   */
  private initializeExchanges(configs: ExchangeConfig[]): void {
    configs.forEach(config => {
      try {
        const exchangeName = config.name as keyof typeof ccxt;
        type CcxtConstructor = new (params: Record<string, unknown>) => ccxt.Exchange;
        const exchangeClass = (ccxt as unknown as Record<string, CcxtConstructor>)[exchangeName];
        if (!exchangeClass) {
          throw new Error(`Exchange ${config.name} não suportada`);
        }

        const exchange = new exchangeClass({
          apiKey: config.apiKey,
          secret: config.apiSecret,
          options: {
            defaultType: config.enableFutures ? 'future' : 'spot',
            adjustForTimeDifference: true
          }
        });

        if (config.testnet) {
          exchange.setSandboxMode(true);
        }

        this.exchanges.set(config.name, exchange);
      } catch (error) {
        console.error(`Erro ao inicializar exchange ${config.name}:`, error);
      }
    });
  }

  /**
   * Obtém dados de mercado históricos (OHLCV)
   */
  async getMarketData(
    exchangeName: string, 
    symbol: string, 
    timeframe: string, 
    limit: number = 100,
    since?: number
  ): Promise<MarketData[]> {
    const exchange = this.exchanges.get(exchangeName);
    if (!exchange) {
      throw new Error(`Exchange ${exchangeName} não encontrada`);
    }

    try {
      const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, since, limit);
      return ohlcv.map(candle => ({
        timestamp: Number(candle[0] ?? Date.now()),
        open: Number(candle[1] ?? 0),
        high: Number(candle[2] ?? 0),
        low: Number(candle[3] ?? 0),
        close: Number(candle[4] ?? 0),
        volume: Number(candle[5] ?? 0)
      }));
    } catch (error) {
      console.error(`Erro ao obter dados de mercado de ${exchangeName}:`, error);
      throw error;
    }
  }

  /**
   * Obtém ticker em tempo real
   */
  async getTicker(exchangeName: string, symbol: string): Promise<{
    symbol: string;
    bid: number;
    ask: number;
    last: number;
    volume: number;
    timestamp: number;
  }> {
    const exchange = this.exchanges.get(exchangeName);
    if (!exchange) {
      throw new Error(`Exchange ${exchangeName} não encontrada`);
    }

    try {
      const ticker = await exchange.fetchTicker(symbol);
      const ts = typeof ticker.timestamp === 'number' ? ticker.timestamp : Date.now();
      return {
        symbol: String(ticker.symbol),
        bid: Number(ticker.bid ?? 0),
        ask: Number(ticker.ask ?? 0),
        last: Number(ticker.last ?? 0),
        volume: Number(ticker.baseVolume ?? ticker.quoteVolume ?? 0),
        timestamp: Number(ts)
      };
    } catch (error) {
      console.error(`Erro ao obter ticker de ${exchangeName}:`, error);
      throw error;
    }
  }

  /**
   * Cria ordem de mercado
   */
  async createMarketOrder(
    exchangeName: string,
    symbol: string,
    side: 'buy' | 'sell',
    amount: number
  ): Promise<ExchangeOrder> {
    const exchange = this.exchanges.get(exchangeName);
    if (!exchange) {
      throw new Error(`Exchange ${exchangeName} não encontrada`);
    }

    try {
      const order = await exchange.createMarketOrder(symbol, side, amount);
      
      return this.mapExchangeOrder(order);
    } catch (error) {
      console.error(`Erro ao criar ordem de mercado em ${exchangeName}:`, error);
      throw error;
    }
  }

  /**
   * Cria ordem limite
   */
  async createLimitOrder(
    exchangeName: string,
    symbol: string,
    side: 'buy' | 'sell',
    amount: number,
    price: number
  ): Promise<ExchangeOrder> {
    const exchange = this.exchanges.get(exchangeName);
    if (!exchange) {
      throw new Error(`Exchange ${exchangeName} não encontrada`);
    }

    try {
      const order = await exchange.createLimitOrder(symbol, side, amount, price);
      
      return this.mapExchangeOrder(order);
    } catch (error) {
      console.error(`Erro ao criar ordem limite em ${exchangeName}:`, error);
      throw error;
    }
  }

  /**
   * Cria ordem stop
   */
  async createStopOrder(
    exchangeName: string,
    symbol: string,
    side: 'buy' | 'sell',
    amount: number,
    stopPrice: number,
    price?: number
  ): Promise<ExchangeOrder> {
    const exchange = this.exchanges.get(exchangeName);
    if (!exchange) {
      throw new Error(`Exchange ${exchangeName} não encontrada`);
    }

    try {
      const params = price ? { stopPrice, price } : { stopPrice };
      const order = await exchange.createOrder(symbol, 'stop', side, amount, price, params);
      
      return this.mapExchangeOrder(order);
    } catch (error) {
      console.error(`Erro ao criar ordem stop em ${exchangeName}:`, error);
      throw error;
    }
  }

  /**
   * Cancela ordem
   */
  async cancelOrder(exchangeName: string, orderId: string, symbol?: string): Promise<boolean> {
    const exchange = this.exchanges.get(exchangeName);
    if (!exchange) {
      throw new Error(`Exchange ${exchangeName} não encontrada`);
    }

    try {
      await exchange.cancelOrder(orderId, symbol);
      return true;
    } catch (error) {
      console.error(`Erro ao cancelar ordem em ${exchangeName}:`, error);
      return false;
    }
  }

  /**
   * Obtém ordens abertas
   */
  async getOpenOrders(exchangeName: string, symbol?: string): Promise<ExchangeOrder[]> {
    const exchange = this.exchanges.get(exchangeName);
    if (!exchange) {
      throw new Error(`Exchange ${exchangeName} não encontrada`);
    }

    try {
      const orders = await exchange.fetchOpenOrders(symbol);
      
      return orders.map(order => this.mapExchangeOrder(order));
    } catch (error) {
      console.error(`Erro ao obter ordens abertas de ${exchangeName}:`, error);
      throw error;
    }
  }

  /**
   * Obtém saldo da conta
   */
  async getBalance(exchangeName: string): Promise<Record<string, { free: number; used: number; total: number }>> {
    const exchange = this.exchanges.get(exchangeName);
    if (!exchange) {
      throw new Error(`Exchange ${exchangeName} não encontrada`);
    }

    try {
      const balance = await exchange.fetchBalance();
      
      const result: Record<string, { free: number; used: number; total: number }> = {};
      
      Object.keys(balance).forEach(currency => {
        const entry = (balance as Record<string, unknown>)[currency] as
          | { total?: number; free?: number; used?: number }
          | undefined;
        if (entry && typeof entry === 'object') {
          const total = Number(entry.total ?? 0);
          const free = Number(entry.free ?? 0);
          const used = Number(entry.used ?? 0);
          if (total > 0 || free > 0 || used > 0) {
            result[currency] = { free, used, total };
          }
        }
      });

      return result;
    } catch (error) {
      console.error(`Erro ao obter saldo de ${exchangeName}:`, error);
      throw error;
    }
  }

  /**
   * Testa conectividade com a exchange
   */
  async testConnection(exchangeName: string): Promise<boolean> {
    const exchange = this.exchanges.get(exchangeName);
    if (!exchange) {
      return false;
    }

    try {
      await exchange.fetchTime();
      return true;
    } catch (error) {
      console.error(`Erro ao testar conexão com ${exchangeName}:`, error);
      return false;
    }
  }

  async getFundingRate(exchangeName: string, symbol: string): Promise<number> {
    const exchange = this.exchanges.get(exchangeName);
    if (!exchange) throw new Error(`Exchange ${exchangeName} não encontrada`);
    
    try {
      if (exchange.has['fetchFundingRate']) {
        const rate = await exchange.fetchFundingRate(symbol);
        return rate.fundingRate || 0;
      }
      return 0;
    } catch (error) {
      console.error(`Erro ao obter funding rate para ${symbol}:`, error);
      return 0;
    }
  }

  async getOpenInterest(exchangeName: string, symbol: string): Promise<number> {
    const exchange = this.exchanges.get(exchangeName);
    if (!exchange) throw new Error(`Exchange ${exchangeName} não encontrada`);
    
    try {
      if (exchange.has['fetchOpenInterest']) {
        const oi = await exchange.fetchOpenInterest(symbol);
        // CCXT normalizes to openInterestAmount or openInterestValue
        // We prefer value (USD) if available, else estimate with amount * price
        if (oi.openInterestValue) return oi.openInterestValue;
        if (oi.openInterestAmount) {
            const ticker = await exchange.fetchTicker(symbol);
            return oi.openInterestAmount * (ticker.last || 0);
        }
        return 0;
      }
      return 0;
    } catch (error) {
      console.error(`Erro ao obter open interest para ${symbol}:`, error);
      return 0;
    }
  }

  /**
   * Executes a Time-Weighted Average Price (TWAP) order.
   * Splits a large order into smaller chunks executed over a specified duration.
   */
  async executeTWAP(
    exchangeName: string,
    symbol: string,
    side: 'buy' | 'sell',
    totalAmount: number,
    durationMinutes: number,
    slices: number
  ): Promise<ExchangeOrder[]> {
    const exchange = this.exchanges.get(exchangeName);
    if (!exchange) throw new Error(`Exchange ${exchangeName} não encontrada`);

    const sliceAmount = totalAmount / slices;
    const intervalMs = (durationMinutes * 60 * 1000) / slices;
    const executedOrders: ExchangeOrder[] = [];

    console.log(`Starting TWAP: ${side} ${totalAmount} ${symbol} in ${slices} slices over ${durationMinutes} min`);

    for (let i = 0; i < slices; i++) {
      try {
        console.log(`Executing TWAP slice ${i + 1}/${slices}: ${sliceAmount} ${symbol}`);
        
        // Execute slice as a market order (or limit if preferred)
        const order = await this.createMarketOrder(exchangeName, symbol, side, sliceAmount);
        executedOrders.push(order);

        // Wait for next interval if not the last slice
        if (i < slices - 1) {
          await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
      } catch (error) {
        console.error(`TWAP slice ${i + 1} failed:`, error);
        // Continue to next slice? Or abort? 
        // For robustness, we might want to retry or abort. Here we continue.
      }
    }
    
    return executedOrders;
  }

  /**
   * Executes an Iceberg order.
   * Displays only a small visible quantity (tip) to the market, refilling as it gets filled.
   */
  async executeIceberg(
    exchangeName: string,
    symbol: string,
    side: 'buy' | 'sell',
    totalAmount: number,
    visibleAmount: number,
    limitPrice: number
  ): Promise<ExchangeOrder[]> {
    const exchange = this.exchanges.get(exchangeName);
    if (!exchange) throw new Error(`Exchange ${exchangeName} não encontrada`);

    let remainingAmount = totalAmount;
    const orders: ExchangeOrder[] = [];

    console.log(`Starting Iceberg: ${side} ${totalAmount} ${symbol} @ ${limitPrice} (Visible: ${visibleAmount})`);

    while (remainingAmount > 0) {
      const currentQty = Math.min(remainingAmount, visibleAmount);
      
      try {
        // Place limit order for visible amount
        const order = await this.createLimitOrder(exchangeName, symbol, side, currentQty, limitPrice);
        orders.push(order);
        
        // Wait for fill (Polling logic - simplified)
        // In production, this should listen to websocket updates
        let filled = false;
        while (!filled) {
           const checkedOrder = await exchange.fetchOrder(order.id, symbol);
           if (checkedOrder.status === 'closed') {
             remainingAmount -= (checkedOrder.filled ?? 0);
             filled = true;
             console.log(`Iceberg slice filled. Remaining: ${remainingAmount}`);
           } else if (checkedOrder.status === 'canceled') {
             throw new Error('Iceberg slice canceled manually');
           } else {
             await new Promise(resolve => setTimeout(resolve, 2000)); // Poll every 2s
           }
        }
      } catch (error) {
        console.error('Iceberg execution interrupted:', error);
        break;
      }
    }

    return orders;
  }

  /**
   * Mapeia ordem da exchange para nosso formato
   */
  private mapExchangeOrder(order: ccxt.Order): ExchangeOrder {
    const side: 'buy' | 'sell' = order.side === 'buy' ? 'buy' : 'sell';
    const type: 'market' | 'limit' | 'stop' =
      order.type === 'market' || order.type === 'limit' || order.type === 'stop'
        ? (order.type as 'market' | 'limit' | 'stop')
        : 'limit';
    const status: 'open' | 'closed' | 'cancelled' =
      order.status === 'open' || order.status === 'closed'
        ? (order.status as 'open' | 'closed')
        : 'cancelled'; // map 'canceled' -> 'cancelled'
    const createdAt = typeof order.timestamp === 'number' ? order.timestamp : Date.now();
    const updatedAt = typeof order.lastTradeTimestamp === 'number' ? order.lastTradeTimestamp : createdAt;

    return {
      id: String(order.id),
      symbol: String(order.symbol),
      side,
      type,
      quantity: Number(order.amount ?? 0),
      price: typeof order.price === 'number' ? order.price : undefined,
      stopPrice: (order as unknown as { stopPrice?: number }).stopPrice,
      status,
      filledQuantity: Number(order.filled ?? 0),
      averagePrice: typeof order.average === 'number' ? order.average : undefined,
      createdAt,
      updatedAt
    };
  }

  /**
   * Obtém lista de símbolos disponíveis
   */
  async getSymbols(exchangeName: string): Promise<string[]> {
    const exchange = this.exchanges.get(exchangeName);
    if (!exchange) {
      throw new Error(`Exchange ${exchangeName} não encontrada`);
    }

    try {
      await exchange.loadMarkets();
      return Object.keys(exchange.markets);
    } catch (error) {
      console.error(`Erro ao obter símbolos de ${exchangeName}:`, error);
      throw error;
    }
  }

  /**
   * Obtém informações do símbolo
   */
  async getSymbolInfo(exchangeName: string, symbol: string): Promise<{
    symbol: string;
    base: string;
    quote: string;
    minAmount: number;
    maxAmount: number;
    minPrice: number;
    maxPrice: number;
    precision: number;
  }> {
    const exchange = this.exchanges.get(exchangeName);
    if (!exchange) {
      throw new Error(`Exchange ${exchangeName} não encontrada`);
    }

    try {
      await exchange.loadMarkets();
      const market = exchange.markets[symbol];
      
      if (!market) {
        throw new Error(`Símbolo ${symbol} não encontrado`);
      }

      return {
        symbol: market.symbol,
        base: market.base,
        quote: market.quote,
        minAmount: market.limits.amount?.min || 0,
        maxAmount: market.limits.amount?.max || Infinity,
        minPrice: market.limits.price?.min || 0,
        maxPrice: market.limits.price?.max || Infinity,
        precision: market.precision?.amount || 8
      };
    } catch (error) {
      console.error(`Erro ao obter informações do símbolo ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Cria ordem com stop loss e take profit
   */
  async createOrderWithStopLossAndTakeProfit(
    exchangeName: string,
    symbol: string,
    side: 'buy' | 'sell',
    amount: number,
    entryPrice: number,
    stopLoss: number,
    takeProfit: number[]
  ): Promise<{
    entryOrder: ExchangeOrder;
    stopLossOrder?: ExchangeOrder;
    takeProfitOrders: ExchangeOrder[];
  }> {
    // Criar ordem de entrada
    const entryOrder = await this.createMarketOrder(exchangeName, symbol, side, amount);

    const oppositeSide = side === 'buy' ? 'sell' : 'buy';

    // Criar ordem de stop loss
    let stopLossOrder: ExchangeOrder | undefined;
    try {
      stopLossOrder = await this.createStopOrder(
        exchangeName,
        symbol,
        oppositeSide,
        amount,
        stopLoss,
        stopLoss
      );
    } catch (error) {
      console.error('Erro ao criar ordem de stop loss:', error);
    }

    // Criar ordens de take profit
    const takeProfitOrders: ExchangeOrder[] = [];
    for (const tpPrice of takeProfit) {
      try {
        const tpOrder = await this.createLimitOrder(
          exchangeName,
          symbol,
          oppositeSide,
          amount / takeProfit.length, // Dividir quantidade entre take profits
          tpPrice
        );
        takeProfitOrders.push(tpOrder);
      } catch (error) {
        console.error(`Erro ao criar ordem de take profit em ${tpPrice}:`, error);
      }
    }

    return {
      entryOrder,
      stopLossOrder,
      takeProfitOrders
    };
  }

  /**
   * Atualiza Stop Loss (Cancela anterior e cria novo)
   */
  async updateStopLoss(
    exchangeName: string,
    symbol: string,
    side: 'buy' | 'sell',
    amount: number,
    newStopPrice: number,
    oldOrderId?: string
  ): Promise<ExchangeOrder> {
    // 1. Cancel old order if exists
    if (oldOrderId) {
        await this.cancelOrder(exchangeName, oldOrderId, symbol);
    }

    // 2. Create new Stop Order
    // Note: Assuming "Stop Market" behavior (trigger price = stopPrice, execution = market or limit)
    // Here we reuse createStopOrder which might be Stop Limit or Stop Market depending on implementation
    // We'll pass price=newStopPrice to make it a Stop Limit at the stop price, 
    // or we could leave price undefined for Stop Market if supported.
    // Given the previous usage `createStopOrder(..., stopLoss, stopLoss)`, it seems to be Stop Limit.
    return this.createStopOrder(exchangeName, symbol, side, amount, newStopPrice, newStopPrice);
  }
}
