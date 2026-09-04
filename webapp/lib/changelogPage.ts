import { localeOf } from './i18n'
import type { MessageKey } from './i18n'
import { DEFAULT_LANGUAGE, type LanguageId } from './i18n/languages'

/**
 * Everything `/changelog` needs that is NOT the changelog itself: the page's copy keys,
 * the tone each category wears, and the one date format the page prints.
 *
 * SEPARATE FROM `lib/changelog.ts`, and that separation is load-bearing rather than
 * tidy. That module reads `CHANGELOG.md` off the disk with `node:fs`, which makes it
 * server-only — importing it from a `'use client'` component is a build error, and
 * deliberately so. This one imports nothing but the catalogues, so the client tree can
 * have it. The two halves of "the changelog page" therefore split along the boundary
 * Next actually enforces: the file read on one side, the presentation on the other.
 *
 * ZERO RUNTIME IMPORTS BAR `./i18n`, the same hard constraint `lib/features.ts` is
 * written under and for the same reason: `changelogPage.test.ts` runs in the ROOT vitest
 * suite, on the root `node_modules`, and CI never installs `webapp/`'s dependencies (see
 * the note in `vitest.config.ts`). A `react`, `next/*` or `lucide-react` import at any
 * depth from here would not fail that test — it would fail to RESOLVE it, which reads as
 * a broken suite instead of as a broken module. `./i18n` and `./i18n/languages` are both
 * pure; `i18n.test.ts` already rests on that.
 */

/**
 * The page's chrome, as catalogue keys.
 *
 * Named here rather than spelled out in the markup for the reason `features.ts`'s
 * `PAGE_CHROME` gives: `tsc` never runs on `webapp/` in CI (`.github/workflows/ci.yml`
 * typechecks `desktop/` only), so a `MessageKey` union over there guarantees nothing —
 * and `t()` has no per-key fallback, so a key that does not exist renders as an empty
 * element rather than as an error. Keys named in THIS module are keys the root suite
 * looks up in the catalogue for real.
 */
export const PAGE_CHROME = {
  /** The page's `h1`. */
  title: 'site.changelog.title',
  /** The one line under it. */
  lead: 'site.changelog.lead',
  /** The hero's link out to the file this page is rendered from. */
  readOnGithub: 'site.changelog.readOnGithub',
  /** The button under the list, while there are older versions left to show. */
  showMore: 'site.changelog.showMore',
  /** Shown instead of the list when `CHANGELOG.md` could not be read at build time. */
  unavailable: 'site.changelog.unavailable',
} as const satisfies Record<string, MessageKey>

/**
 * The three headings `parseChangelog` recognises → the copy and the hue each one wears.
 *
 * KEYED BY THE PARSER'S OWN STRINGS, which is what makes this the place a fourth
 * category would announce itself: `parseChangelog` matches `### (Added|Changed|Fixed)`,
 * so those three are the whole domain, and `changelogPage.test.ts` pins the two lists
 * against each other by reading that regex out of the source.
 *
 * THE CATEGORY NAMES ARE TRANSLATED AND THE ENTRIES ARE NOT, which looks inconsistent
 * on a French screen until you see where the line is. The entries are written from
 * commit messages at release time and have no French source to render — that is the
 * note the old `Changelog.tsx` carried before this page existed, and it still holds.
 * These three words are not entries; they are the page's own structure, the same as its
 * heading and its button, and structure is translated.
 *
 * A HUE, NOT A CLASS. `lib/features.ts` names a `plate` ground and lets `LogoPlate` in
 * `components/ui.tsx` map it to a recipe; same split here, and for the same reason —
 * this module is read by a test that cannot import a React component, so a Tailwind
 * class string in it would be an untestable literal. `ChangelogContent` owns the map.
 *
 * NEVER `brand`: the token table reserves it for the primary CTA fill, and there is
 * nothing to press on this page but the button at the bottom of it.
 */
export const CATEGORIES = {
  Added: { label: 'site.changelog.added', hue: 'green' },
  Changed: { label: 'site.changelog.changed', hue: 'accent' },
  Fixed: { label: 'site.changelog.fixed', hue: 'yellow' },
} as const satisfies Record<string, { label: MessageKey; hue: string }>

export type ChangelogCategoryType = keyof typeof CATEGORIES

/** Whether a heading out of `CHANGELOG.md` is one this page knows how to dress. */
export function isKnownCategory(type: string): type is ChangelogCategoryType {
  return Object.prototype.hasOwnProperty.call(CATEGORIES, type)
}

/**
 * `2026-09-03` → `September 3, 2026` (`3 septembre 2026` in French).
 *
 * PARSED FIELD BY FIELD RATHER THAN HANDED TO `new Date(iso)`, and that is a correctness
 * fix rather than a preference. A bare `YYYY-MM-DD` is specified as UTC midnight, while
 * `toLocaleDateString` prints it in the reader's own zone — so every release date on this
 * page would render one day EARLY for anyone west of Greenwich, which is most of the
 * Americas and therefore most of the traffic. Building the date from the three numbers
 * makes it local midnight, and local midnight formats as the day it says.
 *
 * A string that is not a date is returned untouched. The changelog is parsed out of a
 * markdown file at build time, so a malformed line is a plausible input, and printing
 * `2026-09-3x` is a better bug report than printing `Invalid Date`.
 */
export function formatReleaseDate(date: string, lang: LanguageId = DEFAULT_LANGUAGE): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) return date

  const at = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  if (Number.isNaN(at.getTime())) return date

  return at.toLocaleDateString(localeOf(lang), { day: 'numeric', month: 'long', year: 'numeric' })
}

/**
 * How many versions the page opens on, and how many more each press of the button adds.
 *
 * THERE ARE OVER TWO HUNDRED OF THEM, which is the whole reason this number exists. The
 * reference page this one is modelled on renders its entire history in one document; it
 * has a fraction of the releases, and this project ships several a week. Every version
 * in the HTML would be a payload measured in hundreds of kilobytes for a reader who came
 * to see what changed last Tuesday.
 *
 * 25 rather than the 15 the documentation section used: a page whose ONLY subject is the
 * changelog can afford a longer first screen than a section at the bottom of a manual,
 * and 25 covers roughly the last two months of releases — which is the question almost
 * everybody arrives with.
 */
export const VERSIONS_PER_PAGE = 25
