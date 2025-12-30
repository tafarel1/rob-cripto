import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import * as Icons from '@/components/ui/icons';

const ColorSwatch = ({ name, variable, className }: { name: string, variable: string, className?: string }) => (
  <div className="flex flex-col gap-2">
    <div 
      className={`h-20 w-full rounded-md shadow-sm border ${className}`} 
      style={{ backgroundColor: `hsl(var(${variable}))` }}
    />
    <div className="space-y-1">
      <p className="font-medium text-sm">{name}</p>
      <code className="text-xs text-muted-foreground bg-muted p-1 rounded block w-fit">
        var({variable})
      </code>
    </div>
  </div>
);

const TypographySample = ({ role, size, weight, sample }: { role: string, size: string, weight: string, sample: string }) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-4 py-4 border-b last:border-0">
    <div className="w-48 shrink-0">
      <p className="font-medium text-sm">{role}</p>
      <div className="flex gap-2 mt-1">
        <Badge variant="outline" className="text-xs">{size}</Badge>
        <Badge variant="outline" className="text-xs">{weight}</Badge>
      </div>
    </div>
    <div className={`${size} ${weight} truncate`}>
      {sample}
    </div>
  </div>
);

export default function DesignTokensPage() {
  return (
    <div className="container mx-auto py-8 space-y-8 animate-fade-in">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Design Tokens</h1>
        <p className="text-muted-foreground">
          Guia de referência para as variáveis CSS globais do sistema.
        </p>
      </div>

      {/* Colors */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Cores</h2>
        
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Base Colors</CardTitle>
              <CardDescription>Cores fundamentais da interface (Background, Foreground, Card, Popover)</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <ColorSwatch name="Background" variable="--background" />
              <ColorSwatch name="Foreground" variable="--foreground" />
              <ColorSwatch name="Card" variable="--card" />
              <ColorSwatch name="Card Foreground" variable="--card-foreground" />
              <ColorSwatch name="Popover" variable="--popover" />
              <ColorSwatch name="Popover Foreground" variable="--popover-foreground" />
              <ColorSwatch name="Muted" variable="--muted" />
              <ColorSwatch name="Muted Foreground" variable="--muted-foreground" />
              <ColorSwatch name="Border" variable="--border" />
              <ColorSwatch name="Input" variable="--input" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Primary (Blue)</CardTitle>
              <CardDescription>Cor principal para ações e destaques</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <ColorSwatch name="Primary 50" variable="--primary-50" />
              <ColorSwatch name="Primary 100" variable="--primary-100" />
              <ColorSwatch name="Primary 200" variable="--primary-200" />
              <ColorSwatch name="Primary 300" variable="--primary-300" />
              <ColorSwatch name="Primary 400" variable="--primary-400" />
              <ColorSwatch name="Primary 500" variable="--primary-500" />
              <ColorSwatch name="Primary 600" variable="--primary-600" />
              <ColorSwatch name="Primary 700" variable="--primary-700" />
              <ColorSwatch name="Primary 800" variable="--primary-800" />
              <ColorSwatch name="Primary 900" variable="--primary-900" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Success (Emerald)</CardTitle>
              <CardDescription>Feedback positivo e estados de sucesso</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <ColorSwatch name="Success 50" variable="--success-50" />
              <ColorSwatch name="Success 100" variable="--success-100" />
              <ColorSwatch name="Success 500" variable="--success-500" />
              <ColorSwatch name="Success 600" variable="--success-600" />
              <ColorSwatch name="Success 900" variable="--success-900" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Danger (Red)</CardTitle>
              <CardDescription>Erros, ações destrutivas e alertas críticos</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <ColorSwatch name="Danger 50" variable="--danger-50" />
              <ColorSwatch name="Danger 100" variable="--danger-100" />
              <ColorSwatch name="Danger 500" variable="--danger-500" />
              <ColorSwatch name="Danger 600" variable="--danger-600" />
              <ColorSwatch name="Danger 900" variable="--danger-900" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SMC & Trading</CardTitle>
              <CardDescription>Cores específicas para análise de mercado</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <ColorSwatch name="SMC Bullish" variable="--smc-bullish" />
              <ColorSwatch name="SMC Bearish" variable="--smc-bearish" />
              <ColorSwatch name="SMC Liquidity" variable="--smc-liquidity" />
              <ColorSwatch name="Risk High" variable="--risk-high" />
              <ColorSwatch name="Risk Medium" variable="--risk-medium" />
              <ColorSwatch name="Risk Low" variable="--risk-low" />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Typography */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Tipografia</h2>
        <Card>
          <CardContent className="pt-6">
            <TypographySample 
              role="Heading 1" 
              size="text-4xl" 
              weight="font-extrabold" 
              sample="Design System Heading 1" 
            />
            <TypographySample 
              role="Heading 2" 
              size="text-3xl" 
              weight="font-semibold" 
              sample="Design System Heading 2" 
            />
            <TypographySample 
              role="Heading 3" 
              size="text-2xl" 
              weight="font-semibold" 
              sample="Design System Heading 3" 
            />
            <TypographySample 
              role="Heading 4" 
              size="text-xl" 
              weight="font-semibold" 
              sample="Design System Heading 4" 
            />
            <TypographySample 
              role="Body Large" 
              size="text-lg" 
              weight="font-normal" 
              sample="The quick brown fox jumps over the lazy dog." 
            />
            <TypographySample 
              role="Body Default" 
              size="text-base" 
              weight="font-normal" 
              sample="The quick brown fox jumps over the lazy dog." 
            />
            <TypographySample 
              role="Body Small" 
              size="text-sm" 
              weight="font-normal" 
              sample="The quick brown fox jumps over the lazy dog." 
            />
            <TypographySample 
              role="Caption" 
              size="text-xs" 
              weight="font-normal" 
              sample="The quick brown fox jumps over the lazy dog." 
            />
          </CardContent>
        </Card>
      </section>

      {/* Spacing */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Espaçamento & Radius</h2>
        <Card>
          <CardContent className="pt-6 grid gap-8">
            <div className="space-y-4">
              <h3 className="font-medium">Radius</h3>
              <div className="flex items-end gap-4">
                <div className="w-16 h-16 bg-primary rounded-sm flex items-center justify-center text-primary-foreground text-xs">sm</div>
                <div className="w-16 h-16 bg-primary rounded-md flex items-center justify-center text-primary-foreground text-xs">md</div>
                <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center text-primary-foreground text-xs">lg</div>
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs">full</div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-medium">Shadows</h3>
              <div className="flex items-center gap-6 flex-wrap">
                <div className="w-24 h-24 bg-card rounded-md shadow-sm flex items-center justify-center text-xs border">sm</div>
                <div className="w-24 h-24 bg-card rounded-md shadow flex items-center justify-center text-xs border">default</div>
                <div className="w-24 h-24 bg-card rounded-md shadow-md flex items-center justify-center text-xs border">md</div>
                <div className="w-24 h-24 bg-card rounded-md shadow-lg flex items-center justify-center text-xs border">lg</div>
                <div className="w-24 h-24 bg-card rounded-md shadow-xl flex items-center justify-center text-xs border">xl</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
      {/* Icons */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Ícones</h2>
        <Card>
          <CardHeader>
            <CardTitle>Biblioteca de Ícones</CardTitle>
            <CardDescription>Ícones customizados do sistema (substituindo lucide-react)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
              {Object.entries(Icons).map(([name, IconComponent]) => (
                <div key={name} className="flex flex-col items-center gap-2 p-2 border rounded hover:bg-muted/50 transition-colors">
                  {/* @ts-ignore */}
                  <IconComponent className="h-6 w-6" />
                  <span className="text-xs text-muted-foreground truncate w-full text-center" title={name}>{name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
