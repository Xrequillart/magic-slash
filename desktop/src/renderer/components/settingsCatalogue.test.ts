import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

/**
 * THE CATALOGUE KEPT IN STEP WITH THE PAGES. `SETTINGS_CATALOGUE` is written by hand (see
 * its header for why the pages are not crawled), so a row added to a page and not to the
 * catalogue is a setting the search cannot find — which is how the MCP servers went
 * missing from it. This suite makes that a red test rather than a bug report.
 *
 * THE FILES ARE READ AS TEXT, never imported: the catalogue and the pages pull React,
 * which this suite cannot resolve (see `vitest.config.ts`). So what counts as a row's
 * name is what the pages spell as one — `label: t('…')`, `label={t('…')}`, `label: '…'` —
 * and a label built at runtime (`t(step.key)`, `MCP_SERVER_NAMES[id]`) is out of reach.
 * Rows drawn from a table are therefore catalogued FROM that table (`CHORDS`, the MCP
 * servers), which keeps them in step without this suite having to see them.
 *
 * A label that is not a setting — a button, a status, a choice inside a select, a figure
 * read off a card — goes in `NOT_SETTINGS`, so leaving a row out of the search is a
 * decision someone wrote down rather than an oversight.
 */

const RENDERER = resolve(__dirname, '..')
const PAGES_DIR = resolve(RENDERER, 'pages/Config')
const read = (path: string) => readFileSync(path, 'utf8')

/** Labels the pages render that are not settings, by why. */
const NOT_SETTINGS: readonly string[] = [
  // Buttons.
  'common.cancel', 'common.edit', 'common.remove', 'common.loading',
  'cloud.signIn', 'cloud.signOut', 'cloud.joinWithInvitation',
  'jira.disconnect',
  'org.invite', 'org.inviteLink', 'org.leave', 'org.archive',
  'org.inviteModal.send', 'org.createModal.submit', 'org.joinModal.submit',
  'security.retry',
  'settings.connections.mcp.check',
  'settings.launchMode.bypassConfirm',
  'settings.application.setup.recheck', 'settings.application.setup.getIt',
  'settings.application.setup.skills.reinstall', 'settings.application.setup.integrations.confirmOff',
  // Statuses.
  'security.activeNow',
  // Choices inside a select whose row is catalogued, built at runtime there.
  'settings.agents.model.cliDefault', 'settings.code.syntax.auto', 'settings.quickLaunch.mode.inherit',
  // Figures read off a card whose section is catalogued: nothing to set.
  'settings.claude.name', 'settings.claude.email', 'settings.claude.organization',
  'usage.session', 'usage.weekly',
  'settings.spend.today', 'settings.spend.week', 'settings.spend.allTime',
  // A column of the invite modal.
  'org.colRole',
  // The pages listed in the sidebar modal, behind the catalogued sidebar row.
  'sidebar.plans', 'sidebar.tasks', 'sidebar.skills', 'settings.tab.repositories',
]

/** Each tab's files: the page the modal mounts for it, and what that page imports from its folder. */
function filesByTab(): Map<string, string[]> {
  const modal = read(resolve(RENDERER, 'components/SettingsModal.tsx'))
  const fileOf = new Map(
    [...modal.matchAll(/import \{ (\w+) \} from '\.\.\/pages\/Config\/(\w+)'/g)].map(([, name, file]) => [name, file]),
  )
  const tabs = new Map<string, string[]>()
  for (const [, tab, component] of modal.matchAll(/tab === '([\w-]+)' && <(\w+) \/>/g)) {
    const seen = new Set<string>()
    const queue = [fileOf.get(component)!]
    while (queue.length > 0) {
      const file = queue.pop()!
      if (seen.has(file)) continue
      seen.add(file)
      for (const [, local] of read(resolve(PAGES_DIR, `${file}.tsx`)).matchAll(/from '\.\/(\w+)'/g)) {
        if (existsSync(resolve(PAGES_DIR, `${local}.tsx`))) queue.push(local)
      }
    }
    tabs.set(tab, [...seen].sort())
  }
  return tabs
}

/** The names a file gives its rows, as written: a message key or a name never translated. */
function rowLabels(source: string): string[] {
  return [...source.matchAll(/\blabel(?::\s*|=\{)(?:t\(\s*'([^']+)'|'([^']+)')/g)].map(([, key, name]) => key ?? name)
}

const TABS = filesByTab()
const CATALOGUE = read(resolve(RENDERER, 'components/settingsCatalogue.ts'))
/** Every string the catalogue spells, labels, help lines and choices alike. */
const CATALOGUED = new Set([...CATALOGUE.matchAll(/'([^'\n]+)'/g)].map(([, text]) => text))
/** The catalogue's entries, as (tab, label) pairs. */
const ENTRIES = [...CATALOGUE.matchAll(/tab: '([\w-]+)',\s*label(?:Key)?: '([^']+)'/g)].map(([, tab, label]) => ({ tab, label }))

describe('SETTINGS_CATALOGUE', () => {
  it('reads the tabs off the modal', () => {
    expect(TABS.size).toBeGreaterThan(10)
  })

  it('holds every row the settings pages render', () => {
    const missing: string[] = []
    for (const [tab, files] of TABS) {
      for (const file of files) {
        for (const label of rowLabels(read(resolve(PAGES_DIR, `${file}.tsx`)))) {
          if (!CATALOGUED.has(label) && !NOT_SETTINGS.includes(label)) missing.push(`${tab} (${file}): ${label}`)
        }
      }
    }
    expect(missing, 'add these to SETTINGS_CATALOGUE, or to NOT_SETTINGS if they are not settings').toEqual([])
  })

  it('has entries for every tab', () => {
    const empty = [...TABS.keys()].filter((tab) => !ENTRIES.some((entry) => entry.tab === tab))
    expect(empty).toEqual([])
  })

  it('names each entry the way its tab renders it, which is how the row is found on arrival', () => {
    const stale = ENTRIES.filter(({ tab, label }) => {
      const files = TABS.get(tab) ?? []
      return !files.some((file) => read(resolve(PAGES_DIR, `${file}.tsx`)).includes(`'${label}'`))
    })
    expect(stale.map(({ tab, label }) => `${tab}: ${label}`)).toEqual([])
  })

  it('declares nothing as not a setting that the pages no longer render', () => {
    const rendered = new Set(
      [...TABS.values()].flat().flatMap((file) => rowLabels(read(resolve(PAGES_DIR, `${file}.tsx`)))),
    )
    expect(NOT_SETTINGS.filter((label) => !rendered.has(label))).toEqual([])
  })
})
