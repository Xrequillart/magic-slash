import { PageModal } from './PageModal'
import { TabSweep } from './TabSweep'
import { MODAL_COLUMN_PADDING } from '@ds/desktop'
import { AboutPage } from '../pages/Config/AboutPage'
import { AccountPage } from '../pages/Config/AccountPage'
import { AgentsPage } from '../pages/Config/AgentsPage'
import { ApplicationPage } from '../pages/Config/ApplicationPage'
import { AppearancePage } from '../pages/Config/AppearancePage'
import { ClaudeCodePage } from '../pages/Config/ClaudeCodePage'
import { CodeReviewsPage } from '../pages/Config/CodeReviewsPage'
import { ConnectionsPage } from '../pages/Config/ConnectionsPage'
import { LanguagePage } from '../pages/Config/LanguagePage'
import { NotificationsPage } from '../pages/Config/NotificationsPage'
import { OrgPage } from '../pages/Config/OrgPage'
import { ProfilePage } from '../pages/Config/ProfilePage'
import { QuickLaunchPage } from '../pages/Config/QuickLaunchPage'
import { ShortcutsPage } from '../pages/Config/ShortcutsPage'
import { SplitViewPage } from '../pages/Config/SplitViewPage'
import { useStore } from '../store'
import { useT, type MessageKey } from '../i18n'
import {
  AppWindow,
  Bell,
  Bot,
  Building2,
  CircleUserRound,
  CodeXml,
  Info,
  Keyboard,
  Languages,
  Palette,
  Plug,
  SquareSplitHorizontal,
  SquareTerminal,
  TextCursorInput,
  UserPen,
} from '@ds/desktop/icons'
import type { IconComponent } from '@ds/desktop/types'

/**
 * WHO YOU ARE AND WHAT THE APP DOES, in one page overlay with every page down the left.
 *
 * IT WAS TWO WINDOWS. `AccountModal` held who the app is signed in as — the account, the
 * organization, the connections, Claude Code, About — and this one held what it does —
 * the machine's setup, the notifications, the appearance, the language, the chords. Each
 * had a tab strip in its header, and the split was the one the title bar draws. It was a
 * clean line on paper and a guess in practice: a reader looking for the language had to
 * know which of two controls it lived behind before they could find it. One window with
 * all of them down the side answers that by showing them.
 *
 * THE RAIL IS THE DESIGN SYSTEM'S, handed over as data (`PageModal`'s `rail`), because
 * the panel is sized from it: the rail plus exactly the column these pages were always
 * measured for, so no page got narrower for the merge.
 *
 * STILL OPENED ON A PAGE, by every door that led to either window: the account dropdown
 * picks its row, the quick settings sheet and ⌘, lead to Application, the Tasks page's
 * missing-credential banner to Connections. See `settingsTab` in the store.
 *
 * REPOSITORIES ARE STILL THE OTHER WINDOW — the one ⌘P opens — because a repository is
 * neither a preference nor an identity: it is a folder on this disk with a detail page
 * of its own, and a row here that swapped windows would be the one row that does not
 * open a page.
 *
 * ONLY THE OPEN PAGE IS MOUNTED. Most of these ask the main process or the cloud
 * something on mount — the org roster, the Jira status, the Claude account and its
 * spend, the setup status, the app version — and mounting ten to hide nine would be
 * those round trips for pages nobody opened. The cost is that a page starts at its top
 * each time it comes back, which is what a settings page should do.
 */

export type SettingsTab =
  | 'account'
  | 'profile'
  | 'organization'
  | 'connections'
  | 'claude-code'
  | 'application'
  | 'agents'
  | 'code-reviews'
  | 'split-view'
  | 'quick-launch'
  | 'notifications'
  | 'appearance'
  | 'language'
  | 'shortcuts'
  | 'about'

interface SettingsPageEntry {
  id: SettingsTab
  labelKey: MessageKey
  icon: IconComponent
}

/**
 * The runs, top to bottom, each under its caption: everything that is about YOU and how
 * the app treats you, then what the app does, then the reference pages — the chords to
 * learn and the copy you are running.
 *
 * Message KEYS rather than labels: module scope is evaluated once at import, so a `t()`
 * here would pin the rail to whatever language the app booted in.
 */
const GROUPS: { id: string; labelKey: MessageKey; pages: SettingsPageEntry[] }[] = [
  {
    id: 'personal',
    labelKey: 'settings.group.personal',
    pages: [
      { id: 'account', labelKey: 'settings.tab.account', icon: CircleUserRound },
      { id: 'profile', labelKey: 'settings.tab.profile', icon: UserPen },
      { id: 'organization', labelKey: 'settings.tab.organization', icon: Building2 },
      { id: 'claude-code', labelKey: 'settings.tab.claudeCode', icon: SquareTerminal },
      { id: 'notifications', labelKey: 'settings.tab.notifications', icon: Bell },
      { id: 'connections', labelKey: 'settings.tab.connections', icon: Plug },
      { id: 'appearance', labelKey: 'settings.tab.appearance', icon: Palette },
      { id: 'language', labelKey: 'settings.tab.language', icon: Languages },
    ],
  },
  {
    id: 'features',
    labelKey: 'settings.group.features',
    pages: [
      { id: 'application', labelKey: 'settings.tab.application', icon: AppWindow },
      { id: 'agents', labelKey: 'settings.tab.agents', icon: Bot },
      { id: 'code-reviews', labelKey: 'settings.tab.codeReviews', icon: CodeXml },
      { id: 'split-view', labelKey: 'settings.tab.splitView', icon: SquareSplitHorizontal },
      { id: 'quick-launch', labelKey: 'settings.tab.quickLaunch', icon: TextCursorInput },
    ],
  },
  {
    id: 'about',
    labelKey: 'settings.group.about',
    pages: [
      { id: 'shortcuts', labelKey: 'settings.tab.shortcuts', icon: Keyboard },
      { id: 'about', labelKey: 'settings.tab.about', icon: Info },
    ],
  },
]

const PAGES = GROUPS.flatMap(({ pages }) => pages)
const ORDER = PAGES.map(({ id }) => id)

export function SettingsModal() {
  const t = useT()
  const tab = useStore((s) => s.settingsTab)
  const setTab = useStore((s) => s.setSettingsTab)

  if (tab === null) return null
  const active = PAGES.find((page) => page.id === tab) ?? PAGES[0]

  return (
    <PageModal
      title={t(active.labelKey)}
      titleIcon={active.icon}
      onClose={() => setTab(null)}
      size="column"
      bodyKey={tab}
      rail={{
        groups: GROUPS.map(({ id, labelKey, pages }) => ({
          id,
          label: t(labelKey),
          rows: pages.map((page) => ({ key: page.id, label: t(page.labelKey), icon: page.icon })),
        })),
        activeKey: tab,
        // The cast holds because the rail only ever reports back a key it was given.
        onSelect: (key) => setTab(key as SettingsTab),
        ariaLabel: t('accountMenu.settings'),
      }}
    >
      {/* The arriving page travels along the rail: a page further down the list comes up
          from below. The organization page has a strip of its own inside it, and the two
          nest without fighting — the inner one animates its own element, which is already
          at rest by the time anybody reaches it. */}
      {/* THE PAGE'S PADDING RIDES ON THE SWEEP, not on the scroller around it — see
          `MODAL_COLUMN_PADDING`. On the scroller, the cards sit flush against the box
          that clips, and a card that slides 24px arrives with 24px missing. */}
      <TabSweep tabKey={tab} order={ORDER} style={MODAL_COLUMN_PADDING} vertical>
        {tab === 'account' && <AccountPage />}
        {tab === 'profile' && <ProfilePage />}
        {tab === 'organization' && <OrgPage />}
        {tab === 'connections' && <ConnectionsPage />}
        {tab === 'claude-code' && <ClaudeCodePage />}
        {tab === 'application' && <ApplicationPage />}
        {tab === 'agents' && <AgentsPage />}
        {tab === 'code-reviews' && <CodeReviewsPage />}
        {tab === 'split-view' && <SplitViewPage />}
        {tab === 'quick-launch' && <QuickLaunchPage />}
        {tab === 'notifications' && <NotificationsPage />}
        {tab === 'appearance' && <AppearancePage />}
        {tab === 'language' && <LanguagePage />}
        {tab === 'shortcuts' && <ShortcutsPage />}
        {tab === 'about' && <AboutPage />}
      </TabSweep>
    </PageModal>
  )
}
