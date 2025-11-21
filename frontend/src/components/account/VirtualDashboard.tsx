import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Clock, 
  RotateCcw,
  Play,
  Pause,
  Settings,
  Target,
  Award,
  GamepadIcon
} from 'lucide-react';
import { useAccountManager } from './useAccountManager';
import { toast } from 'sonner';

interface VirtualTrade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  timestamp: number;
  profit?: number;
  status: 'open' | 'closed';
}

interface VirtualPerformance {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalProfit: number;
  maxDrawdown: number;
  sharpeRatio: number;
}

export default function VirtualDashboard() {
  const { virtualAccount, updateBalance, resetVirtualAccount } = useAccountManager();
  const [trades, setTrades] = useState<VirtualTrade[]>([]);
  const [performance, setPerformance] = useState<VirtualPerformance>({
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    winRate: 0,
    totalProfit: 0,
    maxDrawdown: 0,
    sharpeRatio: 0
  });
  const [isSimulationActive, setIsSimulationActive] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(1);

  // Load saved virtual data
  useEffect(() => {
    const savedTrades = localStorage.getItem('virtualTrades');
    const savedPerformance = localStorage.getItem('virtualPerformance');
    
    if (savedTrades) {
      try {
        setTrades(JSON.parse(savedTrades));
      } catch (error) {
        console.error('Error loading virtual trades:', error);
      }
    }
    
    if (savedPerformance) {
      try {
        setPerformance(JSON.parse(savedPerformance));
      } catch (error) {
        console.error('Error loading virtual performance:', error);
      }
    }
  }, []);

  // Save virtual data
  useEffect(() => {
    localStorage.setItem('virtualTrades', JSON.stringify(trades));
    localStorage.setItem('virtualPerformance', JSON.stringify(performance));
  }, [trades, performance]);

  // Calculate performance metrics
  useEffect(() => {
    const totalTrades = trades.length;
    const winningTrades = trades.filter(t => (t.profit || 0) > 0).length;
    const losingTrades = trades.filter(t => (t.profit || 0) < 0).length;
    const totalProfit = trades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    
    // Calculate max drawdown (simplified)
    let maxDrawdown = 0;
    let peak = virtualAccount.initialBalance;
    let current = virtualAccount.balance;
    
    trades.forEach(trade => {
      current += (trade.profit || 0);
      if (current > peak) {
        peak = current;
      }
      const drawdown = ((peak - current) / peak) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    });

    setPerformance({
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      totalProfit,
      maxDrawdown,
      sharpeRatio: calculateSharpeRatio(trades)
    });
  }, [trades, virtualAccount.balance, virtualAccount.initialBalance]);

  const calculateSharpeRatio = (trades: VirtualTrade[]): number => {
    if (trades.length < 2) return 0;
    
    const profits = trades.map(t => t.profit || 0);
    const avgProfit = profits.reduce((a, b) => a + b, 0) / profits.length;
    const variance = profits.reduce((sum, profit) => sum + Math.pow(profit - avgProfit, 2), 0) / profits.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev === 0 ? 0 : avgProfit / stdDev;
  };

  const executeVirtualTrade = (symbol: string, side: 'buy' | 'sell', amount: number, price: number) => {
    const newTrade: VirtualTrade = {
      id: `virtual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      symbol,
      side,
      amount,
      price,
      timestamp: Date.now(),
      status: 'open'
    };

    setTrades(prev => [...prev, newTrade]);
    
    // Simulate trade outcome after 5 seconds
    setTimeout(() => {
      const profit = simulateTradeProfit(side, amount, price);
      const updatedTrade = { ...newTrade, profit, status: 'closed' as const };
      
      setTrades(prev => prev.map(t => t.id === newTrade.id ? updatedTrade : t));
      updateBalance('VIRTUAL', virtualAccount.balance + profit);
      
      toast.success(`Trade ${side} ${symbol} finalizado!`, {
        description: `Lucro: $${profit.toFixed(2)}`,
      });
    }, 5000);
  };

  const simulateTradeProfit = (side: 'buy' | 'sell', amount: number, price: number): number => {
    // Simulate realistic profit/loss based on market volatility
    const volatility = 0.02; // 2% volatility
    const direction = side === 'buy' ? 1 : -1;
    const randomFactor = (Math.random() - 0.5) * 2; // -1 to 1
    const profitFactor = randomFactor * volatility * direction;
    
    return amount * price * profitFactor;
  };

  const handleResetAccount = () => {
    resetVirtualAccount();
    setTrades([]);
    setPerformance({
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalProfit: 0,
      maxDrawdown: 0,
      sharpeRatio: 0
    });
    
    toast.success('Conta virtual resetada!', {
      description: 'Histórico limpo e saldo restaurado.',
    });
  };

  const toggleSimulation = () => {
    setIsSimulationActive(!isSimulationActive);
    toast.success(isSimulationActive ? 'Simulação pausada' : 'Simulação ativada');
  };

  const currentProfitLoss = virtualAccount.balance - virtualAccount.initialBalance;
  const profitPercentage = (currentProfitLoss / virtualAccount.initialBalance) * 100;

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <GamepadIcon className="w-6 h-6 mr-3 text-green-600" />
            Dashboard Virtual
          </h2>
          <p className="text-gray-600 mt-1">Ambiente de aprendizado sem risco real</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSimulation}
            className={`${isSimulationActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
          >
            {isSimulationActive ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            {isSimulationActive ? 'Pausar' : 'Simular'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetAccount}
            className="text-orange-600 border-orange-300 hover:bg-orange-50"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Resetar
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${virtualAccount.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className={`text-xs mt-1 flex items-center ${
              currentProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {currentProfitLoss >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              {profitPercentage >= 0 ? '+' : ''}{profitPercentage.toFixed(2)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Trades</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{performance.totalTrades}</div>
            <div className="text-xs text-gray-500 mt-1">
              {performance.winningTrades} vitórias • {performance.losingTrades} derrotas
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Acerto</CardTitle>
            <Target className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{performance.winRate.toFixed(1)}%</div>
            <Progress value={performance.winRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sharpe Ratio</CardTitle>
            <Award className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {performance.sharpeRatio.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {performance.sharpeRatio > 1 ? 'Excelente' : performance.sharpeRatio > 0 ? 'Bom' : 'A melhorar'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profit/Loss Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
              Evolução do Capital
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">Gráfico de evolução do capital</p>
                <p className="text-sm text-gray-500 mt-1">
                  {currentProfitLoss >= 0 ? '+' : ''}${currentProfitLoss.toFixed(2)} de lucro/prejuízo
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Trades */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2 text-blue-600" />
              Trades Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {trades.length === 0 ? (
                <div className="text-center py-8">
                  <Play className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">Nenhum trade executado ainda</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Execute seu primeiro trade virtual para começar!
                  </p>
                </div>
              ) : (
                trades.slice(-5).reverse().map((trade) => (
                  <div key={trade.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        trade.status === 'open' ? 'bg-yellow-500' : 
                        (trade.profit || 0) >= 0 ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <div>
                        <div className="font-medium text-sm">{trade.symbol}</div>
                        <div className="text-xs text-gray-500">
                          {trade.side.toUpperCase()} • {trade.amount}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        ${trade.price.toFixed(2)}
                      </div>
                      {trade.profit !== undefined && (
                        <div className={`text-xs ${
                          trade.profit >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {trade.profit >= 0 ? '+' : ''}${trade.profit.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2 text-gray-600" />
            Ações Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={() => executeVirtualTrade('BTC/USDT', 'buy', 0.001, 45000)}
              className="bg-green-600 hover:bg-green-700"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Comprar BTC (Demo)
            </Button>
            
            <Button
              onClick={() => executeVirtualTrade('ETH/USDT', 'sell', 0.01, 3000)}
              className="bg-red-600 hover:bg-red-700"
            >
              <TrendingDown className="w-4 h-4 mr-2" />
              Vender ETH (Demo)
            </Button>
            
            <Button
              variant="outline"
              onClick={handleResetAccount}
              className="border-orange-300 text-orange-600 hover:bg-orange-50"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Resetar Conta
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}