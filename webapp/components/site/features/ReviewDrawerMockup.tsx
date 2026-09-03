'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FolderGit2,
  MessageSquare,
  MessageSquarePlus,
  Pencil,
  SendHorizontal,
  Trash2,
  X,
} from 'lucide-react'
import type { MessageKey } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'

/**
 * The visual under the `Review the changes` row: the desktop app's review drawer,
 * redrawn, with a comment being left on a line and sent to the agent.
 *
 * DRAWN FROM `desktop/src/renderer/components/FilePreviewPanel.tsx` and the components
 * under `file-preview/`, band for band and at the app's own sizes — nothing here is
 * scaled, because the drawer is 70% of a window and its type is already the 12–14px a
 * page can read:
 *
 *   1. THE REVIEW HEADER (`ReviewHeader`): `px-4 py-3 border-b`, the repo's name over
 *      "N files changed", and on the right the `ChangeCountChip` — `+added −removed` at
 *      `text-[10px] font-medium` in a bordered pill — then the close button.
 *   2. ONE CARD PER FILE (`FileReviewCard`), `rounded-xl border` in a `p-3 space-y-3`
 *      column: a chevron, the status letter in its `w-5 h-5` bordered square, the file
 *      name at `text-sm font-medium` over its path at `text-xs`, and the file's own count
 *      chip. Under it the diff, in the app's github-dark chrome: added rows on a green
 *      wash with a 2px green rail and a `+` in the gutter, removed rows the same in red.
 *      The three colour values are `CodeView`'s own constants and are inlined here for
 *      that reason — they are a syntax theme's, not this site's, and a token for them
 *      would be a token nobody else may use.
 *   3. THE COMPOSER (`CommentCard`), spliced under the row it was opened on: the plus-
 *      signed bubble, "Line N", the quoted row on a 2px rule, a three-row textarea, and
 *      Cancel / Save with Save disabled until there is something to save. Saved, the same
 *      card shows the body with Delete / Edit under it.
 *   4. THE NAVIGATOR (`ChangeNavigator`), floating at `bottom-4` in a `w-4/5` pill:
 *      previous / "2 / 5" / next on the left, and on the right the comments count and
 *      "Send to the agent" in accent — `ReviewCommentsButton`, which is the step that
 *      hands the notes back.
 *
 * THE ANIMATION IS THE FEATURE, and it is a SEQUENCE rather than the independent reveals
 * the other drawings on this page run: the list scrolls to a change, a pointer lands on
 * the gutter and clicks, the composer opens, a sentence is typed, Save is pressed, the
 * count in the bar becomes 1, and Send is pressed. Eight states, each one only meaningful
 * after the one before it. That is a state machine, and it is driven from ONE clock in
 * JavaScript — `elapsed % LOOP_MS`, read every tick — rather than from eight sets of CSS
 * keyframes that would have to agree about their percentages by hand. What CSS still
 * owns is the motion between states: the pointer's travel and the scroll are transitions
 * on `left`/`top` and `translate`, so a state change is a destination and the easing is
 * declared once.
 *
 * THE POINTER'S TARGETS ARE MEASURED, NOT PLACED. Each thing it clicks is a `ref`, and its
 * position is read off the DOM when the state that aims at it arrives — so a longer
 * French label or a narrower phone does not leave the pointer clicking beside a button.
 *
 * UNDER `prefers-reduced-motion` the clock never starts and the drawing rests at the end:
 * scrolled to the change, the comment saved, no pointer. The finished state is the one
 * with the most information in it, which is why every loop also spends its last beats
 * there.
 *
 * IN DARK, the same trade the other app reproductions on this page make: `bg-ink` plus the
 * declared white-alpha ramp for the app's `bg-secondary` / `bg-tertiary` / `line` steps,
 * `appink` for its secondary text, and the app's `orange` — which this palette does not
 * declare — becomes `yellow`, exactly as the Agents sidebar does it.
 *
 * `aria-hidden`, and the whole panel: it is a drawing, and a button that cannot be pressed
 * should be announced to nobody.
 */

/** One loop of the sequence, in milliseconds. The last two seconds rest on the sent state. */
const LOOP_MS = 12000

/**
 * When each state begins, in milliseconds into the loop. Spelled as a table because the
 * ORDER is the point and a reader should be able to see it in one place — a delay per
 * element would have hidden it across the file.
 */
const AT = {
  scroll: 900,
  aimLine: 2300,
  clickLine: 3300,
  type: 3900,
  aimSave: 7000,
  clickSave: 7800,
  aimSend: 8600,
  clickSend: 9400,
} as const

/** How long the pointer stays pressed on a click. */
const PRESS_MS = 160

/** How long between two typed characters. About the pace of somebody who knows what to say. */
const TYPE_MS = 55

/** How often the clock is read. Fine enough for typing; nothing else needs more. */
const TICK_MS = 40

/** The app's github-dark diff chrome — `CodeView.tsx`, `DARK_CHROME`. See the note above. */
const DIFF = {
  add: '#2ea043',
  addBg: 'rgba(46,160,67,0.15)',
  remove: '#f85149',
  removeBg: 'rgba(248,81,73,0.15)',
} as const

type Kind = 'ctx' | 'add' | 'del'
type Line = { n: number | ''; kind: Kind; code: string }

/**
 * The three files of the review, on the same invented project as the Agents drawing —
 * PAY-318, an invoice's VAT. Code is a literal: it is code, and the same in both
 * languages.
 *
 * THE COMMENTED LINE IS THE ONE THAT ADDS THE VAT WITHOUT ROUNDING IT, so the comment
 * typed under it — "round to the cent before adding it" — is a remark a reviewer would
 * actually make and not a placeholder. `commentAt` names the row by index.
 */
const FILES: readonly {
  name: string
  path: string
  status: 'M' | 'A'
  added: number
  removed: number
  lines: readonly Line[]
  commentAt?: number
}[] = [
  {
    name: 'invoice.ts',
    path: 'src/billing/invoice.ts',
    status: 'M',
    added: 6,
    removed: 2,
    lines: [
      { n: 41, kind: 'ctx', code: 'export function totalOf(invoice: Invoice) {' },
      { n: 42, kind: 'del', code: '  return invoice.lines.reduce((sum, l) => sum + l.amount, 0)' },
      { n: 42, kind: 'add', code: '  const net = invoice.lines.reduce((sum, l) => sum + l.amount, 0)' },
      { n: 43, kind: 'add', code: '  return applyVat(net, invoice.vatRate)' },
      { n: 44, kind: 'ctx', code: '}' },
    ],
  },
  {
    name: 'vat.ts',
    path: 'src/billing/vat.ts',
    status: 'M',
    added: 4,
    removed: 1,
    lines: [
      { n: 9, kind: 'ctx', code: 'export function applyVat(amount: number, rate: number) {' },
      { n: 10, kind: 'del', code: '  return amount * (1 + rate)' },
      { n: 10, kind: 'add', code: '  const vat = amount * rate' },
      { n: 11, kind: 'add', code: '  return amount + vat' },
      { n: 12, kind: 'ctx', code: '}' },
    ],
    commentAt: 3,
  },
  {
    name: 'vat.test.ts',
    path: 'src/billing/__tests__/vat.test.ts',
    status: 'A',
    added: 14,
    removed: 0,
    lines: [
      { n: 1, kind: 'add', code: "import { applyVat } from '../vat'" },
      { n: 2, kind: 'add', code: '' },
      { n: 3, kind: 'add', code: "test('applies the rate', () => {" },
      { n: 4, kind: 'add', code: '  expect(applyVat(100, 0.2)).toBe(120)' },
      { n: 5, kind: 'add', code: '})' },
    ],
  },
]

const COMMENTED_FILE = 1
const COMMENTED_LINE = FILES[COMMENTED_FILE].lines[FILES[COMMENTED_FILE].commentAt!]

/** Which of the pointer's three destinations it is aiming at, or none. */
type Target = 'line' | 'save' | 'send' | null

type Frame = {
  scrolled: boolean
  target: Target
  pressed: boolean
  open: boolean
  typed: number
  saved: boolean
  sent: boolean
}

/** The whole drawing, as a function of one clock. Pure, so the tick can never drift from the table. */
function frameAt(ms: number, commentLength: number): Frame {
  const pressedAt = (at: number) => ms >= at && ms < at + PRESS_MS
  const target: Target =
    ms >= AT.aimSend ? 'send' : ms >= AT.aimSave ? 'save' : ms >= AT.aimLine ? 'line' : null
  return {
    scrolled: ms >= AT.scroll,
    target,
    pressed: pressedAt(AT.clickLine) || pressedAt(AT.clickSave) || pressedAt(AT.clickSend),
    open: ms >= AT.clickLine,
    typed: ms < AT.type ? 0 : Math.min(commentLength, Math.floor((ms - AT.type) / TYPE_MS)),
    saved: ms >= AT.clickSave,
    sent: ms >= AT.clickSend,
  }
}

/** Where the loop rests under reduced motion: everything done, nobody's hand on it. */
function restingFrame(commentLength: number): Frame {
  return {
    scrolled: true,
    target: null,
    pressed: false,
    open: true,
    typed: commentLength,
    saved: true,
    sent: false,
  }
}

/** The status letter in front of a file — `statusConfigFor` in `FileHeader.tsx`. */
const STATUS: Record<'M' | 'A', string> = {
  M: 'text-yellow border-yellow/40',
  A: 'text-green border-green/40',
}

/** `ChangeCountChip`, at its own `text-[10px]`. */
function CountChip({ added, removed }: { added: number; removed: number }) {
  return (
    <span className="flex items-center gap-1.5 rounded border border-onink-rule bg-onink-tint px-1.5 py-0.5 text-[10px] font-medium tabular-nums">
      <span className="text-green">+{added}</span>
      <span className="text-red">−{removed}</span>
    </span>
  )
}

/** A macOS arrow pointer, black with a white edge so it reads on the dark drawer. */
function Pointer({ pressed }: { pressed: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5 drop-shadow-md transition-transform duration-150 ${
        pressed ? 'scale-[0.82]' : 'scale-100'
      }`}
      style={{ transformOrigin: '4px 3px' }}
    >
      <path
        d="M5 3l12 10.5h-6.6l3.9 8-2.8 1.2-3.9-8L5 19.5z"
        fill="#000"
        stroke="#fff"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ReviewDrawerMockup() {
  const { t } = useT()
  const comment = t('site.reviewDrawer.comment')

  const [frame, setFrame] = useState<Frame>(() => frameAt(0, comment.length))
  const [reduced, setReduced] = useState(false)

  const bodyRef = useRef<HTMLDivElement>(null)
  const drawerRef = useRef<HTMLDivElement>(null)
  const lineRef = useRef<HTMLDivElement>(null)
  const saveRef = useRef<HTMLSpanElement>(null)
  const sendRef = useRef<HTMLSpanElement>(null)

  const [scrollBy, setScrollBy] = useState(0)
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null)

  // THE CLOCK. One interval, and every tick derives the whole frame from how far into
  // the loop it is — see `frameAt`. Not started at all under reduced motion.
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (media.matches) {
      setReduced(true)
      setFrame(restingFrame(comment.length))
      return
    }
    const start = performance.now()
    const id = window.setInterval(() => {
      setFrame(frameAt((performance.now() - start) % LOOP_MS, comment.length))
    }, TICK_MS)
    return () => window.clearInterval(id)
  }, [comment.length])

  // THE SCROLL DISTANCE: enough to put the commented row a third of the way down the
  // body. Measured, because the cards above it are as tall as their diffs.
  useLayoutEffect(() => {
    const measure = () => {
      const body = bodyRef.current
      const line = lineRef.current
      if (!body || !line) return
      const lineTop = line.getBoundingClientRect().top - body.getBoundingClientRect().top
      setScrollBy(Math.max(0, Math.round(lineTop - body.clientHeight * 0.34)))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // THE POINTER'S DESTINATION, read off the element it is aiming at. Runs when the target
  // changes and again once the composer has opened, because Save does not exist until
  // then and the pointer must not aim at where it was going to be.
  useLayoutEffect(() => {
    const drawer = drawerRef.current
    if (!drawer || !frame.target) {
      setPointer(null)
      return
    }
    const el =
      frame.target === 'line'
        ? lineRef.current
        : frame.target === 'save'
          ? saveRef.current
          : sendRef.current
    if (!el) return
    const box = el.getBoundingClientRect()
    const origin = drawer.getBoundingClientRect()
    // The gutter's middle for a row, a button's centre otherwise.
    const x = frame.target === 'line' ? box.left + 22 : box.left + box.width / 2
    const y = box.top + box.height / 2
    setPointer({ x: x - origin.left, y: y - origin.top })
  }, [frame.target, frame.open, frame.scrolled, scrollBy])

  const commentCount: MessageKey = frame.saved
    ? 'site.reviewDrawer.oneComment'
    : 'site.reviewDrawer.noComments'

  return (
    <div
      aria-hidden
      className="h-[460px] overflow-hidden rounded-2xl bg-tone-mist pl-5 pt-5 sm:h-[560px] sm:pl-14 sm:pt-10"
    >
      {/* THE WINDOW. Its top-left corner is the one edge fully drawn; the plate crops the
          rest. A strip of terminal on the left — the 30% the drawer does not cover — and
          the drawer, which in the app is `w-[70%] border-l-4` sliding in from the right.

          `overflow-hidden` is what makes the corner a corner: the terminal strip inside is
          a translucent black, and without the clip its square corner showed through the
          radius as a grey wedge on the plate. `shadow-lift` rather than `shadow-edge`,
          because two edges of this window meet the plate, not one. */}
      <div className="flex h-full w-full overflow-hidden rounded-tl-xl bg-ink shadow-lift">
        <div className="w-10 shrink-0 bg-black/30 sm:w-24" />
        <div
          ref={drawerRef}
          className="relative flex min-w-0 flex-1 flex-col border-l-4 border-l-onink-rule bg-ink"
        >
          {/* ── 1. THE REVIEW HEADER ──────────────────────────────────────── */}
          <div className="flex shrink-0 items-center justify-between border-b border-onink-rule px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <FolderGit2 className="h-4 w-4 shrink-0 text-appink" />
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium text-white">magic-pay</span>
                <span className="truncate text-xs text-appink">
                  {t('site.reviewDrawer.filesChanged')}
                </span>
              </div>
            </div>
            <div className="ml-3 flex shrink-0 items-center gap-2">
              <CountChip added={24} removed={3} />
              <span className="rounded-md p-1.5 text-appink">
                <X className="h-4 w-4" />
              </span>
            </div>
          </div>

          {/* ── 2. THE FILES ──────────────────────────────────────────────── */}
          <div ref={bodyRef} className="relative min-h-0 flex-1 overflow-hidden">
            <div
              className="space-y-3 p-3 transition-transform duration-[1100ms] ease-in-out motion-reduce:transition-none"
              style={{ transform: `translateY(-${frame.scrolled ? scrollBy : 0}px)` }}
            >
              {FILES.map((file, fileIndex) => (
                <div key={file.path} className="rounded-xl border border-onink-rule bg-onink-tint">
                  <div className="flex items-center gap-2.5 px-3 py-2.5">
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-appink" />
                    <span
                      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[10px] font-bold ${STATUS[file.status]}`}
                    >
                      {file.status}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium text-white">{file.name}</span>
                      <span className="truncate text-xs text-appink">{file.path}</span>
                    </div>
                    <CountChip added={file.added} removed={file.removed} />
                  </div>
                  <div className="overflow-hidden rounded-b-xl border-t border-onink-tint py-2 font-mono text-xs leading-[18px]">
                    {file.lines.map((line, lineIndex) => {
                      const isTarget = fileIndex === COMMENTED_FILE && lineIndex === file.commentAt
                      const marked = isTarget && frame.open
                      return (
                        <div key={lineIndex}>
                          <div
                            ref={isTarget ? lineRef : undefined}
                            className="flex whitespace-pre"
                            style={
                              line.kind === 'add'
                                ? { background: DIFF.addBg, boxShadow: `inset 2px 0 0 ${DIFF.add}` }
                                : line.kind === 'del'
                                  ? { background: DIFF.removeBg, boxShadow: `inset 2px 0 0 ${DIFF.remove}` }
                                  : undefined
                            }
                          >
                            {/* THE GUTTER, `CodeView`'s `::before`: 3rem wide, right-aligned,
                                a rule on its right, and the sign in front of the number on a
                                changed row. A commented row carries the bubble here too. */}
                            <span
                              className="mr-3 flex w-12 shrink-0 select-none items-center justify-end gap-1 border-r pr-3 text-right"
                              style={{
                                color:
                                  line.kind === 'add'
                                    ? DIFF.add
                                    : line.kind === 'del'
                                      ? DIFF.remove
                                      : '#8A8A92',
                                borderRightColor: 'rgba(255,255,255,0.1)',
                              }}
                            >
                              {marked ? <MessageSquare className="h-3 w-3 text-yellow" /> : null}
                              {line.kind === 'add' ? '+' : line.kind === 'del' ? '−' : ''}
                              {line.n}
                            </span>
                            <span className="text-white/90">{line.code || ' '}</span>
                          </div>

                          {/* ── 3. THE COMPOSER, spliced under its row ──────────── */}
                          {isTarget && frame.open ? (
                            <div className="mx-3 my-2 flex gap-2.5 rounded-lg border border-onink-rule bg-onink-selected p-3 font-sans">
                              {frame.saved ? (
                                <MessageSquare className="mt-px h-3.5 w-3.5 shrink-0 text-yellow" />
                              ) : (
                                <MessageSquarePlus className="mt-px h-3.5 w-3.5 shrink-0 text-yellow" />
                              )}
                              <div className="flex min-w-0 flex-1 flex-col gap-2">
                                <span className="text-[11px] font-medium text-appink">
                                  {t('site.reviewDrawer.line')}
                                </span>
                                <pre className="max-h-16 overflow-hidden whitespace-pre-wrap break-all border-l-2 border-onink-rule pl-2 font-mono text-[11px] leading-snug text-appink">
                                  {COMMENTED_LINE.code.trim()}
                                </pre>
                                {frame.saved ? (
                                  <>
                                    <p className="whitespace-pre-wrap break-words text-xs text-white">
                                      {comment}
                                    </p>
                                    <div className="flex items-center justify-end gap-1.5">
                                      <span className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red">
                                        <Trash2 className="h-3.5 w-3.5" />
                                        {t('site.reviewDrawer.delete')}
                                      </span>
                                      <span className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-appink">
                                        <Pencil className="h-3.5 w-3.5" />
                                        {t('site.reviewDrawer.edit')}
                                      </span>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    {/* `INPUT` from the app's `controls.ts`, three rows tall.
                                        The caret is a bar that follows the typed text and
                                        blinks once the sentence is finished. */}
                                    <div className="min-h-[62px] rounded-lg border border-onink-rule bg-onink-tint px-3 py-1.5 text-xs leading-relaxed text-white">
                                      {frame.typed === 0 ? (
                                        <span className="text-appink/30">
                                          {t('site.reviewDrawer.placeholder')}
                                        </span>
                                      ) : (
                                        comment.slice(0, frame.typed)
                                      )}
                                      <span
                                        className={`ml-px inline-block h-3 w-px translate-y-0.5 bg-white ${
                                          frame.typed >= comment.length ? 'animate-caret-blink' : ''
                                        }`}
                                      />
                                    </div>
                                    <div className="flex items-center justify-end gap-1.5">
                                      <span className="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium text-appink">
                                        {t('site.reviewDrawer.cancel')}
                                      </span>
                                      <span
                                        ref={saveRef}
                                        className={`inline-flex items-center rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition-opacity ${
                                          frame.typed === 0 ? 'opacity-40' : ''
                                        } ${frame.pressed && frame.target === 'save' ? 'bg-accent-hover' : ''}`}
                                      >
                                        {t('site.reviewDrawer.save')}
                                      </span>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
              {/* Room under the last card for the floating bar, as the app's own padding leaves. */}
              <div className="h-16" />
            </div>

            {/* ── 4. THE NAVIGATOR ─────────────────────────────────────────── */}
            <div className="absolute bottom-4 left-1/2 z-10 w-[92%] -translate-x-1/2 sm:w-4/5">
              <div className="flex items-center justify-between gap-2 rounded-full border border-onink-rule bg-[#1c1c1f] p-1 shadow-lift">
                <div className="flex items-center gap-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full py-1.5 pl-2 pr-3 text-sm font-medium text-appink">
                    <ChevronLeft className="h-[18px] w-[18px]" />
                  </span>
                  <span className="select-none px-1.5 text-sm tabular-nums text-appink">2 / 5</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full py-1.5 pl-3 pr-2 text-sm font-medium text-appink">
                    <ChevronRight className="h-[18px] w-[18px]" />
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full py-1.5 pl-2.5 pr-3.5 text-sm font-medium text-appink ${
                      frame.saved ? '' : 'opacity-40'
                    }`}
                  >
                    <MessageSquare className="h-[18px] w-[18px]" />
                    <span className="tabular-nums">{t(commentCount)}</span>
                  </span>
                  <span
                    ref={sendRef}
                    className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full py-1.5 pl-2.5 pr-3.5 text-sm font-medium transition-colors ${
                      frame.saved ? 'text-accent' : 'text-accent opacity-40'
                    } ${frame.sent ? 'bg-onink-selected text-accent-hover' : ''}`}
                  >
                    <SendHorizontal className="h-[18px] w-[18px]" />
                    <span className="hidden sm:inline">{t('site.reviewDrawer.sendToAgent')}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── THE POINTER ───────────────────────────────────────────────── */}
          {pointer && !reduced ? (
            <div
              className="pointer-events-none absolute z-20 transition-[left,top] duration-700 ease-in-out"
              style={{ left: pointer.x, top: pointer.y }}
            >
              <Pointer pressed={frame.pressed} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
