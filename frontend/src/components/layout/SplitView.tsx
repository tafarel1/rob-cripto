import React from 'react';
import { cn } from '@/lib/utils';

interface SplitViewProps {
  left: React.ReactNode;
  right: React.ReactNode;
  className?: string;
  ratio?: '50-50' | '70-30' | '30-70';
}

export default function SplitView({ 
  left, 
  right, 
  className,
  ratio = '50-50' 
}: SplitViewProps) {
  const getGridCols = () => {
    switch (ratio) {
      case '70-30': return 'md:grid-cols-[70%_30%]';
      case '30-70': return 'md:grid-cols-[30%_70%]';
      default: return 'md:grid-cols-2';
    }
  };

  return (
    <div className={cn('grid grid-cols-1 gap-4 h-full', getGridCols(), className)}>
      <div className="w-full h-full overflow-auto min-h-[300px]">
        {left}
      </div>
      <div className="w-full h-full overflow-auto min-h-[300px] border-t md:border-t-0 md:border-l border-border pl-0 md:pl-4 pt-4 md:pt-0">
        {right}
      </div>
    </div>
  );
}
