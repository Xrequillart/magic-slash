import { PageModal } from './PageModal'
import { TabSweep } from './TabSweep'
import { MODAL_COLUMN_PADDING } from '@ds/desktop'
import { ApplicationPage } from '../pages/Config/ApplicationPage'
import { NotificationsPage } from '../pages/Config/NotificationsPage'
import { AppearancePage } from '../pages/Config/AppearancePage'
import { LanguagePage } from '../pages/Config/LanguagePage'
import { ShortcutsPage } from '../pages/Config/ShortcutsPage'
import { useStore } from '../store'
import { useT, type MessageKey } from '../i18n'
import { AppWindow, Bell, Keyboard, Languages, Palette } from '@ds/desktop/icons'
import type { IconComponent } from '@ds/desktop/types'

/**
 * EVERYTHING THE QUICK SETTINGS SHEET DOES NOT HOLD — as a page overlay in the middle of
 * the window.
 *
 * The sheet is a grid of tiles: it answers the settings that are a yes or a no, a scale
 * or a swatch. The REST has to live somewhere — the machine's setup card with its
 * installers, the Quick Launch shortcut, the PR watcher's interval and its skill
 * auto-launch, the two sidebar panels' format, every chord, and every sentence of help
 * text a 40px circle has no room for. This is where they are read.
 *
 * A `PageModal` AND NOT A DIALOG, which it was for a while, and the tab strip is what
 * decided it. These five are PAGES — they scroll, they hold forms, one of them holds the
 * machine's whole setup — and the app already has a window for pages: the one Skills,
 * Tasks and Plans open into, with the strip centred in its header and the button that
 * takes it full screen. A second window shape for the same kind of content, with its
 * tabs in the BODY under a title band, was two answers to one question.
 *
 * THE TITLE NAMES THE ACTIVE PAGE, which is that header's rule: the strip in the middle
 * is what you choose with, the word on the left is what you are on.
 *
 * ONLY THE OPEN PAGE IS MOUNTED. Three of the five ask the main process something when
 * they mount — the setup status, the auto-start flag — and mounting all five to hide
 * four would be those round trips for pages nobody opened. The cost is that a page
 * starts at its top each time it comes back, which is what a settings page should do.
 */

export type AppSettingsTab = 'application' | 'notifications' | 'appearance' | 'language' | 'shortcuts'

/** The five, in the order the settings rail used to list them. Message KEYS rather than
 *  labels, for the reason the rail gave: module scope is evaluated once at import, so a
 *  `t()` here would pin the bar to whatever language the app booted in. */
const PAGES: { id: AppSettingsTab; labelKey: MessageKey; icon: IconComponent }[] = [
  { id: 'application', labelKey: 'settings.tab.application', icon: AppWindow },
  { id: 'notifications', labelKey: 'settings.tab.notifications', icon: Bell },
  { id: 'appearance', labelKey: 'settings.tab.appearance', icon: Palette },
  { id: 'language', labelKey: 'settings.tab.language', icon: Languages },
  { id: 'shortcuts', labelKey: 'settings.tab.shortcuts', icon: Keyboard },
]

export function SettingsModal() {
  const t = useT()
  const tab = useStore((s) => s.appSettingsTab)
  const setTab = useStore((s) => s.setAppSettingsTab)

  if (tab === null) return null
  const active = PAGES.find((page) => page.id === tab) ?? PAGES[0]

  return (
    <PageModal
      title={t(active.labelKey)}
      titleIcon={active.icon}
      onClose={() => setTab(null)}
      tabs={{
        items: PAGES.map(({ id, labelKey, icon }) => ({ key: id, label: t(labelKey), icon })),
        activeKey: tab,
        // The cast holds because the strip only ever reports back a key it was given.
        onSelect: (key) => setTab(key as AppSettingsTab),
        ariaLabel: t('controlCenter.allSettings'),
      }}
      /* ONE COLUMN OF FORMS, so the window is exactly that column and its padding rather
         than the 72rem the pages with layouts open into — twelve rem of empty panel
         either side read as a page that had failed to load on the short tabs.
         `bodyKey` is what puts each page at its top: the scroller belongs to the design
         system at this size, and it is the scroller that holds the offset. */
      size="column"
      bodyKey={tab}
    >
      {/* The arriving page travels in the direction of the pill you pressed — the same
          `TabSweep` the organization and repository tabs move by, so no two tab strips
          in the app slide differently. It sits INSIDE the scroller, which is why that
          scroller is reset rather than remounted: a sweep rebuilt on every switch has
          nothing to sweep from. */}
      {/* THE PAGE'S PADDING RIDES ON THE SWEEP, not on the scroller around it — see
          `MODAL_COLUMN_PADDING`. On the scroller, the cards sit flush against the box
          that clips, and a card that slides 24px arrives with 24px missing. */}
      <TabSweep tabKey={tab} order={PAGES.map(({ id }) => id)} style={MODAL_COLUMN_PADDING}>
        {tab === 'application' && <ApplicationPage />}
        {tab === 'notifications' && <NotificationsPage />}
        {tab === 'appearance' && <AppearancePage />}
        {tab === 'language' && <LanguagePage />}
        {tab === 'shortcuts' && <ShortcutsPage />}
      </TabSweep>
    </PageModal>
  )
}
