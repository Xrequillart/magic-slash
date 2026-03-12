import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: [
      'web-ui/**/*.test.{js,ts}',
      'desktop/src/**/*.test.{ts,tsx}',
    ],
  },
})
