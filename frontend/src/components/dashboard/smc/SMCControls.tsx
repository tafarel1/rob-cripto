import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { ShieldIcon, SettingsIcon, ZapIcon, AlertTriangleIcon, BarChartIcon, HistoryIcon } from '@/components/ui/icons';

interface SMCControlsProps {
  onBacktest?: () => void;
}

export function SMCControls({ onBacktest }: SMCControlsProps) {
  const [riskProfile, setRiskProfile] = React.useState('moderate');
  const [riskPerTrade, setRiskPerTrade] = React.useState([1]);
  const [leverage, setLeverage] = React.useState([5]);
  const [autoBe, setAutoBe] = React.useState(true);

  return (
    <div className="flex flex-col gap-[var(--space-md)] h-full overflow-y-auto pr-2" style={{ scrollbarGutter: 'stable' }}>
      {/* Risk Profile Section */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ShieldIcon className="w-4 h-4 text-blue-500" />
            Perfil de Risco
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-[var(--space-md)]">
          <Select value={riskProfile} onValueChange={setRiskProfile}>
            <SelectTrigger className="min-h-[44px]">
              <SelectValue placeholder="Selecione o perfil" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="conservative">Conservador (2%)</SelectItem>
              <SelectItem value="moderate">Moderado (5%)</SelectItem>
              <SelectItem value="aggressive">Agressivo (10%)</SelectItem>
              <SelectItem value="institutional">Institucional</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex flex-col gap-[var(--space-sm)]">
            <div className="flex justify-between text-xs">
              <Label>Risco por Trade</Label>
              <span className="text-muted-foreground">{riskPerTrade}%</span>
            </div>
            <Slider 
              value={riskPerTrade} 
              onValueChange={setRiskPerTrade} 
              max={10} 
              step={0.5} 
              className="py-3"
            />
          </div>

          <div className="flex flex-col gap-[var(--space-sm)]">
            <div className="flex justify-between text-xs">
              <Label>Alavancagem Máx</Label>
              <span className="text-muted-foreground">{leverage}x</span>
            </div>
            <Slider 
              value={leverage} 
              onValueChange={setLeverage} 
              max={125} 
              step={5} 
              className="py-3"
            />
          </div>
        </CardContent>
      </Card>

      {/* Execution Settings */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <SettingsIcon className="w-4 h-4" />
            Configurações de Execução
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-[var(--space-md)]">
          <div className="flex items-center justify-between min-h-[44px]">
            <Label htmlFor="auto-be" className="text-xs cursor-pointer">Auto Break-Even</Label>
            <Switch id="auto-be" checked={autoBe} onCheckedChange={setAutoBe} />
          </div>
          
          <div className="flex items-center justify-between min-h-[44px]">
            <Label htmlFor="trailing" className="text-xs cursor-pointer">Trailing Stop</Label>
            <Switch id="trailing" />
          </div>

          <div className="flex flex-col gap-[var(--space-xs)]">
            <Label className="text-xs">Max Slippage (%)</Label>
            <Input type="number" placeholder="0.1" className="min-h-[44px] text-xs" />
          </div>
        </CardContent>
      </Card>

      {/* Strategy Tools */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChartIcon className="w-4 h-4" />
            Estratégia
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-[var(--space-sm)]">
          <Button 
            variant="secondary" 
            className="w-full min-h-[44px] text-xs justify-start gap-2" 
            size="sm"
            onClick={onBacktest}
          >
            <HistoryIcon className="w-3 h-3" />
            Executar Backtest
          </Button>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="border-destructive/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive">
            <ZapIcon className="w-4 h-4" />
            Ações Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-[var(--space-sm)]">
          <Button variant="outline" className="w-full min-h-[44px] text-xs justify-start" size="sm">
            Zerar Limites Diários
          </Button>
          <Button variant="destructive" className="w-full min-h-[44px] text-xs justify-start gap-2" size="sm">
            <AlertTriangleIcon className="w-3 h-3" />
            Fechar Todas Posições
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
