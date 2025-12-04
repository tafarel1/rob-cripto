import { describe, it, expect, beforeEach } from 'vitest';
import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { useTheme } from './useTheme';

function delay(ms = 0) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('useTheme', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('light', 'dark');
    localStorage.clear();
    if (typeof window.matchMedia !== 'function') {
      // @ts-expect-error jsdom stub
      window.matchMedia = () => ({ matches: false, addEventListener: () => {}, addListener: () => {}, removeListener: () => {} });
    }
  });

  it('inicializa com tema salvo no localStorage', async () => {
    localStorage.setItem('theme', 'dark');

    function Harness() {
      useTheme();
      return null;
    }

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    root.render(React.createElement(Harness));
    await delay(50);

    expect(document.documentElement.classList.contains('dark')).toBe(true);

    root.unmount();
  });

  it('alternar tema atualiza classe e localStorage', async () => {
    let api: { isDark: boolean; toggle: () => void } | null = null;
    function Harness() {
      const { isDark, toggleTheme } = useTheme();
      useEffect(() => {
        api = { isDark, toggle: toggleTheme };
      });
      return null;
    }

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    root.render(React.createElement(Harness));
    await delay(50);

    api?.toggle();
    await delay();

    const stored = localStorage.getItem('theme');
    expect(stored === 'dark' || stored === 'light').toBe(true);
    expect(
      document.documentElement.classList.contains(stored === 'dark' ? 'dark' : 'light')
    ).toBe(true);

    root.unmount();
  });
});
