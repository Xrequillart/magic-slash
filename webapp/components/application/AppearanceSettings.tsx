'use client'

import { useMemo } from 'react'
import { AlertTriangle, Check, Palette, PanelsTopLeft } from 'lucide-react'
import { Dropdown } from '@/components/Dropdown'
import { SettingRow, SettingsCard, Toggle } from '@/components/SettingRow'
import { useT } from '@/lib/i18n/useLanguage'
import { DEFAULTS, PANEL_FORMAT_OPTIONS, THEME_OPTIONS, type ThemeSwatch } from '@/lib/settings'
import { useAppSettings } from '@/components/application/SettingsContext'
import { translateOptions } from '@/components/application/options'

/**
 * Appearance tab: how the desktop app looks — its theme, how far that theme
 * reaches, and which of the two sidebar panels it draws.
 *
 * The sidebar panels are here rather than under Features for the reason the
 * desktop app moved them here too: showing a panel or not is a decision about
 * what the window looks like, and the left sidebar's usage card is only
 * comprehensible next to the right one's agent card — one card, one question.
 */

/**
 * Miniature of a theme, painted with that theme's own colours rather than the
 * one in use — the point is to show what the desktop is about to look like.
 * Inline styles because these colours are outside the webapp's palette.
 *
 * Ported from `desktop/src/renderer/pages/Config/AppearancePage.tsx`.
 */
function ThemePreview({ swatch }: { swatch: ThemeSwatch }) {
  return (
    <div
      className="h-16 w-full overflow-hidden rounded-lg border"
      style={{ backgroundColor: `rgb(${swatch.bgRgb})`, borderColor: swatch.lineStrong }}
    >
      <div className="h-3 w-full" style={{ backgroundColor: swatch.surface }} />
      <div className="flex h-full gap-1.5 p-2">
        <div className="w-1/4 rounded" style={{ backgroundColor: swatch.surface }} />
        <div className="flex flex-1 flex-col gap-1">
          <span className="h-1.5 w-3/4 rounded-full" style={{ backgroundColor: `rgb(${swatch.inkRgb})` }} />
          <span
            className="h-1.5 w-1/2 rounded-full"
            style={{ backgroundColor: `rgb(${swatch.inkRgb} / 0.5)` }}
          />
          <span className="mt-1 h-2 w-2/5 rounded" style={{ backgroundColor: `rgb(${swatch.accentRgb})` }} />
        </div>
      </div>
    </div>
  )
}

export function AppearanceSettings() {
  const { t } = useT()
  const { settings, patch } = useAppSettings()

  const formatOptions = useMemo(() => translateOptions(PANEL_FORMAT_OPTIONS, t), [t])

  // A null column means the user never chose, so the desktop applies its own
  // default — show that, never a normalised value.
  const theme = settings.theme ?? DEFAULTS.theme
  const usageCard = settings.usageCardEnabled ?? DEFAULTS.usageCardEnabled
  const agentContext = settings.agentContextEnabled ?? DEFAULTS.agentContextEnabled

  /**
   * The format select for one panel. Shown only while the panel is: offering it
   * for a hidden card would be asking how to lay out something that is not on
   * screen. The stored choice survives — it is a separate column, untouched here.
   */
  const format = (minimized: boolean, onChange: (minimized: boolean) => void) => (
    <Dropdown
      value={minimized ? 'minimized' : 'full'}
      options={formatOptions}
      onChange={(next) => onChange(next === 'minimized')}
      className="w-32"
      width={160}
      size="sm"
    />
  )

  return (
    <>
      {/* ── Theme ───────────────────────────────────────────────────────────── */}
      <SettingsCard icon={Palette} title={t('settings.appearance')}>
        <div className="py-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {THEME_OPTIONS.map((option) => {
              const active = option.id === theme
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => !active && patch({ theme: option.id })}
                  aria-pressed={active}
                  className={`rounded-xl border p-2 text-left transition-colors ${
                    active ? 'border-accent bg-accent/[0.06]' : 'border-black/10 hover:border-black/20'
                  }`}
                >
                  <ThemePreview swatch={option.swatch} />
                  <span className="mt-2 flex items-center gap-1.5">
                    <span className="min-w-0 truncate font-display text-xs font-bold text-ink">
                      {t(option.labelKey)}
                    </span>
                    {active && <Check className="h-3 w-3 shrink-0 text-accent" />}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-muted">
                    {t(option.descriptionKey)}
                  </span>
                </button>
              )
            })}
          </div>
          {/* Warning-toned: the theme dresses the desktop app, and a plain grey
              note under the swatches was read as "this page is about to change". */}
          <p className="mt-3 flex items-start gap-2 rounded-xl border border-yellow/30 bg-yellow/[0.07] px-3 py-2 text-xs text-muted">
            <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0 text-yellow" />
            <span>{t('settings.appearance.note')}</span>
          </p>
        </div>
        {/* Part of the theme card, not a card of its own: it decides how far the
            theme above reaches, and read anywhere else it is a question about
            nothing. */}
        <SettingRow
          label={t('settings.appearance.claudeTheme.label')}
          description={t('settings.appearance.claudeTheme.help')}
        >
          <Toggle
            checked={settings.syncClaudeTheme ?? DEFAULTS.syncClaudeTheme}
            onChange={(syncClaudeTheme) => patch({ syncClaudeTheme })}
            label={t('settings.appearance.claudeTheme.label')}
          />
        </SettingRow>
      </SettingsCard>

      {/* ── Sidebars ────────────────────────────────────────────────────────── */}
      <SettingsCard icon={PanelsTopLeft} title={t('settings.sidebars.section')}>
        <SettingRow label={t('settings.usageCard.label')} description={t('settings.usageCard.help')}>
          <div className="flex items-center gap-3">
            {usageCard &&
              format(settings.usageCardMinimized ?? DEFAULTS.usageCardMinimized, (usageCardMinimized) =>
                patch({ usageCardMinimized }),
              )}
            <Toggle
              checked={usageCard}
              onChange={(usageCardEnabled) => patch({ usageCardEnabled })}
              label={t('settings.usageCard.label')}
            />
          </div>
        </SettingRow>
        <SettingRow
          label={t('settings.sidebars.agentContext.label')}
          description={t('settings.sidebars.agentContext.help')}
        >
          <div className="flex items-center gap-3">
            {agentContext &&
              format(
                settings.agentContextMinimized ?? DEFAULTS.agentContextMinimized,
                (agentContextMinimized) => patch({ agentContextMinimized }),
              )}
            <Toggle
              checked={agentContext}
              onChange={(agentContextEnabled) => patch({ agentContextEnabled })}
              label={t('settings.sidebars.agentContext.label')}
            />
          </div>
        </SettingRow>
      </SettingsCard>
    </>
  )
}
