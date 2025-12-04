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
import HeaderBar from '@/components/layout/HeaderBar';

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
    <div className="min-h-screen bg-background">
      <HeaderBar rightItems={
        <div className="ml-6">
          <Badge className={`${getModeColor(currentMode)} border-2 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800`}>
            {getModeIcon(currentMode)} {currentMode} Mode
          </Badge>
        </div>
      } />

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
