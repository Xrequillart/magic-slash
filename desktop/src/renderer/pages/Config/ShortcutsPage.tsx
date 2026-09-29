import { Keyboard } from '@ds/desktop/icons'
import { SectionHeader, SettingsCard } from '@ds/desktop'
import { SPOTLIGHT_OPTIONS } from './QuickLaunchPage'
import { useStore } from '../../store'
import { useT, type MessageKey } from '../../i18n'

/**
 * EVERY CHORD THE APP ANSWERS TO, on one page — and the page reads, it does not write.
 *
 * It was the settings modal's seventh tab and it is `SettingsModal`'s fifth, which is
 * the same move Application, Notifications, Appearance and Language already made: the
 * quick settings and the dialog behind them hold what the APP does, and the account
 * dropdown holds who it is signed in as. A keyboard shortcut is the first kind.
 *
 * NOTHING HERE IS EDITABLE and that is not an oversight. Every chord below is compiled
 * into its own `useEffect` across the app, so there is nothing to offer a user but the
 * truth about what the keys do. Quick Launch, at the foot, is the one exception — it IS
 * settable, and its control is on the Application page beside the switch that turns the
 * panel on, because which keys are free is a property of the machine and belongs next to
 * the feature rather than in a list of facts. It is REPEATED here, read-only, so that
 * this page can honestly claim to be every shortcut.
 *
 * ── EACH CHORD IS A SETTINGS ROW ──────────────────────────────────────────────────
 *
 * `SettingsCard`, like every other page in this window: the name and what it does on the
 * left, the caps on the right through `SettingRow`'s `kbd` kind. It used to be a two-column
 * grid of bare labels, which fit fourteen names on few lines and said nothing about what
 * "Toggle agent info" actually toggles. One row per chord costs height and buys the line
 * of explanation.
 */

/** The thirteen chords, each ⌘ plus one key: its name, what it does, the key. Message
 *  KEYS, resolved in the render path: module scope is evaluated once at import, so a
 *  `t()` here would pin the list to whatever language the app booted in. */
export const CHORDS: readonly (readonly [MessageKey, MessageKey, string])[] = [
  ['sidebar.newAgent', 'settings.shortcuts.help.newAgent', 'N'],
  ['settings.shortcuts.duplicateAgent', 'settings.shortcuts.help.duplicateAgent', 'D'],
  ['settings.shortcuts.closeAgent', 'settings.shortcuts.help.closeAgent', 'W'],
  ['settings.shortcuts.previousAgent', 'settings.shortcuts.help.previousAgent', '↑'],
  ['settings.shortcuts.nextAgent', 'settings.shortcuts.help.nextAgent', '↓'],
  ['settings.shortcuts.toggleAgentInfo', 'settings.shortcuts.help.toggleAgentInfo', 'I'],
  ['settings.shortcuts.toggleAgentsList', 'settings.shortcuts.help.toggleAgentsList', 'B'],
  ['settings.shortcuts.toggleSplit', 'settings.shortcuts.help.toggleSplit', '/'],
  // The four windows the sidebar opens, in its own order. Tasks and Plans were missing
  // from this list for as long as it existed — a page claiming to be every shortcut,
  // quietly short by two. See `PAGE_SHORTCUTS` in `Sidebar.tsx` for why these letters.
  ['sidebar.skills', 'settings.shortcuts.help.skills', ';'],
  ['tasks.title', 'settings.shortcuts.help.tasks', 'J'],
  ['plans.title', 'settings.shortcuts.help.plans', 'T'],
  ['settings.tab.repositories', 'settings.shortcuts.help.repositories', 'P'],
  // Not a window: ⌘, pulls the quick settings sheet down, where the platform's own
  // "preferences" chord belongs.
  ['controlCenter.title', 'settings.shortcuts.help.controlCenter', ','],
]

export function ShortcutsPage() {
  const t = useT()
  // Straight off the store and not into local state, unlike the pages either side of
  // this one: they mirror the config because they WRITE it and have to show the new
  // value before the round trip comes back. This page only reads, so a copy would be
  // one more thing that can fall behind the config it was copied from.
  const config = useStore((s) => s.config)
  const spotlightEnabled = config?.spotlight?.enabled ?? true
  const spotlightShortcut = config?.spotlight?.shortcut ?? 'Control+Space'

  return (
    <div className="flex flex-col gap-8">
      <div>
        <SectionHeader icon={Keyboard} title={t('settings.shortcuts.section')} />
        <SettingsCard
          rows={[
            ...CHORDS.map(([labelKey, helpKey, key]) => ({
              id: labelKey,
              label: t(labelKey),
              hint: t(helpKey),
              control: { kind: 'kbd' as const, keys: ['⌘', key] },
            })),
            {
              id: 'quickLaunch',
              label: t('settings.shortcuts.quickLaunch'),
              hint: t('settings.shortcuts.help.quickLaunch'),
              // The option's own keys, handed over as they were written. A chord the
              // config holds and this build no longer offers falls back to the raw value
              // (`Control+Space`): ugly and true, where drawing nothing would claim there
              // is no shortcut when there is one. Off, there is no cap at all, since a
              // key nobody can press drawn as a key is a lie about the keyboard, and the
              // row says so in its note instead.
              ...(spotlightEnabled
                ? {
                    control: {
                      kind: 'kbd' as const,
                      keys: SPOTLIGHT_OPTIONS.find((o) => o.value === spotlightShortcut)?.keys ?? [spotlightShortcut],
                    },
                  }
                : { note: t('settings.shortcuts.disabled') }),
            },
          ]}
        />
      </div>
    </div>
  )
}
