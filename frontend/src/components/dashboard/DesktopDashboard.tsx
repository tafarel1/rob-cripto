import React, { useState, useCallback, lazy, Suspense } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3Icon, 
  ActivityIcon, 
  TrendingUpIcon, 
  DollarIcon, 
  MoveIcon,
  MaximizeIcon,
  XIcon
} from '@/components/ui/icons';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSocket, EngineStatusEvent, BalanceEvent, PositionsEvent } from '@/hooks/useSocket';
import { Position, DashboardItem } from '@/types/dashboard';

// Lazy Loaded Widgets
const ChartWidget = lazy(() => import('./widgets/ChartWidget'));
const OrderBookWidget = lazy(() => import('./widgets/OrderBookWidget'));
const PositionsWidget = lazy(() => import('./widgets/PositionsWidget'));
const StatsWidget = lazy(() => import('./widgets/StatsWidget'));
const LivePriceTicker = lazy(() => import('./LivePriceTicker').then(module => ({ default: module.LivePriceTicker })));

const WidgetLoading = () => <Skeleton className="w-full h-full min-h-[100px] bg-muted/50" />;

// Draggable Sortable Item Wrapper
function SortableItem({ id, children, title, icon, className, onRemove }: { id: string, children: React.ReactNode, title: string, icon: React.ReactNode, className?: string, onRemove?: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={`h-full ${className}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      layout
    >
      <Card className={`h-full flex flex-col overflow-hidden transition-all duration-300 ${isDragging ? 'opacity-50 shadow-xl ring-2 ring-primary/20' : 'hover:shadow-lg hover:ring-1 hover:ring-primary/10'}`}>
        <WidgetHeader title={title} icon={icon} dragHandleProps={{ ...attributes, ...listeners }} onRemove={onRemove} />
        <CardContent className="p-0 flex-1 overflow-auto">
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Header Component for Widgets
const WidgetHeader = ({ title, icon, dragHandleProps, onRemove }: { title: string, icon: React.ReactNode, dragHandleProps: React.HTMLAttributes<HTMLButtonElement>, onRemove?: () => void }) => (
  <div className="flex items-center justify-between px-4 py-2 border-b bg-card/50 backdrop-blur-sm group">
    <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80 group-hover:text-primary transition-colors">
      {icon}
      {title}
    </div>
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <Button variant="ghost" size="icon" className="h-6 w-6 cursor-grab active:cursor-grabbing hover:bg-muted" {...dragHandleProps}>
        <MoveIcon className="h-3 w-3" />
      </Button>
      <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-muted">
        <MaximizeIcon className="h-3 w-3" />
      </Button>
      {onRemove && (
        <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive" onClick={onRemove}>
          <XIcon className="h-3 w-3" />
        </Button>
      )}
    </div>
  </div>
);

const AVAILABLE_PAIRS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'BNB/USDT', 'ADA/USDT', 'DOGE/USDT', 'MATIC/USDT'];

export default function DesktopDashboard() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [items, setItems] = useState<DashboardItem[]>([
    { id: 'ticker-BTC/USDT', title: 'Bitcoin (BTC)', icon: <TrendingUpIcon className="w-4 h-4" />, colSpan: 'md:col-span-1 md:row-span-1' },
    { id: 'ticker-ETH/USDT', title: 'Ethereum (ETH)', icon: <TrendingUpIcon className="w-4 h-4" />, colSpan: 'md:col-span-1 md:row-span-1' },
    { id: 'stats', title: 'Estatísticas da Conta', icon: <BarChart3Icon className="w-4 h-4" />, colSpan: 'md:col-span-1 md:row-span-1' },
    { id: 'chart', title: 'Gráfico Principal', icon: <ActivityIcon className="w-4 h-4" />, colSpan: 'md:col-span-2 md:row-span-2' },
    { id: 'orderbook', title: 'Livro de Ofertas', icon: <ActivityIcon className="w-4 h-4" />, colSpan: 'md:col-span-1 md:row-span-2' },
    { id: 'positions', title: 'Posições Abertas', icon: <DollarIcon className="w-4 h-4" />, colSpan: 'md:col-span-3 md:row-span-1' },
  ]);

  // Real-time Data State
  const [positions, setPositions] = useState<Position[]>([]);
  const [balance, setBalance] = useState<BalanceEvent['data'] | null>(null);
  const [engineStatus, setEngineStatus] = useState<EngineStatusEvent | null>(null);

  const handleEngineStatus = useCallback((status: EngineStatusEvent) => {
    setEngineStatus(status);
  }, []);

  const handleBalance = useCallback((bal: BalanceEvent) => {
    if (bal.success && bal.data) setBalance(bal.data);
  }, []);

  const handlePositions = useCallback((pos: PositionsEvent) => {
    if (pos.success && Array.isArray(pos.data)) setPositions(pos.data as Position[]);
  }, []);

  useSocket(
    handleEngineStatus,
    undefined, // Trade Executed
    handleBalance,
    handlePositions
  );

  const handleAddTicker = (pair: string) => {
    const id = `ticker-${pair}`;
    if (items.some(item => item.id === id)) return;

    const newItem: DashboardItem = {
      id,
      title: `${pair.split('/')[0]} Ticker`,
      icon: <TrendingUpIcon className="w-4 h-4" />,
      colSpan: 'md:col-span-1 md:row-span-1'
    };
    setItems(prev => [newItem, ...prev]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const renderWidget = (id: string) => {
    if (id.startsWith('ticker-')) {
      const symbol = id.replace('ticker-', '');
      return <LivePriceTicker symbol={symbol} />;
    }

    return (
      <Suspense fallback={<WidgetLoading />}>
        {(() => {
          switch(id) {
            case 'chart': return <ChartWidget />;
            case 'orderbook': return <OrderBookWidget />;
            case 'positions': return <PositionsWidget positions={positions} />;
            case 'stats': return <StatsWidget balance={balance} engineStatus={engineStatus} />;
            default: return null;
          }
        })()}
      </Suspense>
    );
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
    setActiveId(null);
  }

  const activeItem = items.find(i => i.id === activeId);

  return (
    <div className="p-4 h-[calc(100vh-4rem)] overflow-hidden bg-background flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold tracking-tight">Pro Dashboard</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden md:inline">Layout Personalizável</span>
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" title="Conectado ao WebSocket" />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Select onValueChange={handleAddTicker}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Adicionar Ticker" />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_PAIRS.map(pair => (
                <SelectItem key={pair} value={pair}>
                  {pair}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-20 pr-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={items.map(i => i.id)}
            strategy={rectSortingStrategy}
          >
            <motion.div layout className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-20">
              <AnimatePresence>
                {items.map((item) => (
                  <SortableItem 
                    key={item.id} 
                    id={item.id} 
                    title={item.title} 
                    icon={item.icon}
                    className={item.colSpan}
                    onRemove={item.id.startsWith('ticker-') ? () => handleRemoveItem(item.id) : undefined}
                  >
                    {renderWidget(item.id)}
                  </SortableItem>
                ))}
              </AnimatePresence>
            </motion.div>
          </SortableContext>

          <DragOverlay>
            {activeId && activeItem ? (
               <Card className="h-full flex flex-col overflow-hidden border-2 border-primary shadow-xl cursor-grabbing opacity-90">
                  <WidgetHeader title={activeItem.title} icon={activeItem.icon} dragHandleProps={{}} />
                  <CardContent className="p-0 flex-1 overflow-auto bg-background">
                    {renderWidget(activeItem.id)}
                  </CardContent>
               </Card>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
