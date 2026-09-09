'use client'

import { ArrowRight } from 'lucide-react'
import { ButtonNavLink, ToneCard, type ToneCardVisual } from '@/components/ui'
import { useT } from '@/lib/i18n/useLanguage'
import {
  WORKFLOW_CHROME,
  WORKFLOW_PATH,
  WORKFLOW_STEPS,
  type WorkflowStepId,
} from '@/lib/workflow'
import { Reveal } from '../Reveal'
import { ResolveRunTerminal } from './ResolveRunTerminal'
import { HomeHeading, HomeSection } from './Shell'
import { CommitPrArt, MergeCleanArt, PlanSpecArt, StartAgentArt } from './WorkflowArt'

/**
 * The band between the two pillars and the app's own window: WHAT WORKING WITH IT IS
 * ACTUALLY LIKE, as the five steps of the loop — a headline and a line of copy on the
 * left, the ask on the right, then five coloured cards each carrying its own drawing.
 *
 * WHY IT IS HERE, and it answers the question the band above it leaves open. The hero
 * names the outcome and `PillarsSection` says what the product IS — eight skills, and an
 * app that drives them. Neither says what a DAY with it looks like, and "from idea to
 * merged PR" is a claim about a SEQUENCE, so a page that never shows the sequence is
 * asking to be taken on faith. This band is that sequence, in five cards, once.
 *
 * IT SHIPPED BELOW THE APP BAND AND THE OWNER MOVED IT ABOVE, which is worth recording
 * because the original argument was not a bad one: five steps land better for a reader who
 * has already seen the thing that runs them. What the move buys is a page that goes from
 * abstract to concrete without a step back — what it is, what you do with it, then the
 * window where all of that happens — so the window reads as the PAYOFF of these five cards
 * instead of their preface. `app/(marketing)/page.tsx` holds the order and the reasoning
 * for all three middle bands.
 *
 * WHAT IS ON THE BAND IS NOT DECIDED HERE. `lib/workflow.ts` is the source of truth —
 * five steps, in the order you run them, each with its tone, its two catalogue keys and
 * the commands it runs — and `/workflow` renders that same list in depth. This file owns
 * the composition and which drawing goes in which card, and nothing else: a reworded step
 * is a pair of catalogue entries, and a reordered one is a moved row over there.
 *
 * IT IS NOT "HOW IT WORKS" COMING BACK. That band was cut by the product owner and its
 * three moments — you describe, it builds, you approve — were a description of the
 * MECHANISM in the abstract, which is the part the owner judged a landing page does not
 * owe a reader (`app/(marketing)/page.tsx` records the argument and what the cut cost).
 * These five are the opposite kind of thing: each one is a command you type, in the order
 * you type them, drawn as the artefact it produces. `site.how.*` stays retired in the
 * catalogues; nothing here reads it.
 *
 * ── THE COMPOSITION, AND WHERE IT COMES FROM ──────────────────────────────────────
 *
 * The product owner brought CleanShot's feature block as the reference, and its shape is
 * the shape below: a headline over two lines of grey copy, a single filled button pushed
 * to the RIGHT of that copy on the same row, and under it a grid of coloured cards whose
 * illustrations hang off their own edges. Three things it does that this band copies:
 *
 *   • THE CTA IS ON THE HEADING'S ROW, not under the grid. It reads as "and there is a
 *     whole page about this" rather than as the band's conclusion — which matters,
 *     because the band's conclusion is the FINAL CTA at the bottom of the page and two
 *     asks in one column compete. `md:items-end` sits the button on the copy's last
 *     baseline; at the mobile width the row becomes a column and the button follows the
 *     copy, which is where a reader who has just read it looks.
 *
 *   • THE GRID IS UNEVEN, four-and-two then three twos. A five-card grid of equal
 *     columns has one hole in it wherever you put it; a wide first card fills the row and
 *     also says which step is the beginning. `/magic:plan` is the one step that has
 *     something to SHOW at width — a document, and the tickets it becomes — so it gets
 *     the wide card and the `beside` layout, and the other four are portrait.
 *
 *   • EVERY DRAWING IS CROPPED by its own card's edge. See `WorkflowArt.tsx` for which
 *     edges each one hangs off and why; the cards do the clipping (`ToneCard` is
 *     `overflow-hidden`), so no drawing has to know it is being cropped.
 *
 * ── THE COLOURS ARE THE STORY, WHICH IS WHY NONE OF THEM IS DEALT ─────────────────
 *
 * `CARD_TONE_CYCLE` exists so a grid of eight can be dressed without the palette becoming
 * a legend, and it is deliberately NOT used here. Every card in this band asks for its
 * ground BY NAME, because every card is a specific step and the tone is part of what it
 * says:
 *
 *     sky        /magic:plan            the idea, still cool and on paper
 *     amber      /magic:start           where work ENTERS the loop — amber's own meaning
 *     midnight   /magic:commit + pr     the deep middle: the code, and the PR it becomes
 *     indigo     /magic:review + resolve   still in the middle, and the product's own blue
 *     mint       /magic:done            the loop closing — mint's own meaning
 *
 * TWO OF THE FIVE ALREADY MEANT EXACTLY THIS. `tailwind.config.ts` reserves `amber` for
 * `/magic:start` ("where a piece of work enters the loop") and `mint` for `/magic:done`
 * ("the quietest moment in the loop"), and `/features` names those two and only those two
 * across its grid of eight. This band names five, which is a decision worth being
 * explicit about rather than leaving as a precedent somebody discovers: `features.test.ts`
 * pins ITS page to exactly two on the argument that "a third named ground in a grid of
 * eight is where a rhythm turns into a legend the reader has to learn". The argument does
 * not carry here, because there is no rhythm to protect — five cards ARE five different
 * things, in a fixed order, and the reader is meant to learn exactly that. A cycle would
 * have dealt the same four blues across them and said nothing at all.
 *
 * THE FIRST CARD WAS `lemon` AND THE OWNER CHANGED IT: "elle est trop jaune". The reason
 * that reads as an aesthetic note and is really a structural one — `lemon` beside `amber`
 * put two warm grounds one step apart at the top of the band, so the row's loudest moment
 * was its first card rather than the one where work enters the loop. On `sky` the row opens
 * cool and TURNS warm on `/magic:start`, which is the thing the colour was supposed to say.
 * `lemon` goes back to being a declared, unnamed ground, and `rose` stays one beside it —
 * see `WorkflowTone` in `lib/workflow.ts` for what naming a cycle tone here does and does
 * not cost.
 *
 * THE WEIGHT RUNS LIGHT → DARK → LIGHT across the five, which is the one thing the cycle
 * was protecting and this order keeps for free: two light cards open, two dark ones carry
 * the middle, and the last is light again. The arc of the colour is the arc of the work.
 *
 * ── WHERE THE BUTTON GOES ─────────────────────────────────────────────────────────
 *
 * `/workflow`, a page of its own, and it is `ButtonNavLink` rather than `ButtonLink`
 * because the route is on THIS origin — see the note on that component for why a bare
 * anchor would be the one internal link on the site that reloads the page.
 *
 * THE ROUTE HAD TO BE ADDED TO `PUBLIC_PATHS` (`lib/hostRouting.ts`) IN THE SAME CHANGE,
 * and this is the sentence that explains why it could not wait for the page to be
 * finished. That list enumerates the paths the public site owns; everything absent from it
 * belongs to the app, so a `/workflow` this band links to but the list does not know about
 * does not 404 on production — it 307s the reader to a login form on `app.magic-slash.io`.
 * A landing page whose CTA signs you out is worse than one whose CTA is missing, which is
 * the same reasoning `/features`, `/changelog` and `/faq` each carry at the top of their
 * own route.
 */

/**
 * WHICH DRAWING GOES IN WHICH CARD, and it is the only thing this file knows that
 * `lib/workflow.ts` does not.
 *
 * A `Record` KEYED BY THE STEP ID rather than an `art` field on the step itself, which is
 * what forces the split: a step is data — a tone, two catalogue keys, the commands it
 * runs — and a React component is not. Putting one in that module would have made
 * `workflow.test.ts` import `lucide-react` through it and stop resolving in the root
 * suite, which is the constraint that file is written under.
 *
 * `Record<WorkflowStepId, …>` AND NOT A PARTIAL ONE, so a sixth step is a compile error
 * HERE — at the map that forgot to draw it — rather than a card with an empty bottom
 * half. Same reasoning as `MagicCommandIcon`'s union in `lib/commands.ts`.
 */
/**
 * WHICH CARDS CENTRE THEIR DRAWING in the height the copy leaves, and it is one.
 *
 * `ToneCard`'s own note draws the line and the commit card fell on the other side of it
 * the day its panel went: `end` is for "a cropped panel … so a pair of cards in a grid
 * row line up along their bottoms", `center` for "a visual that is an OBJECT rather than
 * a crop — one bar, one switch, one tile, complete in itself and narrower than the
 * space", where being pinned to the bottom "leaves a pool of empty ground above it that
 * reads as a mistake rather than as air".
 *
 * That is exactly what happened. The other four drawings are panels that bleed off an
 * edge; `CommitPrArt` is now a git graph with margins on every side, and at the bottom of
 * a card sized by its taller neighbours it sat under a pool of nothing. The owner asked
 * for it in the middle, which is the slot rather than a nudge.
 *
 * A `Partial` MAP AND NOT A FIELD ON `WORKFLOW_STEPS`: where a drawing sits in its card
 * is presentation, and that module is the five steps' own data — read by `/workflow` too,
 * which has no cards. Same reasoning as `ART` and `SPAN` below.
 */
const VISUAL: Partial<Record<WorkflowStepId, ToneCardVisual>> = {
  commit: 'center',
}

const ART: Record<WorkflowStepId, () => React.ReactElement> = {
  plan: PlanSpecArt,
  start: StartAgentArt,
  commit: CommitPrArt,
  review: ResolveRunTerminal,
  done: MergeCleanArt,
}

/**
 * The grid span, per step, as the two literal class lists the grid deals in.
 *
 * LITERAL AND NOT COMPUTED. Tailwind can only emit classes it can SEE in the source, so a
 * `lg:col-span-${n}` built from a number compiles to nothing at all and the card silently
 * takes one column. The same rule that keeps `Reveal`'s delay an inline style.
 */
const SPAN = { wide: 'md:col-span-2 lg:col-span-4', portrait: 'lg:col-span-2' } as const

export function WorkflowSection() {
  const { t } = useT()

  return (
    <HomeSection>
      {/* THE HEAD. `HomeHeading` renders the copy half — this is what that component was
          kept on disk for when the band that used it was cut, and it needed no change to
          serve this one: `max-w-2xl`, left-aligned, an `h2` at the page's own headline
          size. The row around it is this band's, not its business.

          `md:items-end` puts the button on the copy's last baseline rather than centring
          it against the block, which is what the reference does and what stops a
          two-line subtitle from leaving the button floating in the middle of nothing.
          `gap-8` is what the column falls back to below `md`. */}
      <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <Reveal order={1}>
          <HomeHeading
            title={t(WORKFLOW_CHROME.title)}
            subtitle={t(WORKFLOW_CHROME.subtitle)}
          />
        </Reveal>

        {/* `shrink-0` so a long label — the French runs longer, as it does everywhere on
            this page — takes the width it needs out of the copy column instead of
            wrapping inside the button. `md:mb-1` sits the button's own baseline on the
            subtitle's rather than on its descender line. */}
        <Reveal order={2} className="shrink-0 md:mb-1">
          <ButtonNavLink href={WORKFLOW_PATH} variant="primary" size="lg" icon={ArrowRight}>
            {t(WORKFLOW_CHROME.cta)}
          </ButtonNavLink>
        </Reveal>
      </div>

      {/* THE GRID. Six columns at `lg` so the first row can be four-and-two; TWO at `md`,
          which is the rung that keeps the middle widths honest — a third of 768px is
          240px, and `ToneCard`'s `p-7` leaves 144px of measure for a three-line
          description in there. So the wide card takes the full row at `md` and the other
          four pair up beneath it. One column below that.

          THE SPAN IS ON THE `Reveal` AND NOT ON THE CARD, which is easy to get wrong and
          renders as a grid that ignores every span: `Reveal` is a `div`, so IT is the
          grid item and the card is its child. The card takes `h-full` to fill whatever
          the row's tallest member settles on — the same arrangement `PillarsSection`
          uses. */}
      <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-6">
        {WORKFLOW_STEPS.map((step, index) => {
          const Art = ART[step.id]
          return (
            <Reveal
              key={step.id}
              order={index + 3}
              className={step.wide ? SPAN.wide : SPAN.portrait}
            >
              <ToneCard
                tone={step.tone}
                layout={step.wide ? 'beside' : 'stacked'}
                visual={VISUAL[step.id]}
                title={t(step.title)}
                description={t(step.description)}
                className="h-full"
              >
                <Art />
              </ToneCard>
            </Reveal>
          )
        })}
      </div>
    </HomeSection>
  )
}
