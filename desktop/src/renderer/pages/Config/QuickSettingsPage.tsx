import { Settings2 } from '@ds/desktop/icons'
import { QuickSettingsEditor, SectionHeader, SettingsCard } from '@ds/desktop'
import { useToggleRow } from './ToggleRow'
import { useConfig } from '../../hooks/useConfig'
import { useQuickSettingIds, useQuickSettingLabels } from '../../components/quickSettingTiles'
import { useT } from '../../i18n'
import { showToast } from '../../components/Toast'
import { QUICK_SETTING_IDS, type QuickSettingId } from '../../../types'

/**
 * THE QUICK SETTINGS SHEET, arranged: whether the title bar offers it, and which
 * switches it carries in which order.
 *
 * The sheet had a fixed set, decided for everyone. It is the reader's now, from a
 * catalogue of the app's on/off settings (quickSettingTiles.ts), five of them by default:
 * the ones it always carried. The editor is the design system's `QuickSettingsEditor`,
 * which draws the sheet's own tiles so what is arranged here is what comes down.
 */
export function QuickSettingsPage() {
  const t = useT()
  const { config, updateQuickSettings } = useConfig()
  const ids = useQuickSettingIds()
  const labels = useQuickSettingLabels()
  const enabled = config?.quickSettingsEnabled !== false

  const enabledRow = useToggleRow({
    label: t('settings.quickSettings.enabled.label'),
    help: t('settings.quickSettings.enabled.help'),
    value: config?.quickSettingsEnabled,
    onChange: (next) => updateQuickSettings({ enabled: next }),
    errorMessage: t('toast.settingUpdateFailed'),
  })

  const arrange = async (next: string[]) => {
    try {
      await updateQuickSettings({ items: next as QuickSettingId[] })
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.settingUpdateFailed'), 'error')
    }
  }

  const item = (id: QuickSettingId) => ({ id, ...labels[id] })

  return (
    <div className="flex flex-col gap-8">
      <div>
        <SectionHeader icon={Settings2} title={t('settings.quickSettings.section')} />
        <SettingsCard rows={[{ id: 'quickSettingsEnabled', ...enabledRow }]} />
      </div>

      <div>
        <SectionHeader
          icon={Settings2}
          title={t('settings.quickSettings.arrange.section')}
          description={t('settings.quickSettings.arrange.description')}
        />
        <QuickSettingsEditor
          items={ids.map(item)}
          available={QUICK_SETTING_IDS.filter((id) => !ids.includes(id)).map(item)}
          onChange={(next) => void arrange(next)}
          menuLabel={t('settings.quickSettings.arrange.menu')}
          menuEmpty={t('settings.quickSettings.arrange.menuEmpty')}
          availableLabel={t('settings.quickSettings.arrange.available')}
          availableEmpty={t('settings.quickSettings.arrange.availableEmpty')}
          removeLabel={(label) => t('settings.quickSettings.arrange.remove', { name: label })}
          // Arranging a sheet nobody can open would be work for nothing to see.
          disabled={!enabled}
        />
      </div>
    </div>
  )
}
