import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickSeries, Time, createSeriesMarkers, SeriesMarker, LineStyle, IPriceLine, MouseEventParams } from 'lightweight-charts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LoaderIcon, BarChart3Icon, TrendingUpIcon, TrendingDownIcon } from '@/components/ui/icons';
import { LineChart } from 'lucide-react';
import { useSMCAnalysis } from '@/hooks/useSMCAnalysis';
import { toast } from 'sonner';
import { useDashboard } from '@/contexts/DashboardContext';
import { SMCFloatingControls } from './SMCFloatingControls';
import { SMCTooltip, SMCTooltipData } from './SMCTooltip';
import { SMCVisualAlert, SMCZoneAlert } from './SMCVisualAlert';
import { SMCPerformanceStats } from './SMCPerformanceStats';
import { AnimatePresence, motion } from 'framer-motion';
import { SMC_THEMES, ThemeMode } from './SMCTheming';

interface SMCMainChartProps {
  symbol: string;
  onSymbolChange?: (_symbol: string) => void;
}

const AVAILABLE_SYMBOLS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'ADA/USDT'];

export function SMCMainChart({ symbol, onSymbolChange }: SMCMainChartProps) {
  const [timeframe, setTimeframe] = useState('1h');
  const [showStats, setShowStats] = useState(true);
  
  // Enhanced State for Controls
  const [layerVisibility, setLayerVisibility] = useState({
    liquidity: true,
    orderBlocks: true,
    fvg: false,
    structure: false,
    premiumDiscount: false,
    sessions: false
  });
  
  const [layerOpacity, setLayerOpacity] = useState({
    liquidity: 0.5,
    orderBlocks: 0.8,
    fvg: 0.3,
    structure: 1.0,
    premiumDiscount: 0.2,
    sessions: 0.4
  });

  const [analysisMode, setAnalysisMode] = useState<'quick' | 'deep' | 'backtest'>('deep');
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>('professional_dark');
  const [controlsExpanded, setControlsExpanded] = useState(false);
  const [tooltipData, setTooltipData] = useState<SMCTooltipData | null>(null);

  // Replay State
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [replaySpeed, setReplaySpeed] = useState(1000); // ms per candle

  // Alert State
  const [activeZoneAlert, setActiveZoneAlert] = useState<SMCZoneAlert | null>(null);

  const { lastEvent } = useDashboard();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesMarkersRef = useRef<any | null>(null);
  const realtimeMarkersRef = useRef<SeriesMarker<Time>[]>([]);
  
  // Ref to store processed data for access in event listeners
  const processedDataRef = useRef<{ candles: any[], markers: SeriesMarker<Time>[] }>({ candles: [], markers: [] });

  // Gesture State
  const touchStartRef = useRef<{ x: number, y: number, time: number } | null>(null);
  const lastTapRef = useRef<number>(0);
  
  const { data, isLoading } = useSMCAnalysis({ 
    symbol, 
    timeframe, 
    refreshInterval: 60000 
  });

  // Apply Analysis Mode Presets
  useEffect(() => {
    if (analysisMode === 'quick') {
        setLayerVisibility(prev => ({ ...prev, liquidity: true, orderBlocks: true, fvg: false, structure: false, premiumDiscount: false, sessions: false }));
        setLayerOpacity(prev => ({ ...prev, orderBlocks: 0.9, liquidity: 0.6 }));
        setIsReplaying(false);
    } else if (analysisMode === 'deep') {
        setLayerVisibility(prev => ({ ...prev, liquidity: true, orderBlocks: true, fvg: true, structure: true }));
        setLayerOpacity(prev => ({ ...prev, orderBlocks: 0.6, liquidity: 0.4, fvg: 0.3 }));
        setIsReplaying(false);
    } else if (analysisMode === 'backtest') {
        setIsReplaying(false);
        // We'll initialize replayIndex in the effect that has access to processedData
    }
  }, [analysisMode]);

  // Apply Visual Theme
  useEffect(() => {
    if (!chartRef.current || !candlestickSeriesRef.current) return;
    
    const theme = SMC_THEMES[currentTheme];
    
    // Update Chart Options
    chartRef.current.applyOptions(theme.chart);
    
    // Update Series Options
    candlestickSeriesRef.current.applyOptions(theme.candles);
    
    // Force redraw to ensure background/grid updates take effect visually immediately if needed
    // Lightweight charts usually handles this efficiently.
  }, [currentTheme]);

  const toggleLayer = (layer: string) => {
    setLayerVisibility(prev => ({ ...prev, [layer]: !prev[layer as keyof typeof prev] }));
  };

  const changeOpacity = (layer: string, value: number) => {
    setLayerOpacity(prev => ({ ...prev, [layer]: value }));
  };

  const stats = useMemo(() => {
    if (!data) return null;
    return {
      trend: data.marketStructures?.[data.marketStructures.length - 1]?.trend || 'Neutral',
      activeOBs: data.orderBlocks?.length || 0,
      activeFVGs: data.fairValueGaps?.length || 0,
      volatility: data.candles && data.candles.length > 0 
        ? ((data.candles[data.candles.length - 1].high - data.candles[data.candles.length - 1].low) / data.candles[data.candles.length - 1].close * 100).toFixed(2) + '%' 
        : '0%'
    };
  }, [data]);

  // Optimized Data Processing with useMemo
  const processedData = useMemo(() => {
    if (!data?.candles) {
      return { candles: [], markers: [] };
    }

    // 1. Validate & Format Candles
    const validCandles = data.candles
      .filter(c => c && (typeof c.time === 'number' || typeof c.timestamp === 'number'))
      .map(candle => {
        const timeVal = candle.time || candle.timestamp || 0;
        return {
          time: (timeVal / 1000) as Time, // Ensure conversion to seconds for Lightweight Charts
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
        };
      })
      .sort((a, b) => (a.time as number) - (b.time as number));

    // 2. Deduplicate
    const uniqueCandles: typeof validCandles = [];
    const seenTimes = new Set<number>();
    
    for (const candle of validCandles) {
      const timeNum = candle.time as number;
      if (!seenTimes.has(timeNum)) {
        seenTimes.add(timeNum);
        uniqueCandles.push(candle);
      }
    }

    // 3. Prepare Base Markers (Signals)
    let markers: SeriesMarker<Time>[] = [];

    if (data.signals) {
      markers = [
        ...markers,
        ...data.signals.map(signal => ({
          time: (signal.timestamp / 1000) as Time,
          position: (signal.type === 'BUY' ? 'belowBar' : 'aboveBar') as 'belowBar' | 'aboveBar',
          color: signal.type === 'BUY' ? '#22c55e' : '#ef4444',
          shape: (signal.type === 'BUY' ? 'arrowUp' : 'arrowDown') as 'arrowUp' | 'arrowDown',
          text: `SIGNAL ${signal.type}`,
          size: 2,
        }))
      ];
    }

    return { candles: uniqueCandles, markers };
  }, [data]);

  // Derived Display Data (handling Backtest Mode)
  const displayData = useMemo(() => {
    if (analysisMode === 'backtest') {
        // Slice candles up to replayIndex
        // Ensure replayIndex is within bounds
        const safeIndex = Math.min(Math.max(0, replayIndex), processedData.candles.length - 1);
        const slicedCandles = processedData.candles.slice(0, safeIndex + 1);
        
        // Filter markers that are within the sliced time range
        const lastTime = slicedCandles[slicedCandles.length - 1]?.time as number;
        const slicedMarkers = processedData.markers.filter(m => (m.time as number) <= lastTime);
        
        return { candles: slicedCandles, markers: slicedMarkers };
    }
    return processedData;
  }, [processedData, analysisMode, replayIndex]);

  // Zone Alert Detection Effect
  useEffect(() => {
    if (!displayData.candles.length || !data) {
        setActiveZoneAlert(null);
        return;
    }

    const lastCandle = displayData.candles[displayData.candles.length - 1];
    const high = lastCandle.high;
    const low = lastCandle.low;
    
    let detected: SMCZoneAlert | null = null;

    // 1. Check Liquidity Zones (High Priority)
    if (data.liquidityZones) {
        for (const zone of data.liquidityZones) {
            // Check if candle touches the zone price (within 0.05% tolerance)
            const tolerance = zone.price * 0.0005;
            if (high >= zone.price - tolerance && low <= zone.price + tolerance) {
                detected = {
                    type: 'Liquidity',
                    side: zone.type === 'buy_side' ? 'Bearish' : 'Bullish', // Sweep often implies reversal
                    price: zone.price,
                    label: `${zone.type === 'buy_side' ? 'Buy-Side' : 'Sell-Side'} Liquidity Sweep`
                };
                break; 
            }
        }
    }

    // 2. Check Order Blocks (if no liquidity detected)
    if (!detected && data.orderBlocks) {
        for (const ob of data.orderBlocks) {
            // Check intersection with OB range
            if (high >= ob.range[0] && low <= ob.range[1]) {
                detected = {
                    type: 'Order Block',
                    side: ob.type === 'bullish' ? 'Bullish' : 'Bearish',
                    price: (ob.range[0] + ob.range[1]) / 2,
                    label: `${ob.type === 'bullish' ? 'Bullish' : 'Bearish'} OB Mitigation`
                };
                break;
            }
        }
    }

    // 3. Check FVGs (Lowest Priority)
    if (!detected && data.fairValueGaps) {
        for (const fvg of data.fairValueGaps) {
            if (high >= fvg.range[0] && low <= fvg.range[1]) {
                detected = {
                    type: 'FVG',
                    side: fvg.type === 'bullish' ? 'Bullish' : 'Bearish',
                    price: (fvg.range[0] + fvg.range[1]) / 2,
                    label: `${fvg.type === 'bullish' ? 'Bullish' : 'Bearish'} FVG Fill`
                };
                break;
            }
        }
    }

    setActiveZoneAlert(detected);
  }, [displayData, data]);

  // Initialize Replay Index when entering Backtest Mode
  useEffect(() => {
    if (analysisMode === 'backtest' && processedData.candles.length > 0) {
         // Only set if we are at 0 (initial) or switching modes. 
         // But we might want to persist index if just pausing.
         // Let's set it if it's 0.
         if (replayIndex === 0) {
             setReplayIndex(Math.floor(processedData.candles.length * 0.7));
         }
    }
  }, [analysisMode, processedData.candles.length]);

  // Replay Loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isReplaying && analysisMode === 'backtest') {
        interval = setInterval(() => {
            setReplayIndex(prev => {
                if (prev >= processedData.candles.length - 1) {
                    setIsReplaying(false);
                    return prev;
                }
                return prev + 1;
            });
        }, replaySpeed);
    }
    return () => clearInterval(interval);
  }, [isReplaying, analysisMode, replaySpeed, processedData.candles.length]);

  // Sync processedDataRef (Using displayData so tooltip sees what user sees?)
  // Actually, tooltip should probably show what's visible.
  useEffect(() => {
    processedDataRef.current = displayData;
  }, [displayData]);

  // Replay Handlers
  const handleToggleReplay = () => setIsReplaying(!isReplaying);
  const handleReplaySpeedChange = (speed: number) => setReplaySpeed(speed);
  const handleReplayStep = (direction: 'forward' | 'backward') => {
      setReplayIndex(prev => {
          const delta = direction === 'forward' ? 1 : -1;
          return Math.min(Math.max(0, prev + delta), processedData.candles.length - 1);
      });
  };

  // Handle Trade Actions
  const handleTrade = (type: 'BUY' | 'SELL') => {
    toast.info(`Ordem ${type} Enviada`, {
      description: `Simulação: ${type} a mercado em ${symbol}`,
      duration: 3000,
    });
  };

  // Listen for Cross-Dashboard Events (Trade Execution & Navigation)
  useEffect(() => {
    if (!lastEvent || !candlestickSeriesRef.current) return;

    let newMarker: SeriesMarker<Time> | null = null;

    if (lastEvent.type === 'TRADE_EXECUTED' && lastEvent.payload && lastEvent.payload.symbol === symbol) {
      newMarker = {
        time: (lastEvent.timestamp / 1000) as Time,
        position: lastEvent.payload.side === 'BUY' ? 'belowBar' : 'aboveBar',
        color: lastEvent.payload.side === 'BUY' ? 'hsl(var(--success-500))' : 'hsl(var(--danger-500))',
        shape: lastEvent.payload.side === 'BUY' ? 'arrowUp' : 'arrowDown',
        text: lastEvent.payload.side === 'BUY' ? 'Buy' : 'Sell',
      };
    } else if (lastEvent.type === 'SIGNAL_DETECTED' && lastEvent.source === 'smc' && lastEvent.payload && lastEvent.payload.symbol === symbol) {
      newMarker = {
        time: (lastEvent.timestamp / 1000) as Time,
        position: lastEvent.payload.type === 'BULLISH' ? 'belowBar' : 'aboveBar',
        color: lastEvent.payload.type === 'BULLISH' ? 'hsl(var(--success-500))' : 'hsl(var(--danger-500))',
        shape: lastEvent.payload.type === 'BULLISH' ? 'arrowUp' : 'arrowDown',
        text: `SIGNAL ${lastEvent.payload.type}`,
        size: 2,
      };
      toast.info(`Sinal SMC Recebido: ${lastEvent.payload.type}`, {
        description: `${symbol} - ${lastEvent.payload.reason || 'Análise Técnica'}`
      });
    } else if (lastEvent.type === 'NAVIGATE_TO_SMC' && lastEvent.payload) {
      // Switch symbol if needed
      if (lastEvent.payload.symbol && lastEvent.payload.symbol !== symbol && onSymbolChange) {
        onSymbolChange(lastEvent.payload.symbol);
      }

      // Add marker for the trade being reviewed
      if (lastEvent.payload.date) {
        const tradeTime = (new Date(lastEvent.payload.date).getTime() / 1000) as Time;
        newMarker = {
          time: tradeTime,
          position: 'aboveBar',
          color: 'hsl(var(--warning-500))', // Amber for review
          shape: 'arrowDown',
          text: 'Review Trade',
          size: 2,
        };
        
        // Visual feedback
        toast.info(`Analisando Trade: ${lastEvent.payload.tradeId || 'Selecionado'}`, {
          description: `Data: ${lastEvent.payload.date}`
        });
      }
    }

    if (newMarker) {
      const updatedRealtimeMarkers = [...realtimeMarkersRef.current, newMarker];
      realtimeMarkersRef.current = updatedRealtimeMarkers;
      
      if (seriesMarkersRef.current) {
        // Merge with historical markers from ref
        const allMarkers = [...processedDataRef.current.markers, ...updatedRealtimeMarkers]
          .sort((a, b) => (a.time as number) - (b.time as number));
        seriesMarkersRef.current.setMarkers(allMarkers);
      }
    }
  }, [lastEvent, symbol, onSymbolChange]);

  // Mobile Gestures Logic
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now()
      };
    } else if (e.touches.length === 3) {
      // 3-Finger Pinch (Reset Zoom)
      chartRef.current?.timeScale().fitContent();
      toast.info("Zoom Resetado");
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const touchEnd = e.changedTouches[0];
    const deltaX = touchEnd.clientX - touchStartRef.current.x;
    const deltaTime = Date.now() - touchStartRef.current.time;

    // 1. Swipe Detection (Horizontal)
    if (Math.abs(deltaX) > 100 && deltaTime < 500) {
      if (onSymbolChange) {
        const currentIndex = AVAILABLE_SYMBOLS.indexOf(symbol);
        let nextIndex;
        if (deltaX > 0) {
          // Swipe Right (Previous)
          nextIndex = currentIndex > 0 ? currentIndex - 1 : AVAILABLE_SYMBOLS.length - 1;
        } else {
          // Swipe Left (Next)
          nextIndex = currentIndex < AVAILABLE_SYMBOLS.length - 1 ? currentIndex + 1 : 0;
        }
        onSymbolChange(AVAILABLE_SYMBOLS[nextIndex]);
        toast.info(`Switched to ${AVAILABLE_SYMBOLS[nextIndex]}`);
      }
    }

    // 2. Double Tap Detection
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double Tap Triggered
      handleTrade('BUY'); // Default Quick Trade Action
    }
    lastTapRef.current = now;
    touchStartRef.current = null;
  };

  // Initialize Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#94a3b8', // slate-400
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#1e293b', // slate-800
      },
      rightPriceScale: {
        borderColor: '#1e293b',
      },
      crosshair: {
        mode: 1, // CrosshairMode.Normal
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e', // Success-500
      downColor: '#ef4444', // Danger-500
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;

    // Initialize Markers Primitive
    try {
      const seriesMarkers = createSeriesMarkers(candlestickSeries, []);
      seriesMarkersRef.current = seriesMarkers;
    } catch (e) {
      console.error("[SMCChart] Failed to create series markers:", e);
    }

    // Smart Tooltip Logic
    chart.subscribeCrosshairMove((param: MouseEventParams) => {
        if (!param.point || !param.time || !candlestickSeries) {
            setTooltipData(null);
            return;
        }

        const price = candlestickSeries.coordinateToPrice(param.point.y);
        if (price === null) return;

        // Check intersections with active data
        // We need to access the LATEST data, but `data` in closure might be stale.
        // However, this effect runs only on mount. We need to use a Ref for data access if we want it fresh inside this closure.
        // BUT, since we rebuild layers in another effect, we can perhaps assume `data` is available via a Ref?
        // Let's rely on `data` being stable or use a Ref for it if this effect doesn't re-run.
        // Actually, this effect DOES NOT re-run on `data` change. So we MUST use a Ref for data.
        
        // Let's assume we create a Ref for data outside
        // For now, I'll use a simplified check or skip if data isn't in ref (which I haven't created yet for `data` specifically, only `processedDataRef`)
        // I will add `dataRef`
    });

    // Resize Observer
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ 
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight 
        });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      candlestickSeriesRef.current = null;
      seriesMarkersRef.current = null;
    };
  }, []);

  // Data Ref for Tooltip
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Theme Ref for Tooltip
  const themeRef = useRef(currentTheme);
  useEffect(() => {
    themeRef.current = currentTheme;
  }, [currentTheme]);

  // Separate Effect for Tooltip Subscription (so it can access dataRef and themeRef)
  useEffect(() => {
    if (!chartRef.current || !candlestickSeriesRef.current) return;
    
    const handleCrosshair = (param: MouseEventParams) => {
        if (!param.point || !candlestickSeriesRef.current || !dataRef.current) {
            setTooltipData(null);
            return;
        }

        const price = candlestickSeriesRef.current.coordinateToPrice(param.point.y);
        if (price === null) {
            setTooltipData(null);
            return;
        }

        const items: SMCTooltipData['items'] = [];
        const d = dataRef.current;
        const themeLayers = SMC_THEMES[themeRef.current].layers;

        // Check Liquidity Zones
        d.liquidityZones?.forEach(zone => {
            // Assume zone has a small range or just a price line. If price line, check proximity
            if (Math.abs(price - zone.price) / price < 0.001) { // 0.1% proximity
                items.push({
                    label: 'Liquidity Zone',
                    value: `${zone.type === 'buy_side' ? 'Buy' : 'Sell'} Side`,
                    color: zone.type === 'buy_side' ? themeLayers.liquidityBuy : themeLayers.liquiditySell
                });
            }
        });

        // Check Order Blocks
        d.orderBlocks?.forEach(ob => {
            if (price >= ob.range[0] && price <= ob.range[1]) {
                items.push({
                    label: 'Order Block',
                    value: ob.type.toUpperCase(),
                    subValue: `Range: ${ob.range[0].toFixed(2)} - ${ob.range[1].toFixed(2)}`,
                    color: ob.type === 'bullish' ? themeLayers.orderBlockBull : themeLayers.orderBlockBear
                });
            }
        });

        // Check FVGs
        d.fairValueGaps?.forEach(fvg => {
             if (price >= fvg.range[0] && price <= fvg.range[1]) {
                items.push({
                    label: 'Fair Value Gap',
                    value: fvg.type.toUpperCase(),
                    color: themeLayers.fvg
                });
            }
        });

        if (items.length > 0) {
            setTooltipData({
                x: param.point.x,
                y: param.point.y,
                items
            });
        } else {
            setTooltipData(null);
        }
    };

    chartRef.current.subscribeCrosshairMove(handleCrosshair);
    
    return () => {
        chartRef.current?.unsubscribeCrosshairMove(handleCrosshair);
    };
  }, []); // Re-bind if chart instance changes (it shouldn't often)


  // Auto Theme based on time
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 18) {
        setCurrentTheme('light_analyst');
    } else {
        setCurrentTheme('professional_dark');
    }
  }, []);

  // Effect to update Price Lines (SMC Layers) with Opacity & Theme Colors
  useEffect(() => {
    if (!candlestickSeriesRef.current || !data) return;

    // 1. Clear existing lines
    priceLinesRef.current.forEach(line => {
        try {
            candlestickSeriesRef.current?.removePriceLine(line);
        } catch(e) { /* ignore */ }
    });
    priceLinesRef.current = [];

    const themeLayers = SMC_THEMES[currentTheme].layers;

    // Helper to apply opacity to hex color
    const getColor = (hex: string, alpha: number) => {
        // Simple Hex to RGBA conversion
        if (!hex) return `rgba(0,0,0,${alpha})`;
        let c = hex.startsWith('#') ? hex.substring(1) : hex;
        if(c.length === 3) c = c.split('').map(char => char + char).join('');
        const cVal = parseInt(c, 16);
        return `rgba(${(cVal>>16)&255}, ${(cVal>>8)&255}, ${cVal&255}, ${alpha})`;
    };

    // 2. Add Liquidity Zones
    if (layerVisibility.liquidity && data.liquidityZones) {
        data.liquidityZones.forEach(zone => {
            if (!candlestickSeriesRef.current) return;
            const baseColor = zone.type === 'buy_side' ? themeLayers.liquidityBuy : themeLayers.liquiditySell;
            
            const line = candlestickSeriesRef.current.createPriceLine({
                price: zone.price,
                color: getColor(baseColor, layerOpacity.liquidity),
                lineWidth: 1,
                lineStyle: LineStyle.Dotted,
                axisLabelVisible: true,
                title: `Liq`,
            });
            priceLinesRef.current.push(line);
        });
    }

    // 3. Add Order Blocks (Range)
    if (layerVisibility.orderBlocks && data.orderBlocks) {
        data.orderBlocks.forEach(ob => {
            if (!candlestickSeriesRef.current) return;
            const baseColor = ob.type === 'bullish' ? themeLayers.orderBlockBull : themeLayers.orderBlockBear;
            const color = getColor(baseColor, layerOpacity.orderBlocks);
            
            const lineTop = candlestickSeriesRef.current.createPriceLine({
                price: ob.range[1],
                color: color,
                lineWidth: 2,
                lineStyle: LineStyle.Solid,
                axisLabelVisible: false,
                title: `OB`,
            });
            
            const lineBottom = candlestickSeriesRef.current.createPriceLine({
                price: ob.range[0],
                color: color,
                lineWidth: 1,
                lineStyle: LineStyle.Solid,
                axisLabelVisible: false,
                title: '',
            });

            priceLinesRef.current.push(lineTop, lineBottom);
        });
    }

    // 4. Add FVGs
    if (layerVisibility.fvg && data.fairValueGaps) {
        data.fairValueGaps.forEach(fvg => {
            if (!candlestickSeriesRef.current) return;
            const color = getColor(themeLayers.fvg, layerOpacity.fvg);
            
            const line = candlestickSeriesRef.current.createPriceLine({
                price: (fvg.range[0] + fvg.range[1]) / 2, // Midpoint
                color: color,
                lineWidth: 1,
                lineStyle: LineStyle.Dashed,
                axisLabelVisible: false,
                title: `FVG`,
            });
            priceLinesRef.current.push(line);
        });
    }

  }, [data, layerVisibility, layerOpacity, currentTheme]);

  // Update Chart Data
  useEffect(() => {
    if (!candlestickSeriesRef.current) return;
    
    candlestickSeriesRef.current.setData(processedData.candles);
    
    // Merge historical signals + realtime user actions
    const allMarkers = [...processedData.markers, ...realtimeMarkersRef.current]
      .sort((a, b) => (a.time as number) - (b.time as number));
      
    if (seriesMarkersRef.current) {
      seriesMarkersRef.current.setMarkers(allMarkers);
    }
  }, [processedData]);

  return (
    <Card 
      className="p-0 border-slate-800 relative h-[600px] flex flex-col overflow-hidden group transition-colors duration-500"
      style={{ 
        background: SMC_THEMES[currentTheme].colors.backgroundGradient,
        borderColor: SMC_THEMES[currentTheme].colors.border
      }}
    >
      {/* Header - Simplified */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
         <Tabs value={timeframe} onValueChange={setTimeframe} className="w-auto">
            <TabsList className="bg-slate-950/80 border border-slate-800 backdrop-blur-md h-8">
              <TabsTrigger value="15m" className="text-[10px] h-6 px-2">15m</TabsTrigger>
              <TabsTrigger value="1h" className="text-[10px] h-6 px-2">1h</TabsTrigger>
              <TabsTrigger value="4h" className="text-[10px] h-6 px-2">4h</TabsTrigger>
              <TabsTrigger value="1d" className="text-[10px] h-6 px-2">1D</TabsTrigger>
            </TabsList>
         </Tabs>
         
         <Button 
             variant={showStats ? "secondary" : "ghost"} 
             size="icon" 
             className="h-8 w-8 bg-slate-950/80 border border-slate-800 backdrop-blur-md"
             onClick={() => setShowStats(!showStats)}
             title="Toggle Stats"
          >
             <BarChart3Icon className="h-4 w-4" />
          </Button>

         <Dialog>
            <DialogTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 bg-slate-950/80 border border-slate-800 backdrop-blur-md"
                    title="Performance Dashboard"
                >
                    <LineChart className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl bg-slate-950 border-slate-800 text-slate-200">
                <DialogHeader>
                    <DialogTitle>SMC Performance Metrics</DialogTitle>
                </DialogHeader>
                <SMCPerformanceStats data={data} />
            </DialogContent>
         </Dialog>
      </div>

      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <div className="flex gap-1 bg-slate-950/80 border border-slate-800 rounded-md p-1 backdrop-blur-md">
             <Button variant="ghost" size="sm" className="h-6 text-[10px] hover:text-green-500" onClick={() => handleTrade('BUY')}>
               <TrendingUpIcon className="w-3 h-3 mr-1" /> Buy
             </Button>
             <Button variant="ghost" size="sm" className="h-6 text-[10px] hover:text-red-500" onClick={() => handleTrade('SELL')}>
               <TrendingDownIcon className="w-3 h-3 mr-1" /> Sell
             </Button>
           </div>
      </div>

      {/* Main Chart Area */}
      <div className="flex-1 relative min-h-0 w-full" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div ref={chartContainerRef} className="w-full h-full" />
        
        {/* Smart Tooltip Overlay */}
        <AnimatePresence>
            {tooltipData && <SMCTooltip data={tooltipData} themeMode={currentTheme} />}
        </AnimatePresence>

        {/* Visual Zone Alerts */}
        <SMCVisualAlert alert={activeZoneAlert} />

        {/* Floating Controls */}
        <SMCFloatingControls 
            layerVisibility={layerVisibility}
            layerOpacity={layerOpacity}
            onToggleLayer={toggleLayer}
            onChangeOpacity={changeOpacity}
            analysisMode={analysisMode}
            onModeChange={setAnalysisMode}
            currentTheme={currentTheme}
            onThemeChange={setCurrentTheme}
            expanded={controlsExpanded}
            onToggleExpand={() => setControlsExpanded(!controlsExpanded)}
        />
        
        {/* Stats Overlay (Level 3 Hierarchy) */}
        <AnimatePresence>
        {showStats && stats && (
            <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={`absolute top-16 left-4 p-3 rounded-lg shadow-xl backdrop-blur-md z-10 w-48 pointer-events-none border ${
                    currentTheme === 'light_analyst' 
                    ? 'bg-white/80 border-slate-200' 
                    : 'bg-slate-950/80 border-slate-700/50'
                }`}
            >
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    <h4 className={`text-[10px] font-bold uppercase tracking-widest ${
                        currentTheme === 'light_analyst' ? 'text-slate-500' : 'text-slate-400'
                    }`}>Market State</h4>
                </div>
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <span className={`text-[11px] font-medium ${
                            currentTheme === 'light_analyst' ? 'text-slate-600' : 'text-slate-500'
                        }`}>Structure</span>
                        <Badge variant="outline" className={`text-[10px] h-5 px-1.5 ${stats.trend === 'bullish' ? 'text-green-400 border-green-900/50 bg-green-900/10' : stats.trend === 'bearish' ? 'text-red-400 border-red-900/50 bg-red-900/10' : 'text-slate-400'}`}>
                            {stats.trend.toUpperCase()}
                        </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className={`text-[11px] font-medium ${
                            currentTheme === 'light_analyst' ? 'text-slate-600' : 'text-slate-500'
                        }`}>Active Zones</span>
                        <div className="flex gap-1">
                            <span className="text-[10px] font-mono bg-slate-900 px-1 rounded text-purple-400" title="Order Blocks">{stats.activeOBs} OB</span>
                            <span className="text-[10px] font-mono bg-slate-900 px-1 rounded text-yellow-400" title="FVGs">{stats.activeFVGs} FVG</span>
                        </div>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className={`text-[11px] font-medium ${
                            currentTheme === 'light_analyst' ? 'text-slate-600' : 'text-slate-500'
                        }`}>Volatility</span>
                        <span className={`text-[11px] font-mono ${
                            currentTheme === 'light_analyst' ? 'text-slate-800' : 'text-slate-300'
                        }`}>{stats.volatility}</span>
                    </div>
                </div>
            </motion.div>
        )}
        </AnimatePresence>
        
        {/* Loading Overlay */}
        {isLoading && !data && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50 z-20 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-3">
                    <LoaderIcon className="w-8 h-8 animate-spin text-primary" />
                    <span className="text-xs text-slate-400 animate-pulse">Analyzing Market Structure...</span>
                </div>
            </div>
        )}
      </div>
    </Card>
  );
}
