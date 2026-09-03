'use client'

import type { ReactNode } from 'react'
import {
  CheckCircle2,
  ChevronDown,
  GitPullRequest,
  Loader2,
  MessagesSquare,
  RefreshCw,
} from 'lucide-react'
import type { MessageKey } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'
import { useLoopStep } from './useLoopStep'

/**
 * The visual under the `pullRequest` row: the info sidebar's PR watch card — the one
 * `RepositoryCard` renders when the agent has opened a pull request — redrawn whole and
 * told a story: the checks pass, the review lands, the verdict changes.
 *
 * DRAWN CLASS FOR CLASS from `agent-info-sidebar/PRWatchCard.tsx`:
 *
 *   1. THE HEADER, `p-2` around a `-m-1 p-2` hit area: a `w-4` slot with the state's own
 *      glyph (an open PR is a green `GitPullRequest`), "Pull request #N" at `text-xs
 *      font-medium` at 90% ink over the repo slug at 10px and 50%, and the badge —
 *      `px-1.5 py-0.5 rounded text-[10px] font-semibold` in the pair `STATE_BADGE` or
 *      `REVIEW_BADGE` gives it: the state's while no review has landed, the review's
 *      verdict once one has.
 *   2. THE CHECKLIST under a subtle rule, every row a `h-9` line in a `px-3` band with the
 *      same `w-4` icon slot, and a hairline between rows (the app draws it as an inset
 *      shadow; a top border is the same pixel here):
 *        – Comments, a `MessagesSquare` in blue, the label at 70%, the count at 10px on
 *          the right and the fold chevron.
 *        – Checks, the `ChecklistRow`: a spinning blue loader while any is running, a
 *          green tick once all have passed — at which point the label goes quiet, to the
 *          70% tier, because a ticked box should stop asking for the eye. "N/M passed"
 *          on the right, and the fold open — the app closes it once every check has
 *          passed, but on a card whose whole point is watching them pass, a list that
 *          folded itself away would read as something going missing. Each check inside
 *          is a `w-3` glyph of its own state and its name at 10px.
 *        – Mergeability, a green tick and "No conflicts", quiet.
 *   3. THE STATUS BAR, `px-2 py-1.5` under a rule: "checked just now" at 10px and 50%,
 *      and the bordered Refresh button pushed right.
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

type Review = 'none' | 'pending' | 'commented' | 'changes' | 'approved'

const BADGE: Record<Review, { tone: string; label: MessageKey }> = {
  none: { tone: 'bg-green/10 text-green', label: 'site.agentPanel.stateOpen' },
  pending: { tone: 'bg-yellow/10 text-yellow', label: 'site.agentPanel.reviewPending' },
  commented: { tone: 'bg-blue/10 text-blue', label: 'site.agentPanel.reviewCommented' },
  changes: { tone: 'bg-red/10 text-red', label: 'site.agentPanel.reviewChanges' },
  approved: { tone: 'bg-green/10 text-green', label: 'site.agentPanel.reviewApproved' },
}

/** `ItemCard`'s line: the icon slot, the header, an optional detail, an optional chevron. */
function Row({
  icon,
  header,
  detail,
  chevron,
  children,
}: {
  icon: ReactNode
  header: ReactNode
  detail?: ReactNode
  chevron?: 'open' | 'closed'
  children?: ReactNode
}) {
  return (
    <div className="w-full px-3 [&+&]:border-t [&+&]:border-white/5">
      <div className="flex h-9 items-center gap-2">
        <span className="flex w-4 shrink-0 items-center justify-center">{icon}</span>
        <div className="min-w-0 flex-1">{header}</div>
        {detail !== undefined ? <span className="shrink-0">{detail}</span> : null}
        {chevron ? (
          <ChevronDown className={`h-3 w-3 shrink-0 text-appink-icon ${chevron === 'open' ? '' : '-rotate-90'}`} />
        ) : null}
      </div>
      {children ? <div className="pb-2.5 pl-6">{children}</div> : null}
    </div>
  )
}

// 0 three running · 1 lint · 2 test · 3 typecheck · 4 awaiting review · 5 commented ·
// 6 three comments, changes requested · 7 approved.
const AT = [0, 1800, 3200, 4600, 6400, 8200, 10000, 12000] as const
const LOOP = 14500

export function PullRequestCardMockup() {
  const { t } = useT()
  const step = useLoopStep(AT, LOOP)

  const passed = Math.min(3, Math.max(0, step))
  const allPassed = passed === 3
  const review: Review = step >= 7 ? 'approved' : step >= 6 ? 'changes' : step >= 5 ? 'commented' : step >= 4 ? 'pending' : 'none'
  // Always at least one: the row is a fixture of the card, and a row that appears
  // mid-story reads as a glitch rather than as news. The count is what moves.
  const comments = step >= 6 ? 3 : 1
  const badge = BADGE[review]

  return (
    // A fixed height, as the repository plates above have: rows come and go with the story.
    <div aria-hidden className="flex h-[400px] items-center justify-center overflow-hidden rounded-2xl bg-tone-indigo px-6 sm:h-[440px]">
      <div className="w-full max-w-[500px] rounded-2xl bg-ink p-4 shadow-lift">
        <div className="overflow-hidden rounded-lg border border-white/5 bg-white/[0.06]">
          {/* ── 1. THE HEADER ─────────────────────────────────────────────── */}
          <div className="flex items-center p-2">
            <div className="-m-1 flex min-w-0 flex-1 items-center gap-2 rounded-md p-2 text-left">
              <span className="flex w-4 shrink-0 items-center justify-center">
                <GitPullRequest className="h-4 w-4 text-green" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-white/90">
                  {t('site.agentPanel.prNumber', { number: 278 })}
                </span>
                <span className="block truncate text-[10px] text-appink/50">Xrequillart/magic-pay</span>
              </span>
              <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors duration-300 ${badge.tone}`}>
                {t(badge.label)}
              </span>
            </div>
          </div>

          {/* ── 2. THE CHECKLIST ──────────────────────────────────────────── */}
          <div className="border-t border-white/5">
            {(
              <Row
                icon={<MessagesSquare className="h-3.5 w-3.5 text-blue" />}
                header={<span className="block truncate text-xs text-appink/70">{t('site.agentPanel.comments')}</span>}
                detail={
                  <span className="text-[10px] tabular-nums text-appink/60">
                    {t(comments === 1 ? 'site.agentPanel.commentOne' : 'site.agentPanel.commentsCount', { count: comments })}
                  </span>
                }
                chevron="closed"
              />
            )}

            <Row
              icon={
                allPassed ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green" />
                ) : (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-blue" />
                )
              }
              header={
                <span className={`block truncate text-xs ${allPassed ? 'text-appink/70' : 'font-medium text-blue'}`}>
                  {t('site.agentPanel.checks')}
                </span>
              }
              detail={
                <span className="text-[10px] tabular-nums text-appink/60">
                  {t('site.agentPanel.checksPassed', { passed, total: 3 })}
                </span>
              }
              chevron="open"
            >
              {(
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
                      <span className="min-w-0 truncate text-[10px] text-appink/70">{name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Row>

            <Row
              icon={<CheckCircle2 className="h-3.5 w-3.5 text-green" />}
              header={<span className="block truncate text-xs text-appink/70">{t('site.agentPanel.noConflicts')}</span>}
            />
          </div>

          {/* ── 3. THE STATUS BAR ─────────────────────────────────────────── */}
          <div className="flex items-center gap-2 border-t border-white/5 px-2 py-1.5">
            <span className="min-w-0 truncate text-[10px] text-appink/50">
              {t('site.agentPanel.lastChecked', { time: t('site.agentPanel.justNow') })}
            </span>
            <span className="ml-auto flex shrink-0 items-center gap-1.5 rounded-md border border-white/5 px-2 py-1 text-[11px] font-medium text-appink">
              <RefreshCw className="h-3 w-3" />
              {t('site.agentPanel.refresh')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
