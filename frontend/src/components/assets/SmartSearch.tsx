import React, { useState, useEffect, useRef } from 'react';
import { SearchIcon, XIcon, TrendingUpIcon, HistoryIcon } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Asset } from '@/types/assets';
import { cn } from '@/lib/utils';

export interface SmartSearchProps {
  value: string;
  onChange: (_value: string) => void;
  onSearch: (_value: string) => void;
  allAssets: Asset[];
  searchHistory: string[];
  onClearHistory: () => void;
}

export default function SmartSearch({ 
  value, 
  onChange, 
  onSearch, 
  allAssets, 
  searchHistory, 
  onClearHistory 
}: SmartSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Asset[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (value.trim().length > 0) {
      const filtered = allAssets
        .filter(asset => 
          asset.symbol.toLowerCase().includes(value.toLowerCase()) || 
          asset.name.toLowerCase().includes(value.toLowerCase())
        )
        .slice(0, 5);
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  }, [value, allAssets]);

  const handleSelect = (term: string) => {
    onChange(term);
    onSearch(term);
    setIsOpen(false);
  };

  const showHistory = value.length === 0 && searchHistory.length > 0;
  const showSuggestions = value.length > 0 && suggestions.length > 0;

  return (
    <div className="relative w-full md:w-96" ref={wrapperRef}>
      <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input 
        placeholder="Search assets (e.g., BTC, Apple, EUR)..." 
        className="pl-9 bg-background"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onSearch(value);
            setIsOpen(false);
          }
        }}
      />
      {value && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="absolute right-1 top-1 h-7 w-7 p-0"
          onClick={() => {
            onChange('');
            setIsOpen(true);
          }}
        >
          <XIcon className="h-4 w-4" />
        </Button>
      )}

      {isOpen && (showHistory || showSuggestions) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          
          {/* History Section */}
          {showHistory && (
            <div className="p-2">
              <div className="flex items-center justify-between px-2 py-1.5 text-xs font-medium text-muted-foreground">
                <span className="flex items-center gap-1"><HistoryIcon className="w-3 h-3" /> Recent Searches</span>
                <button 
                  onClick={onClearHistory}
                  className="hover:text-foreground transition-colors"
                >
                  Clear
                </button>
              </div>
              {searchHistory.map((term, i) => (
                <div 
                  key={i}
                  className="flex items-center px-2 py-2 text-sm rounded-sm hover:bg-accent cursor-pointer"
                  onClick={() => handleSelect(term)}
                >
                  {term}
                </div>
              ))}
            </div>
          )}

          {/* Suggestions Section */}
          {showSuggestions && (
            <div className="p-2">
               <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                <span className="flex items-center gap-1"><TrendingUpIcon className="w-3 h-3" /> Suggestions</span>
              </div>
              {suggestions.map((asset) => (
                <div 
                  key={asset.id}
                  className="flex items-center justify-between px-2 py-2 text-sm rounded-sm hover:bg-accent cursor-pointer"
                  onClick={() => handleSelect(asset.symbol)}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{asset.symbol}</span>
                    <span className="text-xs text-muted-foreground">{asset.name}</span>
                  </div>
                  <span className={cn(
                    "text-xs font-medium",
                    asset.change24h >= 0 ? "text-emerald-500" : "text-rose-500"
                  )}>
                    {asset.change24h > 0 ? '+' : ''}{asset.change24h.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
