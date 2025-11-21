import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { 
  Play, 
  Square, 
  RefreshCw, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { useAccountManager } from './useAccountManager';

interface TestResult {
  test: string;
  status: 'pass' | 'fail' | 'pending';
  message: string;
  details?: any;
}

export default function DualAccountSystemTest() {
  const { currentMode, virtualAccount, realAccount, switchToVirtual, switchToReal, resetVirtualAccount, getPerformanceMetrics } = useAccountManager();
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [currentTestIndex, setCurrentTestIndex] = useState(0);

  const tests = [
    {
      name: 'Account State API',
      description: 'Test account state retrieval',
      testFunction: testAccountStateAPI
    },
    {
      name: 'Virtual Mode Switch',
      description: 'Test switching to virtual mode',
      testFunction: testVirtualModeSwitch
    },
    {
      name: 'Real Mode Switch',
      description: 'Test switching to real mode with API keys',
      testFunction: testRealModeSwitch
    },
    {
      name: 'Virtual Trading',
      description: 'Test virtual trading execution',
      testFunction: testVirtualTrading
    },
    {
      name: 'Performance Metrics',
      description: 'Test performance metrics calculation',
      testFunction: testPerformanceMetrics
    },
    {
      name: 'Account Reset',
      description: 'Test virtual account reset functionality',
      testFunction: testAccountReset
    },
    {
      name: 'Risk Management',
      description: 'Test risk management validation',
      testFunction: testRiskManagement
    },
    {
      name: 'Trade History',
      description: 'Test trade history retrieval',
      testFunction: testTradeHistory
    }
  ];

  async function testAccountStateAPI(): Promise<TestResult> {
    try {
      const response = await fetch('/api/account/state');
      const result = await response.json();
      
      if (result.success && result.data) {
        return {
          test: 'Account State API',
          status: 'pass',
          message: 'Account state retrieved successfully',
          details: result.data
        };
      } else {
        throw new Error(result.error || 'Failed to retrieve account state');
      }
    } catch (error) {
      return {
        test: 'Account State API',
        status: 'fail',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async function testVirtualModeSwitch(): Promise<TestResult> {
    try {
      await switchToVirtual();
      
      if (currentMode === 'VIRTUAL') {
        return {
          test: 'Virtual Mode Switch',
          status: 'pass',
          message: 'Successfully switched to virtual mode'
        };
      } else {
        throw new Error('Mode switch failed');
      }
    } catch (error) {
      return {
        test: 'Virtual Mode Switch',
        status: 'fail',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async function testRealModeSwitch(): Promise<TestResult> {
    try {
      // Test with mock API keys
      const mockApiKeys = {
        binance: {
          apiKey: 'test_api_key_12345',
          secret: 'test_secret_key_67890'
        }
      };
      
      await switchToReal(mockApiKeys);
      
      if (currentMode === 'REAL') {
        return {
          test: 'Real Mode Switch',
          status: 'pass',
          message: 'Successfully switched to real mode'
        };
      } else {
        throw new Error('Mode switch failed');
      }
    } catch (error) {
      return {
        test: 'Real Mode Switch',
        status: 'fail',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async function testVirtualTrading(): Promise<TestResult> {
    try {
      // Ensure we're in virtual mode
      if (currentMode !== 'VIRTUAL') {
        await switchToVirtual();
      }

      const tradeData = {
        symbol: 'BTC/USDT',
        side: 'buy',
        amount: 100,
        entryPrice: 45000,
        stopLoss: 44000,
        takeProfit: 46000
      };

      const response = await fetch('/api/account/virtual/trade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tradeData),
      });

      const result = await response.json();
      
      if (result.success && result.data.trade) {
        return {
          test: 'Virtual Trading',
          status: 'pass',
          message: 'Virtual trade executed successfully',
          details: result.data
        };
      } else {
        throw new Error(result.error || 'Virtual trade failed');
      }
    } catch (error) {
      return {
        test: 'Virtual Trading',
        status: 'fail',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async function testPerformanceMetrics(): Promise<TestResult> {
    try {
      const metrics = await getPerformanceMetrics();
      
      if (metrics && metrics.success) {
        return {
          test: 'Performance Metrics',
          status: 'pass',
          message: 'Performance metrics calculated successfully',
          details: metrics.data
        };
      } else {
        throw new Error('Failed to retrieve performance metrics');
      }
    } catch (error) {
      return {
        test: 'Performance Metrics',
        status: 'fail',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async function testAccountReset(): Promise<TestResult> {
    try {
      await resetVirtualAccount();
      
      if (virtualAccount.balance === virtualAccount.initialBalance) {
        return {
          test: 'Account Reset',
          status: 'pass',
          message: 'Virtual account reset successfully'
        };
      } else {
        throw new Error('Account reset failed');
      }
    } catch (error) {
      return {
        test: 'Account Reset',
        status: 'fail',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async function testRiskManagement(): Promise<TestResult> {
    try {
      // Test risk validation with excessive trade size
      const riskyTrade = {
        symbol: 'BTC/USDT',
        side: 'buy',
        amount: 10000, // Exceeds risk limits
        entryPrice: 45000
      };

      const response = await fetch('/api/account/virtual/trade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(riskyTrade),
      });

      const result = await response.json();
      
      if (!result.success && result.error) {
        return {
          test: 'Risk Management',
          status: 'pass',
          message: 'Risk management working correctly - blocked excessive trade',
          details: result.error
        };
      } else {
        throw new Error('Risk management failed to block excessive trade');
      }
    } catch (error) {
      return {
        test: 'Risk Management',
        status: 'fail',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async function testTradeHistory(): Promise<TestResult> {
    try {
      const response = await fetch('/api/account/trades');
      const result = await response.json();
      
      if (result.success && Array.isArray(result.data)) {
        return {
          test: 'Trade History',
          status: 'pass',
          message: `Retrieved ${result.data.length} trades from history`,
          details: result.data
        };
      } else {
        throw new Error(result.error || 'Failed to retrieve trade history');
      }
    } catch (error) {
      return {
        test: 'Trade History',
        status: 'fail',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  const runAllTests = async () => {
    setIsTesting(true);
    setTestResults([]);
    setCurrentTestIndex(0);

    const results: TestResult[] = [];

    for (let i = 0; i < tests.length; i++) {
      setCurrentTestIndex(i);
      const test = tests[i];
      
      try {
        const result = await test.testFunction();
        results.push(result);
        setTestResults([...results]);
        
        if (result.status === 'pass') {
          toast.success(`${test.name} passed`);
        } else {
          toast.error(`${test.name} failed`);
        }
      } catch (error) {
        const failedResult: TestResult = {
          test: test.name,
          status: 'fail',
          message: error instanceof Error ? error.message : 'Test execution failed'
        };
        results.push(failedResult);
        setTestResults([...results]);
        toast.error(`${test.name} failed`);
      }

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsTesting(false);
    
    const passedTests = results.filter(r => r.status === 'pass').length;
    const totalTests = results.length;
    
    toast.success(`Testing complete! ${passedTests}/${totalTests} tests passed`);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'fail':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getOverallStatus = () => {
    if (testResults.length === 0) return 'pending';
    const failedTests = testResults.filter(r => r.status === 'fail').length;
    return failedTests === 0 ? 'pass' : 'fail';
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <TrendingUp className="w-6 h-6 mr-3 text-blue-600" />
            Dual Account System Test
          </h2>
          <p className="text-gray-600 mt-1">
            Comprehensive testing of virtual and real account functionality
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Badge variant={getOverallStatus() === 'pass' ? 'default' : getOverallStatus() === 'fail' ? 'destructive' : 'secondary'} className={getOverallStatus() === 'pass' ? 'bg-green-100 text-green-800' : ''}>
            {getOverallStatus() === 'pass' ? 'All Tests Passed' : getOverallStatus() === 'fail' ? 'Tests Failed' : 'Ready to Test'}
          </Badge>
          
          <Button
            onClick={runAllTests}
            disabled={isTesting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isTesting ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run All Tests
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Current Test Status */}
      {isTesting && (
        <Alert>
          <AlertDescription className="flex items-center">
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Running test {currentTestIndex + 1} of {tests.length}: {tests[currentTestIndex]?.name}
          </AlertDescription>
        </Alert>
      )}

      {/* Test Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="w-5 h-5 mr-2 text-blue-600" />
            Test Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {testResults.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No tests run yet. Click "Run All Tests" to start.</p>
              </div>
            ) : (
              testResults.map((result, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="mt-1">
                    {getStatusIcon(result.status)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">{result.test}</h4>
                      <Badge variant={result.status === 'pass' ? 'default' : 'destructive'} className={result.status === 'pass' ? 'bg-green-100 text-green-800' : ''}>
                        {result.status.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                    {result.details && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                          View Details
                        </summary>
                        <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Account Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">Virtual Account</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Balance:</span>
                <span className="font-medium">${virtualAccount.balance.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Mode:</span>
                <Badge variant="default" className="bg-green-100 text-green-800">{virtualAccount.mode}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Risk per Trade:</span>
                <span className="font-medium">{virtualAccount.riskSettings.maxRiskPerTrade}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-blue-600">Real Account</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Balance:</span>
                <span className="font-medium">${realAccount.balance.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Mode:</span>
                <Badge variant={currentMode === 'REAL' ? 'default' : 'secondary'}>
                  {realAccount.mode}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Risk per Trade:</span>
                <span className="font-medium">{realAccount.riskSettings.maxRiskPerTrade}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}