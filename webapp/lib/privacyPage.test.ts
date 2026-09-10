import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { marketingEn } from './i18n/marketing/en'
import { marketingFr } from './i18n/marketing/fr'
import { ALL_KEYS, PAGE_CHROME, PRIVACY_PATH, SECTIONS } from './privacyPage'

/**
 * `/privacy`, pinned the way `siteNav.test.ts` pins the header and `downloadPage.test.ts`
 * pins its page: every key the page names exists in BOTH catalogues, the route behind
 * the path exists and renders the real component, and the apex actually answers that
 * path.
 *
 * THIS SUITE IS THE WHOLE CHECK, which is why it exists at all. The keys lived inside
 * `PrivacyContent.tsx` until now, as literals against `MessageKey`, under a comment that
 * said `next build`'s typecheck would catch a typo. It would — on Vercel, after the
 * merge. `.github/workflows/ci.yml` typechecks `desktop/` alone, so nothing on a pull
 * request read those literals, and `t()` has no per-key fallback: an unknown key renders
 * as an EMPTY paragraph under its heading. The failure mode was therefore a privacy
 * policy with a section that announces what it stores and then says nothing, shipped in
 * silence. `lib/siteNav.ts` and `lib/downloadPage.ts` cite the same fact as their reason
 * for living in `lib/`.
 *
 * Runs in the ROOT vitest suite on the root `node_modules`, which is the reason
 * `lib/privacyPage.ts` may import nothing but `./i18n` — see the note on that file. THIS
 * TEST EXISTING IS WHAT KEEPS THAT TRUE: add a `react` or a `next/*` import over there
 * and this fails to RESOLVE rather than fail honestly.
 *
 * READ AS TEXT where it has to be. `PrivacyContent.tsx` imports React and
 * `hostRouting.ts` keeps its paths inside a `Set` literal, so neither is reachable as a
 * value from here; `siteNav.test.ts` and `downloadPage.test.ts` read both the same way.
 */

const site = (key: string) => (marketingEn as Record<string, string>)[key]
const siteFr = (key: string) => (marketingFr as Record<string, string>)[key]
const webapp = (relative: string) => fileURLToPath(new URL(relative, import.meta.url))

describe('the privacy page', () => {
  it('names keys the catalogues actually carry, in both languages', () => {
    // Both catalogues, not just English: `i18n.test.ts` asserts French has every English
    // key, so this could rest on that — but the failure it would produce over there is
    // "fr is missing site.privacy.usage.body", which does not say who wanted it. Here it
    // does, and here it names the page the hole would appear on.
    for (const key of ALL_KEYS) {
      expect(site(key), `en.${key}`).toBeTruthy()
      expect(siteFr(key), `fr.${key}`).toBeTruthy()
    }
  })

  it('renders every section it names, and names every section it renders', () => {
    // A duplicated row is what a copy-pasted section produces when only the title is
    // edited: the page then prints one body twice and the other not at all, which reads
    // as a policy repeating itself rather than as a bug. `key={entry.title}` in the
    // markup makes a duplicated TITLE a React key collision as well.
    const titles = SECTIONS.map((section) => section.title)
    const bodies = SECTIONS.map((section) => section.body)
    expect(new Set(titles).size, titles.join(', ')).toBe(titles.length)
    expect(new Set(bodies).size, bodies.join(', ')).toBe(bodies.length)
  })

  it('keeps its section list out of the client component', () => {
    // THE REGRESSION THIS FILE WAS WRITTEN AGAINST, stated as an assertion rather than
    // left in a header: the array moved to `lib/` so that a test could read it, and a
    // refactor that moved it back would take every check above with it while changing
    // nothing on screen. The component must draw the imported list and declare none.
    const component = readFileSync(webapp('../components/site/privacy/PrivacyContent.tsx'), 'utf8')
    expect(component).toContain("from '@/lib/privacyPage'")
    expect(component).not.toMatch(/^const SECTIONS/m)
  })

  it('turns its clauses without an em dash', () => {
    // The house punctuation rule, and this family is where it is easiest to break: these
    // are the longest paragraphs on the site and every one of them was rewritten from a
    // read of the code. A period, a colon or a comma instead. Both languages, because
    // the French is where a stray one is least likely to be noticed in review.
    // `?? ''` so a key that is missing outright fails in the assertion above, which
    // names it, rather than here as an unreadable complaint about `undefined`.
    for (const key of ALL_KEYS) {
      expect(site(key) ?? '', `en.${key}`).not.toContain('—')
      expect(siteFr(key) ?? '', `fr.${key}`).not.toContain('—')
    }
  })

  it('renders the real page behind the path', () => {
    // `PUBLIC_PATHS` cannot check this half: a listed path with no page behind it is a
    // clean 404, which is honest and still a dead link in the footer of every public
    // page. `features.test.ts` pins a visual to its component the same way.
    const file = webapp(`../app/(marketing)${PRIVACY_PATH}/page.tsx`)
    expect(existsSync(file), `app/(marketing)${PRIVACY_PATH}/page.tsx`).toBe(true)

    const page = readFileSync(file, 'utf8')
    expect(page).toContain('<PrivacyContent')
    expect(page).not.toContain('PlaceholderContent')
  })

  it('points at a path the public site owns', () => {
    // ABSENT FROM `PUBLIC_PATHS` THIS IS NOT A 404. `hostRouting.ts` sends every path
    // that list does not name to the app host, so the footer's "Privacy" link would 307
    // the reader to a login form on `app.magic-slash.io` — a reader asking what we
    // collect, answered with a sign-in wall, which is the least reassuring outcome that
    // question has. Read as text: the paths are literals inside a `Set`.
    const routing = readFileSync(webapp('./hostRouting.ts'), 'utf8')
    expect(routing, `${PRIVACY_PATH} in PUBLIC_PATHS`).toContain(`'${PRIVACY_PATH}',`)
  })

  it('leads with the page title and closes on the way to ask', () => {
    // The chrome is four keys and each one has a job the section list cannot cover: the
    // `h1`, the line under it, and the two halves of the footnote. The footnote's LABEL
    // is a key while its href is a JS constant, which is the rule `i18n.test.ts`
    // enforces from the other side — no `<a>` in a translated string.
    expect(PAGE_CHROME.title).toBe('site.privacy.title')
    expect(Object.keys(PAGE_CHROME)).toEqual(['title', 'lead', 'askLead', 'askLink'])
  })
})
