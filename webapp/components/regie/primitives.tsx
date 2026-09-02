'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown, Copy, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * The back-office's visual vocabulary. Related to `components/ui.tsx` — same blue
 * family, same rounded cards — but never shared with it: nothing is imported
 * across the two, so retuning the console can never move a user page.
 *
 * Where it differs from the user space, and why:
 *
 *  * DATA IS MONOSPACE. Emails, uuids, versions, counts and dates are strings read
 *    character by character and compared down a column. The user pages have prose.
 *  * LABELS, NOT HEADLINES. The console never sets a 5xl display title; it captions
 *    panels with small uppercase labels, because a screen holding six panels cannot
 *    give each one a headline.
 *  * SOFT SHADOW OVER HARD BORDER. Panels sit on a blue ground with a 1px cool rule
 *    and a single-pixel shadow, so they lift off the page instead of being drawn on
 *    it.
 */

// ── Structure ────────────────────────────────────────────────────────────────

/**
 * A titled data surface. The label sits OUTSIDE the card, on the ground — a caption
 * for the panel rather than a header inside it, which keeps the card pure content
 * and lets several stack without a run of heavy bars down the page.
 *
 * `overflow-hidden` is load-bearing: the tables inside are full-width, and without
 * it the first and last rows square off the corners the card just rounded.
 */
export function Panel({
  label,
  action,
  className = '',
  children,
}: {
  label?: string
  action?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className={className}>
      {(label || action) && (
        <div className="mb-2 flex items-baseline gap-3 px-1">
          {label && <SectionLabel>{label}</SectionLabel>}
          {action && <div className="ml-auto">{action}</div>}
        </div>
      )}
      <div className="overflow-hidden rounded-2xl border border-regie-rule bg-regie-panel shadow-sm shadow-brand/[0.04]">
        {children}
      </div>
    </section>
  )
}

/** Uppercase micro-label. The console's only heading device. */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-regie-dim">
      {children}
    </h2>
  )
}

/**
 * One cell of an identity card: a micro-label over its value. The value is monospace
 * and `break-all` — these are emails, uuids, branch names and versions, strings with
 * no word boundaries to wrap on.
 *
 * Draws no rule of its own: the RULES BELONG TO THE PARENT `dl`, which is what lets
 * the same cell read as a stacked list or as one row. The identity cards both use the
 * row form (`flex flex-col divide-y … lg:flex-row lg:divide-x lg:divide-y-0`), so a
 * handful of facts answer "who is this" in a glance instead of down a column.
 *
 * `min-w-0` on a flex child is not optional — without it a long email refuses to
 * shrink below its content and pushes the cells to its right off the card.
 */
export function InlineField({
  label,
  className = 'lg:flex-1',
  children,
}: {
  label: string
  /** Flex weight at lg and up, where the card becomes one row. */
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`min-w-0 px-4 py-3 ${className}`}>
      <dt className="text-[11px] uppercase tracking-[0.08em] text-regie-dim">{label}</dt>
      <dd className="mt-1 flex items-start gap-1.5 break-all font-mono text-[13px] text-ink">
        {children}
      </dd>
    </div>
  )
}

/** What a panel says when it has nothing to show. */
export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-6 text-[13px] text-regie-dim">{children}</p>
}

/**
 * Clips its content to a height and offers a button that grows it to fit.
 *
 * For a panel that holds more than its share of a screen. A console page is read by
 * scanning it, and one card tall enough to fill the viewport pushes everything after
 * it out of reach — while its own top half is usually the answer.
 *
 * HOW THE ANIMATION WORKS, and why it is not `max-height: none`: CSS cannot
 * transition to `auto`, so the open state has to be a NUMBER. The content is measured
 * and that pixel height is what max-height animates to. Animating to a large constant
 * instead — the usual shortcut — makes the card race open and stop early, because the
 * transition is timed over a distance the content does not use.
 *
 * The measurement is kept fresh by a ResizeObserver rather than taken once: the
 * content here is a table that gets its rows from a fetch, so its height changes after
 * mount, and a stale number would clip the rows that arrived last while OPEN, which is
 * the one state where nothing may be hidden.
 *
 * The button is not rendered when everything already fits. A control that expands
 * nothing is worse than no control: it teaches that there is more to see.
 *
 * NOT `hidden` or unmounted while collapsed: the clipped content stays in the DOM and
 * readable by a screen reader, which `aria-expanded` on the button then describes. It
 * holds no focusable element in any current caller — a clipped table of buttons would
 * need `inert`, not a taller card.
 */
export function Collapsible({
  collapsedHeight,
  moreLabel = 'Tout afficher',
  lessLabel = 'Réduire',
  children,
}: {
  /** Pixels of content shown while collapsed. */
  collapsedHeight: number
  moreLabel?: string
  lessLabel?: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [contentHeight, setContentHeight] = useState<number | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const regionId = useId()

  useEffect(() => {
    const content = contentRef.current
    if (!content) return

    const measure = () =>
      setContentHeight((previous) =>
        previous === content.scrollHeight ? previous : content.scrollHeight,
      )

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(content)
    return () => observer.disconnect()
  }, [])

  // Until the first measurement lands, assume it fits: a button that appears is a
  // smaller surprise than one that appears and then vanishes.
  const overflows = contentHeight !== null && contentHeight > collapsedHeight

  return (
    <>
      <div
        id={regionId}
        className="relative overflow-hidden transition-[max-height] duration-300 ease-out motion-reduce:transition-none"
        style={{
          maxHeight: !overflows ? undefined : open ? (contentHeight ?? undefined) : collapsedHeight,
        }}
      >
        <div ref={contentRef}>{children}</div>

        {/* The cut, softened. A hard edge mid-row reads as a rendering bug; a fade
            says the content continues. Only while collapsed, and never catching a
            click meant for what is under it. */}
        {overflows && !open && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-regie-panel to-transparent"
          />
        )}
      </div>

      {overflows && (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={regionId}
          className="flex w-full items-center justify-center gap-1.5 border-t border-regie-rule-soft py-2.5 font-display text-[11px] font-bold uppercase tracking-[0.06em] text-regie-dim transition-colors hover:bg-regie-tint hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
        >
          {open ? lessLabel : moreLabel}
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-300 motion-reduce:transition-none ${
              open ? 'rotate-180' : ''
            }`}
          />
        </button>
      )}
    </>
  )
}

// ── Status ───────────────────────────────────────────────────────────────────

const PILL_TONES = {
  neutral: 'bg-black/[0.05] text-regie-dim',
  brand: 'bg-brand/10 text-brand',
  green: 'bg-green/[0.12] text-green',
  yellow: 'bg-yellow/[0.16] text-yellow',
  red: 'bg-red/[0.12] text-red',
} as const

export type PillTone = keyof typeof PILL_TONES

/**
 * Filled and fully rounded, matching the user app's Badge — the console reads as
 * the same product. Filled rather than outlined because on a rounded white card an
 * outline at 11px reads as a disabled input.
 */
export function Pill({
  tone = 'neutral',
  children,
}: {
  tone?: PillTone
  children: React.ReactNode
}) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 font-mono text-[11px] leading-tight ${PILL_TONES[tone]}`}
    >
      {children}
    </span>
  )
}

/**
 * A boolean drawn as the switch the desktop app shows for it, so the console reads
 * like the screen being described to the operator rather than translating it to
 * on/off.
 *
 * NOT A CONTROL, and shaped so it cannot be taken for one: a span with no cursor, no
 * hover, no focus ring, no handler and no transition. The record it sits in is
 * read-only on purpose — nothing in the console mutates a person's own account — and
 * a switch that moved under the pointer would be the one thing on the page implying
 * otherwise.
 *
 * `role="img"` with a label rather than `aria-hidden`: the position of this switch IS
 * the value of its row, so it cannot be decoration — there is no text beside it to
 * carry the state.
 */
export function SwitchValue({ on }: { on: boolean }) {
  return (
    <span
      role="img"
      aria-label={on ? 'activé' : 'désactivé'}
      className={`inline-flex h-3.5 w-6 shrink-0 items-center rounded-full p-[2px] ${
        on ? 'bg-brand' : 'bg-black/[0.15]'
      }`}
    >
      <span
        className={`h-2.5 w-2.5 rounded-full bg-white shadow-sm ${on ? 'translate-x-2.5' : ''}`}
      />
    </span>
  )
}

// ── Actions ──────────────────────────────────────────────────────────────────

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 font-display text-[11px] font-bold uppercase tracking-[0.06em] transition-colors disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

const BUTTON_TONES = {
  default: 'bg-black/[0.04] text-ink hover:bg-black/[0.08]',
  // The armed state of an affirmative action — promote, demote, restore. Was
  // `bg-brand`, the last blue CTA left in the product; `ink` instead, which is
  // still LOUDER than the `default` tone it replaces on the same button. That
  // direction matters more than the hue: an armed state quieter than the resting
  // one asks "are you sure?" in a smaller voice than the question it is confirming.
  //
  // Named `solid` for the same reason `danger-solid` is: it says what it does to
  // the button, not which brand colour it used to borrow. Deliberately NOT the
  // white primary from `components/ui.tsx` — a console action button has its own
  // base (11px uppercase, `rounded-lg`) and is not a second primary button.
  solid: 'bg-ink text-white hover:bg-black/80',
  danger: 'bg-red/[0.1] text-red hover:bg-red/[0.18]',
  // The armed state of a destructive action. A separate tone rather than a
  // className override on `danger`: `bg-red` and `bg-red/[0.1]` have equal
  // specificity, so which one won would depend on their order in the generated
  // stylesheet rather than on the order they are passed here.
  'danger-solid': 'bg-red text-white hover:bg-red/90',
} as const

export function ActionButton({
  tone = 'default',
  icon: Icon,
  className = '',
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: keyof typeof BUTTON_TONES
  icon?: LucideIcon
}) {
  return (
    <button className={`${BUTTON_BASE} ${BUTTON_TONES[tone]} ${className}`} {...props}>
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </button>
  )
}

/**
 * Copies a value to the clipboard. For the strings a console exists to hand over —
 * an email to paste into a support thread, a uuid to paste into a query.
 *
 * They are the values selecting by hand goes worst on: a uuid double-clicks as
 * three words on its hyphens, and an email picks up the trailing space. So the
 * button is not a convenience over selection, it is the reliable path.
 *
 * The FAILED state is drawn rather than swallowed. `navigator.clipboard` rejects on
 * a denied permission and does not exist at all outside a secure context, and a copy
 * button that shows a check either way leaves the operator pasting whatever they
 * last copied, wondering why the id is wrong.
 */
export function CopyButton({
  value,
  label,
  className = '',
}: {
  value: string
  /** Names the value in the button's accessible name: "Copier l'email". */
  label: string
  className?: string
}) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')

  // Reset from an effect rather than a setTimeout inside the handler, so the timer
  // is cleared when the component goes away — this page swaps one user's record for
  // another's under a live "copié", which would otherwise set state after unmount.
  useEffect(() => {
    if (state === 'idle') return
    const timer = setTimeout(() => setState('idle'), 1600)
    return () => clearTimeout(timer)
  }, [state])

  const Icon = state === 'copied' ? Check : state === 'failed' ? X : Copy

  return (
    <span className="inline-flex items-center">
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value)
            setState('copied')
          } catch {
            setState('failed')
          }
        }}
        aria-label={`Copier ${label}`}
        title={`Copier ${label}`}
        className={`shrink-0 rounded-md p-1 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
          state === 'copied'
            ? 'text-brand'
            : state === 'failed'
              ? 'text-red'
              : 'text-regie-dim hover:bg-black/[0.06] hover:text-ink'
        } ${className}`}
      >
        <Icon className="h-3.5 w-3.5" />
      </button>
      {/* Outside the button on purpose: a live region nested in a control whose name
          is an aria-label is unreachable, and the icon swap is the only feedback a
          sighted user gets. Rendered empty from the start so the region exists
          before it has anything to announce. */}
      <span role="status" className="sr-only">
        {state === 'copied' ? 'copié' : state === 'failed' ? 'échec de la copie' : ''}
      </span>
    </span>
  )
}

/**
 * A two-step action: the label, then the same button asking to be confirmed.
 *
 * Inline rather than a modal dialog. These actions (archive a tenant, revoke an
 * invite) act on ONE row, and a modal takes the row off screen to ask about it — so
 * the operator confirms against memory instead of against the record. The second
 * click happens with the row still under the cursor.
 *
 * The confirm step switches to a SOLID button: the armed state has to be visible
 * from the corner of the eye, and swapping the fill is louder than a word change.
 *
 * `busy` disables both steps while the write is in flight, so a double click cannot
 * fire two RPCs. Arming resets when the action fires, because the row it described
 * has changed underneath.
 */
export function ConfirmAction({
  label,
  confirmLabel,
  tone = 'default',
  icon,
  busy = false,
  disabled = false,
  onConfirm,
}: {
  label: string
  confirmLabel: string
  tone?: keyof typeof BUTTON_TONES
  icon?: LucideIcon
  busy?: boolean
  disabled?: boolean
  onConfirm: () => void
}) {
  const [armed, setArmed] = useState(false)

  if (!armed) {
    return (
      <ActionButton tone={tone} icon={icon} disabled={disabled || busy} onClick={() => setArmed(true)}>
        {label}
      </ActionButton>
    )
  }

  return (
    <span className="inline-flex items-center gap-1">
      <ActionButton
        tone={tone === 'danger' ? 'danger-solid' : 'solid'}
        disabled={busy}
        onClick={() => {
          setArmed(false)
          onConfirm()
        }}
      >
        {busy ? '…' : confirmLabel}
      </ActionButton>
      <button
        onClick={() => setArmed(false)}
        disabled={busy}
        className="rounded-lg px-2 py-1.5 font-display text-[11px] font-bold uppercase tracking-[0.06em] text-regie-dim transition-colors hover:bg-black/[0.04] hover:text-ink disabled:opacity-40"
      >
        Annuler
      </button>
    </span>
  )
}

/**
 * Where a failed write says why.
 *
 * The message comes from the database — 'cannot remove or demote the last admin
 * while other members remain' is the trigger's own wording — so it is shown verbatim
 * rather than replaced with a generic failure. An operator who just tried to demote
 * someone needs the rule, not an apology.
 */
export function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-xl border border-red/25 bg-red/[0.07] px-4 py-3 font-mono text-[12px] text-red"
    >
      {children}
    </p>
  )
}

// ── Toolbar ──────────────────────────────────────────────────────────────────

/**
 * The bar above a table: a filter box, what the filter left, and any actions.
 *
 * The count is `shown / total` rather than a single number, because a filtered table
 * that says "3" is indistinguishable from a platform that has three rows — which is
 * the one reading that would send an operator looking for a data bug.
 */
export function Toolbar({
  query,
  onQueryChange,
  placeholder,
  shown,
  total,
  noun,
  children,
}: {
  query: string
  onQueryChange: (next: string) => void
  placeholder: string
  shown: number
  total: number
  noun: string
  children?: React.ReactNode
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-3">
      <input
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        spellCheck={false}
        className="w-full max-w-xs rounded-xl border border-regie-rule bg-regie-panel px-3.5 py-2 font-mono text-[13px] text-ink shadow-sm shadow-brand/[0.04] outline-none transition-colors placeholder:text-regie-dim/70 focus:border-brand"
      />
      <span className="font-mono text-[12px] text-regie-dim">
        {shown === total ? `${total} ${noun}` : `${shown} / ${total} ${noun}`}
      </span>
      {children && <div className="ml-auto flex items-center gap-2">{children}</div>}
    </div>
  )
}
