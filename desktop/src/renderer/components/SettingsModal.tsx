import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { PageModal } from './PageModal'
import { TabSweep } from './TabSweep'
import { SETTINGS_CATALOGUE } from './settingsCatalogue'
import { searchSettings } from './settingsSearch'
import { MODAL_COLUMN_PADDING, findSettingTarget, spotlightSetting } from '@ds/desktop'
import { AboutPage } from '../pages/Config/AboutPage'
import { AccountPage } from '../pages/Config/AccountPage'
import { AgentsPage } from '../pages/Config/AgentsPage'
import { ApplicationPage } from '../pages/Config/ApplicationPage'
import { AppearancePage } from '../pages/Config/AppearancePage'
import { ClaudeCodePage } from '../pages/Config/ClaudeCodePage'
import { CodeReviewsPage } from '../pages/Config/CodeReviewsPage'
import { WorkflowSettingsPage } from '../pages/Config/WorkflowSettingsPage'
import { ConnectionsPage } from '../pages/Config/ConnectionsPage'
import { LanguagePage } from '../pages/Config/LanguagePage'
import { NotificationsPage } from '../pages/Config/NotificationsPage'
import { OrgPage } from '../pages/Config/OrgPage'
import { ProfilePage } from '../pages/Config/ProfilePage'
import { QuickLaunchPage } from '../pages/Config/QuickLaunchPage'
import { QuickSettingsPage } from '../pages/Config/QuickSettingsPage'
import { SecurityPage } from '../pages/Config/SecurityPage'
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
  Workflow,
  Info,
  Keyboard,
  Languages,
  Palette,
  Plug,
  Settings2,
  ShieldCheck,
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
  | 'security'
  | 'claude-code'
  | 'application'
  | 'agents'
  | 'workflow'
  | 'code-reviews'
  | 'split-view'
  | 'quick-launch'
  | 'quick-settings'
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
      { id: 'connections', labelKey: 'settings.tab.connections', icon: Plug },
      { id: 'security', labelKey: 'settings.tab.security', icon: ShieldCheck },
      { id: 'appearance', labelKey: 'settings.tab.appearance', icon: Palette },
      { id: 'language', labelKey: 'settings.tab.language', icon: Languages },
    ],
  },
  {
    id: 'notifications',
    labelKey: 'settings.group.notifications',
    pages: [{ id: 'notifications', labelKey: 'settings.tab.notifications', icon: Bell }],
  },
  {
    id: 'features',
    labelKey: 'settings.group.features',
    pages: [
      { id: 'application', labelKey: 'settings.tab.application', icon: AppWindow },
      { id: 'agents', labelKey: 'settings.tab.agents', icon: Bot },
      { id: 'workflow', labelKey: 'settings.tab.workflow', icon: Workflow },
      { id: 'code-reviews', labelKey: 'settings.tab.codeReviews', icon: CodeXml },
      { id: 'split-view', labelKey: 'settings.tab.splitView', icon: SquareSplitHorizontal },
      { id: 'quick-launch', labelKey: 'settings.tab.quickLaunch', icon: TextCursorInput },
      { id: 'quick-settings', labelKey: 'settings.tab.quickSettings', icon: Settings2 },
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

/**
 * How long a picked setting may take to appear on its page before the ring gives up.
 * Most are there on the first frame; the Claude account and the org roster arrive from a
 * round trip, and a ring landing two seconds late is still the ring the reader asked for.
 */
const SPOTLIGHT_WAIT_MS = 3000

export function SettingsModal() {
  const t = useT()
  const tab = useStore((s) => s.settingsTab)
  const setTab = useStore((s) => s.setSettingsTab)

  /**
   * THE SEARCH, held here and not in the store: it belongs to this window being open, and
   * a query still sitting in the box the next time someone opens settings would be a
   * search they never typed. The modal unmounts on close, and the box empties with it.
   */
  const [query, setQuery] = useState('')
  const items = useMemo(
    () =>
      SETTINGS_CATALOGUE.map((entry, index) => ({
        key: String(index),
        entry,
        label: 'label' in entry ? entry.label : t(entry.labelKey),
        help: entry.helpKey ? t(entry.helpKey) : '',
        options: entry.options?.(t) ?? [],
        page: t((PAGES.find((page) => page.id === entry.tab) ?? PAGES[0]).labelKey),
      })),
    [t],
  )
  const results = useMemo(() => searchSettings(items, query), [items, query])

  /**
   * THE SETTING A RESULT POINTED AT, until the reader touches the page. `seq` so picking
   * the same result twice rings it again rather than being a state that did not change.
   */
  const [spot, setSpot] = useState<{ label: string; option?: string; seq: number } | null>(null)
  const page = useRef<HTMLDivElement>(null)
  useSettingSpotlight(page, spot, () => setSpot(null))

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
        onSelect: (key) => {
          setSpot(null)
          setTab(key as SettingsTab)
        },
        ariaLabel: t('accountMenu.settings'),
        search: {
          value: query,
          onChange: setQuery,
          placeholder: t('settings.search.placeholder'),
          clearLabel: t('settings.search.clear'),
          emptyLabel: t('settings.search.empty'),
          results: results.map(({ key, label, entry, option }) => {
            const home = PAGES.find((one) => one.id === entry.tab) ?? PAGES[0]
            // Found by a choice, the line under the name says which one, after the page.
            const where = t(home.labelKey)
            return { key, label, context: option ? `${where} · ${option}` : where, icon: home.icon }
          }),
          // Picking ends the search: the rail empties the box and folds back (`SettingsRail`).
          onPick: (key) => {
            const picked = items[Number(key)]
            if (!picked) return
            setTab(picked.entry.tab)
            // The choice rides along, so a tile found by name is the thing that lights.
            const option = results.find((hit) => hit.key === key)?.option
            setSpot({ label: picked.label, option, seq: Date.now() })
          },
        },
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
        {/* The one box the spotlight searches, so a result can only ever ring something on
            the page and never the rail's own copy of its name. */}
        <div ref={page}>
          {tab === 'account' && <AccountPage />}
          {tab === 'profile' && <ProfilePage />}
          {tab === 'organization' && <OrgPage />}
          {tab === 'connections' && <ConnectionsPage />}
          {tab === 'security' && <SecurityPage />}
          {tab === 'claude-code' && <ClaudeCodePage />}
          {tab === 'application' && <ApplicationPage />}
          {tab === 'agents' && <AgentsPage />}
          {tab === 'workflow' && <WorkflowSettingsPage />}
          {tab === 'code-reviews' && <CodeReviewsPage />}
          {tab === 'split-view' && <SplitViewPage />}
          {tab === 'quick-launch' && <QuickLaunchPage />}
          {tab === 'quick-settings' && <QuickSettingsPage />}
          {tab === 'notifications' && <NotificationsPage />}
          {tab === 'appearance' && <AppearancePage />}
          {tab === 'language' && <LanguagePage />}
          {tab === 'shortcuts' && <ShortcutsPage />}
          {tab === 'about' && <AboutPage />}
        </div>
      </TabSweep>
    </PageModal>
  )
}

/**
 * Rings the setting `spot` names on the open page — see `settingSpotlight` in the design
 * system — and takes the ring off at the reader's next press on the page.
 *
 * WATCHED FOR, NOT LOOKED UP ONCE: the page it lands on has only just mounted, and some
 * of its rows wait on a round trip. A `MutationObserver` on the page catches the row the
 * moment it is drawn, for up to `SPOTLIGHT_WAIT_MS`.
 */
function useSettingSpotlight(
  page: RefObject<HTMLDivElement>,
  spot: { label: string; option?: string; seq: number } | null,
  onDone: () => void,
) {
  const done = useRef(onDone)
  done.current = onDone

  useEffect(() => {
    const root = page.current
    if (!spot || !root) return

    let undo: (() => void) | null = null
    const land = () => {
      const target = findSettingTarget(root, spot.label, spot.option)
      if (target) undo = spotlightSetting(target)
      return target !== null
    }

    let observer: MutationObserver | null = null
    let timer: ReturnType<typeof setTimeout> | undefined
    if (!land()) {
      observer = new MutationObserver(() => {
        if (!land()) return
        observer?.disconnect()
        clearTimeout(timer)
      })
      observer.observe(root, { childList: true, subtree: true, characterData: true })
      timer = setTimeout(() => observer?.disconnect(), SPOTLIGHT_WAIT_MS)
    }

    const release = () => done.current()
    root.addEventListener('pointerdown', release)
    return () => {
      observer?.disconnect()
      clearTimeout(timer)
      root.removeEventListener('pointerdown', release)
      undo?.()
    }
  }, [page, spot])
}
