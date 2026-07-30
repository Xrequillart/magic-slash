import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: [
      'desktop/src/**/*.test.{ts,tsx}',
      // The webapp duplicates a little pure logic from the desktop (it cannot
      // import across the two builds), so that logic is covered here too.
      //
      // PURE logic only, and that is a hard constraint rather than a preference: this
      // suite runs on the ROOT node_modules, and CI never installs `webapp/`'s own
      // dependencies. A test that reaches a module importing one of them — the
      // Supabase client, at any depth — fails to RESOLVE, which reads as a broken
      // test rather than as a missing install. Test the data, not the data layer.
      'webapp/lib/**/*.test.ts',
    ],
  },
})
