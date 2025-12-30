import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SMCAnalysisData, SessionLiquidity } from '@/types/smc';
import { GlobeIcon, TrendingUpIcon, TrendingDownIcon, ClockIcon } from '@/components/ui/icons';

interface SMCAdvancedIndicatorsProps {
  data: SMCAnalysisData | null;
}

const SMCAdvancedIndicators: React.FC<SMCAdvancedIndicatorsProps> = ({ data }) => {
  if (!data) return null;

  const { premiumDiscount, sessionLiquidity, currentPrice } = data;

  const getPremiumDiscountColor = (status: string) => {
    return status === 'PREMIUM' ? 'text-red-500' : 'text-green-500';
  };

  const getPremiumDiscountBg = (status: string) => {
    return status === 'PREMIUM' ? 'bg-red-500/10' : 'bg-green-500/10';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
      {/* Premium/Discount Zones Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {premiumDiscount?.status === 'PREMIUM' ? (
              <TrendingDownIcon className="h-4 w-4 text-red-500" />
            ) : (
              <TrendingUpIcon className="h-4 w-4 text-green-500" />
            )}
            Premium / Discount Zones
          </CardTitle>
          {premiumDiscount && (
            <Badge 
              variant="outline" 
              className={`${getPremiumDiscountColor(premiumDiscount.status)} ${getPremiumDiscountBg(premiumDiscount.status)} border-0`}
            >
              {premiumDiscount.status}
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {premiumDiscount ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Swing High (Premium Top)</span>
                <span className="font-mono">{premiumDiscount.high.toFixed(2)}</span>
              </div>
              
              <div className="relative h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div 
                  className="absolute top-0 bottom-0 w-1 bg-yellow-500" 
                  style={{ left: '50%' }}
                  title="Equilibrium (50%)"
                />
                {currentPrice && (
                   <div 
                   className={`absolute top-0 bottom-0 w-2 rounded-full ${premiumDiscount.status === 'PREMIUM' ? 'bg-red-500' : 'bg-green-500'}`}
                   style={{ 
                     left: `${Math.max(0, Math.min(100, ((currentPrice - premiumDiscount.low) / (premiumDiscount.high - premiumDiscount.low)) * 100))}%` 
                   }}
                 />
                )}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span className="text-yellow-500 font-medium">EQ: {premiumDiscount.equilibrium.toFixed(2)}</span>
                <span>100%</span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Swing Low (Discount Bottom)</span>
                <span className="font-mono">{premiumDiscount.low.toFixed(2)}</span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Dados insuficientes para cálculo de zonas.</div>
          )}
        </CardContent>
      </Card>

      {/* Session Liquidity Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <GlobeIcon className="h-4 w-4 text-blue-500" />
            Session Liquidity
          </CardTitle>
          <ClockIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {sessionLiquidity ? (
            <div className="space-y-4">
              {['asia', 'london', 'newYork'].map((sessionKey) => {
                const session = sessionLiquidity[sessionKey as keyof SessionLiquidity];
                if (!session) return null;
                
                return (
                  <div key={sessionKey} className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        sessionKey === 'asia' ? 'bg-yellow-500' : 
                        sessionKey === 'london' ? 'bg-blue-500' : 'bg-purple-500'
                      }`} />
                      <span className="text-sm font-medium">{session.label}</span>
                    </div>
                    <div className="text-right text-xs">
                      <div className="text-red-400">H: {session.high.toFixed(2)}</div>
                      <div className="text-green-400">L: {session.low.toFixed(2)}</div>
                    </div>
                  </div>
                );
              })}
              {Object.keys(sessionLiquidity).length === 0 && (
                <div className="text-sm text-muted-foreground">Nenhuma sessão ativa detectada.</div>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Dados de sessão indisponíveis.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SMCAdvancedIndicators;
