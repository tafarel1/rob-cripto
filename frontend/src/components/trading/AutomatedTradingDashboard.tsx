import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Square, 
  Settings, 
  TrendingUp, 
  AlertTriangle,
  Clock,
  DollarSign,
  Target,
  BarChart3,
  Zap,
  RefreshCw,
  Shield,
  Activity,
  Cog,
  Bot,
  FileDown,
  LineChart,
  PieChart,
  Home
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAccountManager } from '@/components/account/useAccountManager';
import AutomatedTradingConfig from './AutomatedTradingConfig';
import { useExchange } from '@/hooks/useExchange';
import ThemeToggle from '@/components/ui/ThemeToggle';
 

interface EngineStatus {
  status: 'NOT_INITIALIZED' | 'RUNNING' | 'STOPPED' | 'EMERGENCY_STOPPED';
  engineStats: {
    activeStrategies: number;
    activePositions: number;
    totalTrades: number;
    riskStats: RiskStats;
    isRunning: boolean;
  };
  activePositions: Position[];
  strategies: Strategy[];
  timestamp: string;
  uptime?: number;
  config: unknown;
}

interface Position {
  id: string;
  symbol: string;
  type: 'LONG' | 'SHORT';
  entryPrice: number;
  quantity: number;
  stopLoss: number;
  takeProfit: number[];
  status: 'OPEN' | 'CLOSED';
  openTime: number;
  unrealizedPnl?: number;
  currentPrice?: number;
}

interface RiskStats {
  dailyPnl?: number;
  totalPnl?: number;
  marketSpread?: number | null;
  botSpread?: number | null;
  maxRiskPerTrade?: number;
  drawdown?: number;
  fillRate?: number;
}

interface Strategy {
  name: string;
  symbol: string;
  timeframe: string;
  enabled: boolean;
  smcParams?: {
    minLiquidityStrength?: number;
    minOrderBlockStrength?: number;
    minFvgSize?: number;
  };
  riskParams?: {
    maxRiskPerTrade?: number;
    stopLossDistance?: number;
    takeProfitDistance?: number;
  };
}

export default function AutomatedTradingDashboard() {
  const { currentMode, virtualAccount, realAccount, resetVirtualAccount } = useAccountManager();
  const [engineStatus, setEngineStatus] = useState<EngineStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
 
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [preserveSettings, setPreserveSettings] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const { balance, exchangeStatus, connect, disconnect, isLoading: isConnLoading } = useExchange();
  

  // Fetch engine status
  const fetchEngineStatus = useCallback(async () => {
    try {
    const response = await fetch(`${API_CONFIG.baseURL}/api/automated-trading/status`);
      const result = await response.json();
      
      if (result.success) {
        setEngineStatus(result.data);
      } else {
        toast.error('Erro ao obter status do motor', {
          description: result.error || 'Erro desconhecido'
        });
      }
    } catch (error) {
      console.error('Erro ao buscar status:', error);
      // Don't show error toast for periodic refresh
      if (!autoRefresh) {
        toast.error('Erro de conexão', {
          description: 'Não foi possível conectar ao motor de trading'
        });
      }
    }
  }, [autoRefresh]);

  // Initialize trading engine
  const initializeEngine = async () => {
    setIsInitializing(true);
    
    try {
      const config = {
        exchangeConfigs: currentMode === 'REAL' ? [
          {
            name: 'binance',
            apiKey: 'your_binance_api_key',
            secret: 'your_binance_secret'
          }
        ] : [],
        riskConfig: {
          maxRiskPerTrade: 0.02,
          maxDailyLoss: 0.05,
          maxOpenPositions: 5,
          stopLossDistance: 0.02,
          takeProfitDistance: 0.04,
          trailingStop: true,
          breakEvenAfter: 0.01
        },
        initialBalance: currentMode === 'VIRTUAL' ? virtualAccount.balance : realAccount.balance,
        strategies: [
          {
            name: 'SMC_Auto_BTC',
            symbol: 'BTC/USDT',
            timeframe: '15m',
            enabled: true,
            smcParams: {
              minLiquidityStrength: 0.7,
              minOrderBlockStrength: 0.8,
              minFvgSize: 0.002
            },
            riskParams: {
              maxRiskPerTrade: 0.02,
              stopLossDistance: 0.02,
              takeProfitDistance: 0.04
            }
          },
          {
            name: 'SMC_Auto_ETH',
            symbol: 'ETH/USDT',
            timeframe: '15m',
            enabled: true,
            smcParams: {
              minLiquidityStrength: 0.7,
              minOrderBlockStrength: 0.8,
              minFvgSize: 0.002
            },
            riskParams: {
              maxRiskPerTrade: 0.02,
              stopLossDistance: 0.02,
              takeProfitDistance: 0.04
            }
          }
        ]
      };

      const response = await fetch(`${API_CONFIG.baseURL}/api/automated-trading/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config)
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Motor de trading inicializado!', {
          description: 'Sistema automático pronto para iniciar'
        });
        setEngineStatus(result.data);
      } else {
        toast.error('Erro ao inicializar', {
          description: result.error || 'Erro desconhecido'
        });
      }
    } catch (error) {
      console.error('Erro ao inicializar motor:', error);
      toast.error('Erro de conexão', {
        description: 'Não foi possível conectar ao servidor'
      });
    } finally {
      setIsInitializing(false);
    }
  };

  // Start automated trading
  const startTrading = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch(`${API_CONFIG.baseURL}/api/automated-trading/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Trading automático iniciado!', {
          description: 'Robô operando automaticamente'
        });
        setEngineStatus(result.data);
      } else {
        toast.error('Erro ao iniciar', {
          description: result.error || 'Erro desconhecido'
        });
      }
    } catch (error) {
      console.error('Erro ao iniciar trading:', error);
      toast.error('Erro de conexão', {
        description: 'Não foi possível conectar ao servidor'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Stop automated trading
  const stopTrading = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch(`${API_CONFIG.baseURL}/api/automated-trading/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Trading automático parado!', {
          description: 'Robô desligado com segurança'
        });
        setEngineStatus(result.data);
      } else {
        toast.error('Erro ao parar', {
          description: result.error || 'Erro desconhecido'
        });
      }
    } catch (error) {
      console.error('Erro ao parar trading:', error);
      toast.error('Erro de conexão', {
        description: 'Não foi possível conectar ao servidor'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Emergency stop
  const emergencyStop = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch(`${API_CONFIG.baseURL}/api/automated-trading/emergency-stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();

      if (result.success) {
        toast.warning('Emergência ativada!', {
          description: 'Todas as posições serão fechadas'
        });
        setEngineStatus(result.data);
      } else {
        toast.error('Erro na emergência', {
          description: result.error || 'Erro desconhecido'
        });
      }
    } catch (error) {
      console.error('Erro na emergência:', error);
      toast.error('Erro de conexão', {
        description: 'Não foi possível conectar ao servidor'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchEngineStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, engineStatus?.status, fetchEngineStatus]);

  // Initial fetch
  useEffect(() => {
    fetchEngineStatus();
  }, [fetchEngineStatus]);

  const equity = useMemo(() => {
    const base = currentMode === 'VIRTUAL' ? virtualAccount.balance : realAccount.balance;
    return base;
  }, [currentMode, virtualAccount.balance, realAccount.balance]);

  const netExposure = useMemo(() => {
    const positions = (engineStatus?.activePositions || []) as Position[];
    const exposure = positions.reduce((sum: number, p: Position) => sum + (p.quantity || 0) * ((p.currentPrice ?? p.entryPrice) || 0) * (p.type === 'LONG' ? 1 : -1), 0);
    return exposure;
  }, [engineStatus?.activePositions]);

  const dailyPnl = useMemo(() => {
    const risk = engineStatus?.engineStats?.riskStats || {};
    return risk.dailyPnl ?? 0;
  }, [engineStatus?.engineStats]);

  const totalPnl = useMemo(() => {
    const risk = engineStatus?.engineStats?.riskStats || {};
    return risk.totalPnl ?? 0;
  }, [engineStatus?.engineStats]);

  const spreadMetrics = useMemo(() => {
    const marketSpread = engineStatus?.engineStats?.riskStats?.marketSpread ?? null;
    const botSpread = engineStatus?.engineStats?.riskStats?.botSpread ?? null;
    return { marketSpread, botSpread };
  }, [engineStatus?.engineStats]);

  const exportCsv = () => {
    const rows: string[] = [];
    rows.push('type,symbol,side,price,quantity,timestamp');
    (engineStatus?.activePositions || []).forEach((p: Position) => {
      rows.push(`position,${p.symbol},${p.type},${p.currentPrice ?? p.entryPrice ?? ''},${p.quantity ?? ''},${p.openTime ?? ''}`);
    });
    (engineStatus?.strategies || []).forEach((s: Strategy) => {
      rows.push(`strategy,${s.symbol ?? ''},,${s.riskParams?.takeProfitDistance ?? ''},${s.riskParams?.stopLossDistance ?? ''},${Date.now()}`);
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'smc_trading_export.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exportação concluída', { description: 'CSV gerado com dados atuais' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RUNNING': return 'bg-green-500';
      case 'STOPPED': return 'bg-yellow-500';
      case 'EMERGENCY_STOPPED': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'RUNNING': return 'OPERANDO';
      case 'STOPPED': return 'PARADO';
      case 'EMERGENCY_STOPPED': return 'EMERGÊNCIA';
      default: return 'NÃO INICIALIZADO';
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <Bot className="w-8 h-8 mr-3 text-blue-600" />
              Trading Automático
            </h1>
            <p className="text-muted-foreground mt-1">
              Robô de trading inteligente com Smart Money Concepts
            </p>
          </div>
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className={currentMode === 'VIRTUAL' ? 'border-green-200 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}>
            {currentMode === 'VIRTUAL' ? '🎮 MODO DEMO' : '⚡ MODO REAL'}
          </Badge>
          {engineStatus && (
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(engineStatus.status)} animate-pulse`}></div>
              <span className="text-sm font-medium">{getStatusText(engineStatus.status)}</span>
            </div>
          )}
          <Link to="/">
            <Button className="bg-purple-600 hover:bg-purple-700 text-white">
              <Home className="w-4 h-4 mr-2" />
              Página Inicial
            </Button>
          </Link>
          <Link to="/dual-dashboard">
            <Button className="bg-purple-600 hover:bg-purple-700 text-white">
              <Zap className="w-4 h-4 mr-2" />
              Dual Dashboard
            </Button>
          </Link>
          <Button onClick={exportCsv} className="bg-purple-600 hover:bg-purple-700 text-white">
            <FileDown className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
          <ThemeToggle />
        </div>
        </div>

        {/* Status Alert */}
        {!engineStatus && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Motor de trading não inicializado. Clique em "Inicializar Sistema" para começar.
            </AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-2 lg:grid-cols-2 w-full">
            <TabsTrigger value="dashboard" className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center space-x-2">
              <Cog className="w-4 h-4" />
              <span>Configuração</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Control Panel */}
            <Card className="border-blue-200">
              <CardHeader className="bg-blue-50">
                <CardTitle className="flex items-center text-blue-900">
                  <Settings className="w-5 h-5 mr-2" />
                  Painel de Controle Automático
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Initialize Button */}
                  <div className="space-y-2">
                    <Button
                      onClick={initializeEngine}
                      disabled={isInitializing || (engineStatus && engineStatus.status !== 'NOT_INITIALIZED')}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      size="lg"
                    >
                      {isInitializing ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Settings className="w-4 h-4 mr-2" />
                      )}
                      Inicializar Sistema
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      Configurar motor de trading
                    </p>
                  </div>

                  {/* Start/Stop Button */}
                  <div className="space-y-2">
                    {engineStatus?.status === 'RUNNING' ? (
                      <Button
                        onClick={stopTrading}
                        disabled={isLoading}
                        className="w-full bg-red-600 hover:bg-red-700"
                        size="lg"
                      >
                        {isLoading ? (
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Square className="w-4 h-4 mr-2" />
                        )}
                        Parar Robô
                      </Button>
                    ) : (
                      <Button
                        onClick={startTrading}
                        disabled={isLoading || !engineStatus || engineStatus.status === 'NOT_INITIALIZED'}
                        className="w-full bg-green-600 hover:bg-green-700"
                        size="lg"
                      >
                        {isLoading ? (
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4 mr-2" />
                        )}
                        Iniciar Robô
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground text-center">
                      {engineStatus?.status === 'RUNNING' ? 'Robô operando' : 'Iniciar trading automático'}
                    </p>
                  </div>

                  {/* Emergency Stop Button */}
                  <div className="space-y-2">
                    <Button
                      onClick={emergencyStop}
                      disabled={isLoading || !engineStatus || engineStatus.status !== 'RUNNING'}
                      className="w-full bg-orange-600 hover:bg-orange-700"
                      size="lg"
                      variant="destructive"
                    >
                      {isLoading ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 mr-2" />
                      )}
                      Emergência
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      Parar imediatamente e fechar posições
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Button
                      onClick={() => {
                        if (currentMode !== 'VIRTUAL') {
                          toast.warning('Reset disponível apenas no modo virtual', {
                            description: 'Altere para MODO DEMO para resetar a conta virtual.'
                          });
                        }
                        setShowResetConfirm(true);
                      }}
                      className="w-full bg-yellow-500 hover:bg-yellow-600 text-black"
                      size="lg"
                    >
                      {isResetting ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      Resetar Conta Virtual
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      Restaurar saldo e limpar histórico
                    </p>
                  </div>
                </div>

                {/* Auto Refresh Toggle */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Atualização automática</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
            </CardContent>
          </Card>

          {showResetConfirm && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-card text-card-foreground rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
                <h3 className="text-lg font-semibold">Confirmar reset da conta virtual</h3>
                <div className="text-sm text-muted-foreground space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Saldo virtual</span>
                    <span className="font-medium text-foreground">$10.000</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Histórico de trades</span>
                    <span className="text-foreground">Será limpo</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Métricas de performance</span>
                    <span className="text-foreground">Zeradas</span>
                  </div>
                </div>
                <label className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={preserveSettings}
                    onChange={(e) => setPreserveSettings(e.target.checked)}
                  />
                  <span>Manter configurações de estratégia SMC e risco</span>
                </label>
                <div className="flex justify-end space-x-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowResetConfirm(false)}
                    className="border-gray-300"
                    disabled={isResetting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={async () => {
                      try {
                        setIsResetting(true);
                        await resetVirtualAccount({ preserveSettings });
                        await fetchEngineStatus();
                        setShowResetConfirm(false);
                      } finally {
                        setIsResetting(false);
                      }
                    }}
                    className="bg-yellow-500 hover:bg-yellow-600 text-black"
                    disabled={isResetting}
                  >
                    {isResetting ? 'Resetando...' : 'Confirmar Reset'}
                  </Button>
                </div>
              </div>
            </div>
          )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <Card className="border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Equity</p>
                      <p className="text-2xl font-bold text-green-700">${equity.toLocaleString()}</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-purple-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">P&L (Dia / Total)</p>
                      <p className="text-2xl font-bold text-purple-600">${dailyPnl.toFixed(2)} / ${totalPnl.toFixed(2)}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-orange-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Exposição Líquida</p>
                      <p className={`text-2xl font-bold ${Math.abs(netExposure) > (equity * 0.8) ? 'text-red-700' : 'text-orange-600'}`}>${netExposure.toFixed(2)}</p>
                    </div>
                    <Target className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Conexão</p>
                      <p className="text-2xl font-bold text-foreground">{exchangeStatus?.isConnected ? 'Conectado' : 'Desconectado'}</p>
                    </div>
                    <Clock className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div className="mt-3 flex space-x-3">
                    <Button
                      onClick={() => connect({ key: '', secret: '' })}
                      disabled={isConnLoading}
                      className="bg-green-600 hover:bg-green-700"
                      size="sm"
                    >
                      Conectar
                    </Button>
                    <Button
                      onClick={() => disconnect()}
                      disabled={isConnLoading}
                      className="bg-gray-600 hover:bg-gray-700"
                      size="sm"
                    >
                      Desconectar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {engineStatus && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                <Card className="border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Estratégias Ativas</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {engineStatus.engineStats?.activeStrategies || 0}
                        </p>
                      </div>
                      <Target className="w-8 h-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Posições Abertas</p>
                        <p className="text-2xl font-bold text-green-600">
                          {engineStatus.engineStats?.activePositions || 0}
                        </p>
                      </div>
                      <BarChart3 className="w-8 h-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-purple-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total de Trades</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {engineStatus.engineStats?.totalTrades || 0}
                        </p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-orange-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Risco Máx.</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {((engineStatus.engineStats?.riskStats?.maxRiskPerTrade || 0) * 100).toFixed(1)}%
                        </p>
                      </div>
                      <Shield className="w-8 h-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Spread</span>
                    <Badge variant="outline" className="bg-card">Mercado: {spreadMetrics.marketSpread ?? 'N/A'} • Robô: {spreadMetrics.botSpread ?? 'N/A'}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-40 bg-card border rounded flex items-center justify-center text-muted-foreground">Gráfico de Spread</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Equity Curve</span>
                    <LineChart className="w-4 h-4" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-40 bg-card border rounded flex items-center justify-center text-muted-foreground">Gráfico de Equity</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Saldos</span>
                    <PieChart className="w-4 h-4" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 bg-secondary rounded">
                      <p className="text-muted-foreground">BTC</p>
                      <p className="font-semibold">{balance?.data?.free?.BTC?.toFixed(6) ?? 'N/A'}</p>
                    </div>
                    <div className="p-3 bg-secondary rounded">
                      <p className="text-muted-foreground">USDT</p>
                      <p className="font-semibold">{balance?.data?.free?.USDT?.toFixed(2) ?? 'N/A'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2 text-orange-500" />
                  Alertas de Risco
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg border bg-red-50 dark:bg-red-900/20">
                    <p className="text-sm text-red-700">Exposição acima do limite</p>
                    <Progress value={Math.min(100, Math.abs(netExposure) / (equity || 1) * 100)} />
                  </div>
                  <div className="p-4 rounded-lg border bg-yellow-50 dark:bg-yellow-900/20">
                    <p className="text-sm text-yellow-600">Drawdown</p>
                    <Progress value={Math.min(100, (engineStatus?.engineStats?.riskStats?.drawdown || 0) * 100)} />
                  </div>
                  <div className="p-4 rounded-lg border bg-purple-50 dark:bg-purple-900/20">
                    <p className="text-sm text-purple-600">Fill Rate</p>
                    <Progress value={Math.min(100, (engineStatus?.engineStats?.riskStats?.fillRate || 0) * 100)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Positions */}
            {engineStatus?.activePositions && engineStatus.activePositions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2" />
                    Posições Ativas
                    <Badge variant="secondary" className="ml-2">
                      {engineStatus.activePositions.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {engineStatus.activePositions.map((position: Position) => (
                      <div key={position.id} className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className={`w-3 h-3 rounded-full ${position.type === 'LONG' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <div>
                            <p className="font-medium">{position.symbol}</p>
                            <p className="text-sm text-white">{position.type}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${position.entryPrice.toLocaleString()}</p>
                          <p className="text-sm text-white">Entry</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{position.quantity}</p>
                          <p className="text-sm text-white">Quantidade</p>
                        </div>
                        {position.unrealizedPnl !== undefined && (
                          <div className="text-right">
                            <p className={`font-medium ${position.unrealizedPnl >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                              ${position.unrealizedPnl.toFixed(2)}
                            </p>
                            <p className="text-sm text-white">PnL</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Strategies */}
            {engineStatus?.strategies && engineStatus.strategies.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="w-5 h-5 mr-2" />
                    Estratégias Configuradas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {engineStatus.strategies.map((strategy: Strategy, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-2 h-2 rounded-full ${strategy.enabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                          <div>
                            <p className="font-medium">{strategy.name}</p>
                            <p className="text-sm text-muted-foreground">{strategy.symbol} • {strategy.timeframe}</p>
                          </div>
                        </div>
                        <Badge variant={strategy.enabled ? 'default' : 'secondary'}>
                          {strategy.enabled ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* System Status */}
            {engineStatus && (
              <Card className="border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    Status do Sistema
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Última Atualização</p>
                      <p className="font-medium">
                        {engineStatus.timestamp ? new Date(engineStatus.timestamp).toLocaleString('pt-BR') : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Modo de Conta</p>
                      <p className="font-medium">
                        {currentMode === 'VIRTUAL' ? 'Demo Virtual' : 'Conta Real'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Saldo Disponível</p>
                      <p className="font-medium">
                        ${(currentMode === 'VIRTUAL' ? virtualAccount.balance : realAccount.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Tempo de Atividade</p>
                      <p className="font-medium">
                        {engineStatus.uptime ? `${Math.floor(engineStatus.uptime / 3600)}h ${Math.floor((engineStatus.uptime % 3600) / 60)}m` : 'N/A'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Configuration Tab */}
          <TabsContent value="config">
            <AutomatedTradingConfig />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
import { API_CONFIG } from '@/lib/config';
