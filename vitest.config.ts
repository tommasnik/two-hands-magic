import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/tests/unit/**/*.test.ts', 'src/tests/game-design/**/*.test.ts', 'src/tests/game-design/**/*.spec.ts', 'src/tests/game-design-new/**/*.spec.ts'],
    exclude: ['src/tests/e2e/**'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/game/**'],
      // Pure type-definition files have no executable code — c8 reports them as 0%.
      // Excluding them keeps coverage meaningful (only runtime code is measured).
      exclude: ['src/game/skills/types.ts'],
      reporter: ['text', 'lcov'],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
})
