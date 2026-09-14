'use client'

import { CollapsibleLine, PullRequestCard as PullRequestCardComponent, type PRTone } from '@ds/desktop'
import { CheckCircle2, Loader2 } from '@ds/desktop/icons'
import type { MessageKey } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'
import { MessagesSquare } from 'lucide-react'
import { AppGround } from '../AppGround'
import { useLoopStep } from './useLoopStep'

/**
 * The visual under the `pullRequest` row: the info sidebar's PR watch card — the one
 * `RepositoryCard` renders when the agent has opened a pull request — redrawn whole and
 * told a story: the checks pass, the review lands, the verdict changes.
 *
 * IT IS THE COMPONENTS NOW, not a drawing of them. `PullRequestCard` and
 * `CollapsibleLine` come from `design-system/desktop/`, the same files the Electron
 * renderer compiles, on a patch of the app's own theme (`AppGround`). This is
 * `MakeItYoursArt`'s move and `UsageCardMockup`'s before it: change the card and this
 * illustration changes with it.
 *
 * WHAT THAT REPLACED: a `Row` helper rebuilding `ItemCard`'s geometry by hand — the
 * `h-9` line, the `w-4` slot, the chevron's `-rotate-90`, the hairline between rows —
 * plus a header and a status bar spelled out class for class, under a forty-line note
 * listing which of the app's classes each piece had copied. Every one of those notes was
 * a promise to keep two files in step by hand, and the card has since grown a fixed
 * badge height and a refresh that is a `ButtonIcon`. A drawing that IS the component
 * cannot fall behind one.
 *
 * THE BADGE TONES ARE `PRTone`S NOW, not pairs of classes. `bg-green/10 text-green` was
 * written here and again in the app, which is two places for one decision; the shared
 * table in `prTones.ts` is what both read.
 *
 * THE STORY, on one fourteen-second loop through `useLoopStep`, and EVERY ROW STAYS PUT
 * through it — only glyphs, counts and the badge change: three checks running, then
 * passing one by one; the badge turning from "Open" to "Awaiting review" as the watcher
 * sees a reviewer assigned; "Commented" as the review lands; two more comments and
 * "Changes requested"; then "Approved". Each is a state the real card has shown, in the
 * order a PR actually goes through them.
 *
 * COLOURS ARE THE APP'S: `blue` for a running check and the comments glyph, `green` for
 * passed and approved, `red` for changes requested, `yellow` for awaiting review — every
 * one declared in the Tailwind config — and the white-alpha ramp for `surface` and
 * `line-subtle`.
 *
 * `aria-hidden`: it is a drawing, and a Refresh button that refreshes nothing should be
 * announced to nobody.
 */

const CHECKS = ['lint', 'test', 'typecheck'] as const

/** Nothing is listening: the beat is the drawing's, not the reader's. */
const noop = () => undefined

type Review = 'none' | 'pending' | 'commented' | 'changes' | 'approved'

const BADGE: Record<Review, { tone: PRTone; label: MessageKey }> = {
  none: { tone: 'green', label: 'site.agentPanel.stateOpen' },
  pending: { tone: 'yellow', label: 'site.agentPanel.reviewPending' },
  commented: { tone: 'blue', label: 'site.agentPanel.reviewCommented' },
  changes: { tone: 'red', label: 'site.agentPanel.reviewChanges' },
  approved: { tone: 'green', label: 'site.agentPanel.reviewApproved' },
}

// 0 three running · 1 lint · 2 test · 3 typecheck · 4 awaiting review · 5 commented ·
// 6 three comments, changes requested · 7 approved.
const AT = [0, 1800, 3200, 4600, 6400, 8200, 10000, 12000] as const
const LOOP = 14500

/**
 * THE CARD ITSELF, without the plate, so the info sidebar (`InfoSidebarMockup.tsx`) can
 * nest it under a repository card exactly where the app nests `PRWatchCard`
 * (RepositoryCard.tsx:290). The props are the three facts the drawing changes on: how
 * many checks have passed, where the review stands, how many comments there are. The
 * looping mockup below drives them from a clock; the sidebar drives them from the
 * reader's scroll.
 */
export type PullRequestReview = Review

/**
 * The three parts of the card the `/desktop` tour can point at: the header with the
 * verdict badge, the comments row, the checks row. The ring is the same one
 * `InfoSidebarMockup.tsx` draws on a card in focus, on the row rather than the card.
 */
export type PullRequestPart = 'prHeader' | 'prComments' | 'prChecks'
// INSET, unlike the ring the panel draws on a whole card: these rows sit inside the card's
// `overflow-hidden`, and a ring drawn outside a row is clipped to a line at its edges.
const FOCUS_RING = 'rounded-md ring-2 ring-inset ring-accent'

export function PullRequestCard({
  passed,
  review,
  comments,
  focus = null,
  number = 278,
}: {
  passed: number
  review: Review
  comments: number
  focus?: PullRequestPart | null
  /** The PR's number: 278 here and on `/desktop`, the ticket's own on `/workflow`. */
  number?: number
}) {
  const { t } = useT()
  const allPassed = passed === 3
  const badge = BADGE[review]

  return (
    /* `paint={false}`: the plate around this already paints the window colour, and a
       second one inside it would be a panel drawn on a panel. The variables still land,
       which is all a real component needs from this. */
    <AppGround paint={false}>
      {/* THE HEADER STEP ANCHORS ON THE WHOLE CARD, which is the one thing this move
          changed about the tour. The header lives inside the component now, so there is
          nothing here to hang `data-part` on — and an empty anchor div among the card's
          children would draw a stray hairline, because the card rules every child it is
          handed. Pointing at the card is close: the step is about the PR's identity, and
          the identity is the top of it. A design-system component that knew about a
          marketing page's camera would be the wrong trade for the missing 40px. */}
      <div data-part="prHeader" className={focus === 'prHeader' ? `${FOCUS_RING} rounded-lg` : undefined}>
      <PullRequestCardComponent
        state="open"
        title={t('site.agentPanel.prNumber', { number })}
        subtitle="Xrequillart/magic-pay"
        badge={{ label: t(badge.label), tone: badge.tone }}
        /* Nothing is listening: the beat is the drawing's, not the reader's. The label
           is still required and still right — it names what the control would be. */
        open={{ label: t('site.agentPanel.prNumber', { number }), onOpen: noop }}
        footer={{
          label: t('site.agentPanel.lastChecked', { time: t('site.agentPanel.justNow') }),
          refresh: { label: t('site.agentPanel.refresh'), onRefresh: noop },
        }}
      >
        {/* THE TOUR'S ANCHORS AND ITS RING stay on wrappers, never inside the component:
            `data-part` is what `/desktop` pans to and the ring is what it lights up, and
            both are this SITE's business. Wrapping also keeps the card's hairline rule
            working — it rules each child it is handed, and these wrappers are the
            children. */}
        <div data-part="prComments" className={focus === 'prComments' ? FOCUS_RING : undefined}>
          <CollapsibleLine
            icon={MessagesSquare}
            tone="blue"
            label={t('site.agentPanel.comments')}
            muted
            detail={
              <span className="text-[10px] tabular-nums text-text-secondary/60">
                {t(comments === 1 ? 'site.agentPanel.commentOne' : 'site.agentPanel.commentsCount', { count: comments })}
              </span>
            }
            toggle={{ open: false, onToggle: noop }}
          />
        </div>

        <div data-part="prChecks" className={focus === 'prChecks' ? FOCUS_RING : undefined}>
          {/* The fold is held OPEN, which the app would not do once every check has
              passed — but on a card whose whole point is watching them pass, a list that
              folded itself away would read as something going missing. */}
          <CollapsibleLine
            icon={allPassed ? CheckCircle2 : Loader2}
            tone={allPassed ? 'green' : 'blue'}
            spin={!allPassed}
            label={t('site.agentPanel.checks')}
            muted={allPassed}
            detail={
              <span className="text-[10px] tabular-nums text-text-secondary/60">
                {t('site.agentPanel.checksPassed', { passed, total: 3 })}
              </span>
            }
            toggle={{ open: true, onToggle: noop }}
          >
            <ul className="space-y-1">
              {CHECKS.map((name, index) => (
                <li key={name} className="flex items-center gap-1.5">
                  <span className="flex shrink-0">
                    {index < passed ? (
                      <CheckCircle2 className="h-3 w-3 text-green" />
                    ) : (
                      <Loader2 className="h-3 w-3 animate-spin text-blue" />
                    )}
                  </span>
                  <span className="min-w-0 truncate text-[10px] text-text-secondary/70">{name}</span>
                </li>
              ))}
            </ul>
          </CollapsibleLine>
        </div>

        <CollapsibleLine
          icon={CheckCircle2}
          tone="green"
          label={t('site.agentPanel.noConflicts')}
          muted
        />
      </PullRequestCardComponent>
      </div>
    </AppGround>
  )
}

export function PullRequestCardMockup() {
  const step = useLoopStep(AT, LOOP)

  const passed = Math.min(3, Math.max(0, step))
  const review: Review = step >= 7 ? 'approved' : step >= 6 ? 'changes' : step >= 5 ? 'commented' : step >= 4 ? 'pending' : 'none'
  const comments = step >= 6 ? 3 : 1

  return (
    /* `tone-sky`, THE SAME GROUND AS THE REPOSITORY CARD three rows above it
       (`RepoCardMockup`'s `Plate`). The two drawings are the same card — this is the PR
       block of the repository card, pulled out and told a story — so a second colour
       under it said they were two different objects. `ReposSettingsMockup` states the
       same rule for the reverse case: it took sky rather than indigo so two windows a
       few screens apart would not read as two different products. */
    <div aria-hidden className="flex h-[400px] items-center justify-center overflow-hidden rounded-2xl bg-tone-sky px-6 sm:h-[440px]">
      <div className="w-full max-w-[500px] rounded-2xl bg-ink p-4 shadow-lift">
        <PullRequestCard passed={passed} review={review} comments={comments} />
      </div>
    </div>
  )
}
