import type { MessageKey } from '../../i18n'
import type { SettingsTab } from './SettingsModal'

/**
 * EVERY SETTING THE SEARCH BOX CAN FIND, as message keys, with the page each one lives on.
 *
 * A LIST AND NOT A CRAWL of the pages. Only the open page is mounted (see `SettingsModal`),
 * and mounting the other sixteen to read their text would be every round trip they make
 * on mount — the org roster, the Jira status, the Claude spend — for a keystroke. So the
 * catalogue is written down, once, here. The price is that a new row has to be added
 * below to be findable; a row that is not is still on its page, just not in the results.
 *
 * `labelKey` IS ALSO HOW THE ROW IS FOUND ON ARRIVAL: the modal looks for the element
 * carrying that exact text on the page it opened and outlines the row around it. Which is
 * why it must be the key the page renders as the row's NAME, not a paraphrase of it.
 *
 * `helpKey` is searched and never shown: it is how "dock" finds the menu bar switch,
 * whose name does not say dock but whose help line does.
 *
 * The shortcuts page's chords are not listed here: that page owns the list
 * (`CHORDS` in `ShortcutsPage`), and the modal appends them.
 *
 * PURE — type imports only — so the matcher below can be tested on the root suite.
 */
export interface SettingsSearchEntry {
  tab: SettingsTab
  labelKey: MessageKey
  helpKey?: MessageKey
}

export const SETTINGS_SEARCH_ENTRIES: readonly SettingsSearchEntry[] = [
  // ── Account ──
  { tab: 'account', labelKey: 'cloud.row.username', helpKey: 'cloud.username.hint' },
  { tab: 'account', labelKey: 'cloud.row.avatar' },
  { tab: 'account', labelKey: 'cloud.row.email' },
  { tab: 'account', labelKey: 'cloud.row.password' },
  { tab: 'account', labelKey: 'cloud.deleteAccount', helpKey: 'cloud.delete.rowHint' },

  // ── Profile ──
  { tab: 'profile', labelKey: 'profile.section', helpKey: 'profile.description' },
  { tab: 'profile', labelKey: 'profile.form.firstName' },
  { tab: 'profile', labelKey: 'profile.form.role' },
  { tab: 'profile', labelKey: 'profile.form.level' },
  { tab: 'profile', labelKey: 'profile.form.style' },
  { tab: 'profile', labelKey: 'profile.form.languages' },
  { tab: 'profile', labelKey: 'profile.form.freeText' },

  // ── Organization ──
  { tab: 'organization', labelKey: 'org.section' },
  { tab: 'organization', labelKey: 'org.members' },
  { tab: 'organization', labelKey: 'org.invitations' },
  { tab: 'organization', labelKey: 'org.create' },
  { tab: 'organization', labelKey: 'org.join' },

  // ── Claude Code ──
  { tab: 'claude-code', labelKey: 'settings.claude.account' },
  { tab: 'claude-code', labelKey: 'settings.claude.plan' },
  { tab: 'claude-code', labelKey: 'settings.rate.section' },
  {
    tab: 'claude-code',
    labelKey: 'settings.appearance.sidebars.usageCard.label',
    helpKey: 'settings.appearance.sidebars.usageCard.help',
  },
  { tab: 'claude-code', labelKey: 'settings.spend.section', helpKey: 'settings.spend.disclaimer' },

  // ── Connections ──
  { tab: 'connections', labelKey: 'jira.section', helpKey: 'jira.notConnectedHint' },

  // ── Security ──
  { tab: 'security', labelKey: 'security.current' },
  { tab: 'security', labelKey: 'security.others' },
  { tab: 'security', labelKey: 'security.revokeAll', helpKey: 'security.revokeAllHint' },

  // ── Appearance ──
  { tab: 'appearance', labelKey: 'settings.appearance.themeSection' },
  {
    tab: 'appearance',
    labelKey: 'settings.appearance.claudeTheme.label',
    helpKey: 'settings.appearance.claudeTheme.help',
  },
  { tab: 'appearance', labelKey: 'settings.appearance.scale', helpKey: 'settings.appearance.scaleHelp' },

  // ── Language ──
  { tab: 'language', labelKey: 'settings.language.label', helpKey: 'settings.language.help' },

  // ── Notifications ──
  {
    tab: 'notifications',
    labelKey: 'settings.notifications.master.label',
    helpKey: 'settings.notifications.master.help',
  },
  {
    tab: 'notifications',
    labelKey: 'settings.notifications.agentWaiting.label',
    helpKey: 'settings.notifications.agentWaiting.help',
  },
  {
    tab: 'notifications',
    labelKey: 'settings.notifications.agentCompleted.label',
    helpKey: 'settings.notifications.agentCompleted.help',
  },
  {
    tab: 'notifications',
    labelKey: 'settings.notifications.prReview.label',
    helpKey: 'settings.notifications.prReview.help',
  },
  {
    tab: 'notifications',
    labelKey: 'settings.notifications.prChangesRequested.label',
    helpKey: 'settings.notifications.prChangesRequested.help',
  },
  {
    tab: 'notifications',
    labelKey: 'settings.notifications.digest.label',
    helpKey: 'settings.notifications.digest.help',
  },

  // ── Application ──
  { tab: 'application', labelKey: 'settings.application.setup.title' },
  {
    tab: 'application',
    labelKey: 'settings.application.background.autoStartLabel',
    helpKey: 'settings.application.background.autoStartHelp',
  },
  {
    tab: 'application',
    labelKey: 'settings.application.background.menuBarLabel',
    helpKey: 'settings.application.background.menuBarHelp',
  },
  { tab: 'application', labelKey: 'settings.application.sidebar.label', helpKey: 'settings.application.sidebar.help' },
  {
    tab: 'application',
    labelKey: 'settings.application.sidebar.compact.label',
    helpKey: 'settings.application.sidebar.compact.help',
  },
  {
    tab: 'application',
    labelKey: 'settings.application.planSync.label',
    helpKey: 'settings.application.planSync.help',
  },
  {
    tab: 'application',
    labelKey: 'settings.application.usageLogs.label',
    helpKey: 'settings.application.usageLogs.help',
  },
  { tab: 'application', labelKey: 'settings.about.telemetry.title' },

  // ── Sessions ──
  { tab: 'agents', labelKey: 'settings.defaultAgentType.title', helpKey: 'settings.defaultAgentType.description' },
  { tab: 'agents', labelKey: 'settings.agents.model.label', helpKey: 'settings.agents.model.help' },
  { tab: 'agents', labelKey: 'settings.launchMode.label', helpKey: 'settings.launchMode.help' },
  { tab: 'agents', labelKey: 'settings.agents.sort.label', helpKey: 'settings.agents.sort.help' },
  {
    tab: 'agents',
    labelKey: 'settings.appearance.sidebars.agentContext.label',
    helpKey: 'settings.appearance.sidebars.agentContext.help',
  },
  {
    tab: 'agents',
    labelKey: 'settings.application.infoSidebar.label',
    helpKey: 'settings.application.infoSidebar.help',
  },
  {
    tab: 'agents',
    labelKey: 'settings.agents.archive.confirm.label',
    helpKey: 'settings.agents.archive.confirm.help',
  },

  // ── Code & reviews ──
  {
    tab: 'code-reviews',
    labelKey: 'settings.application.prWatcher.label',
    helpKey: 'settings.application.prWatcher.help',
  },
  {
    tab: 'code-reviews',
    labelKey: 'settings.application.prWatcher.intervalLabel',
    helpKey: 'settings.application.prWatcher.intervalHelp',
  },
  {
    tab: 'code-reviews',
    labelKey: 'settings.application.prWatcher.autoLaunchLabel',
    helpKey: 'settings.application.prWatcher.autoLaunchHelp',
  },
  { tab: 'code-reviews', labelKey: 'settings.code.syntax.label', helpKey: 'settings.code.syntax.help' },
  { tab: 'code-reviews', labelKey: 'settings.code.font.label', helpKey: 'settings.code.font.help' },

  // ── Split view ──
  { tab: 'split-view', labelKey: 'settings.application.split.label', helpKey: 'settings.application.split.help' },
  { tab: 'split-view', labelKey: 'settings.split.newAgentPane.label', helpKey: 'settings.split.newAgentPane.help' },

  // ── Quick Launch ──
  {
    tab: 'quick-launch',
    labelKey: 'settings.application.spotlight.label',
    helpKey: 'settings.application.spotlight.help',
  },
  {
    tab: 'quick-launch',
    labelKey: 'settings.application.spotlight.shortcutLabel',
    helpKey: 'settings.application.spotlight.shortcutHelp',
  },
  { tab: 'quick-launch', labelKey: 'settings.quickLaunch.repo.label', helpKey: 'settings.quickLaunch.repo.help' },
  { tab: 'quick-launch', labelKey: 'settings.quickLaunch.mode.label', helpKey: 'settings.quickLaunch.mode.help' },
  {
    tab: 'quick-launch',
    labelKey: 'settings.quickLaunch.background.label',
    helpKey: 'settings.quickLaunch.background.help',
  },

  // ── Quick settings ──
  {
    tab: 'quick-settings',
    labelKey: 'settings.quickSettings.enabled.label',
    helpKey: 'settings.quickSettings.enabled.help',
  },
  {
    tab: 'quick-settings',
    labelKey: 'settings.quickSettings.arrange.section',
    helpKey: 'settings.quickSettings.arrange.description',
  },

  // ── About ──
  { tab: 'about', labelKey: 'settings.about.changelog' },
  { tab: 'about', labelKey: 'settings.about.whatsNew' },
]

/** A catalogue entry once translated — what the matcher reads. */
export interface SettingsSearchItem {
  key: string
  label: string
  help: string
  page: string
}

/**
 * Case and ACCENTS folded, so « reglage » finds « Réglage » and « theme » finds « Thème »:
 * the French catalogue is full of them and nobody types them into a search box.
 */
export function foldForSearch(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

/**
 * The items `query` finds, best first.
 *
 * EVERY WORD MUST APPEAR, anywhere in the name, the help line or the page's name — so
 * « notif agent » narrows to the agent notifications rather than widening to everything
 * that mentions either. Then ranked by WHERE the words were found: a name that starts
 * with the query, then a name holding every word, then the page, then the help line. Ties
 * keep the catalogue's order, which is the rail's.
 */
export function searchSettings<T extends SettingsSearchItem>(items: readonly T[], query: string): T[] {
  const folded = foldForSearch(query.trim())
  const words = folded.split(/\s+/).filter(Boolean)
  if (words.length === 0) return []

  const ranked: { item: T; rank: number; at: number }[] = []
  items.forEach((item, at) => {
    const label = foldForSearch(item.label)
    const page = foldForSearch(item.page)
    const help = foldForSearch(item.help)
    const all = `${label} ${page} ${help}`
    if (!words.every((word) => all.includes(word))) return

    const rank = label.startsWith(folded)
      ? 0
      : words.every((word) => label.includes(word))
        ? 1
        : words.every((word) => `${label} ${page}`.includes(word))
          ? 2
          : 3
    ranked.push({ item, rank, at })
  })

  return ranked.sort((a, b) => a.rank - b.rank || a.at - b.at).map(({ item }) => item)
}
