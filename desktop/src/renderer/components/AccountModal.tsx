import { PageModal } from './PageModal'
import { TabSweep } from './TabSweep'
import { MODAL_COLUMN_PADDING } from '@ds/desktop'
import { AboutPage } from '../pages/Config/AboutPage'
import { AccountPage } from '../pages/Config/AccountPage'
import { ClaudeCodePage } from '../pages/Config/ClaudeCodePage'
import { ConnectionsPage } from '../pages/Config/ConnectionsPage'
import { OrgPage } from '../pages/Config/OrgPage'
import { useStore } from '../store'
import { useT, type MessageKey } from '../i18n'
import { Building2, CircleUserRound, Info, Plug, SquareTerminal } from '@ds/desktop/icons'
import type { IconComponent } from '@ds/desktop/types'

/**
 * WHO YOU ARE — as a page overlay in the middle of the window, opened from the account
 * dropdown in the title bar.
 *
 * `SettingsModal` beside it is the same object for the other control, and the two
 * together are what the settings rail used to be. The split is the one the title bar
 * draws: the sliders open what the app DOES — the machine's setup, the notifications,
 * the appearance, the language, the chords — and the account label opens who it is
 * signed in AS. Nothing is in both.
 *
 * FIVE ROWS OF THE DROPDOWN, FIVE TABS HERE, and that is the whole relationship: the
 * menu row picks which tab this opens on, and the strip in the header is what lets you
 * reach the other four without going back to the menu. A dialog per row was the other
 * option and it would have been five windows to look at one account.
 *
 * REPOSITORIES ARE THE OTHER WINDOW — the one the sidebar opens with ⌘P — because a
 * repository is neither a preference nor an identity: it is a folder on this disk with a
 * remote behind it and a detail page of its own.
 *
 * ONLY THE OPEN PAGE IS MOUNTED. Four of these five ask the main process or the cloud
 * something on mount — the org roster, the Jira status, the Claude account and its
 * spend, the app version — and mounting all five to hide four would be those round
 * trips for pages nobody opened.
 */

export type AccountModalTab = 'account' | 'organization' | 'connections' | 'claude-code' | 'about'

/** The five, in the order the dropdown lists them. Message KEYS rather than labels, for
 *  the reason the rail gave: module scope is evaluated once at import, so a `t()` here
 *  would pin the bar to whatever language the app booted in. */
const PAGES: { id: AccountModalTab; labelKey: MessageKey; icon: IconComponent }[] = [
  { id: 'account', labelKey: 'settings.tab.account', icon: CircleUserRound },
  { id: 'organization', labelKey: 'settings.tab.organization', icon: Building2 },
  { id: 'connections', labelKey: 'settings.tab.connections', icon: Plug },
  { id: 'claude-code', labelKey: 'settings.tab.claudeCode', icon: SquareTerminal },
  { id: 'about', labelKey: 'settings.tab.about', icon: Info },
]

export function AccountModal() {
  const t = useT()
  const tab = useStore((s) => s.accountTab)
  const setTab = useStore((s) => s.setAccountTab)

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
        onSelect: (key) => setTab(key as AccountModalTab),
        ariaLabel: t('accountMenu.title'),
      }}
      /* NARROWER THAN THE OTHER OVERLAYS, and `SettingsModal` beside it is the same:
         these five are one column of forms, not a page with a layout, and the window is
         now exactly that column plus its padding. The scroller and the measure are the
         design system's at this size — see `@ds/desktop/modalSizes` — because the panel's
         width is computed FROM them, and a call site respelling either is a sliver of
         empty plate the day one of them moves. */
      size="column"
      bodyKey={tab}
    >
      {/* `SettingsModal`'s sweep, for its reasons: the page arrives from the side the
          pill you pressed is on. The organization tab has a strip of its own inside it
          and the two nest without fighting — the inner one animates its own element,
          which is already at rest by the time anybody reaches it. */}
      {/* THE PAGE'S PADDING RIDES ON THE SWEEP, not on the scroller around it — see
          `MODAL_COLUMN_PADDING`. On the scroller, the cards sit flush against the box
          that clips, and a card that slides 24px arrives with 24px missing. */}
      <TabSweep tabKey={tab} order={PAGES.map(({ id }) => id)} style={MODAL_COLUMN_PADDING}>
        {tab === 'account' && <AccountPage />}
        {tab === 'organization' && <OrgPage />}
        {tab === 'connections' && <ConnectionsPage />}
        {tab === 'claude-code' && <ClaudeCodePage />}
        {tab === 'about' && <AboutPage />}
      </TabSweep>
    </PageModal>
  )
}
