import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity, 
  Wifi, 
  WifiOff,
  BarChart3,
  Zap,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface ExchangeStatus {
  isConnected: boolean;
  status: string;
  exchange: string;
  mode: string;
  lastError?: string;
}

interface Balance {
  total: { [key: string]: number };
  free: { [key: string]: number };
  used: { [key: string]: number };
}

interface TickerData {
  symbol: string;
  last: number;
  bid: number;
  ask: number;
  high: number;
  low: number;
  volume: number;
  change: number;
  percentage: number;
  timestamp: number;
}

interface SMCAnalysis {
  liquidityZones: Array<any>;
  orderBlocks: Array<any>;
  fairValueGaps: Array<any>;
  signals: Array<any>;
  currentPrice: number;
}

export default function ExchangeMonitor() {
  const [exchangeStatus, setExchangeStatus] = useState<ExchangeStatus | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [ticker, setTicker] = useState<TickerData | null>(null);
  const [smcAnalysis, setSmcAnalysis] = useState<SMCAnalysis | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Buscar status da exchange
  const fetchExchangeStatus = async () => {
    try {
      const response = await fetch('/api/exchange/status');
      const data = await response.json();
      if (data.success) {
        setExchangeStatus(data.data);
      }
    } catch (error) {
      console.error('Erro ao buscar status da exchange:', error);
    }
  };

  // Buscar saldo
  const fetchBalance = async () => {
    try {
      const response = await fetch('/api/exchange/balance');
      const data = await response.json();
      if (data.success) {
        setBalance(data.data);
      }
    } catch (error) {
      console.error('Erro ao buscar saldo:', error);
    }
  };

  // Buscar ticker
  const fetchTicker = async () => {
    try {
      const response = await fetch('/api/exchange/ticker?symbol=BTC/USDT');
      const data = await response.json();
      if (data.success) {
        setTicker(data.data);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Erro ao buscar ticker:', error);
    }
  };

  // Buscar análise SMC
  const fetchSMCAnalysis = async () => {
    try {
      setIsAnalyzing(true);
      const response = await fetch('/api/analysis/smc?symbol=BTC/USDT&timeframe=1h&limit=200');
      const data = await response.json();
      if (data.success) {
        setSmcAnalysis(data.data);
      }
    } catch (error) {
      console.error('Erro ao buscar análise SMC:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Conectar à exchange
  const handleConnectExchange = async () => {
    try {
      setIsConnecting(true);
      const response = await fetch('/api/exchange/connect', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        await fetchExchangeStatus();
        // Buscar dados iniciais
        await Promise.all([fetchBalance(), fetchTicker(), fetchSMCAnalysis()]);
      }
    } catch (error) {
      console.error('Erro ao conectar exchange:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  // Atualizar dados periodicamente
  useEffect(() => {
    if (exchangeStatus?.isConnected) {
      const interval = setInterval(() => {
        fetchTicker();
      }, 30000); // Atualizar a cada 30 segundos

      return () => clearInterval(interval);
    }
  }, [exchangeStatus?.isConnected]);

  // Buscar status inicial
  useEffect(() => {
    fetchExchangeStatus();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getPnlColor = (value: number) => {
    return value >= 0 ? 'text-green-600' : 'text-red-600';
  };

  if (!exchangeStatus) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status da Conexão */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Status da Exchange</span>
            <Badge variant={exchangeStatus.isConnected ? 'default' : 'destructive'}>
              {exchangeStatus.isConnected ? 'Conectado' : 'Desconectado'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {exchangeStatus.isConnected ? (
                  <Wifi className="h-5 w-5 text-green-500" />
                ) : (
                  <WifiOff className="h-5 w-5 text-red-500" />
                )}
                <span className="text-sm text-gray-600">Conexão</span>
              </div>
              <span className="text-sm font-medium">{exchangeStatus.exchange} ({exchangeStatus.mode})</span>
            </div>
            
            {!exchangeStatus.isConnected && (
              <Button 
                onClick={handleConnectExchange}
                disabled={isConnecting}
                className="w-full"
              >
                {isConnecting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Conectando...
                  </>
                ) : (
                  'Conectar Exchange'
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dados de Mercado */}
      {ticker && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Dados de Mercado</span>
              <Badge variant="outline">{ticker.symbol}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Preço Atual</p>
                <p className="text-2xl font-bold">{formatCurrency(ticker.last)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Mudança 24h</p>
                <p className={`text-2xl font-bold ${getPnlColor(ticker.percentage)}`}>
                  {formatPercent(ticker.percentage)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Alta 24h</p>
                <p className="font-semibold">{formatCurrency(ticker.high)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Baixa 24h</p>
                <p className="font-semibold">{formatCurrency(ticker.low)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Volume</p>
                <p className="font-semibold">{ticker.volume.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Spread</p>
                <p className="font-semibold">{formatCurrency(ticker.ask - ticker.bid)}</p>
              </div>
            </div>
            {lastUpdate && (
              <p className="text-xs text-gray-500 mt-4">
                Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Análise SMC */}
      {smcAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Análise SMC</span>
              <Button 
                onClick={fetchSMCAnalysis}
                disabled={isAnalyzing}
                size="sm"
                variant="outline"
              >
                {isAnalyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                    Analisando...
                  </>
                ) : (
                  <>
                    <BarChart3 className="h-3 w-3 mr-1" />
                    Atualizar
                  </>
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Sinais */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Sinais de Trading</span>
                  <Badge variant={smcAnalysis.signals.length > 0 ? 'default' : 'secondary'}>
                    {smcAnalysis.signals.length}
                  </Badge>
                </div>
                {smcAnalysis.signals.length > 0 ? (
                  <div className="space-y-2">
                    {smcAnalysis.signals.slice(0, 3).map((signal, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center space-x-2">
                          {signal.type === 'BUY' ? (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-500" />
                          )}
                          <span className="text-sm font-medium">
                            {signal.type === 'BUY' ? 'COMPRA' : 'VENDA'}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold">{formatCurrency(signal.entry)}</div>
                          <div className="text-xs text-gray-500">
                            Confiança: {(signal.confidence * 100).toFixed(0)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Nenhum sinal encontrado</p>
                )}
              </div>

              {/* Estatísticas */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{smcAnalysis.liquidityZones.length}</p>
                  <p className="text-xs text-gray-500">Zonas de Liquidez</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">{smcAnalysis.orderBlocks.length}</p>
                  <p className="text-xs text-gray-500">Order Blocks</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">{smcAnalysis.fairValueGaps.length}</p>
                  <p className="text-xs text-gray-500">FVGs</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Saldo da Conta */}
      {balance && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Saldo da Conta</span>
              <DollarSign className="h-5 w-5 text-green-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(balance.total).slice(0, 3).map(([currency, amount]) => (
                <div key={currency} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{currency}</span>
                  <span className="font-semibold">
                    {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status de Conexão Detalhado */}
      {exchangeStatus?.isConnected && (
        <div className="flex items-center justify-center space-x-2 text-sm text-green-600">
          <CheckCircle className="h-4 w-4" />
          <span>Conectado à {exchangeStatus.exchange} ({exchangeStatus.mode})</span>
        </div>
      )}
    </div>
  );
}