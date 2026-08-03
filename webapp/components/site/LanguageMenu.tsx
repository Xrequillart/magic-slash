'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Globe } from 'lucide-react'
import { LANGUAGE_AUTONYM, LANGUAGE_IDS, type LanguageId } from '@/lib/i18n/languages'
import { setLanguage, useLanguage } from '@/lib/i18n/useLanguage'

/**
 * The site's language picker, in its two dresses.
 *
 * The header shows the code (`EN`) because it sits in a crowded bar; the footer shows
 * the autonym (`English`) because it has the room and is where someone goes LOOKING
 * for the control. Same behaviour, same state, two sets of class names — which is why
 * this is one component with a `variant` rather than two files that would drift.
 *
 * It writes through `setLanguage()` from the app's own i18n store, so choosing French
 * on the landing page carries into the signed-in app and vice versa. The old site kept
 * its own `magic-slash-lang` key; that key is NOT read here, so a visitor who chose
 * French on the static site starts from their browser language once — the same
 * fallback a first-time visitor gets — rather than the two stores disagreeing forever.
 */
export function LanguageMenu({ variant }: { variant: 'header' | 'footer' }) {
  const lang = useLanguage()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  // Click anywhere else closes it. Listening on the document rather than on a
  // backdrop element so the rest of the header stays clickable while it is open —
  // one click both closes this and follows the link under the cursor.
  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (root.current?.contains(event.target as Node)) return
      setOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('click', close)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('click', close)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  const prefix = variant === 'header' ? 'header-lang' : 'footer-lang'
  const optionClass = variant === 'header' ? 'lang-option' : 'footer-lang-option'
  const label = variant === 'header' ? lang.toUpperCase() : LANGUAGE_AUTONYM[lang]

  const choose = (next: LanguageId) => {
    setLanguage(next)
    setOpen(false)
  }

  return (
    <div ref={root} style={{ position: 'relative' }}>
      <button
        type="button"
        className={`${prefix}-toggle${open ? ' open' : ''}`}
        onClick={() => setOpen((was) => !was)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Globe size={16} />
        <span>{label}</span>
        <ChevronDown size={16} className="chevron" />
      </button>

      <div className={`${prefix}-dropdown${open ? ' open' : ''}`} role="menu">
        {LANGUAGE_IDS.map((id) => (
          <button
            key={id}
            type="button"
            role="menuitemradio"
            aria-checked={id === lang}
            className={`${optionClass}${id === lang ? ' active' : ''}`}
            onClick={() => choose(id)}
          >
            {LANGUAGE_AUTONYM[id]}
          </button>
        ))}
      </div>
    </div>
  )
}
