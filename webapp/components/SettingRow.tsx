'use client'

import type { LucideIcon } from 'lucide-react'
import { useT } from '@/lib/i18n/useLanguage'

/**
 * The settings vocabulary shared by the repository page: a labelled row with its
 * control on the right, grouped into titled cards. Same structure as the desktop
 * app's settings pages, in the webapp's light palette.
 */

/**
 * A group of rows, titled or not. Rows separate themselves with a top border.
 *
 * `title` is optional because a card that is the ONLY one on its tab would repeat the
 * name already on the tab's pill. The icon goes with it: alone above a panel it would
 * be decoration with nothing to decorate.
 */
export function SettingsCard({
  icon: Icon,
  title,
  tone = 'neutral',
  children,
}: {
  icon: LucideIcon
  title?: string
  tone?: 'neutral' | 'danger'
  children: React.ReactNode
}) {
  const danger = tone === 'danger'
  return (
    <section>
      {title && (
        <div className="mb-3 flex items-center gap-2.5">
          <Icon className={`h-4 w-4 shrink-0 ${danger ? 'text-red' : 'text-muted'}`} />
          <h2 className={`font-display text-sm font-bold ${danger ? 'text-red' : 'text-ink'}`}>{title}</h2>
        </div>
      )}
      <div
        className={`rounded-2xl border px-5 ${danger ? 'border-red/20 bg-red/[0.03]' : 'border-black/5 bg-white'}`}
      >
        {children}
      </div>
    </section>
  )
}

/**
 * One setting. `stacked` puts the control below the label instead of beside it,
 * for controls that need the full width (tag lists, long text).
 */
export function SettingRow({
  label,
  description,
  stacked = false,
  children,
}: {
  label: string
  description?: string
  stacked?: boolean
  children?: React.ReactNode
}) {
  return (
    <div
      className={`gap-x-6 gap-y-3 border-b border-black/5 py-4 last:border-b-0 ${
        stacked ? 'block' : 'flex flex-col sm:flex-row sm:items-center sm:justify-between'
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="font-display text-sm font-bold text-ink">{label}</p>
        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
      </div>
      {children && <div className={stacked ? 'mt-3' : 'shrink-0'}>{children}</div>}
    </div>
  )
}

/** Switch. Wrapped in a label so the whole control is clickable. */
export function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  /** Accessible name — the visible text sits in the SettingRow, not here. */
  label: string
}) {
  return (
    <label className={`relative inline-block h-6 w-11 ${disabled ? 'opacity-50' : 'cursor-pointer'}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span className="block h-6 w-11 rounded-full bg-black/[0.12] transition-colors peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2" />
      <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
    </label>
  )
}

/** Read-only example / warning panel shown under a group of settings. */
export function ExamplePanel({
  title,
  tone = 'neutral',
  children,
}: {
  title?: string
  tone?: 'neutral' | 'warning'
  children: React.ReactNode
}) {
  const warning = tone === 'warning'
  return (
    <div
      className={`mb-5 rounded-xl border p-3 ${warning ? 'border-yellow/25 bg-yellow/[0.06]' : 'border-black/5 bg-canvas'}`}
    >
      {title && <p className="mb-2 text-[10px] uppercase tracking-wider text-muted">{title}</p>}
      {children}
    </div>
  )
}

/**
 * Editable list of short strings shown as removable chips (worktree files,
 * keywords). Enter or the Add button commits the input.
 */
export function ChipList({
  items,
  onChange,
  placeholder,
  addLabel,
  inputId,
}: {
  items: string[]
  onChange: (items: string[]) => void
  placeholder: string
  /** Defaults to a translated "Add". */
  addLabel?: string
  inputId: string
}) {
  const { t } = useT()

  const add = (raw: string, clear: () => void) => {
    const value = raw.trim()
    if (!value || items.includes(value)) return
    onChange([...items, value])
    clear()
  }

  return (
    <div>
      {items.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-canvas px-2.5 py-1 font-mono text-xs text-ink"
            >
              {item}
              <button
                type="button"
                onClick={() => onChange(items.filter((i) => i !== item))}
                aria-label={t('common.remove', { item })}
                className="text-muted transition-colors hover:text-red"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          id={inputId}
          type="text"
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3.5 py-2 text-sm text-ink outline-none transition-colors focus:border-accent"
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            e.preventDefault()
            const input = e.currentTarget
            add(input.value, () => {
              input.value = ''
            })
          }}
        />
        <button
          type="button"
          onClick={() => {
            const input = document.getElementById(inputId) as HTMLInputElement | null
            if (input) add(input.value, () => (input.value = ''))
          }}
          className="shrink-0 rounded-xl border border-black/10 px-3.5 py-2 font-display text-xs font-medium text-muted transition-colors hover:bg-black/[0.04] hover:text-ink"
        >
          {addLabel ?? t('common.add')}
        </button>
      </div>
    </div>
  )
}
