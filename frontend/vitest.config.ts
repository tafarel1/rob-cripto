import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/lib/**'],
      thresholds: {
        lines: 10,
        functions: 10,
        branches: 0,
        statements: 10,
      },
    },
  },
})
