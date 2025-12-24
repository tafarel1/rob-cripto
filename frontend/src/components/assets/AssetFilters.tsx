import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FilterIcon, GridIcon, ListIcon, AlignJustifyIcon, SortIcon, DownloadIcon, SlidersIcon } from '@/components/ui/icons';
import { Asset, AssetFilterState, ViewMode, AssetCategory, AssetStatus, SortConfig, SortOption } from '@/types/assets';
import AdvancedFilterModal from './AdvancedFilterModal';
import SmartSearch from './SmartSearch';

interface AssetFiltersProps {
  filters: AssetFilterState;
  onFilterChange: (_filters: AssetFilterState) => void;
  viewMode: ViewMode;
  onViewModeChange: (_mode: ViewMode) => void;
  sortConfig: SortConfig;
  onSortChange: (_config: SortConfig) => void;
  totalCount: number;
  allAssets?: Asset[];
  searchHistory?: string[];
  onSearch?: (_term: string) => void;
  onClearHistory?: () => void;
}

export function AssetFilters({ 
  filters, 
  onFilterChange, 
  viewMode, 
  onViewModeChange, 
  sortConfig, 
  onSortChange, 
  totalCount,
  allAssets = [],
  searchHistory = [],
  onSearch = () => {},
  onClearHistory = () => {}
}: AssetFiltersProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  
  const handleCategoryChange = (category: AssetCategory | 'All') => {
    onFilterChange({ ...filters, category });
  };

  const handleStatusChange = (status: AssetStatus | 'All') => {
    onFilterChange({ ...filters, status });
  };
  
  const handleSortChange = (key: SortOption) => {
     if (sortConfig.key === key) {
       onSortChange({ key, direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' });
     } else {
       onSortChange({ key, direction: 'desc' });
     }
  };

  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
        {/* Search */}
        <SmartSearch 
          value={filters.search}
          onChange={(v) => onFilterChange({ ...filters, search: v })}
          onSearch={onSearch}
          allAssets={allAssets}
          searchHistory={searchHistory}
          onClearHistory={onClearHistory}
        />

        {/* View Toggles & Actions */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
           {/* Sort Dropdown */}
           <Select 
             value={sortConfig.key} 
             onValueChange={(v) => handleSortChange(v as SortOption)}
           >
             <SelectTrigger className="h-9 w-[160px]">
                <SortIcon className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Sort by" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="volume">Volume</SelectItem>
               <SelectItem value="price">Price</SelectItem>
               <SelectItem value="change24h">24h Change</SelectItem>
               <SelectItem value="marketCap">Market Cap</SelectItem>
               <SelectItem value="name">Name</SelectItem>
             </SelectContent>
           </Select>

           <div className="flex items-center border rounded-md p-1 bg-background">
             <Button 
               variant={viewMode === 'card' ? 'secondary' : 'ghost'} 
               size="sm" 
               className="h-7 w-7 p-0"
               onClick={() => onViewModeChange('card')}
               title="Card View"
             >
               <GridIcon className="h-4 w-4" />
             </Button>
             <Button 
               variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
               size="sm" 
               className="h-7 w-7 p-0"
               onClick={() => onViewModeChange('list')}
               title="List View"
             >
               <ListIcon className="h-4 w-4" />
             </Button>
             <Button 
               variant={viewMode === 'compact' ? 'secondary' : 'ghost'} 
               size="sm" 
               className="h-7 w-7 p-0"
               onClick={() => onViewModeChange('compact')}
               title="Compact View"
             >
               <AlignJustifyIcon className="h-4 w-4" />
             </Button>
           </div>
           
           <Button variant="outline" size="sm" className="gap-2 hidden sm:flex">
             <DownloadIcon className="w-4 h-4" /> Export
           </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between p-3 bg-card rounded-lg border shadow-sm">
         <div className="flex flex-wrap items-center gap-2">
           <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mr-2">
             <FilterIcon className="w-3 h-3" /> Filters:
           </div>
           
           <Select value={filters.category} onValueChange={(v) => handleCategoryChange(v as AssetCategory)}>
             <SelectTrigger className="h-8 w-[130px] text-xs">
               <SelectValue placeholder="Category" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="All">All Categories</SelectItem>
               <SelectItem value="Crypto">Crypto</SelectItem>
               <SelectItem value="Forex">Forex</SelectItem>
               <SelectItem value="Stock">Stocks</SelectItem>
             </SelectContent>
           </Select>

           <Select value={filters.status} onValueChange={(v) => handleStatusChange(v as AssetStatus)}>
             <SelectTrigger className="h-8 w-[130px] text-xs">
               <SelectValue placeholder="Status" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="All">All Status</SelectItem>
               <SelectItem value="High">High Volatility</SelectItem>
               <SelectItem value="Low">Low Volatility</SelectItem>
               <SelectItem value="Stable">Stable</SelectItem>
             </SelectContent>
           </Select>

           <Select value={filters.volume} onValueChange={(v) => onFilterChange({ ...filters, volume: v as 'All' | 'High' | 'Medium' | 'Low' })}>
             <SelectTrigger className="h-8 w-[130px] text-xs">
               <SelectValue placeholder="Volume" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="All">All Volume</SelectItem>
               <SelectItem value="High">High Volume</SelectItem>
               <SelectItem value="Medium">Medium Volume</SelectItem>
               <SelectItem value="Low">Low Volume</SelectItem>
             </SelectContent>
           </Select>
           
           {/* Active Filter Badges */}
           {(filters.category !== 'All' || filters.status !== 'All' || filters.volume !== 'All') && (
             <Button 
               variant="ghost" 
               size="sm" 
               className="h-8 text-xs text-muted-foreground hover:text-foreground"
               onClick={() => onFilterChange({ ...filters, category: 'All', status: 'All', volume: 'All' })}
             >
               Clear All
             </Button>
           )}
         </div>

         <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 text-xs gap-2 ml-auto sm:ml-0"
              onClick={() => setIsAdvancedOpen(true)}
            >
               <SlidersIcon className="w-3 h-3" /> Advanced
            </Button>
            <div className="text-xs text-muted-foreground whitespace-nowrap hidden sm:block">
              Showing <span className="font-medium text-foreground">{totalCount}</span> assets
            </div>
         </div>
      </div>

      <AdvancedFilterModal 
        isOpen={isAdvancedOpen} 
        onClose={() => setIsAdvancedOpen(false)} 
        filters={filters} 
        onFilterChange={onFilterChange} 
      />
    </div>
  );
}
