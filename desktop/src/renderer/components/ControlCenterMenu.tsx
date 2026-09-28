import { useEffect, useState } from 'react'
import {
  ControlCenter,
  ControlCenterGroup,
  Label,
  TITLE_BAR_HEIGHT,
  ToggleButton,
} from '@ds/desktop'
import {
  Bell, BellOff, Brain, ChartSpline, Cog, SquareSplitHorizontal, TextCursorInput,
} from '@ds/desktop/icons'
import { useStore } from '../store'
import { useConfig } from '../hooks/useConfig'
import { useT } from '../i18n'
import { showToast } from './Toast'

/**
 * THE QUICK SETTINGS, wired — what comes down when the title bar's sliders are pressed.
 *
 * The drawing is `ControlCenter` in `@ds/desktop`; this file is the store, the config
 * hook, the translator and the one-line handlers, which is the same split `TitleBar`
 * makes with `AppTitleBar`. Nothing here knows how the sheet slides or fades.
 *
 * ── FIVE SWITCHES AND NOTHING ELSE ────────────────────────────────────────────────
 *
 * The sheet held four sections: the machine's setup verdict, appearance (the eight
 * themes, the scale, the split view), the features, and the language. It is the
 * features alone now, with the split view moved in among them, and no heading over
 * them: one cluster needs no signpost.
 *
 * What went is what a person does not reach for in the middle of something else. The
 * theme and the language are chosen once; the scale has ⌘+ and ⌘−; the setup verdict
 * is a check you run when something is wrong, and it has its card at the top of the
 * Application page. What stayed is on or off and wanted NOW: whether the app may speak
 * to you, the global chord that has started fighting another app for ⌃Space, the two
 * sidebar panels, and the split. Every one of them keeps its row on its settings page;
 * this sheet is a second, faster door to the same values, and "All settings" at its
 * foot is the door to the rest.
 */

export function ControlCenterMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  const {
    config, updateNotifications, updateSpotlight, updateUsageCardEnabled, updateAgentContextEnabled,
  } = useConfig()
  const { splitActive, toggleSplitActive } = useStore()
  const setSettingsTab = useStore((s) => s.setSettingsTab)

  // ── Quick Launch: a write that can succeed and still not register ──────────
  // The only tile here with a local copy, and the reason is the shortcut: the config
  // write lands, and then the OS refuses the chord because something else already holds
  // it. `result.registered` is how that comes back, so the tile has to be able to move
  // and then be told it did not.
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
   * tile, and if the write throws, say so. There is no local copy to revert because
   * the tile was never told the new value — a failed write leaves it where it was.
   */
  const write = async (run: () => Promise<unknown>) => {
    try {
      await run()
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('controlCenter.saveFailed'), 'error')
    }
  }

  // Absent means never chosen, which is on — the reading the main process makes. WHICH
  // KINDS it may speak about is the Notifications page's question now, not the sheet's;
  // this tile is the master and nothing else.
  const notificationsOn = config?.notifications?.enabled !== false
  // The two optional sidebar panels — absent means never chosen, which is shown, the
  // reading their settings rows make (Claude Code's page and the Agents page).
  const usageCardOn = config?.usageCardEnabled !== false
  const agentContextOn = config?.agentContextEnabled !== false

  return (
    <ControlCenter
      open={open}
      onClose={onClose}
      top={TITLE_BAR_HEIGHT}
      label={t('controlCenter.title')}
    >
      {/* The features, notifications first: it is the loudest thing the app does.
          Everything else here changes what you see when you look; this changes what
          reaches you when you are not looking. */}
      <ControlCenterGroup label={t('controlCenter.features')} labelHidden>
        <ToggleButton
          icon={Bell}
          offIcon={BellOff}
          offTone="danger"
          checked={notificationsOn}
          onChange={(next) => void write(() => updateNotifications({ enabled: next }))}
          caption={false}
          label={t('settings.notifications.master.label')}
        />
        {/* Quick Launch, after the notifications: it came off this sheet once, on the
            grounds that a panel you set up once does not deserve a tile, and came back,
            because the one thing people do turn off mid-session is a global chord that
            has started fighting with another app. */}
        <ToggleButton
          icon={TextCursorInput}
          checked={spotlightEnabled}
          onChange={toggleSpotlight}
          caption={false}
          label={t('controlCenter.quickLaunch')}
        />
        <ToggleButton
          icon={ChartSpline}
          checked={usageCardOn}
          onChange={(next) => void write(() => updateUsageCardEnabled(next))}
          caption={false}
          label={t('settings.appearance.sidebars.usageCard.label')}
        />
        <ToggleButton
          icon={Brain}
          checked={agentContextOn}
          onChange={(next) => void write(() => updateAgentContextEnabled(next))}
          caption={false}
          label={t('settings.appearance.sidebars.agentContext.label')}
        />
        {/* The split view, last: it changes how the window is laid out rather than what
            the app does, and it came here from the appearance section that went. THE
            TILE IS THE SPLIT ITSELF, not the permission for it: the window is in two
            panes or it is not, and the Split view page says the same with the same value. */}
        <ToggleButton
          icon={SquareSplitHorizontal}
          checked={splitActive}
          onChange={(next) => {
            if (next !== splitActive) toggleSplitActive()
          }}
          caption={false}
          label={t('controlCenter.splitView')}
        />
      </ControlCenterGroup>

      {/* ALL SETTINGS — the way to everything the tiles cannot say, under the last
          group and centred: a foot, not a second section, so it takes a `Label` rather
          than a tile. A LABEL AND NOT A BUTTON because that is what this folder's one
          chip is — a mark and a word on a plate — and `onClick` is what makes it
          pressable at all; without one it would light up under the cursor and do
          nothing, which is the bug that prop exists to prevent.

          IT OPENS A DIALOG AND CLOSES THIS. It used to slide a card out beside the
          sheet with the tiles still lit under your hand, which read as a menu that had
          grown a second window. Pressing a menu item asks for the thing; the menu's job
          after that is to get out of the way. The store closes the sheet — see
          `setSettingsTab` — so a row that opens a dialog cannot forget to. */}
      <div className="flex justify-center">
        <Label icon={Cog} size="md" onClick={() => setSettingsTab('application')}>
          {t('controlCenter.allSettings')}
        </Label>
      </div>
    </ControlCenter>
  )
}
