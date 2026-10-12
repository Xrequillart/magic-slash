import { Languages } from '@ds/desktop/icons'
import { LanguageCard, SectionHeader, Text } from '@ds/desktop'
import { useConfig } from '../../hooks/useConfig'
import { showToast } from '../../components/Toast'
import { LANGUAGES } from '../../languages'
import { useLanguage, useT } from '../../i18n'
import { SELECT_WIDTH } from '../../theme/controls'
import { type LanguageId } from '../../../types'

/**
 * Language & Region. Its own section rather than a row under Appearance: the choice is
 * about who is reading, not about how the window looks, and it is the one setting users
 * most often go looking for by name.
 *
 * THE CARD IS `LanguageCard` — the design system's, which holds the three parts of this
 * choice that kept drifting apart: a picker showing a flag beside each name, the names
 * written in the language they name, and the small print separating this setting from
 * the languages Claude WRITES in. That last one is why the card exists rather than a
 * `SettingRow` in a plate: the desktop has language settings per REPOSITORY, and the two
 * are confused constantly.
 *
 * THE LIST IS `renderer/languages.ts`, which is also what the quick-settings sheet and
 * the repository rows read. Each language is named in itself, so a reader who has set the
 * app to a language they cannot read still has a way back.
 *
 * THE LINE UNDER THE CARD IS NOT PART OF IT. "The language follows your account" is a
 * fact about where the value is STORED — it travels with the cloud identity, not with
 * this machine — and it is true of nothing else on the card.
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
      <LanguageCard
        label={t('settings.language.label')}
        hint={t('settings.language.help')}
        note={t('settings.language.distinction')}
        value={active}
        options={LANGUAGES}
        onChange={(id) => choose(id as LanguageId)}
        width={SELECT_WIDTH}
      />
      <Text size="xs" tone="secondary" className="mt-3 block opacity-50">
        {t('settings.language.followsAccount')}
      </Text>
    </div>
  )
}
