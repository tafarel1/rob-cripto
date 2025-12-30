import React, { useState } from 'react';
import { useAssetData } from './useAssetData';
import { AssetFilters } from './AssetFilters';
import { AssetList } from './AssetList';
import { Button } from '@/components/ui/button';
import { LoaderIcon, XIcon, BarChartIcon, ListPlusIcon } from '@/components/ui/icons';
import { ViewMode } from '@/types/assets';
import { useDashboard } from '@/contexts/DashboardContext';
import { toast } from 'sonner';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  closestCenter,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core';
import { AssetCard } from './AssetCard';

function WatchlistDropZone({ isDragging }: { isDragging: boolean }) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'watchlist-zone',
  });

  if (!isDragging) return null;

  return (
    <div
      ref={setNodeRef}
      className={`fixed right-6 top-1/2 transform -translate-y-1/2 w-64 h-96 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all duration-300 z-40 ${
        isOver 
          ? 'bg-primary/10 border-primary scale-105 shadow-xl' 
          : 'bg-background/80 backdrop-blur-sm border-muted-foreground/30'
      }`}
    >
      <ListPlusIcon className={`w-12 h-12 mb-4 ${isOver ? 'text-primary' : 'text-muted-foreground'}`} />
      <h3 className="font-semibold text-lg">Drop to Watchlist</h3>
      <p className="text-sm text-muted-foreground text-center px-4">
        Drag assets here to add them to your watchlist
      </p>
    </div>
  );
}

export default function AssetDashboard({ headless = false }: { headless?: boolean }) {
  const { 
    paginatedAssets, 
    allAssets,
    totalCount, 
    isLoading, 
    filters, 
    setFilters, 
    sortConfig,
    setSortConfig,
    loadMore, 
    hasMore, 
    toggleFavorite,
    searchHistory,
    addToHistory,
    clearHistory,
    selectedAssetIds,
    handleAssetSelection,
    clearSelection,
    reorderAssets,
    toggleAutoTrade
  } = useAssetData();

  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const { setSymbol, setMode } = useDashboard();

  // Handle asset selection for both local view and global context
  const onAssetSelect = (id: string, multi: boolean) => {
    handleAssetSelection(id, multi);
    
    if (!multi) {
      const asset = allAssets.find(a => a.id === id);
      if (asset) {
        setSymbol(asset.symbol);
        // Optional: Notify user or provide quick action
        toast.info(`Selected ${asset.symbol}`, {
          description: "Click 'SMC Analysis' to view charts",
          action: {
            label: "Analyze",
            onClick: () => setMode('smc')
          }
        });
      }
    }
  };

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

    if (over.id === 'watchlist-zone') {
      handleAssetSelection(active.id as string, true);
    } else if (active.id !== over.id) {
      reorderAssets(active.id as string, over.id as string);
    }
    
    setActiveId(null);
  }

  const activeAsset = activeId ? allAssets.find(a => a.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={`flex flex-col min-h-[calc(100vh-4rem)] ${headless ? 'space-y-4' : 'p-4 md:p-6 space-y-6'} relative`}>
        {!headless && (
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Market Assets</h1>
            <p className="text-muted-foreground">
              Real-time intelligent asset tracking and analysis.
            </p>
          </div>
        )}

        <AssetFilters 
          filters={filters} 
          onFilterChange={setFilters}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          sortConfig={sortConfig}
          onSortChange={setSortConfig}
          totalCount={totalCount}
          allAssets={allAssets}
          searchHistory={searchHistory}
          onSearch={addToHistory}
          onClearHistory={clearHistory}
        />

        <AssetList 
          assets={paginatedAssets} 
          isLoading={isLoading && paginatedAssets.length === 0}
          viewMode={viewMode}
          onToggleFavorite={toggleFavorite}
          onToggleAutoTrade={toggleAutoTrade}
          selectedAssetIds={selectedAssetIds}
          onSelectAsset={onAssetSelect}
          // sortConfig={sortConfig} // AssetList doesn't support this yet
          // onSortChange={setSortConfig} // AssetList doesn't support this yet
        />

        <WatchlistDropZone isDragging={!!activeId} />

        {selectedAssetIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-popover border shadow-lg rounded-full px-6 py-3 flex items-center gap-4 z-50 animate-in slide-in-from-bottom-5">
             <span className="text-sm font-medium">{selectedAssetIds.size} selected</span>
             <div className="h-4 w-px bg-border" />
             <Button size="sm" variant="ghost" className="gap-2 text-xs">
                <BarChartIcon className="w-4 h-4" /> Compare
             </Button>
             <Button size="sm" variant="ghost" className="gap-2 text-xs">
                <ListPlusIcon className="w-4 h-4" /> Add to Watchlist
             </Button>
             <div className="h-4 w-px bg-border" />
             <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full" onClick={clearSelection}>
                <XIcon className="w-4 h-4" />
             </Button>
          </div>
        )}

        {hasMore && !isLoading && (
          <div className="flex justify-center pt-8 pb-4">
            <Button variant="secondary" onClick={loadMore} className="min-w-[200px]">
              Load More Assets
            </Button>
          </div>
        )}
        
        {isLoading && paginatedAssets.length > 0 && (
           <div className="flex justify-center py-4">
              <LoaderIcon className="w-6 h-6 animate-spin text-primary" />
           </div>
        )}

        <DragOverlay>
           {activeId && activeAsset ? (
              <div className="opacity-90 cursor-grabbing w-[300px]">
                <AssetCard 
                   asset={activeAsset} 
                   viewMode="card"
                   onToggleFavorite={() => {}}
                   isSelected={selectedAssetIds.has(activeId)}
                   onSelect={() => {}}
                />
              </div>
           ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
