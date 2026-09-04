import type { MessageKey } from './i18n'

/**
 * What `/faq` asks and answers, in the order it asks it.
 *
 * A MODULE RATHER THAN A LIST IN THE MARKUP, on `lib/changelogPage.ts`'s shape and for
 * the same two reasons. The first is that the page's content and the page's rendering
 * are edited on completely different cadences: a new question is a row here and a pair
 * of catalogue entries, with nothing to touch in the component. The second is that this
 * file is TESTABLE and the component is not — `faq.test.ts` runs in the root vitest
 * suite and looks every key below up in both catalogues for real.
 *
 * ZERO RUNTIME IMPORTS BAR `./i18n`, and that is a hard constraint rather than a
 * preference — the same one `lib/features.ts` and `lib/changelogPage.ts` are written
 * under. The root suite runs on the ROOT `node_modules`, and CI never installs
 * `webapp/`'s dependencies (see the note in `vitest.config.ts`), so a `react`,
 * `next/*` or `lucide-react` import at any depth from here would not FAIL that test —
 * it would fail to resolve it, which reads as a broken suite instead of a broken
 * module. `./i18n` is pure; `i18n.test.ts` already rests on that.
 *
 * WHY THE KEYS ARE NAMED HERE rather than spelled out in the markup: `tsc` never runs
 * on `webapp/` in CI (`.github/workflows/ci.yml` typechecks `desktop/` only), so a
 * `MessageKey` union over in a component guarantees nothing — and `t()` has no per-key
 * fallback, so a key that does not exist renders as an EMPTY element rather than as an
 * error. A missing answer would therefore be an accordion row that opens onto nothing.
 * Keys named in this module are keys the root suite verifies.
 */

/** The page's chrome, as catalogue keys. */
export const PAGE_CHROME = {
  /** The page's `h1`. */
  title: 'site.faq.title',
  /** The one line under it. */
  lead: 'site.faq.lead',
  /** The line under the last row, for the question this page did not answer. */
  stillStuck: 'site.faq.stillStuck',
  /** The link beside it. */
  openIssue: 'site.faq.openIssue',
  /** The label of the link to this page, wherever the site offers one. */
  faq: 'site.footer.faq',
} as const satisfies Record<string, MessageKey>

/** One row of the page: a question, its answer, and the id its anchor is built from. */
type Question = {
  /**
   * The subject, in kebab-free camelCase to match the catalogue key it mirrors. It is
   * also the URL fragment (`/faq#credentials`), which is the reason it is a WORD rather
   * than an index: `/faq#3` would move the day a question is inserted above it, and
   * these links get pasted into support replies and issue comments.
   */
  id: string
  question: MessageKey
  answer: MessageKey
}

/**
 * The eleven questions, TOP TO BOTTOM AS THE PAGE READS THEM.
 *
 * The order is the argument, and it runs from "should I even try this" to "how do I get
 * rid of it" — roughly the order a visitor arrives with them:
 *
 *   1. the two disqualifying questions — is this for me, what does it cost. Someone who
 *      answers no to either has no reason to read the other nine, and burying them
 *      further down wastes their afternoon and our credibility.
 *   2. what it takes to run — prerequisites, platforms.
 *   3. whether it fits the way they already work — tracker, language, commit format,
 *      terminal versus the app. This is the bulk of the page and the bulk of the doubt.
 *   4. the two questions asked only once someone is already committed — where the
 *      tokens live, how it updates.
 *   5. how to leave. Last, and present on purpose: a product that hides its uninstall
 *      is telling you something about itself.
 *
 * NOT GROUPED INTO CATEGORIES, which the reference page (`cleanshot.com/faq`) also does
 * not do. Eleven rows fit on a screen and a half collapsed; headings over groups of two
 * and three would add a level of structure the reader has to read PAST to reach the
 * question they came for. The day this list is thirty rows long is the day it wants
 * categories and a filter, and that is a different page.
 *
 * `as const satisfies` rather than a plain annotation, so `id` stays a literal union for
 * anything that wants to address one row — and so a typo in a key is a `tsc` error here
 * as well as a red test in `faq.test.ts`.
 */
export const QUESTIONS = [
  { id: 'developer', question: 'site.faq.developer.q', answer: 'site.faq.developer.a' },
  { id: 'price', question: 'site.faq.price.q', answer: 'site.faq.price.a' },
  {
    id: 'prerequisites',
    question: 'site.faq.prerequisites.q',
    answer: 'site.faq.prerequisites.a',
  },
  { id: 'platforms', question: 'site.faq.platforms.q', answer: 'site.faq.platforms.a' },
  { id: 'trackers', question: 'site.faq.trackers.q', answer: 'site.faq.trackers.a' },
  { id: 'languages', question: 'site.faq.languages.q', answer: 'site.faq.languages.a' },
  {
    id: 'commitFormat',
    question: 'site.faq.commitFormat.q',
    answer: 'site.faq.commitFormat.a',
  },
  { id: 'terminal', question: 'site.faq.terminal.q', answer: 'site.faq.terminal.a' },
  { id: 'credentials', question: 'site.faq.credentials.q', answer: 'site.faq.credentials.a' },
  { id: 'updates', question: 'site.faq.updates.q', answer: 'site.faq.updates.a' },
  { id: 'uninstall', question: 'site.faq.uninstall.q', answer: 'site.faq.uninstall.a' },
] as const satisfies readonly Question[]
