import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { DESKTOP_DOWNLOAD_URL, LATEST_DESKTOP_VERSION } from './desktopRelease'

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

/**
 * The download URL names a FILE, so it is only right for as long as electron-builder
 * writes that exact name. Nothing in the app can tell it apart from a working link —
 * every button renders the same, the 404 arrives on GitHub, after the click.
 *
 * So the URL is rebuilt here from the packaging config that produces the file, the way
 * the version above is compared to the one the app declares. Renaming the artifact
 * fails CI instead of quietly breaking every download button in the product, the
 * documentation and the invitation funnel at once.
 */
describe('DESKTOP_DOWNLOAD_URL', () => {
  const dmgTemplate = () => {
    const manifest = join(__dirname, '..', '..', 'desktop', 'package.json')
    const pkg = JSON.parse(readFileSync(manifest, 'utf-8')) as {
      build?: { dmg?: { artifactName?: string } }
    }
    return pkg.build?.dmg?.artifactName
  }

  it('points at the file electron-builder is configured to produce', () => {
    const template = dmgTemplate()
    expect(template, 'desktop/package.json → build.dmg.artifactName').toBeDefined()

    // The only build the release workflow publishes. Both substitutions are electron
    // -builder's own, so this is the filename the release will carry.
    const expected = template!
      .replace('${version}', LATEST_DESKTOP_VERSION)
      .replace('${arch}', 'arm64')
      .replace('${ext}', 'dmg')

    expect(DESKTOP_DOWNLOAD_URL).toBe(
      `https://github.com/xrequillart/magic-slash/releases/download/v${LATEST_DESKTOP_VERSION}/${expected}`,
    )
  })

  it('carries no space, so no uploader has to sanitise it', () => {
    // The whole reason artifactName is pinned rather than defaulted: the default
    // interpolates "Magic Slash", and the space came back as a hyphen on the dmg and
    // as a dot in its blockmap. A name that needs sanitising cannot be predicted here.
    expect(DESKTOP_DOWNLOAD_URL).not.toMatch(/[\s%]/)
  })
})
