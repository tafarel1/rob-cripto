import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Settings, 
  Save, 
  RefreshCw, 
  Shield,
  Target,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

interface TradingConfig {
  riskManagement: {
    maxRiskPerTrade: number;
    maxDailyLoss: number;
    maxOpenPositions: number;
    stopLossDistance: number;
    takeProfitDistance: number;
    trailingStop: boolean;
    breakEvenAfter: number;
  };
  strategies: StrategyConfig[];
  general: {
    autoStart: boolean;
    emergencyStop: boolean;
    notifications: boolean;
    maxDailyTrades: number;
  };
}

interface StrategyConfig {
  name: string;
  symbol: string;
  timeframe: string;
  enabled: boolean;
  smcParams: {
    minLiquidityStrength: number;
    minOrderBlockStrength: number;
    minFvgSize: number;
  };
  riskParams: {
    maxRiskPerTrade: number;
    stopLossDistance: number;
    takeProfitDistance: number;
  };
}

export default function AutomatedTradingConfig() {
  const STORAGE_KEY = 'automatedTradingConfig';
  const [config, setConfig] = useState<TradingConfig>({
    riskManagement: {
      maxRiskPerTrade: 2,
      maxDailyLoss: 5,
      maxOpenPositions: 5,
      stopLossDistance: 2,
      takeProfitDistance: 4,
      trailingStop: true,
      breakEvenAfter: 1
    },
    strategies: [
      {
        name: 'SMC_BTC_Auto',
        symbol: 'BTC/USDT',
        timeframe: '15m',
        enabled: true,
        smcParams: {
          minLiquidityStrength: 70,
          minOrderBlockStrength: 80,
          minFvgSize: 0.2
        },
        riskParams: {
          maxRiskPerTrade: 2,
          stopLossDistance: 2,
          takeProfitDistance: 4
        }
      },
      {
        name: 'SMC_ETH_Auto',
        symbol: 'ETH/USDT',
        timeframe: '15m',
        enabled: true,
        smcParams: {
          minLiquidityStrength: 70,
          minOrderBlockStrength: 80,
          minFvgSize: 0.2
        },
        riskParams: {
          maxRiskPerTrade: 2,
          stopLossDistance: 2,
          takeProfitDistance: 4
        }
      }
    ],
    general: {
      autoStart: false,
      emergencyStop: true,
      notifications: true,
      maxDailyTrades: 10
    }
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as TradingConfig;
        setConfig(parsed);
      }
    } catch { void 0; }
  }, []);

  useEffect(() => {
    setIsAutoSaving(true);
    const id = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        setLastSavedAt(Date.now());
      } finally {
        setIsAutoSaving(false);
      }
    }, 600);
    return () => clearTimeout(id);
  }, [config]);

  const updateRiskParam = (param: keyof typeof config.riskManagement, value: number | boolean) => {
    setConfig(prev => ({
      ...prev,
      riskManagement: {
        ...prev.riskManagement,
        [param]: value
      }
    }));
  };

  const updateGeneralParam = (param: keyof typeof config.general, value: number | boolean) => {
    setConfig(prev => ({
      ...prev,
      general: {
        ...prev.general,
        [param]: value
      }
    }));
  };

  const updateStrategyParam = (index: number, param: keyof StrategyConfig, value: string | boolean) => {
    setConfig(prev => ({
      ...prev,
      strategies: prev.strategies.map((strategy, i) => 
        i === index ? { ...strategy, [param]: value } : strategy
      )
    }));
  };

  const updateStrategySMCParam = (index: number, param: keyof StrategyConfig['smcParams'], value: number) => {
    setConfig(prev => ({
      ...prev,
      strategies: prev.strategies.map((strategy, i) => 
        i === index ? { 
          ...strategy, 
          smcParams: { ...strategy.smcParams, [param]: value }
        } : strategy
      )
    }));
  };

  const updateStrategyRiskParam = (index: number, param: keyof StrategyConfig['riskParams'], value: number) => {
    setConfig(prev => ({
      ...prev,
      strategies: prev.strategies.map((strategy, i) => 
        i === index ? { 
          ...strategy, 
          riskParams: { ...strategy.riskParams, [param]: value }
        } : strategy
      )
    }));
  };

  const addStrategy = () => {
    const newStrategy: StrategyConfig = {
      name: `Strategy_${config.strategies.length + 1}`,
      symbol: 'BTC/USDT',
      timeframe: '15m',
      enabled: true,
      smcParams: {
        minLiquidityStrength: 70,
        minOrderBlockStrength: 80,
        minFvgSize: 0.2
      },
      riskParams: {
        maxRiskPerTrade: 2,
        stopLossDistance: 2,
        takeProfitDistance: 4
      }
    };

    setConfig(prev => ({
      ...prev,
      strategies: [...prev.strategies, newStrategy]
    }));
  };

  const removeStrategy = (index: number) => {
    setConfig(prev => ({
      ...prev,
      strategies: prev.strategies.filter((_, i) => i !== index)
    }));
  };

  const saveConfiguration = async () => {
    setIsSaving(true);
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      // Here you would send the configuration to your backend
      // For now, we'll just show a success message
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Configuração salva com sucesso!', {
        description: 'As configurações do robô foram atualizadas.'
      });
      setLastSavedAt(Date.now());
    } catch {
      toast.error('Erro ao salvar configuração', {
        description: 'Não foi possível salvar as configurações.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const validateConfiguration = () => {
    const errors = [];
    
    if (config.riskManagement.maxRiskPerTrade <= 0 || config.riskManagement.maxRiskPerTrade > 10) {
      errors.push('Risco por trade deve estar entre 0.1% e 10%');
    }
    
    if (config.riskManagement.maxDailyLoss <= 0 || config.riskManagement.maxDailyLoss > 20) {
      errors.push('Perda diária máxima deve estar entre 0.1% e 20%');
    }
    
    if (config.strategies.length === 0) {
      errors.push('Adicione pelo menos uma estratégia');
    }
    
    config.strategies.forEach((strategy, index) => {
      if (!strategy.name || strategy.name.trim() === '') {
        errors.push(`Estratégia ${index + 1}: Nome é obrigatório`);
      }
      
      if (strategy.smcParams.minLiquidityStrength < 0 || strategy.smcParams.minLiquidityStrength > 100) {
        errors.push(`Estratégia ${strategy.name}: Força de liquidez deve estar entre 0 e 100`);
      }
    });
    
    return errors;
  };

  const errors = validateConfiguration();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Settings className="w-6 h-6 mr-3" />
            Configuração do Robô de Trading
          </h2>
          <p className="text-gray-600 mt-1">
            Configure os parâmetros do seu sistema de trading automático
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {isAutoSaving ? (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
              <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Salvando...
            </Badge>
          ) : lastSavedAt ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              Salvo
            </Badge>
          ) : null}
          <Button 
            onClick={saveConfiguration} 
            disabled={isSaving || errors.length > 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar Configuração
          </Button>
        </div>
      </div>

      {/* Validation Alert */}
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {errors.map((error, index) => (
                <p key={index} className="text-sm">• {error}</p>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Risk Management */}
      <Card className="border-red-200">
        <CardHeader className="bg-red-50">
          <CardTitle className="flex items-center text-red-900">
            <Shield className="w-5 h-5 mr-2" />
            Gestão de Risco
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="maxRiskPerTrade">Risco Máximo por Trade (%)</Label>
              <Input
                id="maxRiskPerTrade"
                type="number"
                min="0.1"
                max="10"
                step="0.1"
                value={config.riskManagement.maxRiskPerTrade}
                onChange={(e) => updateRiskParam('maxRiskPerTrade', parseFloat(e.target.value))}
              />
              <p className="text-xs text-gray-500">
                Máximo de capital a arriscar em cada operação
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxDailyLoss">Perda Diária Máxima (%)</Label>
              <Input
                id="maxDailyLoss"
                type="number"
                min="0.1"
                max="20"
                step="0.1"
                value={config.riskManagement.maxDailyLoss}
                onChange={(e) => updateRiskParam('maxDailyLoss', parseFloat(e.target.value))}
              />
              <p className="text-xs text-gray-500">
                Limite máximo de perda por dia
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxOpenPositions">Máximo de Posições Abertas</Label>
              <Input
                id="maxOpenPositions"
                type="number"
                min="1"
                max="20"
                value={config.riskManagement.maxOpenPositions}
                onChange={(e) => updateRiskParam('maxOpenPositions', parseInt(e.target.value))}
              />
              <p className="text-xs text-gray-500">
                Número máximo de trades simultâneos
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stopLossDistance">Distância do Stop Loss (%)</Label>
              <Input
                id="stopLossDistance"
                type="number"
                min="0.1"
                max="10"
                step="0.1"
                value={config.riskManagement.stopLossDistance}
                onChange={(e) => updateRiskParam('stopLossDistance', parseFloat(e.target.value))}
              />
              <p className="text-xs text-gray-500">
                Distância padrão do stop loss
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="takeProfitDistance">Distância do Take Profit (%)</Label>
              <Input
                id="takeProfitDistance"
                type="number"
                min="0.1"
                max="20"
                step="0.1"
                value={config.riskManagement.takeProfitDistance}
                onChange={(e) => updateRiskParam('takeProfitDistance', parseFloat(e.target.value))}
              />
              <p className="text-xs text-gray-500">
                Distância padrão do take profit
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="breakEvenAfter">Break-even Após (%)</Label>
              <Input
                id="breakEvenAfter"
                type="number"
                min="0.1"
                max="10"
                step="0.1"
                value={config.riskManagement.breakEvenAfter}
                onChange={(e) => updateRiskParam('breakEvenAfter', parseFloat(e.target.value))}
              />
              <p className="text-xs text-gray-500">
                Mover stop loss para break-even após este ganho
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="trailingStop"
              checked={config.riskManagement.trailingStop}
              onCheckedChange={(checked) => updateRiskParam('trailingStop', checked)}
            />
            <Label htmlFor="trailingStop">Trailing Stop</Label>
            <p className="text-xs text-gray-500">
              Ativar stop móvel para proteger lucros
            </p>
          </div>
        </CardContent>
      </Card>

      {/* General Settings */}
      <Card className="border-blue-200">
        <CardHeader className="bg-blue-50">
          <CardTitle className="flex items-center text-blue-900">
            <Target className="w-5 h-5 mr-2" />
            Configurações Gerais
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="maxDailyTrades">Máximo de Trades por Dia</Label>
              <Input
                id="maxDailyTrades"
                type="number"
                min="1"
                max="50"
                value={config.general.maxDailyTrades}
                onChange={(e) => updateGeneralParam('maxDailyTrades', parseInt(e.target.value))}
              />
              <p className="text-xs text-gray-500">
                Limite máximo de operações por dia
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="autoStart">Iniciar Automaticamente</Label>
                <p className="text-sm text-gray-500">Iniciar trading ao ligar o sistema</p>
              </div>
              <Switch
                id="autoStart"
                checked={config.general.autoStart}
                onCheckedChange={(checked) => updateGeneralParam('autoStart', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="emergencyStop">Parada de Emergência</Label>
                <p className="text-sm text-gray-500">Ativar proteção de emergência</p>
              </div>
              <Switch
                id="emergencyStop"
                checked={config.general.emergencyStop}
                onCheckedChange={(checked) => updateGeneralParam('emergencyStop', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notifications">Notificações</Label>
                <p className="text-sm text-gray-500">Receber alertas de trades</p>
              </div>
              <Switch
                id="notifications"
                checked={config.general.notifications}
                onCheckedChange={(checked) => updateGeneralParam('notifications', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strategies */}
      <Card className="border-green-200">
        <CardHeader className="bg-green-50">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-green-900">
              <TrendingUp className="w-5 h-5 mr-2" />
              Estratégias de Trading
            </CardTitle>
            <Button onClick={addStrategy} variant="outline" size="sm">
              Adicionar Estratégia
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {config.strategies.map((strategy, index) => (
            <Card key={index} className="border-gray-200">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Input
                      value={strategy.name}
                      onChange={(e) => updateStrategyParam(index, 'name', e.target.value)}
                      className="font-medium w-48"
                      placeholder="Nome da Estratégia"
                    />
                    <Badge variant={strategy.enabled ? 'default' : 'secondary'}>
                      {strategy.enabled ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={strategy.enabled}
                      onCheckedChange={(checked) => updateStrategyParam(index, 'enabled', checked)}
                    />
                    <Button
                      onClick={() => removeStrategy(index)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      Remover
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Par de Trading</Label>
                    <select
                      value={strategy.symbol}
                      onChange={(e) => updateStrategyParam(index, 'symbol', e.target.value)}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="BTC/USDT">BTC/USDT</option>
                      <option value="ETH/USDT">ETH/USDT</option>
                      <option value="ADA/USDT">ADA/USDT</option>
                      <option value="SOL/USDT">SOL/USDT</option>
                      <option value="DOT/USDT">DOT/USDT</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Timeframe</Label>
                    <select
                      value={strategy.timeframe}
                      onChange={(e) => updateStrategyParam(index, 'timeframe', e.target.value)}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="5m">5 Minutos</option>
                      <option value="15m">15 Minutos</option>
                      <option value="30m">30 Minutos</option>
                      <option value="1h">1 Hora</option>
                      <option value="4h">4 Horas</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Risco Máx. por Trade (%)</Label>
                    <Input
                      type="number"
                      min="0.1"
                      max="10"
                      step="0.1"
                      value={strategy.riskParams.maxRiskPerTrade}
                      onChange={(e) => updateStrategyRiskParam(index, 'maxRiskPerTrade', parseFloat(e.target.value))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Força Mín. de Liquidez (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={strategy.smcParams.minLiquidityStrength}
                      onChange={(e) => updateStrategySMCParam(index, 'minLiquidityStrength', parseFloat(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Força Mín. de Order Block (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={strategy.smcParams.minOrderBlockStrength}
                      onChange={(e) => updateStrategySMCParam(index, 'minOrderBlockStrength', parseFloat(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Tamanho Mín. FVG (%)</Label>
                    <Input
                      type="number"
                      min="0.01"
                      max="5"
                      step="0.01"
                      value={strategy.smcParams.minFvgSize}
                      onChange={(e) => updateStrategySMCParam(index, 'minFvgSize', parseFloat(e.target.value))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
