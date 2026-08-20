import { useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Shield, User } from 'lucide-react'
import { useAnchoredPanel } from '../../components/useAnchoredPanel'
import { useT } from '../../i18n'
import type { MessageKey } from '../../i18n'
import type { MembershipRole } from '../../../types'

// Catalogue keys, not labels — same reason as THEMES and SETTINGS_TABS: module
// scope is evaluated once at import, so a literal would freeze at the boot language.
const ROLE_OPTIONS: { value: MembershipRole; labelKey: MessageKey; descriptionKey: MessageKey; icon: typeof Shield }[] = [
  { value: 'user', labelKey: 'role.user', descriptionKey: 'role.user.help', icon: User },
  { value: 'admin', labelKey: 'role.admin', descriptionKey: 'role.admin.help', icon: Shield },
]

const PANEL_WIDTH = 240

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
  const t = useT()
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const { triggerRef, panelRef, style } = useAnchoredPanel(open, close, PANEL_WIDTH)

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
            : 'bg-surface border-line text-text-secondary hover:bg-surface-strong hover:text-ink'
        }`}
      >
        <SelectedIcon className="w-3 h-3 shrink-0" />
        <span className="truncate">{t(selected.labelKey)}</span>
        <ChevronDown className={`w-3 h-3 shrink-0 ml-auto transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          style={style()}
          className="bg-bg-secondary border border-line rounded-xl shadow-2xl overflow-hidden z-[60]"
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
                  isSelected ? 'bg-surface' : 'hover:bg-surface'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isSelected ? 'text-accent' : 'text-text-secondary/60'}`} />
                <div className="min-w-0 flex-1">
                  <div className={`text-xs font-medium ${isSelected ? 'text-accent' : 'text-ink'}`}>{t(opt.labelKey)}</div>
                  <div className="text-[11px] text-text-secondary/50 mt-0.5">{t(opt.descriptionKey)}</div>
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
