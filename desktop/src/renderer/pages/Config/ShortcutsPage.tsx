import { Keyboard } from '@ds/desktop/icons'
import { Card, Kbd, SectionHeader, Text } from '@ds/desktop'
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
 *
 * ── THE CAPS ARE `Kbd` ────────────────────────────────────────────────────────────
 *
 * Every chord below was a `<kbd>` spelled here — a ground, a border, a radius and two
 * type sizes, with the `⌘` bumped a rung by hand so it would not read smaller than the
 * letter beside it. The appearance page drew the same object with a different ground and
 * without that correction, which is the drift a design system exists to end. The plate
 * is `Card` and the labels are `Text`; what is left in this file is the LIST.
 *
 * THE GRID IS STILL THIS PAGE'S. Two columns of fourteen facts is a layout, and a layout
 * is what a page owns — the design system draws the things in it, not the arrangement.
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
        <Card>
          {/* `items-center` on every row and not `baseline`: what the eye lines up down
              the right-hand edge is the CAPS, and two rows whose labels wrap to
              different heights would otherwise stagger them. */}
          <div className="grid grid-cols-2 gap-3">
            {CHORDS.map(([labelKey, key]) => (
              <div key={labelKey} className="flex items-center justify-between gap-3">
                <Text size="sm" tone="secondary">{t(labelKey)}</Text>
                <Kbd keys={['⌘', key]} />
              </div>
            ))}
            <div className="flex items-center justify-between gap-3">
              <Text size="sm" tone="secondary">{t('settings.shortcuts.quickLaunch')}</Text>
              {spotlightEnabled ? (
                /* The option's own keys, handed over as they were written. The chord
                   this page cannot find is one the config holds and the build no longer
                   offers, so it falls back to the raw value — `Control+Space` — which is
                   ugly and true, where drawing nothing would be a page claiming there is
                   no shortcut when there is one. */
                <Kbd keys={SPOTLIGHT_OPTIONS.find((o) => o.value === spotlightShortcut)?.keys ?? [spotlightShortcut]} />
              ) : (
                /* No cap when there is no chord: a key nobody can press drawn as a key
                   is a lie about what the keyboard does. */
                <Text size="xs" tone="secondary" className="opacity-40">{t('settings.shortcuts.disabled')}</Text>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
