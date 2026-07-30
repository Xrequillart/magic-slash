import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { LATEST_DESKTOP_VERSION } from './desktopRelease'

/**
 * What makes a hardcoded version safe to rely on.
 *
 * `LATEST_DESKTOP_VERSION` is the reference every "à jour" badge is measured against,
 * and it is maintained by hand — /magic:release bumps it alongside package.json. A
 * release that skipped it would leave the console calling an old build current, which
 * is exactly the bug the constant was introduced to fix, arriving by a different door
 * and just as silently.
 *
 * So it is not trusted: it is compared to the version the desktop app actually
 * declares. A missed bump fails CI on the next push instead of misinforming an
 * operator for a release cycle.
 */
describe('LATEST_DESKTOP_VERSION', () => {
  it('matches the version the desktop app ships', () => {
    const manifest = join(__dirname, '..', '..', 'desktop', 'package.json')
    const { version } = JSON.parse(readFileSync(manifest, 'utf-8')) as { version: string }

    expect(LATEST_DESKTOP_VERSION, 'bumped by /magic:release, step 5.3').toBe(version)
  })

  it('is a plain three-part version, with no leading v', () => {
    // It is fed to `compareVersions`, which parses each component with parseInt: a
    // stray "v" makes the major component 0 and turns the whole fleet yellow.
    expect(LATEST_DESKTOP_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
  })
})
