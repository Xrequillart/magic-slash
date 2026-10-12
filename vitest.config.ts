import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // The same `@ds` the two apps' bundlers resolve. It was only in their configs until
  // an APP file imported through it and a test imported that file — `projectColors.ts`
  // reaching for the palette. The failure is a resolution error naming a package that
  // does not exist, which reads as a missing install rather than as a missing alias.
  //
  // It makes the path resolvable and nothing more. A test still cannot import a module
  // that pulls React, alias or not: this suite runs on the ROOT `node_modules`, and
  // that is why every shared table — `avatarSizes`, `palette` — imports nothing.
  resolve: { alias: { '@ds': resolve(__dirname, 'design-system') } },
  test: {
    include: [
      'desktop/src/**/*.test.{ts,tsx}',
      // The shared components. Same suite as the app that compiles them — they are
      // desktop source that happens to live a directory up.
      'design-system/**/*.test.{ts,tsx}',
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
