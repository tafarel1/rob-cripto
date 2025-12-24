import { describe, it, expect } from 'vitest'
import { toggleTheme, getInitialTheme } from '@/hooks/utils'

describe('hook utils', () => {
  it('toggleTheme switches between light and dark', () => {
    expect(toggleTheme('light')).toBe('dark')
    expect(toggleTheme('dark')).toBe('light')
  })

  it('getInitialTheme prefers saved value when valid', () => {
    expect(getInitialTheme(false, 'dark')).toBe('dark')
    expect(getInitialTheme(true, 'light')).toBe('light')
  })

  it('getInitialTheme falls back to prefersDark', () => {
    expect(getInitialTheme(true)).toBe('dark')
    expect(getInitialTheme(false)).toBe('light')
  })
})
