import React, { useEffect, useState } from 'react';
import { CheckIcon, XIcon, LoaderIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

interface FeedbackProps {
  className?: string;
  size?: number;
}

export const SuccessCheckmark = ({ className, size = 24 }: FeedbackProps) => {
  return (
    <div className={cn("rounded-full bg-success-100 p-1 inline-flex items-center justify-center", className)}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="3" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className="text-success-600 animate-checkmark"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>
  );
};

export const ErrorShake = ({ children, className, trigger }: { children: React.ReactNode, className?: string, trigger?: boolean }) => {
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    if (trigger) {
      setShaking(true);
      const timer = setTimeout(() => setShaking(false), 300);
      return () => clearTimeout(timer);
    }
  }, [trigger]);

  return (
    <div className={cn(shaking && "animate-shake", className)}>
      {children}
    </div>
  );
};

export const LoadingSpinner = ({ className, size = 24 }: FeedbackProps) => {
  return (
    <LoaderIcon className={cn("animate-spin text-primary", className)} size={size} />
  );
};

export const StatusBadge = ({ status, text }: { status: 'success' | 'error' | 'loading' | 'idle', text?: string }) => {
  if (status === 'idle') return null;
  
  return (
    <div className={cn(
      "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border transition-all duration-300",
      status === 'success' && "bg-success-50 text-success-700 border-success-200",
      status === 'error' && "bg-danger-50 text-danger-700 border-danger-200",
      status === 'loading' && "bg-blue-50 text-blue-700 border-blue-200"
    )}>
      {status === 'success' && <SuccessCheckmark size={14} className="p-0 bg-transparent" />}
      {status === 'error' && <XIcon size={14} />}
      {status === 'loading' && <LoaderIcon size={14} className="animate-spin" />}
      {text}
    </div>
  );
};
