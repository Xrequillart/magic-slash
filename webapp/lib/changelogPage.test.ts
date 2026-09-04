import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  CATEGORIES,
  formatReleaseDate,
  isKnownCategory,
  PAGE_CHROME,
  VERSIONS_PER_PAGE,
} from './changelogPage'
import { marketingEn } from './i18n/marketing/en'
import { marketingFr } from './i18n/marketing/fr'

/**
 * Runs in the ROOT vitest suite on the root `node_modules`, which is the reason
 * `lib/changelogPage.ts` may import nothing but `./i18n` — see the note on that file.
 * THIS TEST EXISTING IS WHAT KEEPS THAT TRUE: add a `react`, a `next/*` or a
 * `lucide-react` import over there and this fails to RESOLVE rather than shipping a page
 * that drags a bundle into a module doing arithmetic on a date.
 *
 * The other half of its job is the one a type cannot do here. `tsc` never runs on
 * `webapp/` in CI (`.github/workflows/ci.yml` typechecks `desktop/` only), so the
 * `MessageKey` unions in `PAGE_CHROME` and `CATEGORIES` guarantee nothing — and `t()`
 * has no per-key fallback, so a key that does not exist renders as an empty element
 * rather than as an error. A regex on the SHAPE of a key would not help: `site.changelog.oops`
 * is shaped perfectly. So every key is looked up in the catalogue for real.
 *
 * NOTE what is NOT tested here, because it belongs to the module next door:
 * `lib/changelog.ts` reads and parses `CHANGELOG.md` with `node:fs`. The one thing this
 * file borrows from it is the CATEGORY REGEX, read as text rather than imported, so the
 * two lists cannot drift apart in silence.
 */

describe('the changelog page chrome', () => {
  it('names a key the catalogues actually carry', () => {
    // Both catalogues, not just English: `i18n.test.ts` asserts French has every English
    // key, so this could rest on that — but the failure it would produce over there is
    // "fr is missing site.changelog.lead", which does not say who wanted it. Here it does.
    for (const key of Object.values(PAGE_CHROME)) {
      expect(marketingEn[key], `en.${key}`).toBeTruthy()
      expect((marketingFr as Record<string, string>)[key], `fr.${key}`).toBeTruthy()
    }

    for (const { label } of Object.values(CATEGORIES)) {
      expect(marketingEn[label], `en.${label}`).toBeTruthy()
      expect((marketingFr as Record<string, string>)[label], `fr.${label}`).toBeTruthy()
    }
  })

  it('dresses every category the parser can produce', () => {
    /**
     * READ OUT OF THE SOURCE, not imported. `lib/changelog.ts` opens `node:fs` at module
     * scope — harmless in this suite, but its export is a PARSER, and what this test
     * needs is the list of headings that parser recognises, which is a literal inside a
     * regex rather than a value it exports.
     *
     * So the regex is matched as text. That is the same technique
     * `homepageStylesheet.test.ts` and `marketingCss.test.ts` use, and it is here for
     * the reason those two exist: a fourth heading added to the parser — `Removed`,
     * `Deprecated`, the two Keep-a-Changelog sections this project does not write yet —
     * would render on the page under a raw English label and a neutral dot, which is a
     * silent half-failure. This turns it into a red test naming the missing entry.
     */
    const source = readFileSync(fileURLToPath(new URL('./changelog.ts', import.meta.url)), 'utf8')
    const match = /\^### \(([A-Za-z|]+)\)/.exec(source)

    expect(match, '`parseChangelog`’s category regex could not be found in lib/changelog.ts').not.toBeNull()

    const parsed = match![1].split('|')
    expect(parsed.sort()).toEqual(Object.keys(CATEGORIES).sort())

    for (const type of parsed) expect(isKnownCategory(type), type).toBe(true)
    expect(isKnownCategory('Removed')).toBe(false)
  })

  it('gives every category a hue the palette declares, and the page a dot for it', () => {
    /**
     * TWO FILES THIS SUITE CANNOT IMPORT — `tailwind.config.ts` pulls in the Tailwind
     * types and `ChangelogContent.tsx` is a `'use client'` React module — so both are
     * read as text. Same technique `homepageStylesheet.test.ts` and `marketingCss.test.ts`
     * use, and here it closes the loop a `Record` cannot: `CATEGORIES` names a HUE, the
     * component maps it to a class, and the palette is what makes that class exist.
     * A hue with no colour token emits no class at all — Tailwind never sees it — and
     * the dot renders invisible rather than wrong, which is the failure nobody notices.
     */
    const config = readFileSync(fileURLToPath(new URL('../tailwind.config.ts', import.meta.url)), 'utf8')
    const view = readFileSync(
      fileURLToPath(new URL('../components/site/changelog/ChangelogContent.tsx', import.meta.url)),
      'utf8',
    )

    for (const { hue } of Object.values(CATEGORIES)) {
      expect(config, `${hue} is not a colour in tailwind.config.ts`).toMatch(
        new RegExp(`^\\s*${hue}:`, 'm'),
      )
      expect(view, `ChangelogContent has no dot for ${hue}`).toMatch(
        new RegExp(`^\\s*${hue}: 'bg-${hue}',`, 'm'),
      )
    }

    // `brand` is the primary CTA fill and nothing on this page is one.
    expect(Object.values(CATEGORIES).map((c) => c.hue)).not.toContain('brand')
  })

  it('shows a first screen worth reading and asks for more in the same size', () => {
    // A count, not a shape — but a `0` here renders an empty page with a button under it
    // and nothing says so, and `Infinity` puts 238 releases in the HTML.
    expect(VERSIONS_PER_PAGE).toBeGreaterThan(10)
    expect(VERSIONS_PER_PAGE).toBeLessThan(60)
  })
})

describe('formatReleaseDate', () => {
  it('prints the day the file says, in the reader’s language', () => {
    expect(formatReleaseDate('2026-09-03', 'en')).toBe('September 3, 2026')
    expect(formatReleaseDate('2026-09-03', 'fr')).toBe('3 septembre 2026')
  })

  /**
   * THE BUG THIS FUNCTION EXISTS TO AVOID, and the reason it does not call
   * `new Date(iso)`.
   *
   * A bare `YYYY-MM-DD` is specified as UTC midnight, while `toLocaleDateString` prints
   * in the runtime's own zone — so `new Date('2026-01-01')` formats as December 31st for
   * every reader west of Greenwich. That is most of the Americas, and it would have made
   * every release on the page a day early for them with nothing on the page to hint at
   * it.
   *
   * `TZ` is set for the process before the module under test does any date arithmetic;
   * the format below is deliberately a January 1st, which is the date where an hours-long
   * shift crosses a year as well as a day.
   */
  it('does not slip a day in a timezone behind UTC', () => {
    const previous = process.env.TZ
    try {
      process.env.TZ = 'America/Los_Angeles'
      expect(formatReleaseDate('2026-01-01', 'en')).toBe('January 1, 2026')
    } finally {
      process.env.TZ = previous
    }
  })

  it('hands back anything that is not a date, untouched', () => {
    // The input is parsed out of a markdown file at build time, so a malformed line is a
    // plausible input — and printing what the file said is a better bug report than
    // printing "Invalid Date".
    expect(formatReleaseDate('unreleased', 'en')).toBe('unreleased')
    expect(formatReleaseDate('2026-9-3', 'en')).toBe('2026-9-3')
    expect(formatReleaseDate('', 'en')).toBe('')
  })

  it('falls back to English when no language is passed', () => {
    expect(formatReleaseDate('2026-09-03')).toBe(formatReleaseDate('2026-09-03', 'en'))
  })
})
