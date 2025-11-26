import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export type AccountMode = 'VIRTUAL' | 'REAL';

export interface AccountConfig {
  id: string;
  mode: AccountMode;
  balance: number;
  initialBalance: number;
  currency: string;
  riskSettings: {
    maxRiskPerTrade: number;
    dailyLossLimit: number;
    maxOpenTrades: number;
    allowedPairs: string[];
  };
  safety?: {
    stopLossRequired: boolean;
    takeProfitRecommended: boolean;
    maxLeverage: number;
  };
  features?: {
    replayMode?: boolean;
    speedControl?: boolean;
    analytics?: boolean;
  };
}

export interface ExchangeConfig {
  binance?: {
    apiKey: string;
    secret: string;
  };
  bybit?: {
    apiKey: string;
    secret: string;
  };
}

const VIRTUAL_ACCOUNT_CONFIG: AccountConfig = {
  id: 'virtual-demo-001',
  mode: 'VIRTUAL',
  balance: 10000,
  initialBalance: 10000,
  currency: 'USD',
  riskSettings: {
    maxRiskPerTrade: 2, // 2% em modo virtual
    dailyLossLimit: 5,  // 5% limite diário
    maxOpenTrades: 5,
    allowedPairs: ['BTC/USDT', 'ETH/USDT', 'ADA/USDT', 'SOL/USDT', 'DOT/USDT']
  },
  features: {
    replayMode: true,
    speedControl: true,
    analytics: true
  }
};

const REAL_ACCOUNT_CONFIG: AccountConfig = {
  id: 'real-production-001',
  mode: 'REAL',
  balance: 0,
  initialBalance: 0,
  currency: 'USD',
  riskSettings: {
    maxRiskPerTrade: 1, // 1% em modo real
    dailyLossLimit: 3,  // 3% limite diário
    maxOpenTrades: 3,
    allowedPairs: ['BTC/USDT', 'ETH/USDT']
  },
  safety: {
    stopLossRequired: true,
    takeProfitRecommended: true,
    maxLeverage: 1 // Apenas spot inicialmente
  }
};

export const useAccountManager = () => {
  const [currentMode, setCurrentMode] = useState<AccountMode>('VIRTUAL');
  const [virtualAccount, setVirtualAccount] = useState<AccountConfig>(VIRTUAL_ACCOUNT_CONFIG);
  const [realAccount, setRealAccount] = useState<AccountConfig>(REAL_ACCOUNT_CONFIG);
  const [isLoading, setIsLoading] = useState(false);
  const [exchangeConfig, setExchangeConfig] = useState<ExchangeConfig | null>(null);

  // Load saved configuration from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem('tradingMode') as AccountMode;
    const savedVirtual = localStorage.getItem('virtualAccount');
    const savedReal = localStorage.getItem('realAccount');
    const savedExchange = localStorage.getItem('exchangeConfig');

    if (savedMode && (savedMode === 'VIRTUAL' || savedMode === 'REAL')) {
      setCurrentMode(savedMode);
    }

    if (savedVirtual) {
      try {
        const parsed = JSON.parse(savedVirtual);
        setVirtualAccount(parsed);
      } catch (error) {
        console.error('Error loading virtual account:', error);
      }
    }

    if (savedReal) {
      try {
        const parsed = JSON.parse(savedReal);
        setRealAccount(parsed);
      } catch (error) {
        console.error('Error loading real account:', error);
      }
    }

    if (savedExchange) {
      try {
        const parsed = JSON.parse(savedExchange);
        setExchangeConfig(parsed);
      } catch (error) {
        console.error('Error loading exchange config:', error);
      }
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      localStorage.setItem('tradingMode', currentMode);
      localStorage.setItem('virtualAccount', JSON.stringify(virtualAccount));
      localStorage.setItem('realAccount', JSON.stringify(realAccount));
      if (exchangeConfig) {
        localStorage.setItem('exchangeConfig', JSON.stringify(exchangeConfig));
      }
    }, 600);
    return () => clearTimeout(id);
  }, [currentMode, virtualAccount, realAccount, exchangeConfig]);

  useEffect(() => {
    const fetchServerState = async () => {
      try {
        const response = await fetch('/api/account/state');
        if (!response.ok) return;
        const result = await response.json();
        if (result?.success && result.data) {
          const hasLocalVirtual = !!localStorage.getItem('virtualAccount');
          const hasLocalReal = !!localStorage.getItem('realAccount');
          const savedMode = localStorage.getItem('tradingMode') as AccountMode;
          if (!savedMode && result.data.currentMode) {
            setCurrentMode(result.data.currentMode);
          }
          if (!hasLocalVirtual && result.data.virtualAccount) {
            setVirtualAccount(prev => ({ ...prev, ...result.data.virtualAccount }));
          }
          if (!hasLocalReal && result.data.realAccount) {
            setRealAccount(prev => ({ ...prev, ...result.data.realAccount }));
          }
        }
      } catch {}
    };
    fetchServerState();
  }, []);

  // Save configuration to localStorage
  const saveConfiguration = () => {
    localStorage.setItem('tradingMode', currentMode);
    localStorage.setItem('virtualAccount', JSON.stringify(virtualAccount));
    localStorage.setItem('realAccount', JSON.stringify(realAccount));
    if (exchangeConfig) {
      localStorage.setItem('exchangeConfig', JSON.stringify(exchangeConfig));
    }
  };

  // Switch to Virtual Mode
  const switchToVirtual = async () => {
    setIsLoading(true);
    try {
      // Call API to switch mode
      const response = await fetch('/api/account/switch-mode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'VIRTUAL'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to switch to virtual mode');
      }

      const result = await response.json();
      
      if (result.success) {
        setCurrentMode('VIRTUAL');
        // Update account data from server response
        if (result.data.currentAccount) {
          setVirtualAccount(prev => ({
            ...prev,
            balance: result.data.currentAccount.balance,
            riskSettings: result.data.currentAccount.riskSettings
          }));
        }
        toast.success('🎮 Modo Virtual ativado!', {
          description: 'Você está operando com capital virtual. Nenhum risco real!',
        });
        saveConfiguration();
      } else {
        throw new Error(result.error || 'Failed to activate virtual mode');
      }
    } catch (error) {
      console.error('Error switching to virtual mode:', error);
      toast.error('Erro ao ativar modo virtual', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Switch to Real Mode
  const switchToReal = async (apiKeys: ExchangeConfig) => {
    setIsLoading(true);
    try {
      // Validate API keys
      if (!apiKeys.binance?.apiKey || !apiKeys.binance?.secret) {
        throw new Error('Binance API keys are required for real mode');
      }

      // Call API to switch mode
      const response = await fetch('/api/account/switch-mode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'REAL',
          apiKey: apiKeys.binance.apiKey,
          apiSecret: apiKeys.binance.secret
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to switch to real mode');
      }

      const result = await response.json();
      
      if (result.success) {
        setCurrentMode('REAL');
        setExchangeConfig(apiKeys);
        if (result.data?.currentAccount) {
          setRealAccount(prev => ({
            ...prev,
            balance: result.data.currentAccount.balance ?? prev.balance,
            initialBalance: result.data.currentAccount.initialBalance ?? prev.initialBalance,
            riskSettings: result.data.currentAccount.riskSettings ?? prev.riskSettings
          }));
        }
        toast.success('⚡ Modo Real ativado!', {
          description: 'Atenção: Você está operando com capital real. Use com cuidado!',
        });
        saveConfiguration();
      } else {
        throw new Error(result.error || 'Failed to activate real mode');
      }
    } catch (error) {
      console.error('Error switching to real mode:', error);
      toast.error('Erro ao ativar modo real', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update account balance
  const updateBalance = (mode: AccountMode, newBalance: number) => {
    if (mode === 'VIRTUAL') {
      const updated = { ...virtualAccount, balance: newBalance };
      setVirtualAccount(updated);
      localStorage.setItem('virtualAccount', JSON.stringify(updated));
    } else {
      const updated = { ...realAccount, balance: newBalance };
      setRealAccount(updated);
      localStorage.setItem('realAccount', JSON.stringify(updated));
    }
  };

  // Get current account configuration
  const getCurrentAccount = () => {
    return currentMode === 'VIRTUAL' ? virtualAccount : realAccount;
  };

  // Reset virtual account to initial state
  const resetVirtualAccount = async (options?: { preserveSettings?: boolean }) => {
    try {
      const prevSettings = {
        riskSettings: virtualAccount.riskSettings,
        features: virtualAccount.features,
        currency: virtualAccount.currency,
      };

      const response = await fetch('/api/account/virtual/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to reset virtual account');
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        const nextAccount: AccountConfig = {
          ...virtualAccount,
          ...result.data,
        };

        if (options?.preserveSettings) {
          nextAccount.riskSettings = prevSettings.riskSettings;
          nextAccount.features = prevSettings.features;
          nextAccount.currency = prevSettings.currency;
        }

        setVirtualAccount(nextAccount);
        localStorage.setItem('virtualAccount', JSON.stringify(nextAccount));

        try {
          const engineResponse = await fetch('/api/automated-trading/reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              preserveSettings: !!options?.preserveSettings,
              initialBalance: nextAccount.balance
            })
          });
          if (!engineResponse.ok) {
            throw new Error('Failed to reset trading engine');
          }
          const engineResult = await engineResponse.json();
          if (!engineResult.success) {
            throw new Error(engineResult.error || 'Failed to reset trading engine');
          }
        } catch (e) {
          toast.error('Erro ao resetar motor de trading', {
            description: e instanceof Error ? e.message : 'Erro desconhecido'
          });
        }

        toast.success('Conta virtual resetada!', {
          description: `Saldo restaurado para $${nextAccount.balance.toLocaleString()}`,
        });
      } else {
        throw new Error(result.error || 'Failed to reset virtual account');
      }
    } catch (error) {
      console.error('Error resetting virtual account:', error);
      toast.error('Erro ao resetar conta virtual', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // Get performance metrics
  const getPerformanceMetrics = async () => {
    try {
      const response = await fetch(`/api/account/performance?mode=${currentMode}`);
      if (!response.ok) {
        throw new Error('Failed to fetch performance metrics');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
      return null;
    }
  };

  return {
    currentMode,
    virtualAccount,
    realAccount,
    exchangeConfig,
    isLoading,
    switchToVirtual,
    switchToReal,
    updateBalance,
    getCurrentAccount,
    resetVirtualAccount,
    getPerformanceMetrics
  };
};
