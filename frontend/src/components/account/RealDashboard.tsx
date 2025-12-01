import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  AlertTriangle,
  Shield,
  Settings,
  Zap,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useAccountManager } from './useAccountManager';
import { useExchange } from '@/hooks/useExchange';
import { toast } from 'sonner';


interface RealPerformance {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalProfit: number;
  realizedPnl: number;
  unrealizedPnl: number;
  maxDrawdown: number;
  riskLevel: 'low' | 'medium' | 'high';
}

interface RiskMetrics {
  dailyLoss: number;
  dailyLossLimit: number;
  openPositions: number;
  maxPositions: number;
  exposure: number;
  maxExposure: number;
  riskScore: number;
}

export default function RealDashboard() {
  const { realAccount } = useAccountManager();
  const { exchangeStatus, balance, positions } = useExchange();
  const [performance, setPerformance] = useState<RealPerformance>({
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    winRate: 0,
    totalProfit: 0,
    realizedPnl: 0,
    unrealizedPnl: 0,
    maxDrawdown: 0,
    riskLevel: 'low'
  });
  
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics>({
    dailyLoss: 0,
    dailyLossLimit: realAccount.riskSettings.dailyLossLimit * realAccount.balance / 100,
    openPositions: 0,
    maxPositions: realAccount.riskSettings.maxOpenTrades,
    exposure: 0,
    maxExposure: realAccount.balance * 0.8, // 80% of balance
    riskScore: 0
  });

  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

  // Monitor real account connection
  useEffect(() => {
    if (exchangeStatus?.isConnected) {
      setConnectionStatus('connected');
    } else {
      setConnectionStatus('error');
    }
  }, [exchangeStatus]);

  // Calculate performance metrics
  useEffect(() => {
    if (balance && balance.success) {
      const currentBalance = balance.data.total?.USDT || 0;
      const totalProfit = currentBalance - (realAccount.initialBalance || currentBalance);
      
      // Calculate from positions
      const totalPositions = positions?.length || 0;
      const winningPositions = positions?.filter(p => p.unrealizedPnl > 0).length || 0;
      const losingPositions = positions?.filter(p => p.unrealizedPnl < 0).length || 0;
      const winRate = totalPositions > 0 ? (winningPositions / totalPositions) * 100 : 0;
      
      const unrealizedPnl = positions?.reduce((sum, p) => sum + (p.unrealizedPnl || 0), 0) || 0;
      
      // Calculate risk level
      const riskLevel = calculateRiskLevel(riskMetrics);

      setPerformance({
        totalTrades: totalPositions,
        winningTrades: winningPositions,
        losingTrades: losingPositions,
        winRate,
        totalProfit,
        realizedPnl: 0, // Would come from trade history
        unrealizedPnl: unrealizedPnl,
        maxDrawdown: 0, // Would be calculated from history
        riskLevel
      });
    }
  }, [balance, positions, realAccount.initialBalance, riskMetrics]);

  const calculateRiskScore = useCallback((positions: number, exposure: number, maxExposure: number): number => {
    const positionScore = (positions / realAccount.riskSettings.maxOpenTrades) * 50;
    const exposureScore = (exposure / maxExposure) * 50;
    return Math.min(100, positionScore + exposureScore);
  }, [realAccount.riskSettings.maxOpenTrades]);

  // Update risk metrics
  useEffect(() => {
    if (positions) {
      const openPositions = positions.length;
      const exposure = positions.reduce((sum, p) => sum + (p.amount * p.currentPrice), 0);
      
      setRiskMetrics(prev => ({
        ...prev,
        openPositions,
        exposure,
        riskScore: calculateRiskScore(openPositions, exposure, prev.maxExposure)
      }));
    }
  }, [positions, riskMetrics.maxExposure, calculateRiskScore]);

  const calculateRiskLevel = (metrics: RiskMetrics): 'low' | 'medium' | 'high' => {
    const positionRatio = metrics.openPositions / metrics.maxPositions;
    const exposureRatio = metrics.exposure / metrics.maxExposure;
    
    if (positionRatio > 0.8 || exposureRatio > 0.8) return 'high';
    if (positionRatio > 0.5 || exposureRatio > 0.6) return 'medium';
    return 'low';
  };


  const handleTestConnection = async () => {
    try {
      const response = await fetch(`${API_CONFIG.baseURL}/api/exchange/status`);
      const result = await response.json();
      
      if (result.success) {
        toast.success('Conexão estabelecida!', {
          description: 'Exchange conectada com sucesso.'
        });
      } else {
        toast.error('Erro de conexão', {
          description: result.error || 'Não foi possível conectar à exchange.'
        });
      }
    } catch {
      toast.error('Erro de conexão', {
        description: 'Verifique suas chaves API e tente novamente.'
      });
    }
  };

  const handleEmergencyStop = async () => {
    try {
      const response = await fetch(`${API_CONFIG.baseURL}/api/exchange/emergency-stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        toast.warning('Parada de emergência ativada!', {
          description: 'Todas as operações foram suspensas.'
        });
      } else {
        toast.error('Erro ao ativar parada de emergência');
      }
    } catch {
      toast.error('Erro de conexão com o servidor');
    }
  };

  const handleCloseAllPositions = async () => {
    try {
      const response = await fetch(`${API_CONFIG.baseURL}/api/exchange/close-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        toast.success('Todas as posições foram fechadas!');
      } else {
        toast.error('Erro ao fechar posições');
      }
    } catch {
      toast.error('Erro de conexão com o servidor');
    }
  };

  const handleRiskSettings = () => {
    // Abrir modal de configurações de risco
    toast.info('Configurações de risco em desenvolvimento');
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      {/* Header with Connection Status */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Zap className="w-6 h-6 mr-3 text-blue-600" />
            Dashboard Real
          </h2>
          <p className="text-gray-600 mt-1">Operações com capital real - Máxima segurança</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Connection Status */}
          <div className={`flex items-center px-3 py-2 rounded-full ${
            connectionStatus === 'connected' 
              ? 'bg-green-100 text-green-800' 
              : connectionStatus === 'error' 
              ? 'bg-red-100 text-red-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {connectionStatus === 'connected' ? (
              <CheckCircle className="w-4 h-4 mr-2" />
            ) : connectionStatus === 'error' ? (
              <XCircle className="w-4 h-4 mr-2" />
            ) : (
              <Clock className="w-4 h-4 mr-2" />
            )}
            <span className="text-sm font-medium">
              {connectionStatus === 'connected' ? 'Conectado' : 
               connectionStatus === 'error' ? 'Erro' : 'Conectando'}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleTestConnection}
            disabled={connectionStatus === 'connecting'}
          >
            <Settings className="w-4 h-4 mr-2" />
            Testar Conexão
          </Button>
        </div>
      </div>

      {/* Risk Alert */}
      {performance.riskLevel === 'high' && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Risco Elevado Detectado!</strong> Você está próximo dos limites de exposição. 
            Considere reduzir posições ou ajustar a alavancagem.
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Real</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ${realAccount.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className={`text-xs mt-1 flex items-center ${
              performance.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {performance.totalProfit >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              {performance.totalProfit >= 0 ? '+' : ''}${performance.totalProfit.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">P&L Não Realizado</CardTitle>
            <BarChart3 className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              performance.unrealizedPnl >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              ${performance.unrealizedPnl.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {performance.totalTrades} posições abertas
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Acerto</CardTitle>
            <div className={`w-4 h-4 rounded-full ${getRiskColor(performance.riskLevel).split(' ')[1]}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-800">
              {performance.winRate.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {performance.winningTrades}V • {performance.losingTrades}D
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nível de Risco</CardTitle>
            <Shield className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-lg font-bold ${getRiskColor(performance.riskLevel)} px-2 py-1 rounded`}>
              {performance.riskLevel.toUpperCase()}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Score: {riskMetrics.riskScore.toFixed(0)}/100
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="w-5 h-5 mr-2 text-orange-600" />
              Gestão de Risco
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Perda Diária</span>
                  <span className={riskMetrics.dailyLoss > riskMetrics.dailyLossLimit * 0.8 ? 'text-red-600' : 'text-gray-600'}>
                    ${riskMetrics.dailyLoss.toFixed(2)} / ${riskMetrics.dailyLossLimit.toFixed(2)}
                  </span>
                </div>
                <Progress 
                  value={(riskMetrics.dailyLoss / riskMetrics.dailyLossLimit) * 100} 
                  className={riskMetrics.dailyLoss > riskMetrics.dailyLossLimit * 0.8 ? 'bg-red-200' : ''}
                />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Posições Abertas</span>
                  <span className={riskMetrics.openPositions > riskMetrics.maxPositions * 0.8 ? 'text-red-600' : 'text-gray-600'}>
                    {riskMetrics.openPositions} / {riskMetrics.maxPositions}
                  </span>
                </div>
                <Progress 
                  value={(riskMetrics.openPositions / riskMetrics.maxPositions) * 100}
                  className={riskMetrics.openPositions > riskMetrics.maxPositions * 0.8 ? 'bg-red-200' : ''}
                />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Exposição Total</span>
                  <span className={riskMetrics.exposure > riskMetrics.maxExposure * 0.8 ? 'text-red-600' : 'text-gray-600'}>
                    ${riskMetrics.exposure.toFixed(2)} / ${riskMetrics.maxExposure.toFixed(2)}
                  </span>
                </div>
                <Progress 
                  value={(riskMetrics.exposure / riskMetrics.maxExposure) * 100}
                  className={riskMetrics.exposure > riskMetrics.maxExposure * 0.8 ? 'bg-red-200' : ''}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Positions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="w-5 h-5 mr-2 text-blue-600" />
              Posições em Tempo Real
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {(!positions || positions.length === 0) ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Clock className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-600">Nenhuma posição aberta</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Aguardando oportunidades de mercado
                  </p>
                </div>
              ) : (
                positions.map((position) => (
                  <div key={position.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        position.unrealizedPnl >= 0 ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <div>
                        <div className="font-medium text-sm">{position.symbol}</div>
                        <div className="text-xs text-gray-500">
                          {position.side.toUpperCase()} • {position.amount}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        ${position.currentPrice.toFixed(2)}
                      </div>
                      <div className={`text-xs ${
                        position.unrealizedPnl >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {position.unrealizedPnl >= 0 ? '+' : ''}${position.unrealizedPnl.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Safety Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />
            Controles de Segurança
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              onClick={handleEmergencyStop}
              className="bg-red-50 text-red-700 border-red-300 hover:bg-red-100"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Parada de Emergência
            </Button>
            
            <Button
              variant="outline"
              onClick={handleCloseAllPositions}
              disabled={riskMetrics.openPositions === 0}
              className="bg-orange-50 text-orange-700 border-orange-300 hover:bg-orange-100"
            >
              <TrendingDown className="w-4 h-4 mr-2" />
              Fechar Todas
            </Button>
            
            <Button
              variant="outline"
              onClick={handleRiskSettings}
              className="bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100"
            >
              <Settings className="w-4 h-4 mr-2" />
              Config. de Risco
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import { API_CONFIG } from '@/lib/config';
