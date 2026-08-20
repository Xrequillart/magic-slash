import { useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import { Flag } from './Flag'
import { useAnchoredPanel } from './useAnchoredPanel'
import { LANGUAGE_IDS, type LanguageId } from '../../types'

/**
 * Language picker: a flag and a name, on the trigger and on every option.
 *
 * Replaces a native `<select>`, and had to: an `<option>` can hold TEXT and nothing
 * else, so a flag inside one is not a styling problem but an impossibility. macOS also
 * draws the popup itself and ignores the app's theme, which is the same reason
 * RoleSelect exists.
 *
 * The list is every language the app ships in, and it is built from LANGUAGE_IDS
 * rather than typed out: that constant is what the rest of the app validates against,
 * and a second list would let this picker offer a language the config refuses — or,
 * worse, quietly stop offering one that was added. Adding a language is therefore one
 * entry in AUTONYMS and one flag in Flag.tsx, and nothing at the call sites.
 */
const AUTONYMS: Record<LanguageId, string> = {
  // Each language named in itself, so the list reads correctly whatever the app is
  // currently showing — and so it needs no translation, which also keeps it clear of
  // the module-scope freeze that would pin a `t()` here to the boot language.
  en: 'English',
  fr: 'Français',
}

const LANGUAGES = LANGUAGE_IDS.map((id) => ({ value: id, label: AUTONYMS[id] }))

const PANEL_WIDTH = 208 // w-52, the width of the trigger

export function LanguageSelect({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const { triggerRef, panelRef, style } = useAnchoredPanel(open, close, PANEL_WIDTH)

  // Falls back to the first entry rather than rendering an empty trigger: the value is
  // jsonb the webapp writes wholesale, so an unknown code can arrive, and a picker that
  // shows nothing at all is worse than one showing the default it will act on.
  const selected = LANGUAGES.find((l) => l.value === value) ?? LANGUAGES[0]

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 w-52 px-3 py-1.5 rounded-lg bg-surface border border-line-field text-xs text-ink cursor-pointer transition-colors hover:border-accent disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Flag code={selected.value} />
        <span className="truncate">{selected.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 ml-auto text-text-secondary transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          style={style()}
          className="bg-bg-secondary border border-line rounded-xl shadow-2xl overflow-hidden z-[60] p-1"
        >
          {LANGUAGES.map((lang) => {
            const isSelected = lang.value === value
            return (
              <button
                key={lang.value}
                type="button"
                onClick={() => {
                  setOpen(false)
                  if (!isSelected) onChange(lang.value)
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors ${
                  isSelected ? 'bg-surface' : 'hover:bg-surface'
                }`}
              >
                <Flag code={lang.value} />
                <span className={`text-xs ${isSelected ? 'text-accent' : 'text-ink'}`}>{lang.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-accent shrink-0 ml-auto" />}
              </button>
            )
          })}
        </div>,
        document.body,
      )}
    </>
  )
}
