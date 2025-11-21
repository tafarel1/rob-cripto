import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Play,
  Square,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Zap,
  Shield,
  BarChart3,
  Target,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

interface TestResult {
  id: string;
  timestamp: number;
  testType: 'connection' | 'analysis' | 'order' | 'risk' | 'notification';
  status: 'success' | 'failed' | 'warning';
  duration: number;
  message: string;
  details?: any;
}

interface SystemStatus {
  exchangeConnected: boolean;
  analysisWorking: boolean;
  orderSystemReady: boolean;
  riskManagementActive: boolean;
  notificationsEnabled: boolean;
}

export default function SystemValidationDemo() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    exchangeConnected: false,
    analysisWorking: false,
    orderSystemReady: false,
    riskManagementActive: false,
    notificationsEnabled: false
  });
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [currentTest, setCurrentTest] = useState<string>('');

  const getTestTypeIcon = (testType: string) => {
    switch (testType) {
      case 'connection': return <Zap className="h-4 w-4" />;
      case 'analysis': return <BarChart3 className="h-4 w-4" />;
      case 'order': return <DollarSign className="h-4 w-4" />;
      case 'risk': return <Shield className="h-4 w-4" />;
      case 'notification': return <Activity className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const getTestTypeColor = (testType: string) => {
    switch (testType) {
      case 'connection': return 'text-blue-600';
      case 'analysis': return 'text-purple-600';
      case 'order': return 'text-green-600';
      case 'risk': return 'text-orange-600';
      case 'notification': return 'text-cyan-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-100 text-green-800">Sucesso</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="bg-red-100 text-red-800">Falhou</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Aviso</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const runSystemValidation = async () => {
    setIsRunningTests(true);
    setTestResults([]);
    
    const testTypes = ['connection', 'analysis', 'order', 'risk', 'notification'];
    
    for (const testType of testTypes) {
      setCurrentTest(testType);
      await runIndividualTest(testType);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Pequeno delay entre testes
    }
    
    setCurrentTest('');
    setIsRunningTests(false);
  };

  const runIndividualTest = async (testType: string) => {
    try {
      const response = await fetch('/api/tests/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ testType })
      });
      
      const result = await response.json();
      
      if (result.success && result.data.results && result.data.results.length > 0) {
        const testResult = result.data.results[0];
        setTestResults(prev => [...prev, testResult]);
        
        // Atualizar status do sistema baseado nos resultados
        setSystemStatus(prev => ({
          ...prev,
          [`${testType}Working`]: testResult.status === 'success'
        }));
      }
    } catch (error) {
      console.error(`Erro ao executar teste ${testType}:`, error);
      
      // Adicionar resultado de erro
      const errorResult: TestResult = {
        id: `error_${Date.now()}_${testType}`,
        timestamp: Date.now(),
        testType: testType as any,
        status: 'failed',
        duration: 0,
        message: `Erro de conexão: ${error.message}`,
        details: { error: error.message }
      };
      
      setTestResults(prev => [...prev, errorResult]);
    }
  };

  const getOverallStatus = () => {
    const statuses = Object.values(systemStatus);
    const workingCount = statuses.filter(Boolean).length;
    const totalCount = statuses.length;
    
    if (workingCount === totalCount) return { status: 'success', message: 'Todos os sistemas operacionais' };
    if (workingCount === 0) return { status: 'failed', message: 'Nenhum sistema operacional' };
    return { status: 'warning', message: `${workingCount}/${totalCount} sistemas operacionais` };
  };

  const overallStatus = getOverallStatus();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Sistema de Validação - Robô de Trading SMC
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Demonstração completa do sistema conectado à exchange real em modo testnet
          </p>
          
          {/* Status Geral */}
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className={`w-4 h-4 rounded-full ${
              overallStatus.status === 'success' ? 'bg-green-500' :
              overallStatus.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
            }`}></div>
            <span className={`text-lg font-semibold ${
              overallStatus.status === 'success' ? 'text-green-600' :
              overallStatus.status === 'failed' ? 'text-red-600' : 'text-yellow-600'
            }`}>
              {overallStatus.message}
            </span>
          </div>
          
          <Button 
            onClick={runSystemValidation}
            disabled={isRunningTests}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isRunningTests ? (
              <>
                <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                Validando Sistema... {currentTest && `(${currentTest})`}
              </>
            ) : (
              <>
                <Play className="h-5 w-5 mr-2" />
                Iniciar Validação Completa
              </>
            )}
          </Button>
        </div>

        {/* Cards de Status do Sistema */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {[
            { key: 'exchangeConnected', name: 'Exchange', icon: <Zap className="h-6 w-6" />, color: 'blue' },
            { key: 'analysisWorking', name: 'Análise SMC', icon: <BarChart3 className="h-6 w-6" />, color: 'purple' },
            { key: 'orderSystemReady', name: 'Sistema de Ordens', icon: <DollarSign className="h-6 w-6" />, color: 'green' },
            { key: 'riskManagementActive', name: 'Gestão de Risco', icon: <Shield className="h-6 w-6" />, color: 'orange' },
            { key: 'notificationsEnabled', name: 'Notificações', icon: <Activity className="h-6 w-6" />, color: 'cyan' }
          ].map((system) => (
            <Card key={system.key} className="text-center">
              <CardContent className="pt-6">
                <div className={`mx-auto mb-4 p-3 rounded-full ${
                  systemStatus[system.key] ? `bg-${system.color}-100 text-${system.color}-600` : 'bg-gray-100 text-gray-400'
                }`}>
                  {system.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{system.name}</h3>
                <Badge variant={systemStatus[system.key] ? 'default' : 'secondary'}>
                  {systemStatus[system.key] ? 'Operacional' : 'Aguardando'}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Resultados dos Testes */}
        {testResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2" />
                Resultados dos Testes
                <Badge variant="outline" className="ml-2">
                  {testResults.length} testes executados
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {testResults.map((result) => (
                  <div key={result.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`${getTestTypeColor(result.testType)}`}>
                        {getTestTypeIcon(result.testType)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium capitalize">
                            {result.testType === 'connection' && 'Conexão com Exchange'}
                            {result.testType === 'analysis' && 'Análise SMC'}
                            {result.testType === 'order' && 'Execução de Ordens'}
                            {result.testType === 'risk' && 'Gestão de Risco'}
                            {result.testType === 'notification' && 'Sistema de Notificações'}
                          </span>
                          {getStatusBadge(result.status)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(result.timestamp).toLocaleString('pt-BR')} • {formatDuration(result.duration)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">
                        {result.message}
                      </div>
                      {result.details && (
                        <div className="text-xs text-gray-500 mt-1">
                          {JSON.stringify(result.details).substring(0, 50)}...
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Informações de Testnet */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2 text-green-500" />
                Ambiente Seguro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-gray-600">
                <p>✅ Todas as operações são executadas na <strong>Binance Testnet</strong></p>
                <p>✅ Capital virtual é utilizado para todos os testes</p>
                <p>✅ Nenhum dinheiro real está em risco</p>
                <p>✅ Ambiente perfeito para validação e aprendizado</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-blue-500" />
                Dados Reais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-gray-600">
                <p>📊 Análise SMC com <strong>dados de mercado reais</strong></p>
                <p>📊 Preços em tempo real do Bitcoin e outras criptomoedas</p>
                <p>📊 Sinais gerados com base em condições reais de mercado</p>
                <p>📊 Validação completa do sistema antes de ir para produção</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}