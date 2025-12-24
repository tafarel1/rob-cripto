import { useState, useMemo, useEffect } from 'react';
import { Asset, AssetFilterState, AssetCategory, AssetStatus, SortConfig } from '@/types/assets';
import { arrayMove } from '@dnd-kit/sortable';

const GENERATE_COUNT = 495;

const CATEGORIES: AssetCategory[] = ['Crypto', 'Forex', 'Stock'];

// Mock Data Generator
const generateAssets = (): Asset[] => {
  return Array.from({ length: GENERATE_COUNT }, (_, i) => {
    const price = Math.random() * 50000 + 10;
    const change = (Math.random() * 20) - 10;
    const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    const status: AssetStatus = change > 5 ? 'High' : change < -5 ? 'Low' : 'Stable';
    
    return {
      id: `asset-${i}`,
      symbol: `B${i + 1}/USDT`,
      name: `Asset B${i + 1}`,
      price,
      change24h: change,
      volume: Math.random() * 1000000000,
      marketCap: Math.random() * 50000000000,
      category,
      status,
      isFavorite: Math.random() > 0.9,
      isAutoTrading: Math.random() > 0.95,
      chartData: Array.from({ length: 24 }, () => Math.random() * 100),
      listedDate: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
    };
  });
};

export function useAssetData() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<AssetFilterState>({
    search: '',
    category: 'All',
    status: 'All',
    volume: 'All',
    priceRange: [0, 100000],
    minVolume: 0,
    changeRange: [-100, 100],
    marketCap: 'All',
    listedAfter: null,
  });
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'volume', direction: 'desc' });
  const itemsPerPage = 20;

  useEffect(() => {
    // Simulate API call
    const loadData = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 800)); // Fake network delay
      const data = generateAssets();
      setAssets(data);
      setIsLoading(false);
    };
    loadData();
  }, []);

  const toggleFavorite = (id: string) => {
    setAssets(prev => prev.map(asset => 
      asset.id === id ? { ...asset, isFavorite: !asset.isFavorite } : asset
    ));
  };

  const toggleAutoTrade = (id: string, enabled: boolean) => {
    setAssets(prev => prev.map(asset => 
      asset.id === id ? { ...asset, isAutoTrading: enabled } : asset
    ));
  };

  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const matchesSearch = asset.symbol.toLowerCase().includes(filters.search.toLowerCase()) || 
                            asset.name.toLowerCase().includes(filters.search.toLowerCase());
      const matchesCategory = filters.category === 'All' || asset.category === filters.category;
      const matchesStatus = filters.status === 'All' || asset.status === filters.status;
      
      // Volume filter logic
      let matchesVolume = true;
      if (filters.volume === 'High') matchesVolume = asset.volume > 500000000;
      else if (filters.volume === 'Medium') matchesVolume = asset.volume > 100000000 && asset.volume <= 500000000;
      else if (filters.volume === 'Low') matchesVolume = asset.volume <= 100000000;
      
      // Advanced Filters
      const matchesPrice = asset.price >= filters.priceRange[0] && asset.price <= filters.priceRange[1];
      const matchesMinVolume = asset.volume >= filters.minVolume;
      const matchesChange = asset.change24h >= filters.changeRange[0] && asset.change24h <= filters.changeRange[1];
      
      let matchesMarketCap = true;
      if (filters.marketCap === 'Large') matchesMarketCap = asset.marketCap > 10000000000; // > 10B
      else if (filters.marketCap === 'Mid') matchesMarketCap = asset.marketCap > 1000000000 && asset.marketCap <= 10000000000; // 1B - 10B
      else if (filters.marketCap === 'Small') matchesMarketCap = asset.marketCap <= 1000000000; // < 1B
      
      const matchesListedDate = filters.listedAfter ? new Date(asset.listedDate) >= new Date(filters.listedAfter) : true;

      return matchesSearch && matchesCategory && matchesStatus && matchesVolume && 
             matchesPrice && matchesMinVolume && matchesChange && matchesMarketCap && matchesListedDate;
    });
  }, [assets, filters]);

  const sortedAssets = useMemo(() => {
    if (sortConfig.key === 'custom') {
      return filteredAssets;
    }
    return [...filteredAssets].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredAssets, sortConfig]);

  const paginatedAssets = useMemo(() => {
    return sortedAssets.slice(0, page * itemsPerPage);
  }, [sortedAssets, page]);

  const hasMore = paginatedAssets.length < sortedAssets.length;

  const loadMore = () => {
    if (hasMore) setPage(prev => prev + 1);
  };

  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem('assetSearchHistory');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('assetSearchHistory', JSON.stringify(searchHistory));
  }, [searchHistory]);

  const addToHistory = (term: string) => {
    if (!term.trim()) return;
    setSearchHistory(prev => {
      const newHistory = [term, ...prev.filter(t => t !== term)].slice(0, 5);
      return newHistory;
    });
  };

  const clearHistory = () => setSearchHistory([]);

  const reorderAssets = (activeId: string, overId: string) => {
    setAssets((items) => {
      const oldIndex = items.findIndex((item) => item.id === activeId);
      const newIndex = items.findIndex((item) => item.id === overId);
      return arrayMove(items, oldIndex, newIndex);
    });
    if (sortConfig.key !== 'custom') {
      setSortConfig({ key: 'custom', direction: 'asc' });
    }
  };

  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());

  // Simulate live price updates
  useEffect(() => {
    const interval = setInterval(() => {
      setAssets(prevAssets => {
        return prevAssets.map(asset => {
          if (Math.random() > 0.7) { // Only update 30% of assets each tick
            const volatility = Math.random() * 0.02 - 0.01; // +/- 1%
            const newPrice = asset.price * (1 + volatility);
            const newChange = asset.change24h + (volatility * 100);
            return {
              ...asset,
              price: newPrice,
              change24h: newChange
            };
          }
          return asset;
        });
      });
    }, 3000); // Update every 3 seconds

    return () => clearInterval(interval);
  }, []);

  const handleAssetSelection = (id: string, multi: boolean) => {
    setSelectedAssetIds(prev => {
      const newSet = new Set(multi ? prev : []);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const clearSelection = () => setSelectedAssetIds(new Set());

  return {
    paginatedAssets,
    allAssets: assets,
    totalCount: filteredAssets.length,
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
  };
}
