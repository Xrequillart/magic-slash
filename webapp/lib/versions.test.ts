import { describe, expect, it } from 'vitest'
import { versionStanding } from './versions'

/**
 * `compareVersions` and `highestVersion` are covered through adminRollups.test.ts,
 * which exercises them on fleet shapes. `versionStanding` gets its own file because
 * it is the one that DECIDES something — the pill an operator reads — and the case
 * that used to be wrong is invisible in a fleet-shaped test.
 */
describe('versionStanding', () => {
  it('compares against the shipped release, not against the fleet', () => {
    // The bug this replaces: minutes after publishing 0.59.3, no machine has it, so
    // the fleet maximum was still 0.59.2 and every machine on it called itself up to
    // date. A reference from outside the fleet is what settles it.
    expect(versionStanding('0.59.2', '0.59.3')).toBe('behind')
    expect(versionStanding('0.59.3', '0.59.3')).toBe('current')
  })

  it('calls a build ahead of the release current, not behind', () => {
    // Someone running from source. "En retard" would be a strange thing to tell them.
    expect(versionStanding('0.60.0', '0.59.3')).toBe('current')
  })

  it('treats a machine that never launched as unknown', () => {
    expect(versionStanding(null, '0.59.3')).toBe('unknown')
  })

  it('compares numerically, not as strings', () => {
    // '0.9.0' > '0.10.0' lexicographically, which would call a very old build current.
    expect(versionStanding('0.9.0', '0.10.0')).toBe('behind')
  })

  it('ignores a pre-release suffix, like the comparison it is built on', () => {
    expect(versionStanding('0.59.3-beta.1', '0.59.3')).toBe('current')
  })
})
