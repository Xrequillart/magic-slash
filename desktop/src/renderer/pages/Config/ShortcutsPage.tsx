import { Keyboard } from '@ds/desktop/icons'
import { SectionHeader } from '@ds/desktop'
import { SPOTLIGHT_OPTIONS } from './ApplicationPage'
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
 */

/** The thirteen chords, each ⌘ plus one key. Message KEYS, resolved in the render
 *  path: module scope is evaluated once at import, so a `t()` here would pin the list
 *  to whatever language the app booted in. */
const CHORDS: readonly (readonly [MessageKey, string])[] = [
  ['sidebar.newAgent', 'N'],
  ['settings.shortcuts.duplicateAgent', 'D'],
  ['settings.shortcuts.closeAgent', 'W'],
  ['settings.shortcuts.previousAgent', '↑'],
  ['settings.shortcuts.nextAgent', '↓'],
  ['settings.shortcuts.toggleAgentInfo', 'I'],
  ['settings.shortcuts.toggleAgentsList', 'B'],
  ['settings.shortcuts.toggleSplit', '/'],
  // The four windows the sidebar opens, in its own order. Tasks and Plans were missing
  // from this list for as long as it existed — a page claiming to be every shortcut,
  // quietly short by two. See `PAGE_SHORTCUTS` in `Sidebar.tsx` for why these letters.
  ['sidebar.skills', ';'],
  ['tasks.title', 'J'],
  ['plans.title', 'T'],
  ['settings.tab.repositories', 'P'],
  // Not a window: ⌘, pulls the quick settings sheet down, where the platform's own
  // "preferences" chord belongs.
  ['controlCenter.title', ','],
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
        <div className="bg-surface border border-line-strong rounded-xl p-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            {CHORDS.map(([labelKey, key]) => (
              <div key={labelKey} className="flex items-center justify-between">
                <span className="text-text-secondary">{t(labelKey)}</span>
                <kbd className="px-2 py-0.5 bg-surface border border-line rounded text-xs text-text-secondary"><span className="text-sm">⌘</span> {key}</kbd>
              </div>
            ))}
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">{t('settings.shortcuts.quickLaunch')}</span>
              {spotlightEnabled ? (
                <kbd className="px-2 py-0.5 bg-surface border border-line rounded text-xs text-text-secondary">
                  {SPOTLIGHT_OPTIONS.find((o) => o.value === spotlightShortcut)?.label ?? spotlightShortcut}
                </kbd>
              ) : (
                <span className="px-2 py-0.5 text-xs text-text-secondary/40">{t('settings.shortcuts.disabled')}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
