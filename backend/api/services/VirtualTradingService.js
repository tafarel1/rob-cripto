class VirtualTradingService {
  constructor() {
    this.marketData = new Map();
    this.volatility = {
      'BTC/USDT': 0.02,
      'ETH/USDT': 0.025,
      'ADA/USDT': 0.04,
      'SOL/USDT': 0.05,
      'DOT/USDT': 0.035
    };
    
    // Initialize market data
    this.initializeMarketData();
  }

  initializeMarketData() {
    const pairs = ['BTC/USDT', 'ETH/USDT', 'ADA/USDT', 'SOL/USDT', 'DOT/USDT'];
    const basePrices = {
      'BTC/USDT': 45000,
      'ETH/USDT': 3000,
      'ADA/USDT': 0.5,
      'SOL/USDT': 100,
      'DOT/USDT': 10
    };

    pairs.forEach(pair => {
      this.marketData.set(pair, {
        price: basePrices[pair],
        trend: Math.random() > 0.5 ? 'up' : 'down',
        momentum: Math.random() * 2 - 1 // -1 to 1
      });
    });
  }

  validateTrade({ symbol, side, amount, entryPrice, balance, riskSettings }) {
    // Validate symbol
    if (!riskSettings.allowedPairs.includes(symbol)) {
      return { isValid: false, error: 'Par não permitido para este modo' };
    }

    // Validate amount
    if (amount <= 0) {
      return { isValid: false, error: 'Quantidade deve ser positiva' };
    }

    // Calculate risk per trade
    const riskAmount = amount * (riskSettings.maxRiskPerTrade / 100);
    const maxPositionSize = balance * (riskSettings.maxRiskPerTrade / 100);
    
    if (amount > maxPositionSize) {
      return { 
        isValid: false, 
        error: `Tamanho da posição excede o limite de risco de ${riskSettings.maxRiskPerTrade}%` 
      };
    }

    // Validate against daily loss limit
    const dailyLossLimit = balance * (riskSettings.dailyLossLimit / 100);
    // This would need to track daily losses

    return { isValid: true };
  }

  async executeTrade({ symbol, side, amount, entryPrice, stopLoss, takeProfit }) {
    // Simulate market movement
    const marketInfo = this.marketData.get(symbol);
    const volatility = this.volatility[symbol] || 0.03;
    
    // Generate realistic price movement
    const priceMovement = this.simulatePriceMovement(marketInfo, volatility, side);
    const exitPrice = entryPrice * (1 + priceMovement);
    
    // Calculate P&L
    const pnl = side === 'buy' 
      ? (exitPrice - entryPrice) * amount
      : (entryPrice - exitPrice) * amount;
    
    // Create trade object
    const trade = {
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      symbol,
      side,
      amount,
      entryPrice,
      exitPrice,
      pnl,
      stopLoss,
      takeProfit,
      timestamp: Date.now(),
      duration: Math.floor(Math.random() * 3600000) + 300000, // 5min to 1hr
      fees: amount * 0.001 // 0.1% trading fee
    };

    // Update market data for next trade
    this.updateMarketData(symbol, priceMovement);

    // Calculate updated performance metrics
    const updatedPerformance = this.calculatePerformance(trade);

    return {
      trade,
      newBalance: this.calculateNewBalance(trade),
      updatedPerformance
    };
  }

  simulatePriceMovement(marketInfo, volatility, side) {
    // Base movement influenced by market trend and momentum
    let baseMovement = 0;
    
    if (marketInfo.trend === 'up') {
      baseMovement = marketInfo.momentum * 0.01; // 0% to 1%
    } else {
      baseMovement = -marketInfo.momentum * 0.01; // -1% to 0%
    }

    // Add random volatility
    const randomMovement = (Math.random() - 0.5) * volatility * 2;
    
    // Bias movement based on trade side for realistic simulation
    let sideBias = 0;
    if (side === 'buy') {
      sideBias = Math.random() * 0.005; // Small positive bias for longs
    } else {
      sideBias = -Math.random() * 0.005; // Small negative bias for shorts
    }

    return baseMovement + randomMovement + sideBias;
  }

  updateMarketData(symbol, lastMovement) {
    const marketInfo = this.marketData.get(symbol);
    
    // Update price
    marketInfo.price *= (1 + lastMovement);
    
    // Update trend based on movement
    if (lastMovement > 0.01) {
      marketInfo.trend = 'up';
      marketInfo.momentum = Math.min(1, marketInfo.momentum + 0.1);
    } else if (lastMovement < -0.01) {
      marketInfo.trend = 'down';
      marketInfo.momentum = Math.max(-1, marketInfo.momentum - 0.1);
    } else {
      // Gradually reduce momentum
      marketInfo.momentum *= 0.9;
    }

    // Add some mean reversion
    if (Math.abs(marketInfo.momentum) > 0.8) {
      marketInfo.momentum *= 0.7;
    }
  }

  calculatePerformance(trade) {
    // This would be calculated based on account history
    // For now, return mock performance
    return {
      totalTrades: Math.floor(Math.random() * 50) + 10,
      winningTrades: Math.floor(Math.random() * 30) + 5,
      losingTrades: Math.floor(Math.random() * 20) + 2,
      winRate: Math.random() * 40 + 50, // 50-90%
      totalProfit: Math.random() * 1000 - 200, // -200 to +800
      realizedPnl: trade.pnl,
      unrealizedPnl: 0,
      maxDrawdown: Math.random() * 15 // 0-15%
    };
  }

  calculateNewBalance(trade) {
    // This would be calculated based on current balance
    // For demo purposes, return a mock balance around the initial amount
    return 10000 + Math.random() * 2000 - 1000; // 9000-11000
  }

  // Get current market prices
  getMarketPrices() {
    const prices = {};
    this.marketData.forEach((info, symbol) => {
      prices[symbol] = info.price;
    });
    return prices;
  }

  // Get market data for a specific symbol
  getMarketData(symbol) {
    return this.marketData.get(symbol);
  }

  // Simulate real-time price updates
  simulatePriceUpdate(symbol) {
    const marketInfo = this.marketData.get(symbol);
    const volatility = this.volatility[symbol] || 0.03;
    
    // Small random movement
    const movement = (Math.random() - 0.5) * volatility * 0.5;
    marketInfo.price *= (1 + movement);
    
    return marketInfo.price;
  }
}

export default VirtualTradingService;