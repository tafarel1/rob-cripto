export type Theme = 'light' | 'dark'

export function toggleTheme(current: Theme): Theme {
  return current === 'light' ? 'dark' : 'light'
}

export function getInitialTheme(prefersDark: boolean, saved?: Theme): Theme {
  if (saved === 'light' || saved === 'dark') return saved
  return prefersDark ? 'dark' : 'light'
}

