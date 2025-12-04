import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  Zap,
  Target,
  Shield,
  Activity
} from 'lucide-react';

interface TestResult {
  id: string;
  timestamp: number;
  testType: 'connection' | 'analysis' | 'order' | 'risk' | 'notification';
  status: 'success' | 'failed' | 'warning';
  duration: number;
  message: string;
  details?: Record<string, unknown>;
}

interface TestSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  warningTests: number;
  successRate: number;
  averageDuration: number;
  lastRun: number;
}

export default function TestResultsDashboard() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testSummary, setTestSummary] = useState<TestSummary | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [lastTestRun, setLastTestRun] = useState<Date | null>(null);
  const TEST_TYPES: TestResult['testType'][] = ['connection', 'analysis', 'order', 'risk', 'notification'];

  // Buscar resultados de testes
  const fetchTestResults = useCallback(async () => {
    try {
      const response = await fetch(`${API_CONFIG.baseURL}/api/tests/results`);
      const data = await response.json();
      if (data.success) {
        setTestResults(data.data.results);
        setTestSummary(data.data.summary);
        setLastTestRun(new Date(data.data.summary.lastRun));
      }
    } catch (err) {
      console.error('Erro ao buscar resultados de testes:', err);
    }
  }, []);

  // Executar todos os testes
  const runAllTests = async () => {
    try {
      setIsRunningTests(true);
      const response = await fetch(`${API_CONFIG.baseURL}/api/tests/run`, { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        await fetchTestResults();
        setLastTestRun(new Date());
      }
    } catch (error) {
      console.error('Erro ao executar testes:', error);
    } finally {
      setIsRunningTests(false);
    }
  };

  // Executar teste específico
  const runSpecificTest = async (testType: TestResult['testType']) => {
    try {
      const response = await fetch(`${API_CONFIG.baseURL}/api/tests/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ testType })
      });
      const data = await response.json();
      if (data.success) {
        await fetchTestResults();
      }
    } catch (err) {
      console.error(`Erro ao executar teste ${testType}:`, err);
    }
  };

  useEffect(() => {
    fetchTestResults();
  }, [fetchTestResults]);

  const getTestTypeIcon = (testType: string) => {
    switch (testType) {
      case 'connection':
        return <Zap className="h-4 w-4" />;
      case 'analysis':
        return <BarChart3 className="h-4 w-4" />;
      case 'order':
        return <DollarSign className="h-4 w-4" />;
      case 'risk':
        return <Shield className="h-4 w-4" />;
      case 'notification':
        return <Activity className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  const getTestTypeColor = (testType: string) => {
    switch (testType) {
      case 'connection':
        return 'text-blue-600';
      case 'analysis':
        return 'text-purple-600';
      case 'order':
        return 'text-green-700';
      case 'risk':
        return 'text-orange-600';
      case 'notification':
        return 'text-cyan-600';
      default:
        return 'text-muted-foreground';
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

  

  if (!testSummary) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header e Controles */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard de Testes</h2>
          <p className="text-sm text-muted-foreground">
            Última execução: {lastTestRun ? lastTestRun.toLocaleString('pt-BR') : 'Nunca'}
          </p>
        </div>
        <Button 
          onClick={runAllTests}
          disabled={isRunningTests}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isRunningTests ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Executando...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Executar Todos os Testes
            </>
          )}
        </Button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {testSummary.successRate.toFixed(1)}%
            </div>
            <Progress value={testSummary.successRate} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Testes</CardTitle>
            <Target className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{testSummary.totalTests}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {testSummary.passedTests} passou • {testSummary.failedTests} falhou
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Duração Média</CardTitle>
            <Clock className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(testSummary.averageDuration)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Tempo médio por teste
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {testSummary.warningTests}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Testes com avisos
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Testes por Categoria */}
      <Card>
        <CardHeader>
          <CardTitle>Testes por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {TEST_TYPES.map((category) => {
              const categoryTests = testResults.filter(t => t.testType === category);
              const successCount = categoryTests.filter(t => t.status === 'success').length;
              const successRate = categoryTests.length > 0 ? (successCount / categoryTests.length) * 100 : 0;
              
              return (
                <div key={category} className="text-center">
                  <div className={`mx-auto mb-2 ${getTestTypeColor(category)}`}>
                    {getTestTypeIcon(category)}
                  </div>
                  <div className="text-sm font-medium capitalize">
                    {category === 'connection' && 'Conexão'}
                    {category === 'analysis' && 'Análise'}
                    {category === 'order' && 'Ordens'}
                    {category === 'risk' && 'Risco'}
                    {category === 'notification' && 'Notificações'}
                  </div>
                  <div className="text-2xl font-bold">{successCount}/{categoryTests.length}</div>
                  <Progress value={successRate} className="h-2 mt-1" />
                  <div className="text-xs text-muted-foreground mt-1">
                    {successRate.toFixed(0)}% sucesso
                  </div>
                  <Button 
                    onClick={() => runSpecificTest(category)}
                    size="sm" 
                    variant="outline" 
                    className="mt-2"
                  >
                    Testar
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Histórico de Testes */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Testes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {testResults.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum teste executado ainda. Clique em "Executar Todos os Testes" para começar.
                </p>
            ) : (
              testResults.map((result) => (
                <div key={result.id} className="flex items-center justify-between p-3 border rounded-lg">
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
                      <div className="text-xs text-muted-foreground">
                        {new Date(result.timestamp).toLocaleString('pt-BR')} • {formatDuration(result.duration)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">
                      {result.message}
                    </div>
                    {result.details && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {JSON.stringify(result.details).substring(0, 50)}...
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
  );
}
import { API_CONFIG } from '@/lib/config';
