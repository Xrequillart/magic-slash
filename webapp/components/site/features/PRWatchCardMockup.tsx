'use client'

import { CollapsibleLine, PullRequestCard } from '@ds/desktop'
import { CheckCircle2, Loader2 } from '@ds/desktop/icons'
import { MessagesSquare } from 'lucide-react'
import type { MessageKey } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'
import { AppGround } from '../AppGround'
import { useLoopStep } from './useLoopStep'

/**
 * The visual inside the `/magic:pr` card: the app's PR watch card, with its CI checks
 * resolving. CROPPED at the bottom only.
 *
 * IT IS THE COMPONENTS NOW, not a drawing of them. `PullRequestCard` and
 * `CollapsibleLine` come from `design-system/desktop/`, the same files the Electron
 * renderer compiles, on a patch of the app's own theme (`AppGround`). This is
 * `MakeItYoursArt`'s move and `UsageCardMockup`'s before it: change the card and this
 * illustration changes with it.
 *
 * WHAT THAT REPLACED: four constants rebuilding the card's geometry by hand — `BAND`,
 * `LINE`, `SLOT`, `DONE_LABEL` — under a sixty-line note listing which of the app's
 * classes each had copied, including a paragraph on the one hairline that had to take a
 * different route to the same pixel. The card owns all of it now, and that hairline is
 * its own `border-t` rather than a shadow this file had to work around.
 *
 * THE DARK IS THE APP'S OWN, and it used to be an approximation. This webapp has one
 * palette, so the card was drawn on `bg-ink` with the declared white-alpha ramp and the
 * app's `text-blue` became `accent`, "the nearest declared blue". `AppGround` hands the
 * component the real theme's variables instead, so the blue is the blue and there is
 * nothing left to approximate.
 *
 * THE STATUS BAR IS STILL LEFT OUT, and now it is a prop rather than an omission:
 * `footer` is optional on the component, for its own reason — a card whose watcher is
 * off must not offer a refresh — and the drawing takes the same exit. Both halves of
 * that band are about the WATCHER rather than about the pull request: a timestamp that
 * has to keep moving to stay true, and a control that cannot be pressed in a drawing.
 *
 * THE STORY COSTS A TIMER NOW, which is the one thing this move gives up. It was six
 * declared keyframes and two stacked copies of every row, crossfading — a React
 * component's state cannot be driven by a CSS animation, so the beats are read off the
 * same 8s clock by `useLoopStep`, which every other storyboard on this page already
 * uses. The six `ci-pending-*`/`ci-settled-*` keyframes went with it, along with the
 * trick of stacking two stroked glyphs so neither showed through the other.
 *
 * THE COPY IS THE APP'S OWN, taken from `desktop/src/i18n/{en,fr}.ts` rather than
 * rewritten. A mockup of a screen that paraphrases it is a mockup of a different screen.
 *
 * `aria-hidden`, and the whole panel: it is a drawing, and a chevron that cannot open
 * should be announced to nobody.
 */

/** The PR's identity. `Pull request #{number}` is the app's format, and it is the same
 *  string in French — so a literal rather than a catalogue pair identical on purpose. */
const PR_NUMBER = 'Pull request #278'
const REPO_SLUG = 'Xrequillart/magic-slash'

/**
 * The three checks. Job names, so literals: a job name is an identifier — what the
 * workflow file calls it and what GitHub prints — and it does not translate. These are
 * this repository's own, from `.github/workflows/ci.yml`.
 */
const CHECKS = ['lint', 'test', 'typecheck'] as const

/**
 * The beats, and they are the keyframes' own: the three checks settled at 30%, 48% and
 * 66% of an 8s turn, which is 2400ms, 3840ms and 5280ms. Kept to the millisecond so the
 * drawing reads at exactly the pace it did before — the mechanism changed, the rhythm
 * did not.
 *
 * Step 0 is all three running; 1, 2 and 3 are one more settled each. Under reduced
 * motion `useLoopStep` rests on the LAST step, which is the state with the most in it
 * and the right still for this card.
 */
const AT = [0, 2400, 3840, 5280] as const
const LOOP = 8000

/** Nothing is listening: the beat is the drawing's, not the reader's. */
const noop = () => undefined

export function PRWatchCardMockup() {
  const { t } = useT()
  const passed = Math.max(0, useLoopStep(AT, LOOP))
  const allPassed = passed >= CHECKS.length

  const label = (key: MessageKey) => t(key)

  return (
    // `-mb-6` is the only negative margin: the bottom is cut, both sides are whole, so
    // every icon slot stays on screen. WHERE the panel sits is `ToneCard`'s business.
    <div aria-hidden className="-mb-6 px-7 pt-6">
      {/* `h-64` — 256px, the height four bands want without a status bar. The grid row it
          sits in grows with it and its neighbour stretches to match. */}
      <div className="h-64 overflow-hidden rounded-lg shadow-lift">
        <AppGround className="h-full">
          <PullRequestCard
            state="open"
            title={PR_NUMBER}
            subtitle={REPO_SLUG}
            badge={{ label: label('site.prCard.stateOpen'), tone: 'green' }}
            open={{ label: PR_NUMBER, onOpen: noop }}
          >
            {/* Comments. Folded — reporting rather than gating, so the label stays in
                the muted tier with no tone of its own. */}
            <CollapsibleLine
              icon={MessagesSquare}
              tone="blue"
              label={label('site.prCard.comments')}
              muted
              detail={
                <span className="text-[10px] tabular-nums text-text-secondary/60">
                  {label('site.prCard.commentsCount')}
                </span>
              }
              toggle={{ open: false, onToggle: noop }}
            />

            {/* CI checks. The header changes as a WHOLE — mark, tone and count together —
                because in the app all three change with the state at once: `checksItem`
                swaps `Loader2`/blue/loud for `CheckCircle2`/green/muted. One row swapping
                its props is a smaller lie than two crossfading copies of it.

                Its fold is open, which is what the app does on its own: `checksOpen`
                defaults to true while anything is running. */}
            <CollapsibleLine
              icon={allPassed ? CheckCircle2 : Loader2}
              tone={allPassed ? 'green' : 'blue'}
              spin={!allPassed}
              label={label('site.prCard.checks')}
              muted={allPassed}
              detail={
                <span className="text-[10px] tabular-nums text-text-secondary/60">
                  {allPassed ? label('site.prCard.checksDone') : label('site.prCard.checksPending')}
                </span>
              }
              toggle={{ open: true, onToggle: noop }}
            >
              <ul className="space-y-1">
                {CHECKS.map((check, index) => (
                  <li key={check} className="flex items-center gap-1.5">
                    {/* One glyph at a time now. Two stroked SVGs stacked in one slot
                        needed each to carry its own opacity — a stroked shape has a
                        transparent middle, so fading one left both sets of strokes
                        showing through each other. Swapping the element has no middle
                        to see through. */}
                    <span className="flex h-3 w-3 shrink-0 items-center justify-center">
                      {index < passed ? (
                        <CheckCircle2 className="h-3 w-3 text-green" />
                      ) : (
                        <Loader2 className="h-3 w-3 animate-spin text-blue" />
                      )}
                    </span>
                    <span className="min-w-0 truncate text-[10px] text-text-secondary/70">{check}</span>
                  </li>
                ))}
              </ul>
            </CollapsibleLine>

            {/* Conflicts. `MERGEABLE_ITEMS.true` — a ticked green box, and `muted`, so
                its label sits in the quiet tier rather than carrying the tone. Absent
                means unknown in the app, never a conflict; this one is known and clear. */}
            <CollapsibleLine
              icon={CheckCircle2}
              tone="green"
              label={label('site.prCard.noConflicts')}
              muted
            />
          </PullRequestCard>
        </AppGround>
      </div>
    </div>
  )
}
