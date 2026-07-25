'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * Custom select. Replaces the native <select>, which the OS renders with its own
 * popup and its own fonts, ignoring the app's styling entirely.
 *
 * The panel is portalled to <body> and positioned `fixed`: inline it would be
 * clipped by any ancestor with `overflow-hidden` (every Card here has it, for
 * rounded corners) or by a scrolling container.
 */

export interface DropdownOption<T extends string> {
  value: T
  label: string
  /** Optional second line in the panel — not shown on the trigger. */
  description?: string
  icon?: LucideIcon
}

const VIEWPORT_MARGIN = 8

/**
 * Anchors a portalled panel to a trigger and keeps them together: flips above
 * when it would overflow the bottom, and closes on anything that would detach
 * them. Measured before paint so the panel never renders misplaced.
 */
function useAnchoredPanel(open: boolean, close: () => void, width: number) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null)
      return
    }
    const trigger = triggerRef.current
    if (!trigger) return

    const rect = trigger.getBoundingClientRect()
    const panelHeight = panelRef.current?.offsetHeight ?? 0
    const spaceBelow = window.innerHeight - rect.bottom

    setPosition({
      top:
        panelHeight > 0 && spaceBelow < panelHeight + VIEWPORT_MARGIN
          ? rect.top - panelHeight - 4
          : rect.bottom + 4,
      left: Math.max(
        VIEWPORT_MARGIN,
        Math.min(rect.right - width, window.innerWidth - width - VIEWPORT_MARGIN),
      ),
    })
  }, [open, width])

  useEffect(() => {
    if (!open) return

    // The portalled panel is not a DOM descendant of the trigger, so it needs
    // its own containment check.
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (triggerRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      close()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', close)
    // capture: catches scrolls on any ancestor, not just the window.
    window.addEventListener('scroll', close, true)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [open, close])

  return { triggerRef, panelRef, position }
}

/**
 * Trigger sizes are whole base strings, not overrides: two utilities from the
 * same family (py-1 vs py-2) resolve by Tailwind's scale order rather than by
 * class-attribute order, so layering an override on top silently loses.
 */
const TRIGGER_SIZES = {
  md: 'rounded-xl px-3 py-2 text-sm',
  sm: 'rounded-lg px-2 py-1 text-xs',
} as const

export function Dropdown<T extends string>({
  value,
  options,
  onChange,
  disabled,
  placeholder = 'Select…',
  width = 260,
  size = 'md',
  className = '',
}: {
  value: T | ''
  options: DropdownOption<T>[]
  onChange: (value: T) => void
  disabled?: boolean
  placeholder?: string
  width?: number
  size?: keyof typeof TRIGGER_SIZES
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const { triggerRef, panelRef, position } = useAnchoredPanel(open, close, width)

  const selected = options.find((o) => o.value === value)
  const TriggerIcon = selected?.icon

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex items-center justify-between gap-2 border border-black/10 bg-white text-left transition-colors hover:border-black/20 disabled:cursor-not-allowed disabled:opacity-50 ${TRIGGER_SIZES[size]} ${open ? 'border-accent' : ''} ${className}`}
      >
        <span className={`flex min-w-0 items-center gap-2 ${selected ? 'text-ink' : 'text-muted'}`}>
          {TriggerIcon && <TriggerIcon className="h-3.5 w-3.5 shrink-0" />}
          <span className="truncate">{selected?.label ?? placeholder}</span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="listbox"
            style={{
              position: 'fixed',
              top: position?.top ?? -9999,
              left: position?.left ?? -9999,
              width,
              // Hidden until measured, so the first paint never flashes at 0,0.
              visibility: position ? 'visible' : 'hidden',
            }}
            className="z-[60] max-h-72 overflow-y-auto rounded-xl border border-black/5 bg-white p-1 shadow-xl shadow-black/10"
          >
            {options.map((opt) => {
              const Icon = opt.icon
              const isSelected = opt.value === value
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    setOpen(false)
                    if (!isSelected) onChange(opt.value)
                  }}
                  className={`flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition-colors ${
                    isSelected ? 'bg-canvas' : 'hover:bg-canvas'
                  }`}
                >
                  {Icon && (
                    <Icon
                      className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-accent' : 'text-muted'}`}
                    />
                  )}
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-xs font-medium ${isSelected ? 'text-accent' : 'text-ink'}`}
                    >
                      {opt.label}
                    </span>
                    {opt.description && (
                      <span className="mt-0.5 block text-[11px] leading-snug text-muted">
                        {opt.description}
                      </span>
                    )}
                  </span>
                  {isSelected && <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />}
                </button>
              )
            })}
          </div>,
          document.body,
        )}
    </>
  )
}
