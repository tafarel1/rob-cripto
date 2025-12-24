import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type DensityLevel = 'high' | 'balanced' | 'low';
export type ExpertiseLevel = 'beginner' | 'trader' | 'pro';
export type FocusZone = 'chart' | 'actions' | 'monitoring' | null;

interface UXContextType {
  density: DensityLevel;
  setDensity: (level: DensityLevel) => void;
  expertise: ExpertiseLevel;
  setExpertise: (level: ExpertiseLevel) => void;
  focusZone: FocusZone;
  setFocusZone: (zone: FocusZone) => void;
  isFocusMode: boolean; // Derived helper
  
  // Helpers for responsive values based on density
  getSpacing: (base: number) => string;
  getFontSize: (scale: 'sm' | 'base' | 'lg') => string;
}

const UXContext = createContext<UXContextType | undefined>(undefined);

export function UXProvider({ children }: { children: ReactNode }) {
  const [density, setDensity] = useState<DensityLevel>('balanced');
  const [expertise, setExpertise] = useState<ExpertiseLevel>('trader');
  const [focusZone, setFocusZone] = useState<FocusZone>(null);

  // Keyboard Shortcuts for Focus Zones
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+1: Actions, Alt+2: Chart, Alt+3: Monitoring, Esc: Clear
      if (e.altKey) {
        switch (e.key) {
          case '1': 
            e.preventDefault();
            setFocusZone('actions'); 
            break;
          case '2': 
            e.preventDefault();
            setFocusZone('chart'); 
            break;
          case '3': 
            e.preventDefault();
            setFocusZone('monitoring'); 
            break;
        }
      }
      if (e.key === 'Escape') {
        setFocusZone(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getSpacing = (base: number) => {
    const multipliers = { high: 0.75, balanced: 1, low: 1.25 };
    return `${base * 0.25 * multipliers[density]}rem`;
  };

  const getFontSize = (scale: 'sm' | 'base' | 'lg') => {
    // Could adjust font size slightly based on density if needed
    return `text-${scale}`; 
  };

  const value = {
    density,
    setDensity,
    expertise,
    setExpertise,
    focusZone,
    setFocusZone,
    isFocusMode: focusZone !== null,
    getSpacing,
    getFontSize,
  };

  return <UXContext.Provider value={value}>{children}</UXContext.Provider>;
}

export const useUX = () => {
  const context = useContext(UXContext);
  if (!context) {
    throw new Error('useUX must be used within a UXProvider');
  }
  return context;
};
