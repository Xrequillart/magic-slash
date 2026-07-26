import { ChevronDown, Languages } from 'lucide-react'
import { useConfig } from '../../hooks/useConfig'
import { showToast } from '../../components/Toast'
import { SectionHeader } from './SectionHeader'
import { useLanguage, useT } from '../../i18n'
import { LANGUAGE_IDS, type LanguageId } from '../../../types'

/**
 * Autonyms — each language named in itself. Correct whichever language the app is
 * showing, so this list needs no translation, and it is immune to the module-scope
 * freeze that would pin a `t()` call here to the language the app booted in.
 */
const LANGUAGE_OPTIONS: Record<LanguageId, string> = {
  en: 'English',
  fr: 'Français',
}

/**
 * Language & Region. Its own section rather than a row under Appearance: the
 * choice is about who is reading, not about how the window looks, and it is the
 * one setting users most often go looking for by name.
 */
export function LanguagePage() {
  const { updateLanguage } = useConfig()
  const active = useLanguage()
  const t = useT()

  const choose = async (id: LanguageId) => {
    if (id === active) return
    try {
      await updateLanguage(id)
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('settings.language.error'), 'error')
    }
  }

  return (
    <div>
      <SectionHeader icon={Languages} title={t('settings.language.section')} />
      <div className="bg-surface border border-line-strong rounded-xl p-4">
        <div className="flex items-center justify-between gap-6">
          <div className="flex-1">
            <div className="text-sm font-medium mb-0.5">{t('settings.language.label')}</div>
            <p className="text-xs text-text-secondary/50">{t('settings.language.help')}</p>
          </div>
          <div className="relative shrink-0">
            <select
              value={active}
              onChange={(e) => choose(e.target.value as LanguageId)}
              className="w-52 px-3 py-2 bg-surface border border-line-field rounded-lg text-sm focus:outline-none focus:border-accent transition-colors appearance-none cursor-pointer"
            >
              {LANGUAGE_IDS.map((id) => (
                <option key={id} value={id}>{LANGUAGE_OPTIONS[id]}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/50 pointer-events-none" />
          </div>
        </div>
        {/* Spelled out because the two are constantly confused: this setting is
            read by a person, the repository ones are written by Claude. */}
        <p className="text-xs text-text-secondary/50 mt-4 leading-relaxed">
          {t('settings.language.distinction')}
        </p>
      </div>
      <p className="text-xs text-text-secondary/50 mt-3">{t('settings.language.followsAccount')}</p>
    </div>
  )
}
