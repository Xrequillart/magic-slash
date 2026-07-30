import { describe, it, expect } from 'vitest'
import {
  bucketByVersion,
  countBy,
  outdatedInstallations,
  QUIET_DAYS,
  quietInstallations,
  UNKNOWN_VALUE,
  type FleetDevice,
} from './adminRollups'

/**
 * The back-office's four rollups: arithmetic over the fleet, where being wrong
 * looks exactly like being right.
 *
 * Imported from `./adminRollups` rather than `./admin` on purpose. This suite runs
 * in the ROOT vitest project, which does not install `webapp/`'s dependencies, so
 * reaching `lib/admin.ts` — and through it `lib/supabase.ts` — fails to resolve
 * `@supabase/supabase-js` before a single assertion runs.
 *
 * Everything else in `lib/admin.ts` is an RPC call and a field rename. Those are
 * NOT type-checked — the Supabase client is untyped here (no generated
 * `database.types.ts`), so `data as AdminUserRpcRow[]` is a cast over `any` and
 * a field wired to the wrong column compiles cleanly. The migration's
 * `returns table` and the `…RpcRow` interfaces are kept in agreement by hand;
 * the pgTAP suite is what pins the SQL side.
 */

/** `deviceId` is not read by any rollup; it is here so assertions can name a row. */
interface TestDevice extends FleetDevice {
  deviceId: string
}

function device(overrides: Partial<TestDevice> = {}): TestDevice {
  return {
    deviceId: 'd1',
    appVersion: '0.54.1',
    platform: 'darwin',
    arch: 'arm64',
    lastSeenAt: '2026-07-28T10:00:00.000Z',
    ...overrides,
  }
}

describe('bucketByVersion', () => {
  it('returns nothing for an empty fleet', () => {
    expect(bucketByVersion([])).toEqual([])
  })

  it('counts devices per version, newest version first', () => {
    const buckets = bucketByVersion([
      device({ deviceId: 'd1', appVersion: '0.53.0' }),
      device({ deviceId: 'd2', appVersion: '0.54.1' }),
      device({ deviceId: 'd3', appVersion: '0.54.1' }),
      device({ deviceId: 'd4', appVersion: '0.9.0' }),
    ])
    expect(buckets).toEqual([
      { version: '0.54.1', count: 2 },
      { version: '0.53.0', count: 1 },
      { version: '0.9.0', count: 1 },
    ])
  })

  it('counts devices rather than users, so two machines of one person count twice', () => {
    expect(
      bucketByVersion([
        device({ deviceId: 'd1', appVersion: '0.54.1' }),
        device({ deviceId: 'd2', appVersion: '0.54.1' }),
      ]),
    ).toEqual([{ version: '0.54.1', count: 2 }])
  })

  it('orders two spellings that compare equal deterministically', () => {
    // compareVersions is numeric-component-only, so 0.54 and 0.54.0 tie; the
    // string tiebreak must produce the same order every run.
    const buckets = bucketByVersion([
      device({ deviceId: 'd1', appVersion: '0.54' }),
      device({ deviceId: 'd2', appVersion: '0.54.0' }),
    ])
    expect(buckets.map((b) => b.version)).toEqual(['0.54.0', '0.54'])
  })
})

describe('outdatedInstallations', () => {
  it('returns nothing for an empty fleet', () => {
    expect(outdatedInstallations([])).toEqual([])
  })

  it('returns nothing when every device is on the same version', () => {
    expect(
      outdatedInstallations([
        device({ deviceId: 'd1', appVersion: '0.54.1' }),
        device({ deviceId: 'd2', appVersion: '0.54.1' }),
      ]),
    ).toEqual([])
  })

  it('returns the devices behind the highest observed version', () => {
    const outdated = outdatedInstallations([
      device({ deviceId: 'd1', appVersion: '0.54.1' }),
      device({ deviceId: 'd2', appVersion: '0.53.9' }),
      device({ deviceId: 'd3', appVersion: '0.9.0' }),
    ])
    expect(outdated.map((d) => d.deviceId)).toEqual(['d2', 'd3'])
  })

  it('compares numerically, not as strings', () => {
    // '0.9.0' > '0.54.1' lexicographically, which is the bug this guards.
    const outdated = outdatedInstallations([
      device({ deviceId: 'd1', appVersion: '0.9.0' }),
      device({ deviceId: 'd2', appVersion: '0.54.1' }),
    ])
    expect(outdated.map((d) => d.deviceId)).toEqual(['d1'])
  })

  it('treats versions that compare equal as up to date', () => {
    expect(
      outdatedInstallations([
        device({ deviceId: 'd1', appVersion: '0.54' }),
        device({ deviceId: 'd2', appVersion: '0.54.0' }),
      ]),
    ).toEqual([])
  })

  it('measures against the reference version when one is given', () => {
    // The case the fleet maximum cannot see: every machine on the same build, one
    // release behind. Against itself the fleet is fully up to date; against the
    // published release, none of it is.
    const fleet = [
      device({ deviceId: 'd1', appVersion: '0.59.2' }),
      device({ deviceId: 'd2', appVersion: '0.59.2' }),
    ]
    expect(outdatedInstallations(fleet)).toEqual([])
    expect(outdatedInstallations(fleet, '0.59.3').map((d) => d.deviceId)).toEqual(['d1', 'd2'])
  })

  it('falls back to the fleet maximum when the reference is unknown', () => {
    // Offline or rate-limited: still incomplete, never wrong about what it returns.
    const fleet = [
      device({ deviceId: 'd1', appVersion: '0.59.2' }),
      device({ deviceId: 'd2', appVersion: '0.59.1' }),
    ]
    expect(outdatedInstallations(fleet, null).map((d) => d.deviceId)).toEqual(['d2'])
  })
})

describe('countBy', () => {
  it('returns nothing for an empty fleet', () => {
    expect(countBy([], 'platform')).toEqual([])
  })

  it('groups by platform, most common first', () => {
    expect(
      countBy(
        [
          device({ deviceId: 'd1', platform: 'darwin' }),
          device({ deviceId: 'd2', platform: 'linux' }),
          device({ deviceId: 'd3', platform: 'darwin' }),
        ],
        'platform',
      ),
    ).toEqual([
      { value: 'darwin', count: 2 },
      { value: 'linux', count: 1 },
    ])
  })

  it('breaks a tie alphabetically so the order is stable between renders', () => {
    expect(
      countBy(
        [
          device({ deviceId: 'd1', arch: 'x64' }),
          device({ deviceId: 'd2', arch: 'arm64' }),
        ],
        'arch',
      ),
    ).toEqual([
      { value: 'arm64', count: 1 },
      { value: 'x64', count: 1 },
    ])
  })

  it('buckets a missing or blank value as unknown instead of dropping the device', () => {
    const buckets = countBy(
      [
        device({ deviceId: 'd1', platform: null }),
        device({ deviceId: 'd2', platform: '  ' }),
        device({ deviceId: 'd3', platform: 'darwin' }),
      ],
      'platform',
    )
    expect(buckets).toEqual([
      { value: UNKNOWN_VALUE, count: 2 },
      { value: 'darwin', count: 1 },
    ])
    // The buckets always sum to the fleet size.
    expect(buckets.reduce((n, b) => n + b.count, 0)).toBe(3)
  })
})

describe('quietInstallations', () => {
  const NOW = new Date('2026-07-28T10:00:00.000Z').getTime()
  const DAY = 24 * 60 * 60 * 1000
  const daysAgo = (n: number) => new Date(NOW - n * DAY).toISOString()

  it('returns nothing for an empty fleet', () => {
    expect(quietInstallations([], NOW)).toEqual([])
  })

  it('returns the devices unseen for longer than the threshold', () => {
    const quiet = quietInstallations(
      [
        device({ deviceId: 'd1', lastSeenAt: daysAgo(1) }),
        device({ deviceId: 'd2', lastSeenAt: daysAgo(30) }),
        device({ deviceId: 'd3', lastSeenAt: daysAgo(90) }),
      ],
      NOW,
    )
    expect(quiet.map((d) => d.deviceId)).toEqual(['d2', 'd3'])
  })

  it('keeps a device seen exactly on the threshold out of the list', () => {
    // The boundary is the difference between "quiet" and "reported this morning,
    // a fortnight ago" — strictly older, so the threshold day itself is fine.
    expect(quietInstallations([device({ lastSeenAt: daysAgo(QUIET_DAYS) })], NOW)).toEqual([])
    expect(
      quietInstallations([device({ deviceId: 'd9', lastSeenAt: daysAgo(QUIET_DAYS + 1) })], NOW),
    ).toHaveLength(1)
  })

  it('does not treat a device last seen in the future as quiet', () => {
    // Clock skew on the reporting machine, not an absent device.
    expect(quietInstallations([device({ lastSeenAt: daysAgo(-2) })], NOW)).toEqual([])
  })
})
