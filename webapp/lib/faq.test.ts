import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { PAGE_CHROME, QUESTIONS } from './faq'
import { marketingEn } from './i18n/marketing/en'
import { marketingFr } from './i18n/marketing/fr'

/**
 * Runs in the ROOT vitest suite on the root `node_modules`, which is the reason
 * `lib/faq.ts` may import nothing but `./i18n` — see the note on that file. THIS TEST
 * EXISTING IS WHAT KEEPS THAT TRUE: add a `react`, a `next/*` or a `lucide-react` import
 * over there and this fails to RESOLVE rather than shipping a page that drags a bundle
 * into a list of eleven strings.
 *
 * The other half of its job is the one a type cannot do here. `tsc` never runs on
 * `webapp/` in CI (`.github/workflows/ci.yml` typechecks `desktop/` only), so the
 * `MessageKey` unions in `PAGE_CHROME` and `QUESTIONS` guarantee nothing — and `t()` has
 * no per-key fallback, so a key that does not exist renders as an EMPTY element rather
 * than as an error. On this page that failure is invisible in the worst possible way: an
 * accordion row that opens onto nothing at all. Every key is therefore looked up in both
 * catalogues for real.
 *
 * Same shape and same reasoning as `changelogPage.test.ts` next door.
 */

const site = (key: string) => (marketingEn as Record<string, string>)[key]
const siteFr = (key: string) => (marketingFr as Record<string, string>)[key]

describe('the FAQ page', () => {
  it('names keys the catalogues actually carry', () => {
    // Both catalogues, not just English: `i18n.test.ts` asserts French has every English
    // key, so this could rest on that — but the failure it would produce over there is
    // "fr is missing site.faq.updates.a", which does not say who wanted it. Here it does.
    for (const key of Object.values(PAGE_CHROME)) {
      expect(site(key), `en.${key}`).toBeTruthy()
      expect(siteFr(key), `fr.${key}`).toBeTruthy()
    }

    for (const { id, question, answer } of QUESTIONS) {
      expect(site(question), `en.${question} (${id})`).toBeTruthy()
      expect(siteFr(question), `fr.${question} (${id})`).toBeTruthy()
      expect(site(answer), `en.${answer} (${id})`).toBeTruthy()
      expect(siteFr(answer), `fr.${answer} (${id})`).toBeTruthy()
    }
  })

  it('keys every question by its own subject', () => {
    // The keys are `site.faq.<id>.{q,a}` and the `id` is also the URL fragment, so the
    // three have to agree — a row whose `id` says `credentials` while its keys say
    // `security` renders correctly and gives `/faq#credentials` to a question that is
    // not about credentials. Nothing else would notice.
    for (const { id, question, answer } of QUESTIONS) {
      expect(question, id).toBe(`site.faq.${id}.q`)
      expect(answer, id).toBe(`site.faq.${id}.a`)
    }
  })

  it('gives every row a distinct anchor', () => {
    // `id` is the React key AND the fragment. A duplicate is two rows that scroll to
    // each other and a console warning nobody reads in production.
    const ids = QUESTIONS.map((entry) => entry.id)
    expect(new Set(ids).size, ids.join(', ')).toBe(ids.length)
  })

  it('asks about ten questions — enough to be worth a page, few enough to stay flat', () => {
    // NOT a spec of the exact number, which is copy and moves. The bounds are where the
    // page's two design decisions stop holding: below ~6 rows a route of its own is
    // worse than a band on the homepage (which is where these questions came from), and
    // past ~15 a single uncategorised list is something a reader has to scan rather than
    // take in — `lib/faq.ts` says as much. Cross either and the PAGE wants rethinking,
    // which is what a red test here means.
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(6)
    expect(QUESTIONS.length).toBeLessThanOrEqual(15)
  })

  it('answers in a paragraph, and asks in a line', () => {
    // The rows are a disclosure widget, and a collapsed row is a promise that opening it
    // is cheap. These caps are that promise, in characters: an answer that grows into a
    // page of prose belongs somewhere a reader can scan it, not behind a chevron — and a
    // question long enough to wrap twice stops working as the thing you scan the page by.
    //
    // Measured on BOTH languages, because French runs ~15-20% longer than English and
    // the English copy is what gets written first.
    for (const { id, question, answer } of QUESTIONS) {
      for (const [lang, read] of [
        ['en', site],
        ['fr', siteFr],
      ] as const) {
        expect(read(question).length, `${lang}.${id} question`).toBeLessThanOrEqual(90)
        expect(read(answer).length, `${lang}.${id} answer`).toBeLessThanOrEqual(600)
      }
    }
  })

  it('keeps its answers inside the markup `RichText` renders', () => {
    // `FaqContent` hands the answers to `RichText`, which is `dangerouslySetInnerHTML`.
    // `i18n.test.ts` already caps the whole site catalogue at `<br>`, `<strong>`,
    // `<code>` and `<em>`; this narrows it further for the answers specifically, because
    // a `<ul>` or a `<p>` in one of these strings would not be caught as unsafe — it
    // would be caught as a nested `<p>` inside the `<p>` this page renders, which is
    // invalid HTML the browser silently reparses into something else.
    const ALLOWED = /^<\/?(br|strong|code|em)>$/

    for (const { id, answer } of QUESTIONS) {
      for (const [lang, read] of [
        ['en', site],
        ['fr', siteFr],
      ] as const) {
        for (const tag of read(answer).match(/<[^>]+>/g) ?? []) {
          expect(ALLOWED.test(tag), `${lang}.${id} contains ${tag}`).toBe(true)
        }
      }
    }
  })

  it('asks its questions as questions', () => {
    // A row that is not a question is a row that belongs in `/features`. The mark is
    // language-specific only in its spacing — French puts a non-breaking space before
    // it — so both catalogues are checked against the same character.
    for (const { id, question } of QUESTIONS) {
      expect(site(question).trimEnd().endsWith('?'), `en.${id}`).toBe(true)
      expect(siteFr(question).trimEnd().endsWith('?'), `fr.${id}`).toBe(true)
    }
  })
})

/**
 * THE PAGE IS DELETED, AND THIS IS WHAT KEEPS IT DELETED.
 *
 * `/documentation` was 16 sections, a route group of its own, a 666-line stylesheet and
 * 675 positional catalogue keys, and it came back once already — as three rows in the
 * footer pointing at anchors inside it. What makes this worth a test rather than a note
 * is that every part of the removal fails SILENTLY in a different direction: a `docEn`
 * import re-added to `lib/i18n/index.ts` type-checks and runs, and a `(docs)` route
 * group restored from a merge renders a page nothing links to.
 *
 * Read as TEXT and by directory listing, because the point is what is NOT there — there
 * is nothing left to import.
 */
describe('the documentation page it replaces', () => {
  const webapp = (relative: string) => fileURLToPath(new URL(`../${relative}`, import.meta.url))

  it('has no route, no components and no catalogue left', () => {
    for (const gone of [
      'app/(docs)',
      'components/site/documentation',
      'lib/i18n/marketing/doc-en.ts',
      'lib/i18n/marketing/doc-fr.ts',
    ]) {
      expect(
        () => readFileSync(webapp(gone)),
        `${gone} is back. \`/documentation\` was retired in favour of \`/faq\`, \`/features\` and \`/changelog\` — see \`RETIRED_PATHS\` in \`lib/hostRouting.ts\`.`,
      ).toThrow()
    }
  })

  it('is no longer merged into the message catalogue', () => {
    // The `site.doc.*` family is what `MessageKey` used to reach through `docEn`. A
    // single one of those keys back in the site catalogue means the manual is being
    // rebuilt one paragraph at a time, which is how it grew the first time.
    const stragglers = Object.keys(marketingEn).filter((key) => key.startsWith('site.doc.'))
    expect(stragglers, `site.doc.* keys back in the site catalogue: ${stragglers.join(', ')}`).toEqual([])

    // Matched on the IMPORT PATH, not on the names `docEn`/`docFr` — that module's own
    // header explains at length what those two used to be, and a rule about what the
    // code does may not be failed by the prose protecting it. Same call
    // `homepageStylesheet.test.ts` makes about its own comments.
    const index = readFileSync(webapp('lib/i18n/index.ts'), 'utf8')
    expect(index, '`lib/i18n/index.ts` imports a doc catalogue again').not.toMatch(
      /(?:import\s+[^'"\n]*from\s*|require\s*\(\s*)['"][^'"]*marketing\/doc-/,
    )
  })
})
