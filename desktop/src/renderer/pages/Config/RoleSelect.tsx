import { useRef, useState, useEffect, useCallback, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Shield, User } from 'lucide-react'
import type { MembershipRole } from '../../../types'

const ROLE_OPTIONS: { value: MembershipRole; label: string; description: string; icon: typeof Shield }[] = [
  { value: 'user', label: 'User', description: 'Can see the team and work on shared repositories', icon: User },
  { value: 'admin', label: 'Admin', description: 'Can invite, change roles and archive the organization', icon: Shield },
]

const PANEL_WIDTH = 240
const VIEWPORT_MARGIN = 8

/**
 * Role picker for a member row. Replaces the native <select>, which macOS
 * renders with its own popup and ignores the app's dark styling.
 *
 * The panel is portalled to <body> and positioned `fixed`: inline it would be
 * clipped by any scrolling ancestor, and it lives inside Modal — whose panel is
 * `max-h-[90vh] overflow-y-auto`, so an absolutely-positioned dropdown got cut off.
 */
export function RoleSelect({
  value,
  onChange,
  disabled,
}: {
  value: MembershipRole
  onChange: (role: MembershipRole) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => setOpen(false), [])

  // Anchor the panel to the trigger, flipping above when it would overflow the
  // bottom of the viewport. Measured before paint so it never renders misplaced.
  useLayoutEffect(() => {
    if (!open) return
    const trigger = triggerRef.current
    if (!trigger) return

    const rect = trigger.getBoundingClientRect()
    const panelHeight = panelRef.current?.offsetHeight ?? 0
    const spaceBelow = window.innerHeight - rect.bottom

    const top = panelHeight > 0 && spaceBelow < panelHeight + VIEWPORT_MARGIN
      ? rect.top - panelHeight - 4
      : rect.bottom + 4

    const left = Math.max(
      VIEWPORT_MARGIN,
      Math.min(rect.right - PANEL_WIDTH, window.innerWidth - PANEL_WIDTH - VIEWPORT_MARGIN),
    )

    setPosition({ top, left })
  }, [open])

  // Close on outside click, Escape, or anything that would detach the panel from
  // its trigger (scrolling an ancestor, resizing). The portalled panel is NOT a
  // DOM descendant of the trigger, so it needs its own containment check.
  useEffect(() => {
    if (!open) return

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

  const selected = ROLE_OPTIONS.find((o) => o.value === value) ?? ROLE_OPTIONS[0]
  const SelectedIcon = selected.icon

  return (
    <>
      {/* w-24, not content width: the trigger used to shrink or grow with the
          selected label, so a members table showed a ragged column of
          differently-sized pickers. The webapp's pins its width for the same
          reason. The chevron is pushed right by ml-auto to fill it. */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 h-7 w-24 px-2 rounded-lg border text-[11px] font-medium transition-all disabled:opacity-40 ${
          value === 'admin'
            ? 'bg-accent/15 border-accent/25 text-accent hover:bg-accent/20'
            : 'bg-white/[0.06] border-white/10 text-text-secondary hover:bg-white/10 hover:text-white'
        }`}
      >
        <SelectedIcon className="w-3 h-3 shrink-0" />
        <span className="truncate">{selected.label}</span>
        <ChevronDown className={`w-3 h-3 shrink-0 ml-auto transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            top: position?.top ?? -9999,
            left: position?.left ?? -9999,
            width: PANEL_WIDTH,
            // Hidden until measured, so the first paint never flashes at 0,0.
            visibility: position ? 'visible' : 'hidden',
          }}
          className="bg-bg-secondary border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[60]"
        >
          {ROLE_OPTIONS.map((opt) => {
            const Icon = opt.icon
            const isSelected = opt.value === value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setOpen(false)
                  if (!isSelected) onChange(opt.value)
                }}
                className={`w-full flex items-start gap-2 px-3 py-2 text-left transition-colors ${
                  isSelected ? 'bg-white/[0.06]' : 'hover:bg-white/[0.06]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isSelected ? 'text-accent' : 'text-text-secondary/60'}`} />
                <div className="min-w-0 flex-1">
                  <div className={`text-xs font-medium ${isSelected ? 'text-accent' : 'text-white'}`}>{opt.label}</div>
                  <div className="text-[11px] text-text-secondary/50 mt-0.5">{opt.description}</div>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />}
              </button>
            )
          })}
        </div>,
        document.body,
      )}
    </>
  )
}
