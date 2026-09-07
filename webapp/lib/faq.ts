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

/**
 * The route, next to the page's own data for `lib/workflow.ts`'s reason: a band on the
 * homepage links here, and a component should not have to know the site's URL shape to
 * do it.
 *
 * NOT PLUMBED THROUGH THE FOOTER, which spells `/faq` itself. Its columns are a table of
 * route literals — `/features`, `/changelog`, `/story` — and importing a constant for one
 * row of five would read as that row being special when it is not.
 */
export const FAQ_PATH = '/faq'

/**
 * The chrome of the FAQ BAND on the homepage, which is a different surface from this page
 * and therefore has its own copy.
 *
 * ITS OWN KEYS AND NOT `PAGE_CHROME`'s, and that is a fix rather than a preference —
 * `FinalCtaSection` learned it the hard way, and its header records it: `site.cta.*` was
 * shared with `/story`, so retuning the homepage's closing band through those keys
 * silently rewrote a page nobody had opened. The two surfaces also want different
 * sentences. This page's `title` is "Frequently asked questions", which is what an `h1`
 * over eleven rows should say and is a poor thing to put on a band a reader arrives at
 * after five screens of product; and its `lead` describes the whole page, where the band
 * has to account for showing five questions out of eleven.
 *
 * WHAT IS SHARED IS THE QUESTIONS, and only them: see `HOME_QUESTION_IDS`. The band is a
 * window onto this list, not a copy of part of it.
 */
export const HOME_CHROME = {
  /** The band's `h2`. */
  title: 'site.homeFaq.title',
  /** The line under it, which is also where the five-out-of-eleven is accounted for. */
  subtitle: 'site.homeFaq.subtitle',
  /** The button out to this page. */
  cta: 'site.homeFaq.cta',
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

/**
 * THE FIVE THE HOMEPAGE BAND SHOWS, by id, in the order it shows them.
 *
 * NAMED AND NOT SLICED. `QUESTIONS.slice(0, 5)` is the same five rows today and it is
 * the wrong mechanism: the order up there is an ARGUMENT about how a reader arrives at
 * the eleven, and it is expected to move — insert a question at the top and the homepage
 * silently drops `trackers` for it, with nothing in either file to say the homepage had
 * an opinion. Naming them is what makes the band survive a reorder of the page, the same
 * call `CARD_TONE_CYCLE` makes about a tone that means something.
 *
 * WHY THESE FIVE. The band sits after five screens of product and immediately before the
 * download, so its job is the doubt that stops a reader pressing the button — not the
 * doubt that arrives a week later. Those are the two DISQUALIFYING questions (is this
 * for me, what does it cost) and the three about whether it will run at all here
 * (prerequisites, platforms, tracker). Deliberately NOT on the band: `credentials`,
 * `updates` and `uninstall`, which nobody asks before installing, and `commitFormat` and
 * `languages`, which are reassurance a reader has to already be interested to want.
 *
 * FIVE IS THE PRODUCT OWNER'S NUMBER, and it happens to be the length the layout wants:
 * the band is a two-column row, and five collapsed plates beside a title, a paragraph
 * and a button is roughly the same height on either side. Change the count and the
 * shorter column starts floating.
 *
 * IDS RATHER THAN THE ROWS THEMSELVES, so this list cannot drift out of step with the
 * page: the band renders whatever `QUESTIONS` currently says about `developer`, and a
 * reworded question or a corrected answer reaches both surfaces at once. `faq.test.ts`
 * pins that every id here is one the page actually has — a typo would otherwise be a
 * silently missing row.
 */
export const HOME_QUESTION_IDS = [
  'developer',
  'price',
  'prerequisites',
  'platforms',
  'trackers',
] as const satisfies readonly (typeof QUESTIONS)[number]['id'][]

/**
 * The same five as rows, resolved against `QUESTIONS` — which is what the band maps over.
 *
 * `find` rather than a lookup table, because eleven entries do not want an index, and
 * the `!` is safe for a reason a reader can check rather than take on trust: the type of
 * `HOME_QUESTION_IDS` is the union of `QUESTIONS`'s own ids, so an id that is not in the
 * list fails `tsc` at the declaration above. `faq.test.ts` asserts it again for CI, where
 * `tsc` never runs on this tree.
 */
export const HOME_QUESTIONS = HOME_QUESTION_IDS.map(
  (id) => QUESTIONS.find((entry) => entry.id === id)!,
)
