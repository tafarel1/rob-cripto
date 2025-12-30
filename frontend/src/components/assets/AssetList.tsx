import React from 'react';
import { Asset, ViewMode } from '@/types/assets';
import { AssetCard, AssetCardProps } from './AssetCard';
import { Skeleton } from '@/components/ui/skeleton';
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface AssetListProps {
  assets: Asset[];
  isLoading: boolean;
  viewMode: ViewMode;
  onToggleFavorite: (_id: string) => void;
  onToggleAutoTrade?: (_id: string, _enabled: boolean) => void;
  selectedAssetIds: Set<string>;
  onSelectAsset: (_id: string, _multi: boolean) => void;
}

function SortableAsset({ asset, ...props }: AssetCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: asset.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none h-full">
      <AssetCard asset={asset} {...props} />
    </div>
  );
}

export function AssetList({ assets, isLoading, viewMode, onToggleFavorite, onToggleAutoTrade, selectedAssetIds, onSelectAsset }: AssetListProps) {
  if (isLoading) {
    return (
      <div className={`grid gap-4 ${
        viewMode === 'card' 
          ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
          : 'grid-cols-1'
      }`}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className={`rounded-lg ${viewMode === 'card' ? 'h-[200px]' : 'h-[80px]'}`} />
        ))}
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-4xl mb-4">🔍</div>
        <h3 className="text-lg font-medium">No assets found</h3>
        <p className="text-muted-foreground">Try adjusting your search or filters.</p>
      </div>
    );
  }

  return (
    <SortableContext
      items={assets.map(a => a.id)}
      strategy={viewMode === 'card' ? rectSortingStrategy : verticalListSortingStrategy}
    >
      <div className={`grid gap-4 ${
        viewMode === 'card' 
          ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
          : 'grid-cols-1'
      }`}>
        {assets.map((asset) => (
          <SortableAsset 
            key={asset.id} 
            asset={asset} 
            viewMode={viewMode}
            onToggleFavorite={onToggleFavorite}
            onToggleAutoTrade={onToggleAutoTrade}
            isSelected={selectedAssetIds.has(asset.id)}
            onSelect={onSelectAsset}
          />
        ))}
      </div>
    </SortableContext>
  );
}
