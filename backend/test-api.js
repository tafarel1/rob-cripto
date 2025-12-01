#!/usr/bin/env node

/**
 * Script de teste para verificar todos os endpoints da API
 * Executa testes automatizados em todos os endpoints críticos
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3002/api';

// Cores para output colorido
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// Função para testar um endpoint
async function testEndpoint(method, endpoint, data = null, description = '') {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    console.log(`${colors.blue}🧪 Testando:${colors.reset} ${method} ${endpoint} ${description ? `- ${description}` : ''}`);
    
    const config = {
      method: method.toLowerCase(),
      url,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    
    // Validar estrutura da resposta
    if (!response.data || typeof response.data !== 'object') {
      throw new Error('Resposta não é um objeto JSON válido');
    }
    
    if (!Object.hasOwn(response.data, 'success')) {
      throw new Error('Resposta não contém campo "success"');
    }
    
    if (response.data.success === false && !response.data.error) {
      throw new Error('Resposta de erro não contém campo "error"');
    }
    
    if (response.data.success === true && !response.data.data && !response.data.message) {
      throw new Error('Resposta de sucesso não contém "data" ou "message"');
    }
    
    console.log(`${colors.green}✅ PASSOU${colors.reset} - Status: ${response.status}`);
    testResults.passed++;
    
    return { success: true, data: response.data };
    
  } catch (error) {
    console.log(`${colors.red}❌ FALHOU${colors.reset} - ${error.message}`);
    
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Dados:`, JSON.stringify(error.response.data, null, 2));
    }
    
    testResults.failed++;
    testResults.errors.push({
      endpoint: `${method} ${endpoint}`,
      error: error.message,
      response: error.response?.data
    });
    
    return { success: false, error: error.message };
  }
}

// Função principal de teste
async function runTests() {
  console.log(`${colors.blue}🚀 Iniciando testes de API${colors.reset}`);
  console.log(`URL Base: ${API_BASE_URL}`);
  console.log('');
  
  // Testes de Health Check
  await testEndpoint('GET', '/health', null, 'Health check básico');
  await testEndpoint('GET', '/usage', null, 'Informações de uso');
  
  // Testes de Conta
  console.log('\n' + colors.yellow + '📋 Testes de Conta' + colors.reset);
  await testEndpoint('GET', '/account/state', null, 'Estado da conta');
  await testEndpoint('POST', '/account/switch-mode', { mode: 'VIRTUAL' }, 'Trocar para modo virtual');
  await testEndpoint('POST', '/account/switch-mode', { mode: 'REAL', apiKey: 'test', apiSecret: 'test' }, 'Trocar para modo real');
  await testEndpoint('GET', '/account/performance', null, 'Métricas de performance');
  await testEndpoint('GET', '/account/trades', null, 'Histórico de trades');
  await testEndpoint('GET', '/account/risk', null, 'Dados de risco');
  await testEndpoint('GET', '/account/trades/history', null, 'Histórico alternativo');
  
  // Testes de Trading Virtual
  console.log('\n' + colors.yellow + '💰 Testes de Trading Virtual' + colors.reset);
  await testEndpoint('POST', '/account/virtual/trade', {
    symbol: 'BTC/USDT',
    side: 'buy',
    amount: 100,
    entryPrice: 45000,
    stopLoss: 44000,
    takeProfit: 46000
  }, 'Executar trade virtual');
  
  await testEndpoint('POST', '/account/virtual/reset', null, 'Resetar conta virtual');
  
  // Testes de Trading Automatizado
  console.log('\n' + colors.yellow + '🤖 Testes de Trading Automatizado' + colors.reset);
  await testEndpoint('GET', '/trading/status', null, 'Status do trading');
  await testEndpoint('GET', '/trading/positions', null, 'Posições abertas');
  
  // Testes de Exchange
  console.log('\n' + colors.yellow + '🔗 Testes de Exchange' + colors.reset);
  await testEndpoint('POST', '/exchange/connect', {}, 'Conectar exchange');
  await testEndpoint('GET', '/exchange/status', null, 'Status da exchange');
  await testEndpoint('GET', '/exchange/balance', null, 'Saldo da exchange');
  await testEndpoint('GET', '/exchange/ticker?symbol=BTC/USDT', null, 'Ticker BTC/USDT');
  await testEndpoint('GET', '/exchange/market-data?symbol=BTC/USDT&timeframe=1h&limit=50', null, 'Dados de mercado');
  
  // Testes de Análise SMC
  console.log('\n' + colors.yellow + '📊 Testes de Análise SMC' + colors.reset);
  await testEndpoint('GET', '/analysis/smc?symbol=BTC/USDT&timeframe=1h&limit=100', null, 'Análise SMC');
  await testEndpoint('GET', '/market/analysis/BTC/USDT', null, 'Análise de mercado');
  
  // Testes de Testes (meta!)
  console.log('\n' + colors.yellow + '🧪 Testes de Testes' + colors.reset);
  await testEndpoint('GET', '/tests/results', null, 'Resultados de testes');
  await testEndpoint('POST', '/tests/run', { testType: 'connection' }, 'Executar teste de conexão');
  await testEndpoint('POST', '/tests/run', {}, 'Executar todos os testes');
  
  // Testes de Trading
  console.log('\n' + colors.yellow + '⚡ Testes de Trading' + colors.reset);
  await testEndpoint('POST', '/exchange/test-order', {
    symbol: 'BTC/USDT',
    type: 'limit',
    side: 'buy',
    amount: 0.001,
    price: 45000
  }, 'Ordem de teste');
  
  // Testes de Configurações
  console.log('\n' + colors.yellow + '⚙️ Testes de Configurações' + colors.reset);
  await testEndpoint('PUT', '/account/settings', {
    riskSettings: {
      maxRiskPerTrade: 3,
      dailyLossLimit: 6
    }
  }, 'Atualizar configurações de risco');
  
  // Relatório final
  console.log('\n' + '='.repeat(50));
  console.log(colors.blue + '📊 RELATÓRIO DE TESTES' + colors.reset);
  console.log('='.repeat(50));
  console.log(`${colors.green}✅ Testes Passados:${colors.reset} ${testResults.passed}`);
  console.log(`${colors.red}❌ Testes Falhados:${colors.reset} ${testResults.failed}`);
  console.log(`${colors.blue}📈 Taxa de Sucesso:${colors.reset} ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  
  if (testResults.errors.length > 0) {
    console.log(`\n${colors.red}🚨 ERROS ENCONTRADOS:${colors.reset}`);
    testResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.endpoint}`);
      console.log(`   Erro: ${error.error}`);
      if (error.response) {
        console.log(`   Resposta:`, JSON.stringify(error.response, null, 2));
      }
    });
  }
  
  console.log('\n' + colors.blue + '✅ Testes concluídos!' + colors.reset);
  
  // Sair com código apropriado
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Executar testes
runTests().catch(error => {
  console.error(colors.red + '❌ Erro fatal nos testes:' + colors.reset, error);
  process.exit(1);
});
