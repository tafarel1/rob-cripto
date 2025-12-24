import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn', () => {
  it('merges tailwind classes and conditional values', () => {
    const result = cn('p-2', 'text-sm', ['p-2', undefined], { 'font-bold': true })
    expect(result).toContain('p-2')
    expect(result).toContain('text-sm')
    expect(result).toContain('font-bold')
    expect(result).not.toContain('hidden')
  })
})
