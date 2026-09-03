'use client'

import { Check, Loader2 } from 'lucide-react'
import type { MessageKey } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'

/**
 * The visual inside the `/magic:start` card: a Claude Code session taking a ticket id,
 * working through it, and scrolling its own prompt away as it goes — CROPPED by the card
 * it sits in.
 *
 * WHY THIS IS NOT `home/AppMockup.tsx`, which already animates exactly this run and is
 * sitting on disk rendered nowhere. Its markup references ~81 `mk-*` class names defined
 * ONLY in `app/(marketing)/marketing.css`, and the `(marketing)` layout deliberately no
 * longer imports that stylesheet — `lib/homepageStylesheet.test.ts` fails the build if
 * this subtree reaches for it. So reusing it here would render it completely unstyled,
 * and styling it would mean undoing acceptance criterion 3 of #268. It is also reserved
 * for #270, which converts it from time-driven to scroll-driven. Hence a small purpose-
 * built panel in tokens instead of a 455-line component that cannot be dressed.
 *
 * CROPPED ON PURPOSE, which is the whole idea borrowed from the reference: the panel is
 * wider than its column and hangs off the card's bottom edge, so it reads as a window
 * you are seeing the corner of rather than as a diagram someone drew to fit. `ToneCard`
 * is `overflow-hidden`, so the card's own radius does the clipping and this component
 * does not have to know it is being cut.
 *
 * NO WINDOW CONTROLS. The three macOS dots were the first thing in here and they are
 * gone: a window whose top-left corner is a traffic light is a window someone drew, and
 * the crop is already saying "this is a real thing, seen partly". They also cost the
 * panel its first 20px, which is the room the prompt needs.
 *
 * NO JS AND NO SCHEDULER. `AppMockup` needs one because it plays six phases across three
 * columns with side effects between them; this plays one command and five lines, which
 * is five `animation-delay`s and one translate. A CSS loop has no mount cost, no
 * cleanup, nothing to leak on unmount, and it keeps running while the tab is
 * backgrounded without a timer.
 *
 * IT USED TO SCROLL ITSELF, and it no longer needs to. The panel was `h-40` — shorter
 * than the command plus five lines — so a `terminal-scroll` keyframe lifted the column
 * by 2.5rem as the last line landed, which put the prompt out of sight to make room. The
 * panel is `h-56` now and holds the whole run at once, so the scroll had nothing left to
 * reveal: it was moving content that already fitted. Both the class and the keyframe
 * behind it are gone rather than left in place doing nothing.
 *
 * The prompt therefore stays visible for the whole loop, which is the better reading
 * anyway — the command and what it produced in one frame is the thing this card is
 * arguing.
 *
 * EVERY ANIMATION RESTS IN ITS FINISHED STATE, so `motion-reduce:animate-none` is
 * correct with no second set of rules: a reader who asked for less motion gets the
 * command fully typed and all five lines landed.
 *
 * AND EVERY ONE OF THEM SHARES ONE DURATION WITH NO DELAY, which is what makes the loop
 * restart cleanly. The stagger is inside the keyframes instead — `statusIn` in
 * `tailwind.config.ts` explains why it has to be: a delay on an `infinite` animation
 * applies to the first iteration only, so five delayed lines each keep their own phase
 * for ever and the panel retypes its command while all five are still on screen. The
 * blink is 1.1s, which divides 11s exactly, so it comes back into phase too.
 *
 * `aria-hidden`, and the whole panel. It is a drawing of a terminal, and every word in it
 * is a paraphrase of the card's own description sitting directly above it — announced, it
 * would say the same thing twice and read a fake prompt out loud in between.
 */

/**
 * The ticket the run is started FROM, which is the argument the skill actually takes:
 * `/magic:start` reads a Jira key or a GitHub issue and does nothing without one, so a
 * bare command in this panel was a command that would have asked a question.
 *
 * Jira-shaped rather than `#269`, because `PROJ-` reads as a placeholder at a glance
 * where a bare number reads as this repository's own issue — and this page is for
 * someone who has never seen it. NOT a catalogue key: a ticket id is not language.
 *
 * IF THIS STRING CHANGES, two numbers in `tailwind.config.ts` change with it — the `ch`
 * in `caret-type` and the `steps()` in its animation are both the character count of the
 * whole command line.
 */
const COMMAND = '/magic:start PROJ-142'

/**
 * The run, in the order `/magic:start` actually performs it — checked against
 * `skills/magic-start/SKILL.md` rather than invented: read the ticket and resolve the
 * repository (steps 2-3), create the worktree on a new branch (4.1), install
 * dependencies (4.3), write the plan and have it reviewed (5.2), then implement (5.4).
 *
 * `done` is the marker, not the wording: the last line is the step still RUNNING when
 * the loop rests, so it carries a spinner where the others carry a check. A green check
 * beside "implementation in progress" would contradict its own sentence.
 */
const STATUS: readonly { key: MessageKey; animation: string; done: boolean }[] = [
  { key: 'site.startCard.ticket', animation: 'animate-status-1', done: true },
  { key: 'site.startCard.worktree', animation: 'animate-status-2', done: true },
  { key: 'site.startCard.deps', animation: 'animate-status-3', done: true },
  { key: 'site.startCard.plan', animation: 'animate-status-4', done: true },
  { key: 'site.startCard.implementing', animation: 'animate-status-5', done: false },
]

export function StartTerminal() {
  const { t } = useT()

  return (
    // `-mr-8` and `-mb-6` pull the panel past the card's padding on two sides, which is
    // what crops it. WHERE the panel sits in the card is `ToneCard`'s business — it used
    // to be an `mt-auto` here, which meant this component had to know the card was a
    // flex column.
    <div aria-hidden className="-mb-6 -mr-8 pl-7 pt-6">
      {/* `bg-ink` because a terminal is dark on every machine, on a card whose ground is
          a pale blue — the contrast is what makes it read as a window ON the card rather
          than as a panel OF it. `rounded-tl-2xl` alone: the other three corners are
          outside the card and would never be seen, and rounding them would put a visible
          curve where the crop should look like a cut.

          `shadow-lift`, the top rung of the declared elevation scale. `ToneCard` itself
          carries no shadow — under a saturated gradient a shadow reads as dirt rather
          than as lift — but that is a rule about the CARD, and this is a window sitting
          on one. A dark panel on a pale blue ground with no shadow looks cut into the
          card; with the lift it looks placed on it.

          `h-56` — 224px — and the number is chosen against the content rather than
          picked: `p-4` twice, a 19.5px prompt row, a 12px gap and five 19.5px lines
          with 6px between them comes to ~185px. The ~39px of slack is what the crop
          eats: the wrapper's `-mb-6` clips the bottom 24px, and it has to land in empty
          panel rather than through the last line. That is the whole reason this is a
          fixed height and not a hug — a content-sized panel would put "implementation
          in progress" exactly where the card cuts.

          No `overflow-hidden` any more: it was there to give the scroll something to
          scroll inside, and nothing overflows now. The crop is `ToneCard`'s, which is
          also what rounds it. */}
      <div className="h-56 rounded-tl-2xl bg-ink p-4 font-mono text-xs leading-relaxed shadow-lift">
        <div>
          {/* The prompt. `whitespace-nowrap` + `overflow-hidden` is what makes the
              `max-width` animation a typewriter rather than a reflow: without it the
              command would wrap as the width grew and the line would jump. */}
          <div className="flex items-center gap-1.5">
            <span className="text-accent">❯</span>
            <span className="animate-caret-type overflow-hidden whitespace-nowrap text-white motion-reduce:animate-none">
              {COMMAND}
            </span>
            <span className="inline-block h-3 w-1.5 animate-caret-blink bg-white/70 motion-reduce:animate-none" />
          </div>

          <div className="mt-3 flex flex-col gap-1.5">
            {STATUS.map((line) => (
              <div
                key={line.key}
                className={`flex items-center gap-2 ${line.animation} motion-reduce:animate-none`}
              >
                {line.done ? (
                  // `green`, the declared status token, and this is the one place on the
                  // page it means what it means everywhere else in the product: a step
                  // that finished.
                  <Check className="h-3 w-3 shrink-0 text-green" />
                ) : (
                  <Loader2 className="h-3 w-3 shrink-0 animate-spin text-accent motion-reduce:animate-none" />
                )}
                {/* The running step is the one to read, so it keeps the full white the
                    finished ones give up. */}
                <span
                  className={`whitespace-nowrap ${line.done ? 'text-onink-body' : 'text-white'}`}
                >
                  {t(line.key)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
