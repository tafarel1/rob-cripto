import React from 'react';
import { cn } from '@/lib/utils';
import { useUX, FocusZone } from '@/contexts/UXContext';

interface UnifiedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: 'flat' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
  zone?: FocusZone; // If this card belongs to a specific focus zone
}

export function UnifiedCard({ 
  children, 
  className, 
  elevation = 'sm',
  interactive = false,
  zone,
  ...props 
}: UnifiedCardProps) {
  const { focusZone, isFocusMode } = useUX();

  // Focus Logic
  const isDimmed = isFocusMode && zone && focusZone !== zone;
  const isHighlighted = isFocusMode && zone && focusZone === zone;

  const elevationClasses = {
    flat: 'border bg-card shadow-none',
    sm: 'border bg-card shadow-sm',
    md: 'border bg-card shadow-md',
    lg: 'border bg-card shadow-lg',
  };

  return (
    <div
      className={cn(
        // Base Layout
        "rounded-lg transition-all duration-300 ease-in-out relative overflow-hidden",
        
        // Elevation & Colors
        elevationClasses[elevation],
        "text-card-foreground",
        
        // Interactivity
        interactive && "hover:border-primary/50 hover:shadow-md cursor-pointer active:scale-[0.99]",
        
        // Focus Zones Effects
        isDimmed && "opacity-40 grayscale-[0.5] blur-[0.5px] scale-[0.99]",
        isHighlighted && "ring-2 ring-primary ring-offset-2 ring-offset-background z-10 scale-[1.005] shadow-xl",

        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function UnifiedCardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { density } = useUX();
  const paddingMap = {
    high: 'px-3 py-2 min-h-[32px]',
    balanced: 'px-4 py-3 min-h-[40px]',
    low: 'px-6 py-4 min-h-[48px]'
  };
  return <div className={cn("border-b flex items-center justify-between bg-muted/5", paddingMap[density], className)} {...props}>{children}</div>;
}

export function UnifiedCardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  const { density } = useUX();
  const sizeMap = {
    high: 'text-xs',
    balanced: 'text-sm',
    low: 'text-base'
  };
  return <h3 className={cn("font-semibold tracking-tight text-foreground", sizeMap[density], className)} {...props}>{children}</h3>;
}

export function UnifiedCardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { density } = useUX();
  
  const paddingMap = {
    high: 'p-2',
    balanced: 'p-4',
    low: 'p-6'
  };

  return <div className={cn(paddingMap[density], className)} {...props}>{children}</div>;
}
