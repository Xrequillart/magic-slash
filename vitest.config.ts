import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: [
      'desktop/src/**/*.test.{ts,tsx}',
    ],
  },
})
