import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { marketingEn } from './i18n/marketing/en'
import { marketingFr } from './i18n/marketing/fr'
import { ALL_KEYS, FIRST_LAUNCH, PAGE_CHROME, REQUIREMENTS } from './downloadPage'
import { DOWNLOAD_PATH } from './siteNav'

/**
 * `/download`, pinned the way `siteNav.test.ts` pins the header: every key the page
 * names exists in BOTH catalogues, the page behind the path exists and is the real one,
 * and the component can draw every glyph the data names.
 *
 * READ AS TEXT where it has to be. `DownloadContent.tsx` imports React and lucide, so
 * this suite — on the root `node_modules`, see `vitest.config.ts` — cannot import it;
 * `features.test.ts` and `siteNav.test.ts` read their components the same way.
 */

const site = (key: string) => (marketingEn as Record<string, string>)[key]
const siteFr = (key: string) => (marketingFr as Record<string, string>)[key]
const webapp = (relative: string) => fileURLToPath(new URL(relative, import.meta.url))

describe('the download page', () => {
  it('names keys the catalogues actually carry', () => {
    for (const key of ALL_KEYS) {
      expect(site(key), `en.${key}`).toBeTruthy()
      expect(siteFr(key), `fr.${key}`).toBeTruthy()
    }
  })

  it('no longer promises a page that is being written', () => {
    // The placeholder's lead ended on that sentence in both languages; a page with a
    // button on it cannot keep it.
    expect(site(PAGE_CHROME.lead)).not.toMatch(/being written/i)
    expect(siteFr(PAGE_CHROME.lead)).not.toMatch(/en cours d.écriture/i)
  })

  it('substitutes the version and the date into the badge', () => {
    // Both placeholders, in both languages — `i18n.test.ts` checks the two catalogues
    // agree with each other, this checks they agree with the component that calls `t()`.
    for (const text of [site(PAGE_CHROME.versionBadge), siteFr(PAGE_CHROME.versionBadge)]) {
      expect(text).toContain('{version}')
      expect(text).toContain('{date}')
    }
  })

  it('lists the three prerequisites the first launch checks, and three steps', () => {
    // The FAQ answer names three; the setup checks three. A fourth here would be a
    // requirement the app does not enforce.
    expect(REQUIREMENTS).toHaveLength(3)
    expect(REQUIREMENTS.map((point) => point.id)).toEqual(['claude', 'node', 'git'])
    expect(FIRST_LAUNCH).toHaveLength(3)

    const ids = [...REQUIREMENTS, ...FIRST_LAUNCH].map((point) => point.id)
    expect(new Set(ids).size, ids.join(', ')).toBe(ids.length)
  })

  it('renders the real page behind the header row', () => {
    const file = webapp(`../app/(marketing)${DOWNLOAD_PATH}/page.tsx`)
    expect(existsSync(file)).toBe(true)

    const page = readFileSync(file, 'utf8')
    expect(page).toContain('<DownloadContent')
    expect(page).not.toContain('PlaceholderContent')
    // The page hands the release notes down from the server: `loadChangelog` touches
    // the filesystem and cannot run in the client tree.
    expect(page).toContain('loadChangelog()')
  })

  it('builds its button from the release constants, not from a spelled-out URL', () => {
    const component = readFileSync(webapp('../components/site/download/DownloadContent.tsx'), 'utf8')
    expect(component).toContain('DESKTOP_DOWNLOAD_URL')
    expect(component).toContain('LATEST_DESKTOP_VERSION')
    expect(component).not.toMatch(/releases\/download\//)
  })

  it('names glyphs the component actually imports', () => {
    const component = readFileSync(webapp('../components/site/download/DownloadContent.tsx'), 'utf8')
    for (const point of [...REQUIREMENTS, ...FIRST_LAUNCH]) {
      expect(component, `${point.icon} imported`).toMatch(new RegExp(`\\b${point.icon}\\b`))
    }
  })
})
