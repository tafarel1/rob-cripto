import React, { useState } from 'react';
import AccountModeSelector from '@/components/account/AccountModeSelector';
import VirtualDashboard from '@/components/account/VirtualDashboard';
import RealDashboard from '@/components/account/RealDashboard';
import DualAccountSystemTest from '@/components/account/DualAccountSystemTest';
import { useAccountManager } from '@/components/account/useAccountManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, 
  TrendingUp, 
  Settings, 
  TestTube,
  BarChart3,
  Zap,
  Bot
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function DualAccountDashboard() {
  const { currentMode, virtualAccount, realAccount, getCurrentAccount, switchToVirtual } = useAccountManager();
  const [activeTab, setActiveTab] = useState('dashboard');
  const currentAccount = getCurrentAccount();

  const getModeColor = (mode: string) => {
    return mode === 'VIRTUAL' 
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-blue-100 text-blue-800 border-blue-200';
  };

  const getModeIcon = (mode: string) => {
    return mode === 'VIRTUAL' ? '🎮' : '⚡';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <Zap className="w-8 h-8 mr-3 text-blue-600" />
                  Robo Cripto SMC
                </h1>
              </div>
              <div className="ml-6">
                <Badge className={`${getModeColor(currentMode)} border-2`}>
                  {getModeIcon(currentMode)} {currentMode} Mode
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link to="/automated-trading">
                <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                  <Bot className="w-4 h-4 mr-2" />
                  Trading Automático
                </Button>
              </Link>
              <div className="text-sm text-gray-500">
                Current Balance: <span className="font-medium text-gray-900">
                  ${currentAccount.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-4 lg:grid-cols-4 w-full">
            <TabsTrigger value="dashboard" className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="mode-selector" className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Mode Selector</span>
            </TabsTrigger>
            <TabsTrigger value="virtual" className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4" />
              <span>Virtual Trading</span>
            </TabsTrigger>
            <TabsTrigger value="testing" className="flex items-center space-x-2">
              <TestTube className="w-4 h-4" />
              <span>System Test</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Virtual Account Summary */}
              <Card className="border-green-200">
                <CardHeader className="bg-green-50">
                  <CardTitle className="flex items-center text-green-800">
                    🎮 Virtual Account
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Balance:</span>
                      <span className="text-2xl font-bold text-green-600">
                        ${virtualAccount.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Risk per Trade:</span>
                      <Badge variant="outline" className="border-green-200 text-green-700">
                        {virtualAccount.riskSettings.maxRiskPerTrade}%
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Daily Loss Limit:</span>
                      <Badge variant="outline" className="border-green-200 text-green-700">
                        {virtualAccount.riskSettings.dailyLossLimit}%
                      </Badge>
                    </div>
                    <div className="pt-4">
                      <Button 
                        onClick={() => setActiveTab('virtual')}
                        className="w-full bg-green-600 hover:bg-green-700"
                        disabled={currentMode === 'VIRTUAL'}
                      >
                        {currentMode === 'VIRTUAL' ? 'Currently Active' : 'Switch to Virtual'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Real Account Summary */}
              <Card className="border-blue-200">
                <CardHeader className="bg-blue-50">
                  <CardTitle className="flex items-center text-blue-800">
                    ⚡ Real Account
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Balance:</span>
                      <span className="text-2xl font-bold text-blue-600">
                        ${realAccount.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Risk per Trade:</span>
                      <Badge variant="outline" className="border-blue-200 text-blue-700">
                        {realAccount.riskSettings.maxRiskPerTrade}%
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Daily Loss Limit:</span>
                      <Badge variant="outline" className="border-blue-200 text-blue-700">
                        {realAccount.riskSettings.dailyLossLimit}%
                      </Badge>
                    </div>
                    <div className="pt-4">
                      <Button 
                        onClick={() => setActiveTab('mode-selector')}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        disabled={currentMode === 'REAL'}
                      >
                        {currentMode === 'REAL' ? 'Currently Active' : 'Switch to Real'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {currentMode === 'VIRTUAL' ? '🎮' : '⚡'}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Active Mode</div>
                    <div className="text-xs text-gray-500">{currentMode}</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      ${virtualAccount.balance.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Virtual Balance</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      ${realAccount.balance.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Real Balance</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {currentAccount.riskSettings.maxRiskPerTrade}%
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Risk Limit</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Mode Selector Tab */}
          <TabsContent value="mode-selector">
            <AccountModeSelector />
          </TabsContent>

          {/* Virtual Trading Tab */}
          <TabsContent value="virtual">
            {currentMode === 'VIRTUAL' ? (
              <VirtualDashboard />
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="text-6xl mb-4">🎮</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Virtual Trading Dashboard</h3>
                  <p className="text-gray-600 mb-6">
                    Switch to Virtual Mode to access the virtual trading dashboard with $10,000 demo capital.
                  </p>
                  <Button onClick={switchToVirtual} className="bg-green-600 hover:bg-green-700">
                    Switch to Virtual Mode
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* System Test Tab */}
          <TabsContent value="testing">
            <DualAccountSystemTest />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}