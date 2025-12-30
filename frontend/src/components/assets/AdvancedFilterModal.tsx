import React from 'react';
import { XIcon } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AssetFilterState } from '@/types/assets';

interface AdvancedFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: AssetFilterState;
  onFilterChange: (_filters: AssetFilterState) => void;
}

export default function AdvancedFilterModal({ isOpen, onClose, filters, onFilterChange }: AdvancedFilterModalProps) {
  // Let's use local state to avoid re-renders while typing in modal.
  const [localFilters, setLocalFilters] = React.useState<AssetFilterState>(filters);

  React.useEffect(() => {
    if (isOpen) {
      setLocalFilters(filters);
    }
  }, [filters, isOpen]);

  if (!isOpen) return null;

  const handleApply = () => {
    onFilterChange(localFilters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters: AssetFilterState = {
      ...filters,
      priceRange: [0, 100000],
      minVolume: 0,
      changeRange: [-100, 100],
      marketCap: 'All',
      listedAfter: null,
    };
    setLocalFilters(resetFilters);
    // Optional: Auto apply on reset? No, let user confirm.
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Advanced Filters</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <XIcon className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid gap-6 py-4">
          {/* Price Range */}
          <div className="grid gap-2">
            <Label>Price Range ($)</Label>
            <div className="flex items-center gap-2">
              <Input 
                type="number" 
                placeholder="Min" 
                value={localFilters.priceRange[0]} 
                onChange={(e) => setLocalFilters({...localFilters, priceRange: [Number(e.target.value), localFilters.priceRange[1]]})}
              />
              <span className="text-muted-foreground">-</span>
              <Input 
                type="number" 
                placeholder="Max" 
                value={localFilters.priceRange[1]} 
                onChange={(e) => setLocalFilters({...localFilters, priceRange: [localFilters.priceRange[0], Number(e.target.value)]})}
              />
            </div>
          </div>

          {/* Change % Range */}
          <div className="grid gap-2">
            <Label>24h Change (%)</Label>
            <div className="flex items-center gap-2">
              <Input 
                type="number" 
                placeholder="Min %" 
                value={localFilters.changeRange[0]} 
                onChange={(e) => setLocalFilters({...localFilters, changeRange: [Number(e.target.value), localFilters.changeRange[1]]})}
              />
              <span className="text-muted-foreground">-</span>
              <Input 
                type="number" 
                placeholder="Max %" 
                value={localFilters.changeRange[1]} 
                onChange={(e) => setLocalFilters({...localFilters, changeRange: [localFilters.changeRange[0], Number(e.target.value)]})}
              />
            </div>
          </div>

          {/* Min Volume & Market Cap */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Min Volume ($)</Label>
              <Input 
                type="number" 
                placeholder="0" 
                value={localFilters.minVolume} 
                onChange={(e) => setLocalFilters({...localFilters, minVolume: Number(e.target.value)})}
              />
            </div>
            <div className="grid gap-2">
              <Label>Market Cap</Label>
              <Select 
                value={localFilters.marketCap} 
                onValueChange={(v: 'Large' | 'Mid' | 'Small' | 'All') => setLocalFilters({...localFilters, marketCap: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">Any</SelectItem>
                  <SelectItem value="Large">Large Cap (&gt;10B)</SelectItem>
                  <SelectItem value="Mid">Mid Cap (1B-10B)</SelectItem>
                  <SelectItem value="Small">Small Cap (&lt;1B)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Listed After */}
          <div className="grid gap-2">
            <Label>Listed After</Label>
            <Input 
              type="date" 
              value={localFilters.listedAfter || ''} 
              onChange={(e) => setLocalFilters({...localFilters, listedAfter: e.target.value || null})}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
          <Button onClick={handleApply}>
            Apply Filters
          </Button>
        </div>
      </div>
    </div>
  );
}
