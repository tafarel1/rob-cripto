import React from 'react';
import TestResultsDashboard from '@/components/TestResultsDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart3, 
  Shield, 
  Zap, 
  Target,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Testes e Validação - Robô de Trading SMC
          </h1>
          <p className="text-gray-600">
            Dashboard de testes para validar o funcionamento completo do sistema de trading automatizado
          </p>
        </div>

        {/* Status Geral */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ambiente</CardTitle>
              <Shield className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Testnet</div>
              <p className="text-xs text-gray-500 mt-1">
                Ambiente seguro com capital virtual
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Exchange</CardTitle>
              <Zap className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">Binance</div>
              <p className="text-xs text-gray-500 mt-1">
                Conectado via API de testes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Validação</CardTitle>
              <CheckCircle className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">Automatizada</div>
              <p className="text-xs text-gray-500 mt-1">
                Testes de integração completos
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Dashboard Principal */}
        <TestResultsDashboard />

        {/* Informações Importantes */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 text-yellow-500" />
                Importante
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-gray-600">
                <p>
                  • <strong>Ambiente Seguro:</strong> Todos os testes são executados na Binance Testnet com capital virtual
                </p>
                <p>
                  • <strong>Dados Reais:</strong> Análises SMC são feitas com dados de mercado em tempo real
                </p>
                <p>
                  • <strong>Sem Risco:</strong> Nenhum dinheiro real está em risco durante os testes
                </p>
                <p>
                  • <strong>Validação Completa:</strong> Testamos conexão, análise, execução e gestão de risco
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2 text-blue-500" />
                Próximos Passos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-gray-600">
                <p>
                  1. <strong>Execute todos os testes</strong> para validar o sistema
                </p>
                <p>
                  2. <strong>Verifique os resultados</strong> de cada categoria de teste
                </p>
                <p>
                  3. <strong>Ajuste configurações</strong> se necessário baseado nos resultados
                </p>
                <p>
                  4. <strong>Obtenha chaves API reais</strong> quando estiver pronto para produção
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}