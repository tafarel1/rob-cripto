import { ColorType, DeepPartial, ChartOptions, CandlestickSeriesOptions } from 'lightweight-charts';

export type ThemeMode = 'professional_dark' | 'light_analyst' | 'terminal_classic';

export interface SMCTheme {
  id: ThemeMode;
  label: string;
  chart: DeepPartial<ChartOptions>;
  candles: DeepPartial<CandlestickSeriesOptions>;
  colors: {
    background: string; // CSS value
    backgroundGradient?: string; // CSS gradient
    textPrimary: string;
    textSecondary: string;
    border: string;
    accent: string;
    success: string;
    danger: string;
    warning: string;
    info: string;
    glass: string;
  };
  layers: {
    liquidityBuy: string;
    liquiditySell: string;
    orderBlockBull: string;
    orderBlockBear: string;
    fvg: string;
    structure: string;
    session: string;
    premium: string;
    discount: string;
  };
  fonts: {
    family: string;
    mono: string;
  };
}

export const SMC_THEMES: Record<ThemeMode, SMCTheme> = {
  professional_dark: {
    id: 'professional_dark',
    label: 'Professional Dark',
    chart: {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#94a3b8',
        fontFamily: "'Inter', sans-serif",
      },
      grid: {
        vertLines: { color: 'rgba(30, 41, 59, 0.4)', style: 1 }, // Dotted
        horzLines: { color: 'rgba(30, 41, 59, 0.4)', style: 1 },
      },
      crosshair: {
        vertLine: { color: '#64748b', labelBackgroundColor: '#1e293b' },
        horzLine: { color: '#64748b', labelBackgroundColor: '#1e293b' },
      },
      rightPriceScale: {
        borderColor: '#1e293b',
      },
      timeScale: {
        borderColor: '#1e293b',
      },
    },
    candles: {
      upColor: '#22c55e',
      downColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      borderVisible: false,
    },
    colors: {
      background: '#020617', // slate-950
      backgroundGradient: 'linear-gradient(to bottom, #0f172a, #020617)',
      textPrimary: '#e2e8f0',
      textSecondary: '#94a3b8',
      border: '#1e293b',
      accent: '#3b82f6',
      success: '#22c55e',
      danger: '#ef4444',
      warning: '#eab308',
      info: '#3b82f6',
      glass: 'rgba(2, 6, 23, 0.7)',
    },
    layers: {
      liquidityBuy: '#22c55e',
      liquiditySell: '#ef4444',
      orderBlockBull: '#15803d', // darker green
      orderBlockBear: '#b91c1c', // darker red
      fvg: '#eab308',
      structure: '#64748b',
      session: '#f97316',
      premium: '#10b981',
      discount: '#ef4444',
    },
    fonts: {
      family: "'Inter', sans-serif",
      mono: "'JetBrains Mono', monospace",
    },
  },

  light_analyst: {
    id: 'light_analyst',
    label: 'Light Analyst',
    chart: {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#475569',
        fontFamily: "'Inter', sans-serif",
      },
      grid: {
        vertLines: { color: 'rgba(203, 213, 225, 0.5)', style: 1 },
        horzLines: { color: 'rgba(203, 213, 225, 0.5)', style: 1 },
      },
      crosshair: {
        vertLine: { color: '#94a3b8', labelBackgroundColor: '#475569' },
        horzLine: { color: '#94a3b8', labelBackgroundColor: '#475569' },
      },
      rightPriceScale: {
        borderColor: '#e2e8f0',
      },
      timeScale: {
        borderColor: '#e2e8f0',
      },
    },
    candles: {
      upColor: '#10b981', // Emerald
      downColor: '#f43f5e', // Rose
      wickUpColor: '#10b981',
      wickDownColor: '#f43f5e',
      borderVisible: false,
    },
    colors: {
      background: '#f8fafc', // slate-50
      backgroundGradient: 'linear-gradient(to bottom, #ffffff, #f1f5f9)',
      textPrimary: '#1e293b',
      textSecondary: '#64748b',
      border: '#e2e8f0',
      accent: '#6366f1', // Indigo
      success: '#10b981',
      danger: '#f43f5e',
      warning: '#f59e0b',
      info: '#3b82f6',
      glass: 'rgba(255, 255, 255, 0.8)',
    },
    layers: {
      liquidityBuy: '#10b981',
      liquiditySell: '#f43f5e',
      orderBlockBull: '#34d399',
      orderBlockBear: '#fb7185',
      fvg: '#fbbf24',
      structure: '#94a3b8',
      session: '#f97316',
      premium: '#34d399',
      discount: '#fb7185',
    },
    fonts: {
      family: "'Inter', sans-serif",
      mono: "'IBM Plex Mono', monospace",
    },
  },

  terminal_classic: {
    id: 'terminal_classic',
    label: 'Terminal Classic',
    chart: {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#00ff00', // Terminal Green
        fontFamily: "'Courier New', monospace",
      },
      grid: {
        vertLines: { color: 'rgba(0, 255, 0, 0.1)', style: 3 }, // Dashed
        horzLines: { color: 'rgba(0, 255, 0, 0.1)', style: 3 },
      },
      crosshair: {
        vertLine: { color: '#00ff00', labelBackgroundColor: '#003300' },
        horzLine: { color: '#00ff00', labelBackgroundColor: '#003300' },
      },
      rightPriceScale: {
        borderColor: '#003300',
      },
      timeScale: {
        borderColor: '#003300',
      },
    },
    candles: {
      upColor: '#00ff00',
      downColor: '#000000', // Hollow style for down? Or just black body with green border? Let's do filled green / empty green
      wickUpColor: '#00ff00',
      wickDownColor: '#00ff00',
      borderUpColor: '#00ff00',
      borderDownColor: '#00ff00',
      borderVisible: true,
    },
    colors: {
      background: '#000000',
      backgroundGradient: 'radial-gradient(circle, #001100 0%, #000000 100%)',
      textPrimary: '#00ff00',
      textSecondary: 'rgba(0, 255, 0, 0.7)',
      border: '#003300',
      accent: '#00ff00',
      success: '#00ff00',
      danger: '#ff0000', // Strict red for contrast or keep monochrome? Let's mix amber/red for serious alerts
      warning: '#ffcc00',
      info: '#00ffff',
      glass: 'rgba(0, 20, 0, 0.9)',
    },
    layers: {
      liquidityBuy: '#00ff00',
      liquiditySell: '#00ff00', // Monochromatic logic usually, but let's keep semantic distinct
      orderBlockBull: 'rgba(0, 255, 0, 0.3)',
      orderBlockBear: 'rgba(255, 0, 0, 0.3)',
      fvg: 'rgba(255, 204, 0, 0.3)',
      structure: '#003300',
      session: '#ff9900',
      premium: '#00ff00',
      discount: '#ff0000',
    },
    fonts: {
      family: "'Courier New', monospace",
      mono: "'Courier New', monospace",
    },
  },
};
