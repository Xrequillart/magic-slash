'use client'

import { Languages } from 'lucide-react'
import { LANGUAGE_AUTONYM, LANGUAGE_IDS } from '@/lib/i18n/languages'
import { setLanguage, useT } from '@/lib/i18n/useLanguage'

/**
 * Picks the language of the website. A segmented control rather than a dropdown:
 * there are two languages, and a control that shows both at once is one click
 * instead of two — and readable by someone who cannot read the current one.
 *
 * Each button carries its own `lang`, so the autonyms are pronounced in the language
 * they name rather than read out in the page's current one.
 *
 * Two variants for the two places it appears, and it appears in both on purpose:
 * `standalone` on the pages that have no app chrome (login, invitation), where a
 * visitor with no account must still be able to switch; `menu` inside the account
 * menu, which is the only place a signed-in user goes looking for it.
 */
export function LanguageSwitcher({
  variant = 'standalone',
  className = '',
}: {
  variant?: 'standalone' | 'menu'
  className?: string
}) {
  const { t, lang } = useT()

  if (variant === 'menu') {
    return (
      <div className={`px-3 py-2 ${className}`}>
        <p className="mb-1.5 text-[10px] uppercase tracking-wider text-muted">
          {t('language.label')}
        </p>
        <div role="group" aria-label={t('language.label')} className="flex gap-1">
          {LANGUAGE_IDS.map((id) => {
            const active = id === lang
            return (
              <button
                key={id}
                type="button"
                lang={id}
                aria-pressed={active}
                onClick={() => setLanguage(id)}
                className={`flex-1 rounded-lg border px-2 py-1 font-display text-[11px] font-medium transition-colors ${
                  active
                    ? 'border-accent/30 bg-accent/10 text-accent'
                    : 'border-black/10 text-muted hover:bg-canvas hover:text-ink'
                }`}
              >
                {LANGUAGE_AUTONYM[id]}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div
      role="group"
      aria-label={t('language.label')}
      title={t('language.hint')}
      className={`inline-flex items-center gap-1 rounded-full border border-black/[0.07] bg-white/70 p-1 pl-3 ${className}`}
    >
      <Languages aria-hidden className="mr-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
      {LANGUAGE_IDS.map((id) => {
        const active = id === lang
        return (
          <button
            key={id}
            type="button"
            lang={id}
            aria-pressed={active}
            onClick={() => setLanguage(id)}
            className={`rounded-full px-3 py-1 font-display text-xs font-medium transition-colors ${
              active ? 'bg-ink text-white' : 'text-muted hover:text-ink'
            }`}
          >
            {LANGUAGE_AUTONYM[id]}
          </button>
        )
      })}
    </div>
  )
}
