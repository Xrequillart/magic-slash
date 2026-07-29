'use client'

import { useState } from 'react'
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
 * A label/value pair. The value is monospace and `break-all`: these are emails,
 * uuids, branch names and versions — strings with no word boundaries to wrap on.
 */
export function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="border-b border-regie-rule-soft px-4 py-3 last:border-b-0">
      <dt className="text-[11px] uppercase tracking-[0.08em] text-regie-dim">{label}</dt>
      <dd className="mt-1 break-all font-mono text-[13px] text-ink">{value}</dd>
    </div>
  )
}

/** What a panel says when it has nothing to show. */
export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-6 text-[13px] text-regie-dim">{children}</p>
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

// ── Actions ──────────────────────────────────────────────────────────────────

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 font-display text-[11px] font-bold uppercase tracking-[0.06em] transition-colors disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

const BUTTON_TONES = {
  default: 'bg-black/[0.04] text-ink hover:bg-black/[0.08]',
  brand: 'bg-brand text-white hover:bg-brand/90',
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
        tone={tone === 'danger' ? 'danger-solid' : 'brand'}
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
