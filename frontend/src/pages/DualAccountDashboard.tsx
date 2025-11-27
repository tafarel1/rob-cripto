import React, { useState } from 'react';
import AccountModeSelector from '@/components/account/AccountModeSelector';
import DualAccountSystemTest from '@/components/account/DualAccountSystemTest';
import { useAccountManager } from '@/components/account/useAccountManager';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  TestTube,
  Zap,
  Bot,
  Home
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DualAccountDashboard() {
  const { currentMode } = useAccountManager();
  const [activeTab, setActiveTab] = useState('mode-selector');

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
              <Link to="/">
                <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                  <Home className="w-4 h-4 mr-2" />
                  Página Inicial
                </Button>
              </Link>
              <Link to="/automated-trading">
                <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                  <Bot className="w-4 h-4 mr-2" />
                  Trading Automático
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-2 lg:grid-cols-2 w-full">
            <TabsTrigger value="mode-selector" className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Mode Selector</span>
            </TabsTrigger>
            <TabsTrigger value="testing" className="flex items-center space-x-2">
              <TestTube className="w-4 h-4" />
              <span>System Test</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab removed */}

        {/* Mode Selector Tab */}
        <TabsContent value="mode-selector">
          <AccountModeSelector />
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
