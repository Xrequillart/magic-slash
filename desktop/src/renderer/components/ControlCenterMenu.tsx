import {
  ControlCenter,
  ControlCenterGroup,
  Label,
  TITLE_BAR_HEIGHT,
  ToggleButton,
} from '@ds/desktop'
import { Cog } from '@ds/desktop/icons'
import { useStore } from '../store'
import { useT } from '../i18n'
import { useQuickSettingIds, useQuickSettingTiles } from './quickSettingTiles'

/**
 * THE QUICK SETTINGS, wired — what comes down when the title bar's sliders are pressed.
 *
 * The drawing is `ControlCenter` in `@ds/desktop`; this file is the store, the config
 * hook, the translator and the one-line handlers, which is the same split `TitleBar`
 * makes with `AppTitleBar`. Nothing here knows how the sheet slides or fades.
 *
 * ── THE READER'S SWITCHES, IN THE READER'S ORDER ──────────────────────────────────
 *
 * Which tiles the sheet carries is Settings → Quick settings now: a catalogue of the
 * app's on/off settings (quickSettingTiles.ts), five of them by default. The sheet held
 * four sections once (the setup verdict, appearance, the features, the language); it is
 * one cluster of switches, with no heading over it: one cluster needs no signpost.
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
  const setSettingsTab = useStore((s) => s.setSettingsTab)
  const tiles = useQuickSettingTiles()
  const ids = useQuickSettingIds()

  return (
    <ControlCenter
      open={open}
      onClose={onClose}
      top={TITLE_BAR_HEIGHT}
      label={t('controlCenter.title')}
    >
      {ids.length > 0 && (
        <ControlCenterGroup label={t('controlCenter.features')} labelHidden>
          {ids.map((id) => {
            const tile = tiles[id]
            return (
              <ToggleButton
                key={id}
                icon={tile.icon}
                offIcon={tile.offIcon}
                offTone={tile.offTone}
                checked={tile.checked}
                onChange={tile.onChange}
                caption={false}
                label={tile.label}
              />
            )
          })}
        </ControlCenterGroup>
      )}

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
