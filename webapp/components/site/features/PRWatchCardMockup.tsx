'use client'

import {
  CheckCircle2,
  ChevronDown,
  GitPullRequest,
  Loader2,
  MessagesSquare,
} from 'lucide-react'
import type { MessageKey } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'

/**
 * The visual inside the `/magic:pr` card: the app's PR watch card, redrawn IN DARK, with
 * its CI checks resolving. CROPPED at the bottom only.
 *
 * DRAWN FROM THE REAL COMPONENT, band for band —
 * `desktop/src/renderer/components/agent-info-sidebar/PRWatchCard.tsx`. It has four, and
 * all four are here:
 *
 *   1. THE HEADER, `flex items-center p-2` around a `-m-1 p-2` hit area: the `w-4` icon
 *      slot, a two-line identity (`Pull request #N` as `text-xs font-medium text-ink/90`
 *      over the repo slug as `text-[10px]`), and the state badge as
 *      `px-1.5 py-0.5 rounded text-[10px] font-semibold` in `STATE_BADGE.open`'s
 *      `bg-green/10 text-green`. Not upper-cased, for the reason the file gives:
 *      "CHANGES REQUESTED" is twice the width of "Open" and would eat the title.
 *   2. COMMENTS, first of the checklist because it is "the one line that is about people
 *      rather than machinery". `MessagesSquare` in blue, the label in the muted tier
 *      because it reports rather than gates, the count as
 *      `text-[10px] tabular-nums`, and a chevron — folded, which is how it opens.
 *   3. CI CHECKS, from `checksItem`: `Loader2` spinning in blue with the label in
 *      `font-medium text-blue` while anything runs, `CheckCircle2` in green with the
 *      label dropped to the muted tier once they pass. Its fold is open, which is what
 *      the app does on its own — `checksOpen` defaults to true while `running > 0` — and
 *      each line inside is a `flex items-center gap-1.5` with a `w-3 h-3` glyph and the
 *      check's name in `text-[10px]`, sans and not mono, per that file's own note.
 *   4. THE CONFLICTS LINE, `MERGEABLE_ITEMS.true`: a ticked green box reading "No
 *      conflicts", `done` so its label sits in the muted tier.
 *
 * THE STATUS BAR IS THE ONE BAND LEFT OUT, and deliberately. The app calls it "the one
 * band that is always there" — how old the snapshot is, and the button that makes it
 * newer — and both halves are about the WATCHER rather than about the pull request: a
 * timestamp that has to keep moving to stay true, and a control that cannot be pressed in
 * a drawing. Neither says anything about `/magic:pr`. Dropping it also bought back 32px
 * of panel, which is the difference between this card forcing its grid row taller and
 * nearly matching the others.
 *
 * Every checklist line is the app's `ItemCard` geometry — a `w-full px-3` band, an
 * `h-9 flex items-center gap-2` line, a `w-4` icon slot, `min-w-0 flex-1` for the header
 * and `flex-shrink-0` for the detail.
 *
 * THE COPY IS THE APP'S OWN, taken from `desktop/src/i18n/{en,fr}.ts` rather than
 * rewritten: "Comments"/"Commentaires", "CI checks"/"Checks CI", "{passed}/{total}
 * passed"/"réussis", "No conflicts"/"Aucun conflit", "Refresh"/"Rafraîchir". A mockup of
 * a screen that paraphrases it is a mockup of a different screen.
 *
 * IN DARK, WHICH IS THE ONE THING THAT IS NOT A REPRODUCTION. The app runs its theme off
 * CSS variables and has a dark mode; this webapp has one palette. So the dark is built
 * the way the start card's terminal builds it — `bg-ink` with the declared white-alpha
 * ramp (`onink-body`, `onink-dim`, `onink-rule`) — and the app's `text-blue` becomes
 * `accent`, the nearest declared blue. `green` is already shared.
 *
 * CROPPED AT THE BOTTOM ONLY, and it took a wrong answer to get here. This was cut on the
 * left as well, on the argument that the card's meaning is on its right. That was simply
 * wrong about the markup: every icon sits in a `w-4` slot at the START of its row, so the
 * left crop was cutting off the one thing on this panel that MOVES.
 *
 * `aria-hidden`, and the whole panel: it is a drawing, and a chevron that cannot open or a
 * refresh that cannot refresh should be announced to nobody.
 */

/** The PR's identity. `Pull request #{number}` is the app's format, and it is the same
 *  string in French — so a literal rather than a catalogue pair identical on purpose. */
const PR_NUMBER = 'Pull request #278'
const REPO_SLUG = 'Xrequillart/magic-slash'

/**
 * The three checks and the keyframe pair each is wired to. Job names, so literals: a job
 * name is an identifier — what the workflow file calls it and what GitHub prints — and it
 * does not translate. These are this repository's own, from `.github/workflows/ci.yml`.
 */
const CHECKS: readonly { name: string; settled: string; pending: string }[] = [
  { name: 'lint', settled: 'animate-ci-settled-1', pending: 'animate-ci-pending-1' },
  { name: 'test', settled: 'animate-ci-settled-2', pending: 'animate-ci-pending-2' },
  { name: 'typecheck', settled: 'animate-ci-settled-3', pending: 'animate-ci-pending-3' },
]

/** The band a checklist line is drawn in, straight out of `ItemCard`. */
const BAND = 'w-full px-3'

/**
 * The hairline between two checklist lines, and the ONE place the reproduction had to
 * take a different route to the same pixel.
 *
 * The app draws it as an inset box-shadow standing in for a border, applied through an
 * adjacent-sibling variant, so the rule costs no height in a stack it does not own.
 * Copied here verbatim it failed `lib/designTokens.test.ts` twice over, and both
 * complaints were fair: an inline inset value is an arbitrary shadow, which that test
 * exists to keep out of the codebase, and pointing a shadow utility at a COLOUR token
 * names an elevation rung the config does not declare.
 *
 * A `border-t` is the same 1px in the same colour. It does add its pixel to the row
 * rather than sitting inside it, which is the whole reason the app avoided it — but the
 * app is stacking rows whose height is load-bearing, and this is a drawing of three of
 * them.
 *
 * (Worth knowing if you edit this file: that test reads the SOURCE AS TEXT, so it does
 * not know a comment from markup. Spelling either offending class here in prose is
 * enough to fail it — which is how this note came to be worded around them.)
 */
const ROW_RULE = 'border-t border-onink-rule'
const LINE = 'flex h-9 items-center gap-2'
const SLOT = 'flex w-4 shrink-0 items-center justify-center'
/** The label tier for a line that is settled, or that reports rather than gates. */
const DONE_LABEL = 'block truncate text-xs text-onink-body'
const DETAIL = 'shrink-0 text-[10px] tabular-nums text-onink-dim'

export function PRWatchCardMockup() {
  const { t } = useT()

  const label = (key: MessageKey) => t(key)

  return (
    // `-mb-6` is the only negative margin: the bottom is cut, both sides are whole, so
    // every icon slot stays on screen. WHERE the panel sits is `ToneCard`'s business.
    <div aria-hidden className="-mb-6 px-7 pt-6">
      {/* `h-64` — 256px. Still 32px taller than the other three panels, because four
          bands do not fit in their 224px, but no longer the 288px it needed while it
          also drew a status bar. The grid row it sits in grows with it and its neighbour
          stretches to match, which is what a grid does. */}
      <div className="h-64 overflow-hidden rounded-lg border border-onink-rule bg-ink shadow-lift">
        {/* ── 1. The header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center p-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 p-2">
            <span className={SLOT}>
              {/* Green, as the app draws an OPEN pull request. */}
              <GitPullRequest className="h-4 w-4 text-green" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium text-white">{PR_NUMBER}</span>
              <span className="block truncate text-[10px] text-onink-dim">{REPO_SLUG}</span>
            </span>
            <span className="shrink-0 rounded bg-green/10 px-1.5 py-0.5 text-[10px] font-semibold text-green">
              {label('site.prCard.stateOpen')}
            </span>
          </div>
        </div>

        {/* ── The checklist ─────────────────────────────────────────────────────── */}
        <div className="border-t border-onink-rule">
          {/* 2. Comments. Folded — the chevron is `-rotate-90` when closed, exactly as
                 `ItemCard` draws it — and reporting rather than gating, so the label
                 stays in the muted tier with no tone of its own. */}
          <div className={BAND}>
            <div className={LINE}>
              <span className={SLOT}>
                <MessagesSquare className="h-3.5 w-3.5 text-accent" />
              </span>
              <div className="min-w-0 flex-1">
                <span className={DONE_LABEL}>{label('site.prCard.comments')}</span>
              </div>
              <span className={DETAIL}>{label('site.prCard.commentsCount')}</span>
              <ChevronDown className="h-3 w-3 shrink-0 -rotate-90 text-onink-faint" />
            </div>
          </div>

          {/* 3. CI checks. The header crossfades as a WHOLE — icon, label tone and count
                 together — because in the app all three change with the state at once:
                 `checksItem` swaps `Loader2`/blue/`font-medium` for
                 `CheckCircle2`/green/muted. Two stacked copies of one row is a smaller
                 lie than three separately-timed pieces of one. */}
          <div className={`${BAND} ${ROW_RULE}`}>
            <div className="relative h-9">
              <div className={`absolute inset-0 ${LINE} animate-ci-pending-3 motion-reduce:hidden`}>
                <span className={SLOT}>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-accent">
                    {label('site.prCard.checks')}
                  </span>
                </div>
                <span className={DETAIL}>{label('site.prCard.checksPending')}</span>
              </div>
              <div className={`absolute inset-0 ${LINE} animate-ci-settled-3 motion-reduce:animate-none`}>
                <span className={SLOT}>
                  <CheckCircle2 className="h-3.5 w-3.5 text-green" />
                </span>
                <div className="min-w-0 flex-1">
                  <span className={DONE_LABEL}>{label('site.prCard.checks')}</span>
                </div>
                <span className={DETAIL}>{label('site.prCard.checksDone')}</span>
              </div>
              <ChevronDown className="absolute right-0 top-3 h-3 w-3 text-onink-faint" />
            </div>

            {/* Its fold, open — `pb-2.5 pl-6`, as `ItemCard` renders children. */}
            <ul className="space-y-1 pb-2.5 pl-6">
              {CHECKS.map((check) => (
                <li key={check.name} className="flex items-center gap-1.5">
                  {/* Both glyphs stacked in one slot, each carrying its own opacity: a
                      stroked SVG has a transparent middle, so fading only the spinner
                      would leave the two sets of strokes showing through each other —
                      see the note on `ciSettled` in the Tailwind config. */}
                  <span className="relative flex h-3 w-3 shrink-0 items-center justify-center">
                    <Loader2
                      className={`absolute h-3 w-3 animate-spin text-accent ${check.pending} motion-reduce:hidden`}
                    />
                    <CheckCircle2
                      className={`absolute h-3 w-3 text-green ${check.settled} motion-reduce:animate-none`}
                    />
                  </span>
                  <span className="min-w-0 truncate text-[10px] text-onink-body">{check.name}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 4. Conflicts. `MERGEABLE_ITEMS.true` — a ticked green box, and `done`, so
                 its label sits in the muted tier rather than carrying the tone. Absent
                 means unknown in the app, never a conflict; this one is known and clear. */}
          <div className={`${BAND} ${ROW_RULE}`}>
            <div className={LINE}>
              <span className={SLOT}>
                <CheckCircle2 className="h-3.5 w-3.5 text-green" />
              </span>
              <div className="min-w-0 flex-1">
                <span className={DONE_LABEL}>{label('site.prCard.noConflicts')}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
