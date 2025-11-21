import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Gamepad2, Zap, DollarSign, Shield, TrendingUp, Settings } from 'lucide-react';
import { useAccountManager, ExchangeConfig } from './useAccountManager';
import { toast } from 'sonner';

interface AccountModeSelectorProps {
  onModeChange?: (mode: 'VIRTUAL' | 'REAL') => void;
}

export default function AccountModeSelector({ onModeChange }: AccountModeSelectorProps) {
  const { currentMode, switchToVirtual, switchToReal, isLoading } = useAccountManager();
  const [selectedMode, setSelectedMode] = useState<'VIRTUAL' | 'REAL'>(currentMode);
  const [apiKeys, setApiKeys] = useState({
    binance: {
      apiKey: '',
      secret: ''
    }
  });
  const [showApiConfig, setShowApiConfig] = useState(false);

  const handleModeSelect = (mode: 'VIRTUAL' | 'REAL') => {
    setSelectedMode(mode);
    if (mode === 'REAL') {
      setShowApiConfig(true);
    } else {
      setShowApiConfig(false);
    }
  };

  const handleActivateVirtual = async () => {
    try {
      await switchToVirtual();
      if (onModeChange) {
        onModeChange('VIRTUAL');
      }
    } catch (error) {
      console.error('Error activating virtual mode:', error);
    }
  };

  const handleActivateReal = async () => {
    if (!apiKeys.binance.apiKey || !apiKeys.binance.secret) {
      toast.error('Configuração incompleta', {
        description: 'Por favor, insira as chaves API da Binance para continuar.'
      });
      return;
    }

    try {
      await switchToReal(apiKeys);
      if (onModeChange) {
        onModeChange('REAL');
      }
    } catch (error) {
      console.error('Error activating real mode:', error);
    }
  };

  const handleApiKeyChange = (field: 'apiKey' | 'secret', value: string) => {
    setApiKeys(prev => ({
      ...prev,
      binance: {
        ...prev.binance,
        [field]: value
      }
    }));
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          🎯 Seletor de Modo de Conta
        </h2>
        <p className="text-gray-600">
          Escolha entre conta virtual para aprendizado ou conta real para operações com capital genuíno
        </p>
        
        {/* Current Mode Indicator */}
        <div className="mt-4 inline-flex items-center px-4 py-2 rounded-full bg-blue-100 text-blue-800">
          {currentMode === 'VIRTUAL' ? (
            <>
              <Gamepad2 className="w-4 h-4 mr-2" />
              <span className="font-medium">🎮 MODO VIRTUAL ATIVO</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              <span className="font-medium">⚡ MODO REAL ATIVO</span>
            </>
          )}
        </div>
      </div>

      {/* Mode Selection Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Virtual Account Card */}
        <Card className={`cursor-pointer transition-all duration-300 ${
          selectedMode === 'VIRTUAL' 
            ? 'ring-2 ring-green-500 shadow-lg transform scale-105' 
            : 'hover:shadow-md'
        }`} onClick={() => handleModeSelect('VIRTUAL')}>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-green-700">
                <Gamepad2 className="w-6 h-6 mr-3 text-green-600" />
                <span className="text-xl font-bold">🎮 Conta Virtual</span>
              </CardTitle>
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                SEM RISCO
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-green-700">Saldo Inicial</span>
                  <DollarSign className="w-4 h-4 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-green-800">$10,000</div>
                <div className="text-xs text-green-600 mt-1">Capital virtual para testes</div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-gray-800 flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2 text-green-600" />
                  Benefícios:
                </h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">•</span>
                    <span>💰 Capital virtual: $10,000 para testes ilimitados</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">•</span>
                    <span>📚 Ideal para aprendizado e estratégias</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">•</span>
                    <span>🛡️ Zero risco real - sem perdas financeiras</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">•</span>
                    <span>📊 Performance tracking completo</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">•</span>
                    <span>🔄 Replay de mercados passados</span>
                  </li>
                </ul>
              </div>

              <div className="pt-4">
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleActivateVirtual}
                  disabled={isLoading || currentMode === 'VIRTUAL'}
                >
                  {isLoading ? (
                    'Ativando...'
                  ) : currentMode === 'VIRTUAL' ? (
                    '✅ Modo Virtual Ativo'
                  ) : (
                    '🎮 Ativar Conta Virtual'
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Real Account Card */}
        <Card className={`cursor-pointer transition-all duration-300 ${
          selectedMode === 'REAL' 
            ? 'ring-2 ring-blue-500 shadow-lg transform scale-105' 
            : 'hover:shadow-md'
        }`} onClick={() => handleModeSelect('REAL')}>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-blue-700">
                <Zap className="w-6 h-6 mr-3 text-blue-600" />
                <span className="text-xl font-bold">⚡ Conta Real</span>
              </CardTitle>
              <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                PRODUÇÃO
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-700">Capital Real</span>
                  <DollarSign className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-blue-800">Seu Capital</div>
                <div className="text-xs text-blue-600 mt-1">Depósito mínimo: $100</div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-gray-800 flex items-center">
                  <Shield className="w-4 h-4 mr-2 text-blue-600" />
                  Características:
                </h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span>💵 Capital real do usuário</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span>🎯 Operações no mercado real</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span>⚠️ Requer configuração de APIs</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span>📈 Lucros e perdas reais</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span>🛡️ Gestão de risco rigorosa</span>
                  </li>
                </ul>
              </div>

              {/* API Configuration */}
              {showApiConfig && (
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <div className="flex items-center mb-3">
                    <Settings className="w-4 h-4 mr-2 text-yellow-600" />
                    <span className="font-medium text-yellow-800">Configuração de API</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="apiKey" className="text-sm font-medium text-gray-700">
                        Binance API Key
                      </Label>
                      <Input
                        id="apiKey"
                        type="password"
                        placeholder="Insira sua Binance API Key"
                        value={apiKeys.binance.apiKey}
                        onChange={(e) => handleApiKeyChange('apiKey', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="apiSecret" className="text-sm font-medium text-gray-700">
                        Binance API Secret
                      </Label>
                      <Input
                        id="apiSecret"
                        type="password"
                        placeholder="Insira sua Binance API Secret"
                        value={apiKeys.binance.secret}
                        onChange={(e) => handleApiKeyChange('secret', e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    <div className="flex items-start p-3 bg-yellow-100 rounded-md">
                      <AlertCircle className="w-4 h-4 mr-2 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-yellow-800">
                        <strong>Atenção:</strong> Suas chaves API são armazenadas localmente e nunca são compartilhadas. 
                        Certifique-se de que suas chaves tenham apenas as permissões necessárias para trading.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4">
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleActivateReal}
                  disabled={isLoading || currentMode === 'REAL'}
                >
                  {isLoading ? (
                    'Ativando...'
                  ) : currentMode === 'REAL' ? (
                    '✅ Modo Real Ativo'
                  ) : (
                    '⚡ Ativar Conta Real'
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mode Comparison */}
      <div className="mt-8 p-6 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-gray-600" />
          Comparação de Modos
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h4 className="font-medium text-green-700">🎮 Conta Virtual</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Risco: 2% por trade</li>
              <li>• Limite diário: 5%</li>
              <li>• Máx. trades: 5 simultâneos</li>
              <li>• Pares: BTC, ETH, ADA, SOL, DOT</li>
              <li>• Replay: ✅ Disponível</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-blue-700">⚡ Conta Real</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Risco: 1% por trade</li>
              <li>• Limite diário: 3%</li>
              <li>• Máx. trades: 3 simultâneos</li>
              <li>• Pares: BTC, ETH (inicial)</li>
              <li>• Stop Loss: ✅ Obrigatório</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}