import type { LucideIcon } from 'lucide-react'

/**
 * The shared visual vocabulary. These classes were duplicated across every page;
 * they are reproduced here verbatim so extracting them changes nothing on screen.
 */

// ── Buttons ──────────────────────────────────────────────────────────────────

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 font-display text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40'

const BUTTON_VARIANTS = {
  primary: 'bg-ink text-white hover:bg-black/80',
  ghost: 'text-muted hover:bg-black/[0.04] hover:text-ink',
  danger: 'bg-red text-white hover:bg-red/90',
} as const

export type ButtonVariant = keyof typeof BUTTON_VARIANTS

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button className={`${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${className}`} {...props} />
}

/** Anchor styled as a Button — for external links (downloads) that must stay <a>. */
export function ButtonLink({
  variant = 'primary',
  className = '',
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: ButtonVariant }) {
  return <a className={`${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${className}`} {...props} />
}

// ── Form controls ────────────────────────────────────────────────────────────

const FIELD =
  'w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent'

export function Input({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${FIELD} ${className}`} {...props} />
}

export function Select({ className = '', ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${FIELD} ${className}`} {...props} />
}

export function Textarea({ className = '', ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${FIELD} ${className}`} {...props} />
}

export function Label({ className = '', ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={`mb-1.5 block text-xs font-medium text-muted ${className}`} {...props} />
}

// ── Surfaces ─────────────────────────────────────────────────────────────────

export function Card({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-2xl border border-black/5 bg-white ${className}`} {...props} />
}

export function Section({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-black/5 bg-white p-6">
      <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
      <p className="mt-1 text-sm text-muted">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  )
}

// ── Badge ────────────────────────────────────────────────────────────────────

const BADGE_TONES = {
  neutral: 'bg-black/[0.05] text-muted',
  accent: 'bg-accent/10 text-accent',
  green: 'bg-green/10 text-green',
  yellow: 'bg-yellow/10 text-yellow',
  red: 'bg-red/10 text-red',
} as const

export type BadgeTone = keyof typeof BADGE_TONES

export function Badge({
  tone = 'neutral',
  className = '',
  children,
}: {
  tone?: BadgeTone
  className?: string
  children: React.ReactNode
}) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${BADGE_TONES[tone]} ${className}`}>
      {children}
    </span>
  )
}

// ── Dashboard tile ───────────────────────────────────────────────────────────

/** A single headline number. `value` is pre-formatted by the caller. */
export function StatTile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5">
      <div className="flex items-center gap-1.5 text-xs text-muted">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-2 font-display text-3xl font-black leading-none tracking-tight text-ink">{value}</div>
    </div>
  )
}

// ── Misc ─────────────────────────────────────────────────────────────────────

/** Monospace slash-command eyebrow — the through-line signature across pages. */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="mb-3 font-mono text-xs font-medium tracking-tight text-brand">{children}</div>
}

/** Small section heading used above lists (`/organizations`, `/members`…). */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="font-mono text-xs font-medium tracking-tight text-muted">{children}</h2>
}
