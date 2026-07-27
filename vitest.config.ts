import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: [
      'desktop/src/**/*.test.{ts,tsx}',
      // The webapp duplicates a little pure logic from the desktop (it cannot
      // import across the two builds), so that logic is covered here too.
      'webapp/lib/**/*.test.ts',
    ],
  },
})
