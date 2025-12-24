export type AssetCategory = 'Crypto' | 'Forex' | 'Stock';
export type AssetStatus = 'High' | 'Low' | 'Stable';

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number; // percentage
  volume: number;
  marketCap: number;
  category: AssetCategory;
  status: AssetStatus;
  isFavorite: boolean;
  isAutoTrading?: boolean;
  chartData: number[]; // Simple array for sparkline
  listedDate: string;
}

export interface AssetFilterState {
  search: string;
  category: AssetCategory | 'All';
  status: AssetStatus | 'All';
  volume: 'High' | 'Medium' | 'Low' | 'All';
  priceRange: [number, number];
  minVolume: number;
  changeRange: [number, number];
  marketCap: 'Large' | 'Mid' | 'Small' | 'All';
  listedAfter: string | null;
}

export type SortOption = 'price' | 'change24h' | 'volume' | 'marketCap' | 'name' | 'custom';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  key: SortOption;
  direction: SortDirection;
}

export type ViewMode = 'card' | 'list' | 'compact';
