import { Languages } from 'lucide-react'
import { useConfig } from '../../hooks/useConfig'
import { LanguageSelect } from '../../components/LanguageSelect'
import { showToast } from '../../components/Toast'
import { SectionHeader } from './SectionHeader'
import { useLanguage, useT } from '../../i18n'
import { type LanguageId } from '../../../types'

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
          {/* The same picker the repository language rows use, so the app's own
              language is chosen the same way as the ones Claude writes in — flag
              included. LANGUAGE_OPTIONS above is now only read by nothing else here:
              the picker carries its own autonyms, for the same module-scope reason. */}
          <div className="shrink-0">
            <LanguageSelect value={active} onChange={(id) => choose(id as LanguageId)} />
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
