'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, SquareTerminal } from 'lucide-react'
import { Dropdown } from '@/components/Dropdown'
import { ExamplePanel, SettingRow, SettingsCard } from '@/components/SettingRow'
import { Modal } from '@/components/Modal'
import { Button } from '@/components/ui'
import { useT } from '@/lib/i18n/useLanguage'
import { DEFAULTS, LAUNCH_MODE_OPTIONS } from '@/lib/settings'
import { useAppSettings } from '@/components/application/SettingsContext'
import { translateOptions } from '@/components/application/options'

const BYPASS = 'bypassPermissions'

/**
 * Claude Code tab: the permission mode every agent launches in, on every machine
 * this account signs in on — which is exactly why Bypass is behind a confirmation
 * rather than one entry in a list.
 */
export function ClaudeCodeSettings() {
  const { t } = useT()
  const { settings, patch } = useAppSettings()
  /** Held until confirmed: bypass mode is not something to enable by a stray click. */
  const [confirmBypass, setConfirmBypass] = useState(false)

  const launchModeOptions = useMemo(() => translateOptions(LAUNCH_MODE_OPTIONS, t), [t])
  const launchMode = settings.launchMode ?? DEFAULTS.launchMode

  return (
    <>
      <SettingsCard icon={SquareTerminal} title={t('settings.claudeCode')}>
        <SettingRow
          label={t('settings.launchMode.label')}
          description={t('settings.launchMode.help')}
        >
          <Dropdown
            value={launchMode}
            options={launchModeOptions}
            onChange={(next) => (next === BYPASS ? setConfirmBypass(true) : patch({ launchMode: next }))}
            className="w-52"
          />
        </SettingRow>
        {launchMode === BYPASS && (
          <ExamplePanel tone="warning">
            <p className="text-xs text-ink">{t('settings.launchMode.bypassInline')}</p>
          </ExamplePanel>
        )}
      </SettingsCard>

      <Modal
        open={confirmBypass}
        onClose={() => setConfirmBypass(false)}
        icon={AlertTriangle}
        title={t('settings.launchMode.bypassTitle')}
        tone="danger"
        footer={
          <>
            <Button variant="ghost" className="ml-auto" onClick={() => setConfirmBypass(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                patch({ launchMode: BYPASS })
                setConfirmBypass(false)
              }}
            >
              {t('settings.launchMode.bypassConfirm')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">{t('settings.launchMode.bypassWarning')}</p>
      </Modal>
    </>
  )
}
