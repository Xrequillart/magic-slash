'use client'

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MessageSquareCode,
  MessagesSquare,
  X,
} from 'lucide-react'
import type { MessageKey } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'
import { useLoopStep } from './useLoopStep'

/**
 * The visual under the `prComments` row: the app's PR comments drawer — what opens when
 * the Comments line of the PR card is clicked — redrawn whole, and scrolling through its
 * threads.
 *
 * DRAWN CLASS FOR CLASS from `components/pr-comments/`:
 *
 *   1. THE DRAWER (`PRCommentsPanel`): 70% of the window, `border-l-4` in blue — the
 *      comments' colour throughout the app — with `DRAWER_HEADER`'s `px-4 py-3` bar: a
 *      `w-4` blue `MessagesSquare`, "Pull request #N" at `text-sm font-medium` over the
 *      repo slug and the thread count at `text-xs`, the close button on the right.
 *   2. THE LIST, `px-5 py-4 pb-20 space-y-6`, one `PRThread` per thread:
 *        – THE HEADING, a full-width row: the fold chevron, the path and line in mono at
 *          `text-xs`, and on the right the reply count and the state pill. A RESOLVED
 *          thread's heading sits on `bg-green/5` inside a `border-green/20` and is folded
 *          — `expanded` defaults to the thread being unresolved — so it is one green line.
 *          A conversation comment has no heading at all.
 *        – THE HUNK (`DiffHunkView`): `font-mono text-xs leading-5` on the sunken surface,
 *          a 2px rail per line in its kind's colour, the commented line's rail in accent
 *          over an accent wash, one line number in a `w-14` gutter.
 *        – THE COMMENT (`ThreadComment`): a `rounded-xl` card on the raised surface with a
 *          `px-5 py-2.5` header on the subtle one — the `w-6` initial avatar in accent,
 *          `@login` at `text-xs font-medium`, the review badge, the age pushed right — and
 *          the body at `px-5 py-4`.
 *        – THE REPLIES, `ml-6 pl-4` behind a 2px rule, each the same card.
 *   3. THE NAVIGATOR (`ThreadNavigator`), floating at `bottom-4`: Previous, "current /
 *      total code comments" with its `MessageSquareCode`, Next — the same pill the review
 *      drawer wears.
 *
 * THE ANIMATION IS A SCROLL, AND ONLY THAT: the list glides down to its second thread,
 * then to its end, then back to the top, on a loop through `useLoopStep`, with a
 * `translateY` transition doing the gliding. Nothing on the threads changes — these are
 * comments already written, and the drawer's job is to let them be read.
 *
 * THE THREADS ARE THE STORY THE OTHER CARDS TELL: a reviewer's change request on the VAT
 * rounding, the agent's reply pointing at the commit that fixed it, a resolved thread on
 * the invoice, and the approving review summary. Same ticket, same branch, same PR.
 *
 * IN DARK, as every app reproduction here, through the declared tokens: `appbg` for the
 * navigator's ground, the white-alpha ramp for `surface`, `surface-subtle`, `surface-
 * sunken`, `line-field` and `line-subtle`, `blue` and `accent` where the app has them.
 *
 * `aria-hidden`: it is a drawing, and a fold that cannot be opened should be announced to
 * nobody.
 */

type Kind = 'ctx' | 'add' | 'del'
type HunkLine = { n: number; kind: Kind; text: string; commented?: boolean }

const VAT_HUNK: readonly HunkLine[] = [
  { n: 9, kind: 'ctx', text: 'export function applyVat(amount: number, rate: number) {' },
  { n: 10, kind: 'del', text: '  return amount * (1 + rate)' },
  { n: 10, kind: 'add', text: '  const vat = amount * rate' },
  { n: 11, kind: 'add', text: '  return amount + vat', commented: true },
  { n: 12, kind: 'ctx', text: '}' },
]

const RAIL: Record<Kind, string> = { add: 'border-green', del: 'border-red', ctx: 'border-transparent' }
const FILL: Record<Kind, string> = { add: 'bg-green/10', del: 'bg-red/10', ctx: '' }
const MARK: Record<Kind, string> = { add: '+', del: '-', ctx: ' ' }

/** `InitialsAvatar`. */
function Avatar({ login }: { login: string }) {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20 text-[11px] font-semibold text-accent">
      {login[0].toUpperCase()}
    </span>
  )
}

/** `ThreadComment`. */
function Comment({
  author,
  badge,
  age,
  children,
}: {
  author: string
  badge?: { tone: string; label: MessageKey }
  age: string
  children: ReactNode
}) {
  const { t } = useT()
  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.06]">
      <div className="flex items-center gap-1.5 border-b border-white/5 bg-white/[0.04] px-5 py-2.5">
        <Avatar login={author} />
        <span className="text-xs font-medium text-white">@{author}</span>
        {badge ? (
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${badge.tone}`}>{t(badge.label)}</span>
        ) : null}
        <span className="ml-auto text-xs text-appink/50">{age}</span>
      </div>
      <div className="px-5 py-4 text-sm leading-relaxed text-white/90">{children}</div>
    </div>
  )
}

/** `DiffHunkView`. */
function Hunk({ lines }: { lines: readonly HunkLine[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-white/[0.08] bg-black/30 font-mono text-xs leading-5">
      {lines.map((line, index) => (
        <div
          key={index}
          className={`flex border-l-2 ${line.commented ? 'border-accent' : RAIL[line.kind]} ${
            line.commented && line.kind === 'ctx' ? 'bg-accent/10' : FILL[line.kind]
          }`}
        >
          <span className="w-14 shrink-0 select-none pr-2 text-right tabular-nums text-appink/50">
            {MARK[line.kind]}
            {line.n}
          </span>
          <span className={`whitespace-pre pr-4 ${line.commented ? 'text-white' : 'text-white/70'}`}>{line.text}</span>
        </div>
      ))}
    </div>
  )
}

// 0 top · 1 down to the second thread · 2 down to the end · 3 back to the top, held.
const AT = [0, 2200, 5200, 8200] as const
const LOOP = 10600
/** How far each beat asks to scroll; the last two are capped at the list's real end. */
const SCROLL_BY = [0, 300, Infinity, 0] as const

export function PRCommentsMockup() {
  const { t } = useT()
  const step = useLoopStep(AT, LOOP)
  const bodyRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState(0)

  // The end of the list is measured, not guessed: a beat that scrolled past it would
  // show an empty drawer, and the list's height is the copy's, which differs by language.
  useLayoutEffect(() => {
    const body = bodyRef.current
    const list = listRef.current
    if (!body || !list) return
    const max = Math.max(0, list.offsetHeight - body.clientHeight)
    setOffset(Math.min(SCROLL_BY[Math.max(0, step)], max))
  }, [step])

  return (
    <div aria-hidden className="h-[520px] overflow-hidden rounded-2xl bg-tone-sky pl-5 pt-5 sm:h-[600px] sm:pl-14 sm:pt-10">
      <div className="flex h-full w-full overflow-hidden rounded-tl-xl bg-ink shadow-lift">
        <div className="w-10 shrink-0 bg-black/30 sm:w-24" />
        <div className="relative flex min-w-0 flex-1 flex-col border-l-4 border-l-blue bg-ink">
          {/* ── 1. THE HEADER ─────────────────────────────────────────────── */}
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <MessagesSquare className="h-4 w-4 shrink-0 text-blue" />
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium text-white">{t('site.agentPanel.prNumber', { number: 278 })}</span>
                <span className="truncate text-xs text-appink">Xrequillart/magic-pay · {t('site.prComments.threads')}</span>
              </div>
            </div>
            <span className="ml-3 rounded-md p-1.5 text-appink">
              <X className="h-4 w-4" />
            </span>
          </div>

          {/* ── 2. THE LIST, scrolling ─────────────────────────────────────── */}
          <div ref={bodyRef} className="relative min-h-0 flex-1 overflow-hidden">
            <div
              ref={listRef}
              className="space-y-6 px-5 py-4 pb-20 transition-transform duration-[1400ms] ease-in-out motion-reduce:transition-none"
              style={{ transform: `translateY(-${offset}px)` }}
            >
              {/* Thread 1 — inline, open, one reply. */}
              <article className="space-y-2">
                <div className="flex w-full min-w-0 items-center gap-2 rounded-md px-1 py-1 text-left">
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-appink-icon" />
                  <span className="min-w-0 truncate font-mono text-xs text-appink">src/billing/vat.ts:11</span>
                  <span className="ml-auto flex shrink-0 items-center gap-2 text-[11px]">
                    <span className="tabular-nums text-appink/70">{t('site.prComments.oneReply')}</span>
                  </span>
                </div>
                <Hunk lines={VAT_HUNK} />
                <Comment author="theo" badge={{ tone: 'bg-red/10 text-red', label: 'site.agentPanel.reviewChanges' }} age={t('site.prComments.age1')}>
                  {t('site.prComments.root1')}
                </Comment>
                <div className="ml-6 space-y-2 border-l-2 border-white/5 pl-4">
                  <Comment author="camille" age={t('site.prComments.age2')}>
                    {t('site.prComments.reply1')}
                  </Comment>
                </div>
              </article>

              {/* Thread 2 — inline, resolved, folded to its green heading. */}
              <article className="space-y-2">
                <div className="flex w-full min-w-0 items-center gap-2 rounded-md border border-green/20 bg-green/5 px-2 py-1.5 text-left">
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-appink-icon" />
                  <span className="min-w-0 truncate font-mono text-xs text-appink">src/billing/invoice.ts:43</span>
                  <span className="ml-auto flex shrink-0 items-center gap-2 text-[11px]">
                    <span className="tabular-nums text-appink/70">{t('site.prComments.oneReply')}</span>
                    <span className="flex items-center gap-1 rounded bg-green/10 px-1.5 py-0.5 font-semibold text-green">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green" />
                      {t('site.prComments.resolved')}
                    </span>
                  </span>
                </div>
              </article>

              {/* Thread 3 — the review summary: no heading, just the comment. */}
              <article className="space-y-2">
                <Comment author="theo" badge={{ tone: 'bg-green/10 text-green', label: 'site.agentPanel.reviewApproved' }} age={t('site.prComments.age3')}>
                  {t('site.prComments.summary')}
                </Comment>
              </article>
            </div>

            {/* ── 3. THE NAVIGATOR ──────────────────────────────────────────── */}
            <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
              <div className="flex items-center gap-1 whitespace-nowrap rounded-full border border-white/10 bg-appbg-tertiary p-1 shadow-lift">
                <span className="inline-flex items-center gap-1.5 rounded-full py-1.5 pl-2 pr-3 text-sm font-medium text-appink opacity-40">
                  <ChevronLeft className="h-[18px] w-[18px]" />
                  {t('site.prComments.previous')}
                </span>
                <span className="flex select-none items-center gap-1.5 px-1.5 text-sm tabular-nums text-appink">
                  <MessageSquareCode className="h-[15px] w-[15px] shrink-0" />
                  {t('site.prComments.counter')}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full py-1.5 pl-3 pr-2 text-sm font-medium text-appink">
                  {t('site.prComments.next')}
                  <ChevronRight className="h-[18px] w-[18px]" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
