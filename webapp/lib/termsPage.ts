import type { MessageKey } from './i18n'
import type { LegalSection } from './privacyPage'

/**
 * What `/terms` is made of: its chrome, and the eight headed clauses it renders in
 * order. The SENTENCES are in `lib/i18n/marketing/{en,fr}.ts`; this is the list of keys
 * that says which of them the page actually reads.
 *
 * `lib/privacyPage.ts`'s shape, deliberately identical, and the header on that file
 * carries the full argument. The short version, because it applies here word for word:
 * these keys used to be an array inside a `'use client'` component, justified by a
 * typecheck that only ever runs on Vercel — `.github/workflows/ci.yml` typechecks
 * `desktop/` alone — while `t()` renders a key it does not know as an EMPTY paragraph.
 * A clause with a heading and nothing under it is the worst failure a terms page has,
 * and it is the one failure nothing on a pull request could see. `termsPage.test.ts`
 * looks every key below up in both catalogues for real.
 *
 * ZERO RUNTIME IMPORTS BAR `./i18n` (as a TYPE, erased by esbuild): the root vitest
 * suite runs on the ROOT `node_modules` and CI never installs `webapp/`'s own, so a
 * `react` or `next/*` import at any depth from here would fail to RESOLVE the test
 * rather than fail it.
 *
 * SEPARATE FROM `lib/privacyPage.ts` RATHER THAN ONE `legalPages.ts`, which was the
 * other way to write this. The two pages share a frame and share nothing else: one is a
 * description of a database schema, the other a set of clauses about a licence and an
 * account, and they are edited by different reads of different files. A single module
 * would make every future change to one of them a diff that touches the other, on the
 * two pages where a diff that looks bigger than it is costs the most to review. The
 * `LegalSection` type is the one thing genuinely common to both, and it is imported
 * from next door rather than declared twice.
 */

/** The page's chrome, as catalogue keys. */
export const PAGE_CHROME = {
  /** The page's `h1`. */
  title: 'site.terms.title',
  /** The one line under it. */
  lead: 'site.terms.lead',
  /** The first footnote: the licence itself. The href is `LICENSE_URL`, composed in JSX. */
  licenseLink: 'site.terms.licenseLink',
  /** The second: the place to ask about any of the above, at `NEW_ISSUE_URL`. */
  askLink: 'site.terms.askLink',
} as const satisfies Record<string, MessageKey>

/**
 * The route. Named here for the reason `PRIVACY_PATH` is, and with the same failure
 * behind it: absent from `PUBLIC_PATHS` (`lib/hostRouting.ts`) this path does not 404,
 * it 307s the reader to a login form on `app.magic-slash.io`. `termsPage.test.ts` pins
 * the pair, and `hostRouting.test.ts` pins it against the href `SiteFooter.tsx` spells
 * out in its copyright row.
 */
export const TERMS_PATH = '/terms'

/**
 * The clauses, in reading order.
 *
 * What the thing IS comes first, then the two grants (the licence, the account), then
 * the two responsibilities that are genuinely the reader's and are the reason this page
 * is not boilerplate: an agent runs commands on their machine, and the trackers and
 * models it drives are their accounts under someone else's terms. The disclaimers come
 * last, where disclaimers belong: after what was actually offered.
 */
export const SECTIONS: readonly LegalSection[] = [
  { title: 'site.terms.what.title', body: 'site.terms.what.body' },
  { title: 'site.terms.license.title', body: 'site.terms.license.body' },
  { title: 'site.terms.account.title', body: 'site.terms.account.body' },
  { title: 'site.terms.machine.title', body: 'site.terms.machine.body' },
  { title: 'site.terms.thirdParty.title', body: 'site.terms.thirdParty.body' },
  { title: 'site.terms.acceptable.title', body: 'site.terms.acceptable.body' },
  { title: 'site.terms.warranty.title', body: 'site.terms.warranty.body' },
  { title: 'site.terms.changes.title', body: 'site.terms.changes.body' },
]

/** Every key the page reads, flat — what `termsPage.test.ts` looks up in both catalogues. */
export const ALL_KEYS: readonly MessageKey[] = [
  ...Object.values(PAGE_CHROME),
  ...SECTIONS.flatMap((section) => [section.title, section.body]),
]
