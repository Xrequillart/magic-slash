import type { MagicCommandId } from './commands'
import type { MessageKey } from './i18n'

/**
 * THE LOOP AS FIVE STEPS — the homepage's workflow band, and the `/workflow` page that
 * band's button opens. One list, read by both.
 *
 * A MODULE RATHER THAN A LIST IN THE MARKUP, on `lib/faq.ts`'s and `lib/features.ts`'s
 * shape and for the same three reasons — with a fourth that is specific to this one:
 *
 *   • the content and the rendering are edited on different cadences: a reworded step is
 *     a pair of catalogue entries and nothing else;
 *   • this file is TESTABLE and a component is not — `workflow.test.ts` runs in the root
 *     suite and looks every key below up in both catalogues for real;
 *   • `tsc` never runs on `webapp/` in CI (`.github/workflows/ci.yml` typechecks
 *     `desktop/` only), so a `MessageKey` union inside a component guarantees nothing,
 *     and `t()` has no per-key fallback — a key that does not exist renders as an EMPTY
 *     element rather than as an error. A step whose description silently vanished would
 *     be a coloured card with a title and a hole under it;
 *   • AND THERE ARE TWO CONSUMERS, which the other data modules cannot say. The band on
 *     the homepage draws these five as cards, and `/workflow` draws them as sections with
 *     the commands under each. Two renderings of one list is exactly the case where a
 *     list living in one of them starts to drift from the other.
 *
 * ZERO RUNTIME IMPORTS BAR `./commands` AND `./i18n`, and that is a hard constraint
 * rather than a preference. The root suite runs on the ROOT `node_modules` and CI never
 * installs `webapp/`'s dependencies (see the note in `vitest.config.ts`), so a `react`,
 * `next/*` or `lucide-react` import at any depth from here would not FAIL the test — it
 * would fail to resolve it, which reads as a broken suite instead of a broken module.
 * Both of those are pure; `commands.test.ts` and `i18n.test.ts` already rest on that.
 *
 * ── WHY FIVE, WHEN THERE ARE EIGHT COMMANDS ───────────────────────────────────────
 *
 * Because five is the number of MOMENTS, and eight is the number of commands. Two of the
 * steps below run a pair, and each pair is one motion in practice: nobody runs
 * `/magic:commit` without `/magic:pr` behind it, and `/magic:resolve` exists to answer
 * what `/magic:review` found. Splitting them would give the band seven cards, two of
 * which say "and then the other half of that".
 *
 * `continue` IS THE ONE COMMAND WITH NO STEP, and that is deliberate rather than an
 * omission the test should catch. It is not a stage of a ticket's life — it is how you
 * re-enter one you left, which is a fact about a working DAY and not about a piece of
 * work. `/features` lists it where it belongs, among the eight. `workflow.test.ts` pins
 * that gap as an exact expectation, so a ninth command or a reshuffle cannot quietly
 * drop a step that IS one.
 */

/** The band's and the page's own chrome, as catalogue keys. */
export const WORKFLOW_CHROME = {
  /** The band's `h2`, and the page's `h1`. */
  title: 'site.workflow.title',
  /** The two lines under it, in both places. */
  subtitle: 'site.workflow.subtitle',
  /** The band's button, which opens the page. */
  cta: 'site.workflow.cta',
  /** The page's own closing line, pointing at the full inventory. */
  more: 'site.workflow.more',
  /**
   * THE ONE ENTRY HERE THAT IS NOT CHROME: the last line of the plan card's DRAWING — the
   * GitHub mark, "Issues created", a green tick.
   *
   * It lives in this table anyway, and the reason is coverage rather than tidiness. A key
   * spelled inline in a component is a key nothing pins: `i18n.test.ts` would still see it
   * in both catalogues, so renaming the entry on both sides passes every check and leaves
   * the drawing rendering an EMPTY span — and `t()` has no per-key fallback to catch it.
   * Named here, it goes through `workflow.test.ts`'s catalogue loop with the rest.
   *
   * The drawings' other keys (`site.planCard.*`, `site.startCard.*`, `site.doneCard.*`) are
   * borrowed from `/features` and pinned from that side by `features.test.ts`. This one is
   * ours, so it needed a home.
   */
  planIssuesCreated: 'site.workflow.planIssuesCreated',
} as const satisfies Record<string, MessageKey>

/**
 * The route the band's button opens.
 *
 * HERE RATHER THAN TYPED AT THE CALL SITE, and it is one string used twice — the button
 * that goes there, and `PUBLIC_PATHS` in `lib/hostRouting.ts`, which is what decides
 * whether the apex answers it at all. Those two disagreeing is not a broken link: it is a
 * 307 to a login form on `app.magic-slash.io`, which is worse than a 404 because the
 * reader concludes the site signed them out. `workflow.test.ts` reads that file and pins
 * the pair together.
 */
export const WORKFLOW_PATH = '/workflow'

/**
 * The five, as a type — so a `Record` keyed by one (the drawings, over in
 * `components/site/home/WorkflowArt.tsx`) is exhaustive, and a sixth step is a compile
 * error at the map that forgot to draw it. Same reasoning as `MagicCommandIcon`.
 */
export type WorkflowStepId = 'plan' | 'start' | 'commit' | 'review' | 'done'

/**
 * The tones these five cards ask for by name. A deliberate subset of `CARD_TONES` in
 * `components/ui.tsx`, kept as its own union here for the purity reason above and
 * cross-checked against that table by `workflow.test.ts` — which reads it as TEXT, the
 * trick `features.test.ts` and `designTokens.test.ts` both use on the same file.
 *
 * FIVE GROUNDS ASKED FOR BY NAME, where `/features` admits exactly two (`FeatureTone`),
 * and the gap is the design rather than a lag. That page is a grid of eight cards where
 * the colour means nothing on purpose — a rhythm, not a legend, which is what
 * `CARD_TONE_CYCLE` is for. This band is five cards that ARE five different things in a
 * fixed order, and the colour is part of what each one says: the idea, the loop opening,
 * the deep middle twice over, the loop closing. Two of them already meant exactly that
 * before this band existed — `tailwind.config.ts` reserves `amber` for `/magic:start` and
 * `mint` for `/magic:done`.
 *
 * TWO OF THE FIVE ARE CYCLE TONES, and that is worth being straight about because it was
 * not true for one round. The plan card opened on `lemon` — the warm yellow declared as a
 * ground "the palette offers and nothing names yet" — precisely so that this list could be
 * five grounds none of which the cycle deals. The product owner overruled it on sight:
 * "Peux-tu mettre la card Plan en bg-tone-sky theme stp ! Elle est trop jaune la." So the
 * first card is `sky`, which IS in `CARD_TONE_CYCLE`, and it sits beside `amber` — where
 * `lemon` beside `amber` was two warm grounds a step apart, and that is what "trop jaune"
 * names. The row opens cool and turns warm on the card where work enters the loop, which
 * says more than a warm-on-warm pair ever did.
 *
 * NAMING A CYCLE TONE IS NOT THE THING THE CYCLE FORBIDS. What `CARD_TONE_CYCLE`'s own
 * header warns against is the reverse — "dealing a MEANINGFUL ground positionally", a card
 * getting `amber` because it landed on index 1 — and nothing here is dealt at all: this
 * band never touches the cycle, it reads five names off the rows below. What `sky` costs is
 * smaller and real: it is on the pillars card directly above this band (`StartTerminal`
 * lives on it, and cannot move — see `PillarsSection`), so the page now shows two `sky`
 * cards within one screen of each other. They are a full band apart, at different widths,
 * and the second one opens a row rather than closing one.
 *
 * `lemon` GOES BACK TO BEING UNNAMED, exactly as it was: declared in the config, reachable
 * by any page that wants it, spent by none. `rose` likewise, and it is the one a sixth step
 * would reach for.
 */
export type WorkflowTone = 'sky' | 'amber' | 'midnight' | 'indigo' | 'mint'

export type WorkflowStep = {
  id: WorkflowStepId
  /** The card's ground, and with it its ink. See `WorkflowTone`. */
  tone: WorkflowTone
  title: MessageKey
  description: MessageKey
  /**
   * The commands this step runs, IN THE ORDER YOU RUN THEM.
   *
   * Ids rather than the `/magic:…` strings: `lib/commands.ts` owns the spelling, and its
   * template-literal type is what makes a typo a compile error instead of a command on a
   * marketing page that does not exist. Whoever renders these resolves them through that
   * module — the drawings do, and so does the page.
   */
  commands: readonly MagicCommandId[]
  /**
   * The step that gets the wide card. ONE of the five, and the grid depends on it being
   * one: five equal columns leave a hole wherever you put it, and a four-and-two first
   * row fills it while also saying which step is the beginning.
   *
   * `/magic:plan` is that step because it is the only one with something to show AT WIDTH
   * — a document, and the tickets it becomes. The others are portrait drawings.
   */
  wide?: true
}

export const WORKFLOW_STEPS: readonly WorkflowStep[] = [
  {
    id: 'plan',
    tone: 'sky',
    title: 'site.workflow.planTitle',
    description: 'site.workflow.planDesc',
    commands: ['plan'],
    wide: true,
  },
  {
    id: 'start',
    tone: 'amber',
    title: 'site.workflow.startTitle',
    description: 'site.workflow.startDesc',
    commands: ['start'],
  },
  {
    id: 'commit',
    tone: 'midnight',
    title: 'site.workflow.commitTitle',
    description: 'site.workflow.commitDesc',
    commands: ['commit', 'pr'],
  },
  {
    id: 'review',
    tone: 'indigo',
    title: 'site.workflow.reviewTitle',
    description: 'site.workflow.reviewDesc',
    commands: ['review', 'resolve'],
  },
  {
    id: 'done',
    tone: 'mint',
    title: 'site.workflow.doneTitle',
    description: 'site.workflow.doneDesc',
    commands: ['done'],
  },
]

/**
 * The per-command description keys, by id.
 *
 * THE SAME TABLE `lib/features.ts` KEEPS PRIVATE, and the duplication is deliberate
 * rather than a missed import. Exporting it from there would have made this module depend
 * on the 1,100-line inventory of the whole product to render five sections, and the two
 * are edited by different hands for different pages: `/features` describes a command as
 * one row of an inventory, `/workflow` describes it as a step of a loop. What keeps them
 * honest is that `workflow.test.ts` looks every key below up in both catalogues, so a
 * renamed `site.commands.*` fails here as well as there.
 *
 * `continue` IS IN THE TABLE even though no step names it: the table is keyed by
 * `MagicCommandId`, so it is exhaustive by type, and leaving a hole in it would have made
 * the record partial for the one command whose absence is a decision rather than an
 * oversight. See the header.
 */
export const COMMAND_DESCRIPTIONS: Record<MagicCommandId, MessageKey> = {
  plan: 'site.commands.plan',
  start: 'site.commands.start',
  continue: 'site.commands.continue',
  commit: 'site.commands.commit',
  pr: 'site.commands.pr',
  review: 'site.commands.review',
  resolve: 'site.commands.resolve',
  done: 'site.commands.done',
}
