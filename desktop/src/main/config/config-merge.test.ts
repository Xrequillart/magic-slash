import { describe, it, expect } from 'vitest'
import type { Config, OrgSharedConfig } from '../../types'
import type { Store } from '../store/Store'
import { setStore, NOOP_STORE } from '../store/Store'
import { mergeOrgSharedConfig, hydrateConfig } from './config'
import { DEFAULT_REPOSITORY_FIELDS } from './defaults'
import { migrateConfig } from './migrate'

// The DB is the single source of truth: config lives behind the Store. These
// tests seed a fake in-memory store, hydrate the config cache from it, then
// exercise mergeOrgSharedConfig against the cache.

let saved: Config | null = null

function fakeStore(initial: Config): Store {
  saved = structuredClone(initial)
  return {
    ...NOOP_STORE,
    loadConfig: async () => (saved ? structuredClone(saved) : null),
    saveConfig: async (c) => { saved = structuredClone(c) },
  }
}

async function seed(config: Config): Promise<void> {
  setStore(fakeStore(config))
  await hydrateConfig()
}

function baseConfig(): Config {
  return {
    version: '1.0.0',
    repositories: {},
    splitEnabled: false,
    splitActive: false,
    integrations: { github: true, atlassian: true },
    spotlight: { enabled: true, shortcut: 'Control+Space' },
  }
}

const ORG = 'org-1'

/** A repo of ORG. `name` is the real cloud name; the record key may differ. */
function repo(name: string, extra: Partial<Config['repositories'][string]> = {}) {
  return { name, orgId: ORG, path: `/local/${name}`, keywords: [], ...extra }
}

describe('mergeOrgSharedConfig', () => {
  const OTHER = 'org-2'

  it('fills unset language fields but never overrides existing local ones', async () => {
    const config = baseConfig()
    config.repositories = { web: repo('web', { keywords: ['web'], languages: { commit: 'fr' } }) }
    await seed(config)

    const shared: OrgSharedConfig = { languages: { commit: 'en', pullRequest: 'en' } }
    const result = mergeOrgSharedConfig(shared, ORG)

    expect(result.repositories.web.languages).toEqual({ commit: 'fr', pullRequest: 'en' })
  })

  it('fills unset commit and pullRequest fields, preserving those already set', async () => {
    const config = baseConfig()
    config.repositories = { api: repo('api', { keywords: ['api'], commit: { format: 'gitmoji' } }) }
    await seed(config)

    const shared: OrgSharedConfig = {
      commit: { format: 'angular', style: 'single-line', coAuthor: false },
      pullRequest: { autoLinkTickets: true },
    }
    const result = mergeOrgSharedConfig(shared, ORG)

    expect(result.repositories.api.commit).toEqual({
      format: 'gitmoji', // local wins
      style: 'single-line', // inherited
      coAuthor: false, // inherited (false is a real value, not "unset")
    })
    expect(result.repositories.api.pullRequest).toEqual({ autoLinkTickets: true })
  })

  it('inherits the shared test-account settings, letting a locally-set mode win', async () => {
    const config = baseConfig()
    config.repositories = {
      api: repo('api', { keywords: ['api'], pullRequest: { testAccounts: 'reference' } }),
      web: repo('web', { keywords: ['web'] }),
    }
    await seed(config)

    const shared: OrgSharedConfig = {
      pullRequest: { testAccounts: 'inline', testAccountsSource: 'docs/test-accounts.md' },
    }
    const result = mergeOrgSharedConfig(shared, ORG)

    expect(result.repositories.api.pullRequest).toEqual({
      testAccounts: 'reference', // local wins
      testAccountsSource: 'docs/test-accounts.md', // inherited
    })
    expect(result.repositories.web.pullRequest).toEqual({
      testAccounts: 'inline',
      testAccountsSource: 'docs/test-accounts.md',
    })
  })

  it('applies shared keywords only to repos with defaulted keywords', async () => {
    const config = baseConfig()
    config.repositories = {
      empty: repo('empty'),
      defaulted: repo('defaulted', { keywords: ['defaulted'] }),
      customized: repo('customized', { keywords: ['payments', 'billing'] }),
    }
    await seed(config)

    const shared: OrgSharedConfig = {
      repoKeywords: {
        empty: ['shared', 'kw'],
        defaulted: ['shared', 'kw'],
        customized: ['should', 'not', 'apply'],
      },
    }
    const result = mergeOrgSharedConfig(shared, ORG)

    expect(result.repositories.empty.keywords).toEqual(['shared', 'kw'])
    expect(result.repositories.defaulted.keywords).toEqual(['shared', 'kw'])
    expect(result.repositories.customized.keywords).toEqual(['payments', 'billing'])
  })

  it('never touches local repo paths', async () => {
    const config = baseConfig()
    config.repositories = { web: repo('web', { path: '/very/local/path' }) }
    await seed(config)

    const result = mergeOrgSharedConfig({ languages: { commit: 'en' }, repoKeywords: { web: ['x'] } }, ORG)

    expect(result.repositories.web.path).toBe('/very/local/path')
  })

  // Every org's repositories are visible at once, so a merge that reached all of
  // them would hand one team's conventions to another's repo.
  it('leaves the repositories of another organization alone', async () => {
    const config = baseConfig()
    config.repositories = {
      mine: repo('mine'),
      theirs: { name: 'theirs', orgId: OTHER, path: '/local/theirs', keywords: [] },
    }
    await seed(config)

    const result = mergeOrgSharedConfig(
      { languages: { commit: 'en' }, repoKeywords: { theirs: ['nope'] } },
      ORG,
    )

    expect(result.repositories.mine.languages).toEqual({ commit: 'en' })
    expect(result.repositories.theirs.languages).toBeUndefined()
    expect(result.repositories.theirs.keywords).toEqual([])
  })

  it('leaves personal repositories alone — they belong to the user, not a team', async () => {
    const config = baseConfig()
    config.repositories = { side: { name: 'side', path: '/local/side', keywords: [] } }
    await seed(config)

    const result = mergeOrgSharedConfig({ languages: { commit: 'en' } }, ORG)

    expect(result.repositories.side.languages).toBeUndefined()
  })

  it('matches shared keywords on the real name, not on the record key', async () => {
    // Two orgs own an `api`; the second one's KEY carries an org suffix, but the
    // org's shared config still addresses it by its real name.
    const config = baseConfig()
    config.repositories = { 'api (Acme)': repo('api') }
    await seed(config)

    const result = mergeOrgSharedConfig({ repoKeywords: { api: ['shared'] } }, ORG)

    expect(result.repositories['api (Acme)'].keywords).toEqual(['shared'])
  })

  it('ignores empty and malformed shared config without throwing', async () => {
    const config = baseConfig()
    config.repositories = { web: repo('web', { keywords: ['web'], languages: { commit: 'fr' } }) }
    await seed(config)

    expect(() => mergeOrgSharedConfig({}, ORG)).not.toThrow()
    const result = mergeOrgSharedConfig({
      languages: 'nope' as unknown as OrgSharedConfig['languages'],
      repoKeywords: { web: 'nope' as unknown as string[] },
    }, ORG)
    expect(result.repositories.web.languages).toEqual({ commit: 'fr' })
    expect(result.repositories.web.keywords).toEqual(['web'])
  })
})

/**
 * Regression cover for issue #161.
 *
 * The `repo()` helper above builds repositories BY HAND, without the fields the
 * app actually stamps on every repo — which is why the tests above kept passing
 * while no user ever inherited anything. These build a repository the way
 * production does: DEFAULT_REPOSITORY_FIELDS spread on creation (addRepository),
 * then the deep merge migrateConfig runs at every launch. A key with a concrete
 * default there is set locally by the time the merge runs, and the merge only
 * fills keys that are `undefined` — so the org's value is skipped forever.
 */
describe('mergeOrgSharedConfig — repositories carrying the app defaults', () => {
  /**
   * A repo shaped like one addRepository just created: the shared `repo()` above
   * (which carries the orgId the merge's scoping filter needs — without it the
   * assertions below would pass for the wrong reason), plus the defaults the app
   * stamps on every repo at creation.
   */
  function defaultedRepo(name: string, extra: Partial<Config['repositories'][string]> = {}) {
    return {
      ...repo(name, { keywords: [name] }),
      ...structuredClone(DEFAULT_REPOSITORY_FIELDS),
      ...extra,
    }
  }

  it("inherits the org's pullRequest settings on a repo built the production way", async () => {
    const config = baseConfig()
    config.repositories = { web: defaultedRepo('web') }
    await seed(config)
    migrateConfig()

    const shared: OrgSharedConfig = {
      pullRequest: { watchCI: false, testAccounts: 'inline', testAccountsSource: 'docs/test-accounts.md' },
    }
    const result = mergeOrgSharedConfig(shared, ORG)

    expect(result.repositories.web.pullRequest).toEqual({
      watchCI: false,
      testAccounts: 'inline',
      testAccountsSource: 'docs/test-accounts.md',
    })
  })

  it('still lets a value the user set locally win over the org value', async () => {
    const config = baseConfig()
    config.repositories = {
      web: defaultedRepo('web', { pullRequest: { testAccounts: 'reference' } }),
    }
    await seed(config)
    migrateConfig()

    const shared: OrgSharedConfig = {
      pullRequest: { watchCI: false, testAccounts: 'inline' },
    }
    const result = mergeOrgSharedConfig(shared, ORG)

    expect(result.repositories.web.pullRequest).toEqual({
      testAccounts: 'reference', // local wins
      watchCI: false, // inherited
    })
  })

  /**
   * The existing-install half of #161: dropping the default only helps repos
   * created from now on, so a repo whose `pullRequest` column still holds the
   * historical default comes back "already set" and inherits nothing. migrateConfig
   * normalizes that block away in memory, which is what makes the merge below
   * possible at all.
   */
  it("lets a repo carrying the legacy persisted defaults inherit the org's pullRequest", async () => {
    const config = baseConfig()
    config.repositories = {
      web: {
        ...repo('web', { keywords: ['web'] }),
        // Exactly what an existing install has in repositories.pull_request.
        pullRequest: { autoLinkTickets: true, watchCI: true, testAccounts: 'off', testAccountsSource: '' },
      },
    }
    await seed(config)
    migrateConfig()

    const shared: OrgSharedConfig = {
      pullRequest: { watchCI: false, testAccounts: 'inline', testAccountsSource: 'docs/test-accounts.md' },
    }
    const result = mergeOrgSharedConfig(shared, ORG)

    expect(result.repositories.web.pullRequest).toEqual({
      watchCI: false,
      testAccounts: 'inline',
      testAccountsSource: 'docs/test-accounts.md',
    })
  })

  // The direct statement of the defect, so re-adding a default here fails loudly
  // rather than quietly restoring "nothing is ever inherited".
  it('carries no pullRequest default at all', () => {
    expect(DEFAULT_REPOSITORY_FIELDS).not.toHaveProperty('pullRequest')
  })
})
