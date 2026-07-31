import { describe, it, expect } from 'vitest'
import type { Config } from '../../types'
import { normalizeLegacyPullRequest } from './normalize'

// Pure unit cover for the load-path normalization (issue #161). No store, no
// cache: normalizeLegacyPullRequest takes a config and mutates it in place.
// migrate.test.ts covers the same rule end-to-end, through migrateConfig and a
// re-hydration.

/** The three shapes DEFAULT_REPOSITORY_FIELDS successively stamped on new repos. */
const HISTORICAL: Record<string, Record<string, unknown>> = {
  'the original one-key block (April → 2026-07-27)': { autoLinkTickets: true },
  'the two-key block (2026-07-27 → 2026-07-31)': { autoLinkTickets: true, watchCI: true },
  'the four-key block shipped in 0.62.0': {
    autoLinkTickets: true, watchCI: true, testAccounts: 'off', testAccountsSource: '',
  },
}

function configWith(pullRequest: unknown): Config {
  return {
    version: '1.0.0',
    repositories: {
      web: { path: '/local/web', keywords: ['web'], pullRequest: pullRequest as never },
    },
    splitEnabled: false,
    splitActive: false,
  }
}

describe('normalizeLegacyPullRequest — historical defaults', () => {
  for (const [label, block] of Object.entries(HISTORICAL)) {
    it(`strips ${label}`, () => {
      const config = configWith({ ...block })
      expect(normalizeLegacyPullRequest(config)).toBe(true)
      expect(config.repositories.web.pullRequest).toBeUndefined()
    })

    it(`strips ${label} whatever order the keys were persisted in`, () => {
      const reversed = Object.fromEntries(Object.entries(block).reverse())
      const config = configWith(reversed)
      expect(normalizeLegacyPullRequest(config)).toBe(true)
      expect(config.repositories.web.pullRequest).toBeUndefined()
    })
  }
})

describe('normalizeLegacyPullRequest — blocks that must survive', () => {
  // Whole-block equality: a near-miss is somebody's choice, and handing it to
  // the org would silently replace a value the user picked.
  const preserved: Record<string, Record<string, unknown>> = {
    'one value changed': { autoLinkTickets: true, watchCI: false },
    'one key missing from a historical shape': { autoLinkTickets: true, watchCI: true, testAccounts: 'off' },
    'a key no historical shape ever had': { autoLinkTickets: true, watchCI: true, draft: true },
    'every key matching but only a subset present': { watchCI: true },
    'the newest shape with a non-default source': {
      autoLinkTickets: true, watchCI: true, testAccounts: 'off', testAccountsSource: 'TESTING.md',
    },
    'a block the user emptied': {},
  }

  for (const [label, block] of Object.entries(preserved)) {
    it(`keeps a block with ${label}`, () => {
      const config = configWith({ ...block })
      expect(normalizeLegacyPullRequest(config)).toBe(false)
      expect(config.repositories.web.pullRequest).toEqual(block)
    })
  }

  it('reports no change on a repo that never had the block', () => {
    const config = configWith(undefined)
    delete config.repositories.web.pullRequest
    expect(normalizeLegacyPullRequest(config)).toBe(false)
    expect(config.repositories.web.pullRequest).toBeUndefined()
  })

  it('ignores a block that is not an object at all', () => {
    for (const value of [null, 'off', 42, [{ autoLinkTickets: true }]]) {
      const config = configWith(value)
      expect(normalizeLegacyPullRequest(config)).toBe(false)
      expect(config.repositories.web.pullRequest).toEqual(value)
    }
  })
})

describe('normalizeLegacyPullRequest — across repositories', () => {
  it('strips only the untouched repos, and reports a change when any was', () => {
    const config = configWith({ autoLinkTickets: true })
    config.repositories.api = {
      path: '/local/api', keywords: ['api'],
      pullRequest: { autoLinkTickets: false } as never,
    }

    expect(normalizeLegacyPullRequest(config)).toBe(true)
    expect(config.repositories.web.pullRequest).toBeUndefined()
    expect(config.repositories.api.pullRequest).toEqual({ autoLinkTickets: false })
  })

  it('is idempotent: a second pass reports nothing', () => {
    const config = configWith({ autoLinkTickets: true, watchCI: true })
    expect(normalizeLegacyPullRequest(config)).toBe(true)
    expect(normalizeLegacyPullRequest(config)).toBe(false)
  })

  it('tolerates a config with no repositories', () => {
    expect(normalizeLegacyPullRequest({ version: '1.0.0' } as Config)).toBe(false)
  })
})
