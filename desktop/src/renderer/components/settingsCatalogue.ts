import type { MessageKey, Translate } from '../i18n'
import { LEVEL_LABEL_KEYS, ROLE_LABEL_KEYS, STYLE_LABEL_KEYS } from '../i18n'
import { LANGUAGES } from '../languages'
import { THEMES, THEME_IDS } from '../theme'
import { CODE_FONT_SIZES, CODE_SYNTAX_FAMILIES, CODE_SYNTAX_FAMILY_IDS, WORKFLOW_CHAIN_LIMITS, type McpServerId } from '../../types'
import { AGENT_TYPE_OPTIONS, LAUNCH_MODE_OPTIONS, SORT_LABEL } from '../pages/Config/AgentsPage'
import { PR_WATCHER_INTERVAL_LABEL } from '../pages/Config/CodeReviewsPage'
import { MCP_SERVER_HINTS, MCP_SERVER_NAMES } from '../pages/Config/McpServersCard'
import { SPOTLIGHT_OPTIONS } from '../pages/Config/QuickLaunchPage'
import { CHORDS } from '../pages/Config/ShortcutsPage'
import { CONFIRM_LABEL, MISSING_LABEL } from '../pages/Config/WorkflowSettingsPage'
import type { SettingsTab } from './SettingsModal'

/** Translates a list of keys — the shape most option tables come in. */
const keys = (list: readonly MessageKey[]) => (t: Translate) => list.map((key) => t(key))

const LAUNCH_MODES = keys(LAUNCH_MODE_OPTIONS.map(({ labelKey }) => labelKey))

/**
 * EVERY SETTING THE SEARCH BOX CAN FIND, as message keys, with the page each one lives on.
 *
 * A LIST AND NOT A CRAWL of the pages. Only the open page is mounted (see `SettingsModal`),
 * and mounting the other sixteen to read their text would be every round trip they make
 * on mount — the org roster, the Jira status, the Claude spend — for a keystroke. So the
 * catalogue is written down, once, here. The price is that a new row has to be added
 * below to be findable — and `settingsCatalogue.test.ts` fails until it is, or until the
 * label is declared as not being a setting there.
 *
 * `labelKey` IS ALSO HOW THE ROW IS FOUND ON ARRIVAL: the modal looks for the element
 * carrying that exact text on the page it opened and outlines the row around it. Which is
 * why it must be the key the page renders as the row's NAME, not a paraphrase of it.
 *
 * `helpKey` is searched and never shown: it is how "dock" finds the menu bar switch,
 * whose name does not say dock but whose help line does.
 *
 * The option tables are the pages' own, imported rather than copied, so a choice added to
 * a select is findable the day it ships. Same for the shortcuts page's chords (`CHORDS`),
 * appended at the end.
 */
export type SettingsSearchEntry = {
  tab: SettingsTab
  helpKey?: MessageKey
  /**
   * WHAT THE SETTING CAN BE SET TO — a select's choices, a picker's tiles — so « dracula »
   * finds the theme and « acceptEdits » the launch mode. A function of the translator
   * because some choices are keys and some are names that are never translated (a
   * syntax family, a language named in itself, a chord).
   */
  options?: (t: Translate) => string[]
} & (
  | { labelKey: MessageKey }
  /**
   * A NAME THAT IS NEVER TRANSLATED, for a row the page labels with one: a service's own
   * name (« GitHub », « Slack ») on the Connections tab. Same contract as `labelKey`: it
   * is the exact text the page renders as the row's name.
   */
  | { label: string }
)

export const SETTINGS_CATALOGUE: readonly SettingsSearchEntry[] = [
  // ── Account ──
  { tab: 'account', labelKey: 'cloud.row.username', helpKey: 'cloud.username.hint' },
  { tab: 'account', labelKey: 'cloud.row.avatar' },
  { tab: 'account', labelKey: 'cloud.row.email' },
  { tab: 'account', labelKey: 'cloud.row.password' },
  { tab: 'account', labelKey: 'cloud.deleteAccount', helpKey: 'cloud.delete.rowHint' },

  // ── Profile ──
  { tab: 'profile', labelKey: 'profile.section', helpKey: 'profile.description' },
  { tab: 'profile', labelKey: 'profile.form.firstName' },
  { tab: 'profile', labelKey: 'profile.form.role', options: keys(Object.values(ROLE_LABEL_KEYS)) },
  { tab: 'profile', labelKey: 'profile.form.level', options: keys(Object.values(LEVEL_LABEL_KEYS)) },
  { tab: 'profile', labelKey: 'profile.form.style', options: keys(Object.values(STYLE_LABEL_KEYS)) },
  { tab: 'profile', labelKey: 'profile.form.languages', options: () => LANGUAGES.map(({ label }) => label) },
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
  { tab: 'connections', labelKey: 'settings.connections.mcp.section' },
  // One per server, from the card's own table: a server added there is findable the day it ships.
  ...(Object.keys(MCP_SERVER_NAMES) as McpServerId[]).map((id) => ({
    tab: 'connections' as const,
    label: MCP_SERVER_NAMES[id],
    helpKey: MCP_SERVER_HINTS[id],
    options: () => (id === 'atlassian' ? ['Jira', 'MCP'] : ['MCP']),
  })),
  { tab: 'connections', labelKey: 'settings.connections.cli.section' },
  { tab: 'connections', label: 'GitHub CLI', helpKey: 'settings.connections.cli.gh.hint', options: () => ['gh'] },

  // ── Security ──
  { tab: 'security', labelKey: 'security.current' },
  { tab: 'security', labelKey: 'security.others' },
  { tab: 'security', labelKey: 'security.revokeAll', helpKey: 'security.revokeAllHint' },

  // ── Appearance ──
  {
    tab: 'appearance',
    labelKey: 'settings.appearance.themeSection',
    options: keys(THEME_IDS.map((id) => THEMES[id].labelKey)),
  },
  {
    tab: 'appearance',
    labelKey: 'settings.appearance.claudeTheme.label',
    helpKey: 'settings.appearance.claudeTheme.help',
  },
  { tab: 'appearance', labelKey: 'settings.appearance.scale', helpKey: 'settings.appearance.scaleHelp' },

  // ── Language ──
  {
    tab: 'language',
    labelKey: 'settings.language.label',
    helpKey: 'settings.language.help',
    options: () => LANGUAGES.map(({ label }) => label),
  },

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
    labelKey: 'settings.application.setup.integrations.title',
    options: keys(['setup.wizard.integrations.both', 'setup.wizard.integrations.githubOnly']),
  },
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
  {
    tab: 'agents',
    labelKey: 'settings.defaultAgentType.title',
    helpKey: 'settings.defaultAgentType.description',
    options: keys(AGENT_TYPE_OPTIONS.map(({ labelKey }) => labelKey)),
  },
  { tab: 'agents', labelKey: 'settings.agents.model.label', helpKey: 'settings.agents.model.help' },
  { tab: 'agents', labelKey: 'settings.launchMode.label', helpKey: 'settings.launchMode.help', options: LAUNCH_MODES },
  {
    tab: 'agents',
    labelKey: 'settings.agents.sort.label',
    helpKey: 'settings.agents.sort.help',
    options: keys(Object.values(SORT_LABEL)),
  },
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

  // ── Workflow ──
  {
    tab: 'workflow',
    labelKey: 'settings.workflow.confirm.label',
    helpKey: 'settings.workflow.confirm.help',
    options: keys(Object.values(CONFIRM_LABEL)),
  },
  {
    tab: 'workflow',
    labelKey: 'settings.workflow.limit.label',
    helpKey: 'settings.workflow.limit.help',
    options: (t) =>
      WORKFLOW_CHAIN_LIMITS.map((count) =>
        count === 0 ? t('settings.workflow.limit.none') : t('settings.workflow.limit.option', { count }),
      ),
  },
  {
    tab: 'workflow',
    labelKey: 'settings.workflow.missing.label',
    helpKey: 'settings.workflow.missing.help',
    options: keys(Object.values(MISSING_LABEL)),
  },
  { tab: 'workflow', labelKey: 'settings.workflow.actions.label', helpKey: 'settings.workflow.actions.help' },

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
    options: keys(Object.values(PR_WATCHER_INTERVAL_LABEL)),
  },
  {
    tab: 'code-reviews',
    labelKey: 'settings.application.prWatcher.autoLaunchLabel',
    helpKey: 'settings.application.prWatcher.autoLaunchHelp',
  },
  {
    tab: 'code-reviews',
    labelKey: 'settings.code.syntax.label',
    helpKey: 'settings.code.syntax.help',
    options: () => CODE_SYNTAX_FAMILY_IDS.map((id) => CODE_SYNTAX_FAMILIES[id].label),
  },
  {
    tab: 'code-reviews',
    labelKey: 'settings.code.font.label',
    helpKey: 'settings.code.font.help',
    options: (t) => CODE_FONT_SIZES.map((size) => t('settings.code.font.option', { size })),
  },

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
    // The keys as drawn (« ⌥ Space ») and as spelt (« Alt+Space »): nobody types a ⌥.
    options: () => SPOTLIGHT_OPTIONS.flatMap(({ keys, value }) => [keys.join(' '), value]),
  },
  {
    tab: 'quick-launch',
    labelKey: 'settings.quickLaunch.repo.label',
    helpKey: 'settings.quickLaunch.repo.help',
    options: keys(['settings.quickLaunch.repo.first', 'settings.quickLaunch.repo.match']),
  },
  {
    tab: 'quick-launch',
    labelKey: 'settings.quickLaunch.mode.label',
    helpKey: 'settings.quickLaunch.mode.help',
    options: LAUNCH_MODES,
  },
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

  // ── Shortcuts ── the page's own list.
  ...CHORDS.map(([labelKey, helpKey]) => ({ tab: 'shortcuts' as const, labelKey, helpKey })),
  { tab: 'shortcuts', labelKey: 'settings.shortcuts.quickLaunch', helpKey: 'settings.shortcuts.help.quickLaunch' },
]

