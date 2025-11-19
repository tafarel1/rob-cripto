import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import ExchangeMonitor from '@/components/ExchangeMonitor';
import OrderTestPanel from '@/components/OrderTestPanel';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity, 
  Settings, 
  Play, 
  Square,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface TradingStats {
  activeStrategies: number;
  activePositions: number;
  totalTrades: number;
  isRunning: boolean;
  riskStats: {
    dailyLoss: number;
    dailyTrades: number;
    maxDailyLossReached: boolean;
    openPositions: number;
    accountBalance: number;
    riskExposure: number;
    availableRisk: number;
  };
}

interface Position {
  id: string;
  symbol: string;
  type: 'LONG' | 'SHORT';
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  stopLoss: number;
  takeProfit: number[];
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  openTime: number;
}

interface Signal {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number[];
  confidence: number;
  reason: string;
  timeframe: string;
  timestamp: number;
}

export default function TradingDashboard() {
  const [stats, setStats] = useState<TradingStats | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSymbol, setSelectedSymbol] = useState('BTC/USDT');
  const [timeframe, setTimeframe] = useState('1h');

  // Buscar dados do servidor
  useEffect(() => {
    fetchTradingData();
    const interval = setInterval(fetchTradingData, 30000); // Atualizar a cada 30 segundos
    return () => clearInterval(interval);
  }, []);

  const fetchTradingData = async () => {
    try {
      // Buscar estatísticas - usando proxy do Vercel para Railway
      const statsResponse = await fetch('/api/trading/status');
      const statsData = await statsResponse.json();
      if (statsData.success) {
        // Converter status para isRunning para compatibilidade
        const statsWithIsRunning = {
          ...statsData.data,
          isRunning: statsData.data.status === 'running'
        };
        setStats(statsWithIsRunning);
      }

      // Buscar posições - usando proxy do Vercel para Railway
      const positionsResponse = await fetch('/api/trading/positions');
      const positionsData = await positionsResponse.json();
      if (positionsData.success) {
        setPositions(positionsData.data);
      }

      // Buscar sinais recentes (simulado por enquanto)
      // setSignals(mockSignals);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartTrading = async () => {
    try {
      const response = await fetch('/api/trading/start', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        // Atualizar estado local imediatamente para feedback visual
        setStats(prev => prev ? { ...prev, isRunning: true, status: 'running' } : null);
        fetchTradingData();
      }
    } catch (error) {
      console.error('Erro ao iniciar trading:', error);
    }
  };

  const handleStopTrading = async () => {
    try {
      const response = await fetch('/api/trading/stop', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        fetchTradingData(); // Recarregar dados
      }
    } catch (error) {
      console.error('Erro ao parar trading:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getPnlColor = (pnl: number) => {
    return pnl >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getPnlIcon = (pnl: number) => {
    return pnl >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Robô de Trading - Smart Money Concepts
          </h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${stats?.isRunning ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">
                Status: {stats?.isRunning ? 'Executando' : 'Parado'}
              </span>
            </div>
            <Badge variant={stats?.riskStats.maxDailyLossReached ? 'destructive' : 'default'}>
              {stats?.riskStats.maxDailyLossReached ? 'Limite Diário Atingido' : 'Dentro dos Limites'}
            </Badge>
          </div>
        </div>

        {/* Controles Principais */}
        <div className="mb-6">
          <div className="flex space-x-4">
            <Button
              onClick={handleStartTrading}
              disabled={stats?.isRunning}
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="h-4 w-4 mr-2" />
              Iniciar Trading
            </Button>
            <Button
              onClick={handleStopTrading}
              disabled={!stats?.isRunning}
              variant="destructive"
            >
              <Square className="h-4 w-4 mr-2" />
              Parar Trading
            </Button>
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Configurações
            </Button>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo da Conta</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats?.riskStats.accountBalance || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Exposição: {formatCurrency(stats?.riskStats.riskExposure || 0)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Posições Ativas</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activePositions || 0}</div>
              <p className="text-xs text-muted-foreground">
                Máximo: {stats?.riskStats.openPositions || 0}/{(stats?.riskStats as any).maxPositions || 5}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Perda Diária</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getPnlColor(-(stats?.riskStats.dailyLoss || 0))}`}>
                {formatCurrency(-(stats?.riskStats.dailyLoss || 0))}
              </div>
              <p className="text-xs text-muted-foreground">
                Trades: {stats?.riskStats.dailyTrades || 0}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Estratégias Ativas</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeStrategies || 0}</div>
              <p className="text-xs text-muted-foreground">
                Total de trades: {stats?.totalTrades || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Posições Ativas */}
          <Card>
            <CardHeader>
              <CardTitle>Posições Ativas</CardTitle>
            </CardHeader>
            <CardContent>
              {positions.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Nenhuma posição ativa</p>
              ) : (
                <div className="space-y-4">
                  {positions.map((position) => (
                    <div key={position.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold">{position.symbol}</h3>
                          <Badge variant={position.type === 'LONG' ? 'default' : 'destructive'}>
                            {position.type}
                          </Badge>
                        </div>
                        <div className={`flex items-center space-x-1 ${getPnlColor(position.unrealizedPnl)}`}>
                          {getPnlIcon(position.unrealizedPnl)}
                          <span className="font-semibold">
                            {formatPercent(position.unrealizedPnlPercent)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Entrada:</span>
                          <div className="font-semibold">{position.entryPrice.toFixed(4)}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Atual:</span>
                          <div className="font-semibold">{position.currentPrice.toFixed(4)}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Quantidade:</span>
                          <div className="font-semibold">{position.quantity.toFixed(6)}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">SL/TP:</span>
                          <div className="text-xs">
                            <div>SL: {position.stopLoss.toFixed(4)}</div>
                            <div>TP: {position.takeProfit[0]?.toFixed(4)}</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-2 text-xs text-gray-500">
                        Aberto há: {Math.floor((Date.now() - position.openTime) / (1000 * 60 * 60))}h
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sinais Recentes */}
          <Card>
            <CardHeader>
              <CardTitle>Sinais Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {signals.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Nenhum sinal recente</p>
              ) : (
                <div className="space-y-4">
                  {signals.map((signal) => (
                    <div key={signal.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold">{signal.symbol}</h3>
                          <Badge variant={signal.type === 'BUY' ? 'default' : 'destructive'}>
                            {signal.type}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold">
                            Confiança: {(signal.confidence * 100).toFixed(1)}%
                          </div>
                          <div className="text-xs text-gray-500">{signal.timeframe}</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm mb-2">
                        <div>
                          <span className="text-gray-600">Entrada:</span>
                          <div className="font-semibold">{signal.entryPrice.toFixed(4)}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Stop Loss:</span>
                          <div className="font-semibold text-red-600">{signal.stopLoss.toFixed(4)}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Take Profit:</span>
                          <div className="font-semibold text-green-600">
                            {signal.takeProfit[0]?.toFixed(4)}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">R/R:</span>
                          <div className="font-semibold">
                            1:{((signal.takeProfit[0] - signal.entryPrice) / Math.abs(signal.entryPrice - signal.stopLoss)).toFixed(1)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-600 mb-2">
                        Razão: {signal.reason}
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        Há: {Math.floor((Date.now() - signal.timestamp) / (1000 * 60))} minutos
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Barra de Progresso de Risco */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Monitor de Risco</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Perda Diária</span>
                  <span className={getPnlColor(-(stats?.riskStats.dailyLoss || 0))}>
                    {formatCurrency(-(stats?.riskStats.dailyLoss || 0))} / 
                    {formatCurrency((stats?.riskStats.accountBalance || 0) * 0.05)}
                  </span>
                </div>
                <Progress 
                  value={((stats?.riskStats.dailyLoss || 0) / ((stats?.riskStats.accountBalance || 0) * 0.05)) * 100} 
                  className="h-2"
                />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Posições Abertas</span>
                  <span>
                    {stats?.riskStats.openPositions || 0} / {(stats?.riskStats as any).maxPositions || 5}
                  </span>
                </div>
                <Progress 
                  value={((stats?.riskStats.openPositions || 0) / ((stats?.riskStats as any).maxPositions || 5)) * 100} 
                  className="h-2"
                />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Exposição Total</span>
                  <span>
                    {formatCurrency(stats?.riskStats.riskExposure || 0)} / 
                    {formatCurrency((stats?.riskStats.accountBalance || 0) * 0.8)}
                  </span>
                </div>
                <Progress 
                  value={((stats?.riskStats.riskExposure || 0) / ((stats?.riskStats.accountBalance || 0) * 0.8)) * 100} 
                  className="h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monitor da Exchange */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Monitor da Exchange</h2>
        <ExchangeMonitor />
      </div>

      {/* Painel de Teste de Ordens */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Teste de Ordens</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <OrderTestPanel />
          <Card>
            <CardHeader>
              <CardTitle>Instruções de Teste</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm text-gray-600">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Como testar:</h4>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Conecte-se à exchange usando o botão no painel acima</li>
                    <li>Configure os parâmetros da ordem (símbolo, tipo, lado, quantidade)</li>
                    <li>Clique em "Enviar Ordem de Teste"</li>
                    <li>Verifique o resultado da ordem no painel de resultados</li>
                  </ol>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-1">Importante:</h4>
                  <p className="text-blue-800">
                    Todas as ordens são executadas no ambiente de testnet da Binance com capital virtual. 
                    Nenhum dinheiro real está em risco.
                  </p>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <h4 className="font-semibold text-yellow-900 mb-1">Limitações:</h4>
                  <ul className="list-disc list-inside space-y-1 text-yellow-800">
                    <li>Limite de ordens por minuto</li>
                    <li>Capital virtual limitado</li>
                    <li>Atrasos simulados de execução</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}