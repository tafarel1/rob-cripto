// Using built-in fetch API (Node.js 18+)

async function testAutomatedTradingSystem() {
  console.log('🚀 Iniciando testes do sistema de trading automático...\n');

  const baseUrl = 'http://localhost:3001';

  try {
    // Test 1: Check system health
    console.log('📊 Teste 1: Verificando saúde do sistema...');
    const healthResponse = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Sistema operacional:', healthData.status);
    console.log('📅 Última atualização:', healthData.lastUpdate);
    console.log('');

    // Test 2: Initialize automated trading engine
    console.log('🔧 Teste 2: Inicializando motor de trading automático...');
    const initConfig = {
      exchangeConfigs: [
        {
          name: 'binance',
          apiKey: 'demo_key_12345',
          apiSecret: 'demo_secret_67890',
          testnet: true,
          enableFutures: true
        }
      ],
      riskConfig: {
        maxRiskPerTrade: 0.02,
        maxDailyLoss: 0.05,
        maxOpenPositions: 3,
        stopLossDistance: 0.02,
        takeProfitDistance: 0.04,
        trailingStop: true,
        breakEvenAfter: 0.01
      },
      initialBalance: 10000,
      strategies: [
        {
          name: 'SMC_BTC_Demo',
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
        }
      ]
    };

    const initResponse = await fetch(`${baseUrl}/api/automated-trading/initialize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(initConfig)
    });
    
    if (initResponse.ok) {
      const initData = await initResponse.json();
      console.log('✅ Motor inicializado com sucesso!');
      console.log('📈 Estatísticas do motor:', initData.data.engineStats);
      console.log('📋 Estratégias configuradas:', initData.data.strategies.length);
      console.log('');
    } else {
      throw new Error(`Falha na inicialização: ${initResponse.status}`);
    }

    // Test 3: Check engine status
    console.log('📋 Teste 3: Verificando status do motor...');
    const statusResponse = await fetch(`${baseUrl}/api/automated-trading/status`);
    const statusData = await statusResponse.json();
    console.log('🔄 Status do motor:', statusData.data.status);
    console.log('📊 Estatísticas atuais:', statusData.data.engineStats);
    console.log('📍 Posições ativas:', statusData.data.activePositions.length);
    console.log('');

    // Test 4: Start automated trading
    console.log('🚀 Teste 4: Iniciando trading automático...');
    const startResponse = await fetch(`${baseUrl}/api/automated-trading/start`, {
      method: 'POST'
    });
    
    if (startResponse.ok) {
      const startData = await startResponse.json();
      console.log('✅ Trading automático iniciado!');
      console.log('📊 Novo status:', startData.data.status);
      console.log('⏰ Timestamp:', startData.data.timestamp);
      console.log('');
    } else {
      throw new Error(`Falha ao iniciar: ${startResponse.status}`);
    }

    // Test 5: Check positions after starting
    console.log('📊 Teste 5: Verificando posições após início...');
    const positionsResponse = await fetch(`${baseUrl}/api/automated-trading/positions`);
    const positionsData = await positionsResponse.json();
    console.log('📍 Posições ativas:', positionsData.data.count);
    if (positionsData.data.positions.length > 0) {
      positionsData.data.positions.forEach(pos => {
        console.log(`  - ${pos.symbol}: ${pos.type} @ ${pos.entryPrice}`);
      });
    }
    console.log('');

    // Test 6: Test emergency stop
    console.log('🛑 Teste 6: Testando botão de emergência...');
    const emergencyResponse = await fetch(`${baseUrl}/api/automated-trading/emergency-stop`, {
      method: 'POST'
    });
    
    if (emergencyResponse.ok) {
      const emergencyData = await emergencyResponse.json();
      console.log('✅ Emergência ativada com sucesso!');
      console.log('🛑 Status:', emergencyData.data.status);
      console.log('📍 Posições para fechar:', emergencyData.data.count);
      console.log('');
    } else {
      throw new Error(`Falha na emergência: ${emergencyResponse.status}`);
    }

    // Test 7: Final status check
    console.log('📋 Teste 7: Verificação final do status...');
    const finalStatusResponse = await fetch(`${baseUrl}/api/automated-trading/status`);
    const finalStatusData = await finalStatusResponse.json();
    console.log('🔄 Status final:', finalStatusData.data.status);
    console.log('📊 Estatísticas finais:', finalStatusData.data.engineStats);
    console.log('');

    console.log('✅ Todos os testes foram concluídos com sucesso!');
    console.log('🎯 Sistema de trading automático está operacional');
    console.log('📈 Pronto para operação 24/7 com gestão automática de risco');

  } catch (error) {
    console.error('❌ Erro durante os testes:', error.message);
    process.exit(1);
  }
}

// Run tests
testAutomatedTradingSystem();