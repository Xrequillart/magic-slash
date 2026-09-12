import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The webapp satisfies the design system's dependencies out of its OWN install, and
 * this is what keeps that from becoming a lie.
 *
 * WHY IT HAS TO. `design-system/` declares `lucide-react` and owns its version — that
 * is the point of the dependency living there rather than in either app. But on Vercel
 * the deployment's root is `webapp/`, so `npm install` runs there and nowhere else:
 * `design-system/node_modules` simply does not exist, and the build died with
 * `Module not found: Can't resolve 'lucide-react'`. Both `next.config.mjs` and
 * `tsconfig.json` therefore point the shared files at this app's copy, which is exactly
 * what a PEER dependency does.
 *
 * IT IS SAFE ONLY WHILE THE RANGES AGREE. Point an app at its own copy of a library the
 * design system asked for a different version of, and the alias hides the mismatch
 * instead of failing on it — the shared components would compile against one library
 * and run against another. So: same range, asserted, or this test goes red.
 *
 * The desktop needs no such mapping. Vite resolves from the importing file, and the
 * desktop build has `design-system/node_modules` beside it — `npm run desktop:install`
 * chains the two installs.
 */
const read = (...parts: string[]) =>
  JSON.parse(readFileSync(join(__dirname, '..', '..', ...parts), 'utf8')) as {
    dependencies?: Record<string, string>
  }

/** Every package the webapp resolves on the design system's behalf. */
const ALIASED = ['lucide-react']

describe('the dependencies the webapp resolves for the design system', () => {
  const ds = read('design-system', 'package.json').dependencies ?? {}
  const web = read('webapp', 'package.json').dependencies ?? {}

  it('covers every dependency the design system declares', () => {
    // A package added to `design-system/package.json` and not to this list is one the
    // Vercel build will fail to resolve — with the same error, in a year, with nobody
    // left who remembers why the aliases are there.
    expect(Object.keys(ds).sort()).toEqual([...ALIASED].sort())
  })

  it('asks for the same version the design system does', () => {
    for (const name of ALIASED) {
      expect(web[name], `${name} in webapp/package.json`).toBe(ds[name])
    }
  })
})
