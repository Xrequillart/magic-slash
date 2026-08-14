'use client'

import Link from 'next/link'
import { Languages } from 'lucide-react'
import { Dropdown } from '@/components/Dropdown'
import { SettingRow, SettingsCard } from '@/components/SettingRow'
import { useT } from '@/lib/i18n/useLanguage'
import { DEFAULTS, LANGUAGE_OPTIONS } from '@/lib/settings'
import { useAppSettings } from '@/components/application/SettingsContext'

/**
 * Language tab: the language the DESKTOP app speaks.
 *
 * Not this website's — that one is a browser preference and lives in the account
 * menu's switcher, which is why picking "Français" here does not translate the
 * page around it. And not the language Claude writes in either: the note points at
 * the two places that decide that.
 */
export function LanguageSettings() {
  const { t } = useT()
  const { settings, patch } = useAppSettings()

  return (
    <SettingsCard icon={Languages} title={t('settings.language.section')}>
      <SettingRow label={t('settings.language.label')} description={t('settings.language.help')}>
        <Dropdown
          value={settings.language ?? DEFAULTS.language}
          options={LANGUAGE_OPTIONS}
          onChange={(language) => patch({ language })}
          className="w-52"
        />
      </SettingRow>
      <div className="pb-5 pt-4">
        <p className="text-xs text-muted">
          {t('settings.language.noteBefore')}{' '}
          <Link href="/organization" className="text-accent hover:underline">
            {t('settings.language.noteLink')}
          </Link>
          {t('settings.language.noteAfter')}
        </p>
      </div>
    </SettingsCard>
  )
}
