import { useEffect, useState } from 'react'
import {
  Archive, BarChart3, Bell, BellOff, Brain, ChartSpline, EyeOff, GitPullRequest, Lightbulb,
  Newspaper, Palette, PanelRight, SquareSplitHorizontal, TextCursorInput,
} from '@ds/desktop/icons'
import type { IconComponent } from '@ds/desktop/types'
import { useStore } from '../store'
import { useConfig } from '../hooks/useConfig'
import { useT, type MessageKey } from '../i18n'
import { showToast } from './Toast'
import {
  cleanQuickSettings, DEFAULT_QUICK_SETTINGS, QUICK_SETTING_IDS, type QuickSettingId,
} from '../../types'

/**
 * WHAT EACH QUICK SETTINGS TILE IS, wired: its mark, its name, its value and its write.
 *
 * One table for the two places that draw these tiles — the sheet itself
 * (`ControlCenterMenu`) and the page that arranges it (`QuickSettingsPage`) — so a tile
 * cannot come to look one way in the editor and another in the menu. Each is a setting
 * that already has its row in Settings; the id list and its order live in types.ts.
 *
 * An adapter and not a component: what comes out is data for `ToggleButton` and for
 * `QuickSettingsEditor`, both the design system's.
 */

export interface QuickSettingTile {
  id: QuickSettingId
  label: string
  icon: IconComponent
  /** The mark while off, for the one tile whose off state is a warning. */
  offIcon?: IconComponent
  offTone?: 'neutral' | 'danger'
  checked: boolean
  onChange: (next: boolean) => void
}

// Message keys rather than labels: module scope is evaluated once at import, so a
// literal here would pin the tiles to the boot language.
const META: Record<QuickSettingId, { labelKey: MessageKey; icon: IconComponent; offIcon?: IconComponent }> = {
  notifications: { labelKey: 'settings.notifications.master.label', icon: Bell, offIcon: BellOff },
  'quick-launch': { labelKey: 'controlCenter.quickLaunch', icon: TextCursorInput },
  'usage-card': { labelKey: 'settings.appearance.sidebars.usageCard.label', icon: ChartSpline },
  'agent-context': { labelKey: 'settings.appearance.sidebars.agentContext.label', icon: Brain },
  'split-view': { labelKey: 'controlCenter.splitView', icon: SquareSplitHorizontal },
  'pr-watcher': { labelKey: 'settings.application.prWatcher.label', icon: GitPullRequest },
  'plan-sync': { labelKey: 'settings.application.planSync.label', icon: Lightbulb },
  activity: { labelKey: 'settings.application.usageLogs.label', icon: BarChart3 },
  'claude-theme': { labelKey: 'settings.appearance.claudeTheme.label', icon: Palette },
  'archive-confirm': { labelKey: 'settings.agents.archive.confirm.label', icon: Archive },
  'info-panel': { labelKey: 'settings.application.infoSidebar.label', icon: PanelRight },
  'quick-launch-background': { labelKey: 'settings.quickLaunch.background.label', icon: EyeOff },
  'daily-digest': { labelKey: 'settings.notifications.digest.label', icon: Newspaper },
}

/** The sheet's switches in the reader's order: absent means the default five. */
export function useQuickSettingIds(): QuickSettingId[] {
  const stored = useStore((s) => s.config?.quickSettingsItems)
  return cleanQuickSettings(stored) ?? DEFAULT_QUICK_SETTINGS
}

/** Mark and name only, for the editor: it arranges tiles, it does not flip them. */
export function useQuickSettingLabels(): Record<QuickSettingId, { label: string; icon: IconComponent }> {
  const t = useT()
  return Object.fromEntries(
    QUICK_SETTING_IDS.map((id) => [id, { label: t(META[id].labelKey), icon: META[id].icon }]),
  ) as Record<QuickSettingId, { label: string; icon: IconComponent }>
}

/** Every tile, wired to its setting. */
export function useQuickSettingTiles(): Record<QuickSettingId, QuickSettingTile> {
  const t = useT()
  const {
    config, updateNotifications, updateSpotlight, updateUsageCardEnabled, updateAgentContextEnabled,
    updateSyncClaudeTheme, updateConfirmAgentArchive, updateQuickLaunch,
  } = useConfig()
  const { splitActive, toggleSplitActive, setConfig } = useStore()

  // ── Quick Launch: a write that can succeed and still not register ──────────
  // The only tile with a local copy, and the reason is the shortcut: the config write
  // lands, and then the OS refuses the chord because something else already holds it.
  // `result.registered` is how that comes back, so the tile has to be able to move and
  // then be told it did not.
  const [spotlightEnabled, setSpotlightEnabled] = useState(config?.spotlight?.enabled ?? true)
  const configSpotlightEnabled = config?.spotlight?.enabled
  useEffect(() => {
    if (configSpotlightEnabled !== undefined) setSpotlightEnabled(configSpotlightEnabled)
  }, [configSpotlightEnabled])

  const toggleSpotlight = async (next: boolean) => {
    setSpotlightEnabled(next)
    try {
      const result = await updateSpotlight({ enabled: next, shortcut: config?.spotlight?.shortcut ?? 'Control+Space' })
      if (next && !result.registered) showToast(t('settings.application.spotlight.error'), 'error')
    } catch {
      setSpotlightEnabled(!next)
    }
  }

  /**
   * The config-backed tiles share one shape: fire the write, let the store move the
   * tile, and if the write throws, say so. There is no local copy to revert because the
   * tile was never told the new value: a failed write leaves it where it was.
   */
  const write = (run: () => Promise<unknown>) => {
    run().catch((error: unknown) => {
      showToast(error instanceof Error ? error.message : t('controlCenter.saveFailed'), 'error')
    })
  }
  // The writes that answer with the config rather than going through `useConfig`: the
  // store has to be told, or the tile would not move until the next config load.
  const writeConfig = (run: () => Promise<{ config: NonNullable<typeof config> } | NonNullable<typeof config>>) =>
    write(async () => {
      const result = await run()
      setConfig('config' in result ? result.config : result)
    })

  // Absent means never chosen. For all but the two below that is ON, the reading each
  // setting's own row makes; the daily digest and the background start default OFF.
  const on = (value: boolean | undefined) => value !== false

  const wired: Record<QuickSettingId, Pick<QuickSettingTile, 'checked' | 'onChange'> & { offTone?: 'danger' }> = {
    notifications: {
      checked: on(config?.notifications?.enabled),
      onChange: (next) => write(() => updateNotifications({ enabled: next })),
      offTone: 'danger',
    },
    'quick-launch': { checked: spotlightEnabled, onChange: (next) => void toggleSpotlight(next) },
    'usage-card': { checked: on(config?.usageCardEnabled), onChange: (next) => write(() => updateUsageCardEnabled(next)) },
    'agent-context': { checked: on(config?.agentContextEnabled), onChange: (next) => write(() => updateAgentContextEnabled(next)) },
    // THE TILE IS THE SPLIT ITSELF, not the permission for it: the window is in two panes
    // or it is not, and the Split view page says the same with the same value.
    'split-view': { checked: splitActive, onChange: (next) => { if (next !== splitActive) toggleSplitActive() } },
    'pr-watcher': {
      checked: on(config?.prReviews?.enabled),
      onChange: (next) => writeConfig(() => window.electronAPI.prWatcher.setEnabled(next)),
    },
    'plan-sync': {
      checked: on(config?.planSyncEnabled),
      onChange: (next) => writeConfig(() => window.electronAPI.config.setPlanSyncEnabled(next)),
    },
    activity: {
      checked: on(config?.usageLogsEnabled),
      onChange: (next) => writeConfig(() => window.electronAPI.config.setUsageLogsEnabled(next)),
    },
    'claude-theme': { checked: on(config?.syncClaudeTheme), onChange: (next) => write(() => updateSyncClaudeTheme(next)) },
    'archive-confirm': { checked: on(config?.confirmAgentArchive), onChange: (next) => write(() => updateConfirmAgentArchive(next)) },
    'info-panel': {
      checked: on(config?.infoSidebarOnCreate),
      onChange: (next) => writeConfig(() => window.electronAPI.config.setInfoSidebarOnCreate(next)),
    },
    'quick-launch-background': {
      checked: config?.quickLaunchBackground === true,
      onChange: (next) => write(() => updateQuickLaunch({ background: next })),
    },
    'daily-digest': {
      checked: config?.dailyDigest?.enabled === true,
      onChange: (next) => writeConfig(() => window.electronAPI.config.setDailyDigestEnabled(next)),
    },
  }

  return Object.fromEntries(
    QUICK_SETTING_IDS.map((id) => [id, {
      id,
      label: t(META[id].labelKey),
      icon: META[id].icon,
      offIcon: META[id].offIcon,
      ...wired[id],
    }]),
  ) as Record<QuickSettingId, QuickSettingTile>
}
