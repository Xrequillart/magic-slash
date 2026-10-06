/**
 * The message catalogue, English. This is the REFERENCE: every other language is
 * typed as `Record<keyof typeof en, string>`, so a missing key is a `tsc` error
 * rather than a string that silently falls back at runtime.
 *
 * Deliberately exported WITHOUT a type annotation. Annotating it
 * `Record<string, string>` would widen `keyof typeof en` to `string` and void
 * that guarantee entirely.
 *
 * Keys are dotted and grouped by where the string is shown, not by what it says
 * — `menu.*`, `tray.*`, `notification.*`, `dialog.*`, `settings.*`. Placeholders
 * are `{name}`; see t() for the interpolation, which is intentionally minimal.
 */
export const en = {
  // ── Application menu ─────────────────────────────────────────────────────
  'menu.file': 'File',
  'menu.edit': 'Edit',
  'menu.view': 'View',
  'menu.window': 'Window',
  'menu.actualSize': 'Actual Size',
  'menu.zoomIn': 'Zoom In',
  'menu.zoomOut': 'Zoom Out',
  'menu.newAgent': 'New Session',
  'menu.tasks': 'Tasks',
  'menu.skills': 'Skills',
  'menu.plans': 'Plans',
  'menu.account': 'Account',
  'menu.checkUpdates': 'Check for Updates…',
  'menu.closeWindow': 'Close Window',
  'menu.quitApp': 'Quit Magic Slash',

  // ── Menu bar panel ───────────────────────────────────────────────────────
  // The tray opens the app's own window (renderer/pages/TrayPopover), not a
  // native menu — the entries that menu had and this one does not (Changelog,
  // Documentation, GitHub) took their strings with them.
  'tray.showWindow': 'Show Window',
  'tray.update.checking': 'Checking for updates…',
  'tray.update.downloadingVersion': 'Downloading v{version}…',
  'tray.update.downloadingProgress': 'Downloading update… {percent}%',
  'tray.update.restart': '↻ Restart to update (v{version})',
  'tray.update.checkFailed': 'Check for Updates (last check failed)',
  'tray.update.check': 'Check for Updates',
  'tray.update.checkVersion': 'Check for Updates (v{version})',

  // ── OS notifications ─────────────────────────────────────────────────────
  // Every one of these is read on a locked phone or a glanced-at corner of the
  // screen, by somebody who is not thinking about the app: the title says what
  // happened, the body says which piece of work it happened to. Nothing here may
  // interpolate a URL or a raw enum value — see notifications/pr-review-message.ts
  // for how a review status becomes one of the sentences below.
  'notification.waiting.title': 'A session is waiting for you',
  'notification.waiting.body': '{subject} needs your answer to continue',
  'notification.completed.title': 'A session has finished',
  'notification.completed.body': '{subject} finished its task',
  /**
   * How an agent is named in the two bodies above — see notifications/agent-message.ts.
   * The quotes live in the catalogue because they are not the same character in
   * every language, and `subject.namedWithRepo` exists because the name an agent is
   * created with is a generated counter ("Claude 3") that says nothing on its own.
   */
  'notification.agent.subject.named': '"{name}"',
  'notification.agent.subject.namedWithRepo': '"{name}" ({repo})',
  'notification.agent.subject.unknown': 'A session',
  'notification.prReview.approved.title': 'Pull request approved',
  'notification.prReview.approved.body': '{subject} was approved',
  'notification.prReview.approved.bodyNamed': '{subject} was approved by {reviewer}',
  'notification.prReview.changesRequested.title': 'Changes requested',
  'notification.prReview.changesRequested.body': 'A reviewer requested changes on {subject}',
  'notification.prReview.changesRequested.bodyNamed': '{reviewer} requested changes on {subject}',
  'notification.prReview.commented.title': 'New review comment',
  'notification.prReview.commented.body': 'A new comment was left on {subject}',
  'notification.prReview.commented.bodyNamed': '{reviewer} commented on {subject}',
  'notification.prReview.pending.title': 'Review pending',
  'notification.prReview.pending.body': '{subject} is waiting for a review',
  /** How a pull request is named inside the sentences above: "MAGIC-202 (PR #204)". */
  'notification.prReview.subject.withPr': '{label} (PR #{number})',
  'notification.prReview.subject.prOnly': 'PR #{number}',
  'notification.prReview.subject.unknown': 'your pull request',
  'notification.pickup.title': 'A colleague picked up {ticket}',
  'notification.pickup.body': 'A teammate is now working on {ticket} — you have a session on it too',

  // ── Daily team digest ────────────────────────────────────────────────────
  // The clauses are whole sentences fragments rather than "{count} PR(s)": the
  // plural break and the word order differ per language, and French agreement
  // cannot be assembled from a suffix.
  'digest.title': 'Your team yesterday',
  'digest.sentence': 'Yesterday your team {parts}.',
  'digest.prs.one': 'shipped 1 PR',
  'digest.prs.other': 'shipped {count} PRs',
  'digest.tickets.one': 'moved 1 ticket to Done',
  'digest.tickets.other': 'moved {count} tickets to Done',
  'digest.sessions.one': 'ran 1 session',
  'digest.sessions.other': 'ran {count} sessions',
  /** Separator between all but the last two clauses of an enumeration. */
  'digest.list.separator': ', ',
  /** Separator before the last clause — " and " in English, " et " in French. */
  'digest.list.last': ' and ',

  // ── Native dialogs ───────────────────────────────────────────────────────
  'dialog.selectRepository': 'Select a repository folder',
  'dialog.selectSkillFolder': 'Select a skill folder',
  'dialog.selectImage': 'Select an image',
  'dialog.filter.zip': 'ZIP Archive',
  'dialog.filter.images': 'Images',

  // ── Settings → Language & Region ─────────────────────────────────────────
  'settings.search.placeholder': 'Search settings',
  'settings.search.clear': 'Clear the search',
  'settings.search.empty': 'No setting matches this search.',
  'settings.tab.account': 'Account',
  'settings.tab.connections': 'Connections',
  'settings.tab.organization': 'Organization',
  'settings.tab.repositories': 'Repositories',
  'settings.tab.claudeCode': 'Claude Code',
  'settings.tab.notifications': 'Notifications',
  'settings.tab.security': 'Security & Access',
  'settings.tab.appearance': 'Appearance',
  'settings.tab.language': 'Language & Region',
  'settings.tab.application': 'Application',
  'settings.tab.quickSettings': 'Quick settings',
  'settings.tab.quickLaunch': 'Quick Launch',
  'settings.tab.splitView': 'Split view',
  'settings.tab.profile': 'Profile',
  'settings.tab.agents': 'Sessions',
  'settings.tab.workflow': 'Workflow',
  'settings.tab.codeReviews': 'Code & reviews',
  'settings.tab.shortcuts': 'Shortcuts',
  'settings.tab.about': 'About',
  'settings.group.personal': 'Personal',
  'settings.group.notifications': 'Notifications',
  'settings.group.features': 'Features',
  'settings.group.about': 'About',
  'settings.language.section': 'Language & Region',
  'settings.language.label': 'Interface language',
  'settings.language.help':
    'The language of the app itself — menus, settings, notifications, and how dates and numbers are written.',
  'settings.language.distinction':
    'It is not what Claude writes in: commit messages, pull requests and Jira comments follow each repository’s own language settings, and your profile’s languages decide how Claude talks to you.',
  'settings.language.followsAccount': 'The language follows your account — every machine you sign in on uses it.',
  'settings.language.error': 'Failed to change language',

  // ── Title bar (terminal chrome) ──────────────────────────────────────────
  'titlebar.normalView': 'Normal',
  'titlebar.splitView': 'Split view',
  'titlebar.toggleAgentsList': 'Toggle sessions list (⌘B)',
  'titlebar.normalViewTitle': 'Normal view (⌘/)',
  'titlebar.splitViewTitle': 'Split view (⌘/)',
  'titlebar.info': 'Info',
  /** The title bar's sliders button, and the sheet it pulls down. */
  'titlebar.quickSettings': 'Quick settings',
  /** The title bar's account label, past the sliders, and the sheet it pulls down. */
  'titlebar.account': 'Account',

  // ── Account menu (the dropdown under the title bar's account label) ──────
  'accountMenu.title': 'Account',
  'accountMenu.settings': 'Settings',
  'accountMenu.checking': 'Checking…',
  'accountMenu.upToDate': 'Magic Slash is up to date.',
  'accountMenu.checkUpdates': 'Check for updates',
  'accountMenu.checkUpdatesFailed': 'Could not check for updates.',
  'accountMenu.signOutFailed': 'Could not sign out.',

  // ── Account sheet (the title bar's other sheet) ──────────────────────────
  // Cards rather than tiles: every line is a fact, and a fact needs a sentence.
  // A count per grammatical form, never a suffix rule — see t() on why.

  // ── Quick settings (the sheet under the title bar) ───────────────────────
  'controlCenter.title': 'Quick settings',
  'controlCenter.features': 'Features',
  // Two words at most under a 40px circle: these are captions, not sentences.
  'controlCenter.splitView': 'Split view',
  'controlCenter.quickLaunch': 'Quick Launch',
  'controlCenter.launchAtLogin': 'Start at login',
  'controlCenter.prWatcher': 'PR watcher',
  'controlCenter.theme': 'Theme',
  'controlCenter.about': 'About',
  'controlCenter.allSettings': 'All settings',
  'controlCenter.saveFailed': 'Failed to save that setting.',
  /** The title bar's standing notice while notifications are off; pressing it opens the sheet. */
  'controlCenter.notificationsOff': 'Notifications off',
  // The machine's setup, in two words: a 3-point card has no room for the page's sentences.

  // ── Left sidebar ─────────────────────────────────────────────────────────
  'sidebar.newAgent': 'New session',
  // The same action as a compact chip on the AGENTS header, where there is no room
  // for the visible shortcut hint the full-width entries carry — so the shortcut
  // moves into the tooltip and the accessible name.
  'sidebar.newAgentShortcut': 'New session ({shortcut})',
  'sidebar.skills': 'Skills',
  'sidebar.tasks': 'Tasks',
  /** Names the menu landmark — the sidebar has two, this one and the agent list. */
  'sidebar.menu.aria': 'Pages',
  'sidebar.plans': 'Plans',
  'sidebar.settings': 'Settings',
  'sidebar.login': 'Login / Sign up',
  'sidebar.accountFallback': 'Account',
  'sidebar.agents': 'Sessions',
  // The sort control on the AGENTS header. Icon only, so the current mode is named in
  // the tooltip and the accessible name — and each option carries the one line that
  // says what it costs, since two of the three let the list move under the cursor.
  'sidebar.sort.title': 'Sort sessions: {mode}',
  'sidebar.sort.group': 'Sort by',
  'sidebar.sort.recent': 'Newest first',
  'sidebar.sort.status': 'By status',
  'sidebar.sort.repository': 'By repository',
  // The header of the last group in `repository` mode: the agents whose working
  // directory matches no configured repository. Decoration, never selectable.
  'sidebar.group.noRepository': 'No repository',
  // A count above the list, not a group header: the agents it counts keep their row.
  'sidebar.needsAttention': 'Needs attention',
  'sidebar.paneLeft': 'Left',
  'sidebar.paneRight': 'Right',
  'sidebar.empty': 'No sessions yet. Click “New session” to start.',
  'sidebar.dropAgents': 'Drop sessions here',

  // ── Claude plan usage gauges ─────────────────────────────────────────────
  // The reset countdown is split per unit rather than assembled from a suffix:
  // French writes "2 h 14" and "3 j", with the space, and "1m" is not "1 min".
  'usage.reset.soon': 'soon',
  'usage.reset.days': '{count}d',
  'usage.reset.hours': '{hours}h{minutes}',
  'usage.reset.minutes': '{count}m',
  'usage.resetsIn': 'resets in {time}',
  'usage.session': 'Session (5h)',
  'usage.weekly': 'Weekly (7d)',
  'usage.sessionShort': 'session',
  'usage.weeklyShort': 'weekly',
  'usage.claudeAccount': 'Claude account',
  'usage.noData': 'No usage data',
  'usage.noDataHint': 'No usage data yet — Claude.ai Pro/Max after the first session activity.',
  'usage.expand': 'Expand',
  'usage.minimize': 'Minimize',
  // Compact token magnitudes. Suffixes, not words — but French abbreviates a
  // billion "Md", so they cannot be hard-coded next to the number.
  'usage.unit.billion': 'B',
  'usage.unit.million': 'M',
  'usage.unit.thousand': 'k',

  // ── Shared UI verbs ──────────────────────────────────────────────────────
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.saving': 'Saving…',
  'common.close': 'Close',
  'common.stop': 'Stop',
  'common.loading': 'Loading…',
  'common.remove': 'Remove',
  'common.add': 'Add',
  'common.edit': 'Edit',
  'common.retry': 'Retry',
  'common.back': 'Back',
  'common.next': 'Next',
  'common.skip': 'Skip',
  'common.done': 'Done',
  'common.copy': 'Copy',
  'common.copied': 'Copied',

  // ── Settings → tab rail footer ───────────────────────────────────────────
  'settings.footer.signOut': 'Sign out',

  // ── Settings → Repositories ──────────────────────────────────────────────
  'settings.repos.add': 'Add repository',
  'settings.repos.adding': 'Adding…',
  'settings.repos.emptyTitle': 'No repositories configured',
  'settings.repos.emptyHint': 'Click to add your first project',
  'settings.repos.personal': 'Personal',
  'settings.repos.noPersonal': 'No personal repository — use “Add repository” above.',
  'settings.repos.noTeam': 'No shared repository in this organization yet.',
  // A repository points at an organization the account's list does not hold: the
  // membership is gone, or the list has not come back. The row still gets a heading.
  'settings.repos.otherOrg': 'Other organization',
  'settings.repos.connected': 'Connected',
  'settings.repos.noRemote': 'No remote',
  'settings.repos.noLocalFolder': 'No local folder — click to set it',
  'settings.repos.agents.one': '{count} session',
  'settings.repos.agents.other': '{count} sessions',

  // ── Settings → Claude Code ───────────────────────────────────────────────
  'settings.claude.account': 'Account',
  'settings.claude.name': 'Name',
  'settings.claude.email': 'Email',
  'settings.claude.organization': 'Organization',
  'settings.claude.plan': 'Plan',
  'settings.claude.noAccount': 'No Claude account detected.',

  'settings.launchMode.section': 'Launch mode',
  'settings.launchMode.label': 'Permission mode',
  'settings.launchMode.help': 'Controls the level of autonomy for all Claude Code sessions',
  'settings.launchMode.plan': 'Plan',
  'settings.launchMode.plan.help': 'Read-only — Claude explores and analyzes but never modifies anything',
  'settings.launchMode.default': 'Standard',
  'settings.launchMode.default.help': 'Claude asks permission for every sensitive action',
  'settings.launchMode.acceptEdits': 'Accept Edits',
  'settings.launchMode.acceptEdits.help': 'Auto-accepts file edits, still asks for bash commands',
  'settings.launchMode.auto': 'Auto',
  'settings.launchMode.auto.help': 'Auto-approves most actions based on configured allowlists',
  'settings.launchMode.bypass': 'Bypass',
  'settings.launchMode.bypass.help': 'No permission checks — for sandboxed environments only',
  'settings.launchMode.bypassWarning':
    'Security warning: Bypass mode disables all permission checks. Only use in sandboxed environments with no internet access.',
  'settings.launchMode.bypassConfirm': 'I understand, enable Bypass',

  'settings.claude.usageCard.section': 'Usage card',
  'settings.rate.section': 'Rate usage',
  'settings.rate.empty':
    'No live rate-limit data yet — available for Claude.ai Pro/Max after the first session activity.',

  'settings.spend.section': 'Spend & tokens',
  'settings.spend.tokens': 'Tokens',
  'settings.spend.estCost': 'Est. cost',
  'settings.spend.today': 'Today',
  'settings.spend.week': 'This week',
  'settings.spend.allTime': 'All time',
  'settings.spend.disclaimer':
    'Cost is an estimate (tokens × public API pricing), not billed spend — your plan is a subscription.',
  'settings.spend.empty': 'No usage history found in ~/.claude yet.',

  // ── Settings → Application ───────────────────────────────────────────────
  'settings.application.usageLogs.section': 'Activity recording',
  'settings.application.usageLogs.label': 'Share my activity with my team',
  'settings.application.usageLogs.help':
    'On by default, and yours to turn off at any time. What you do with your sessions is sent to Magic Slash Cloud so your team’s dashboard reflects your work. Turning it off stops new records; what was already sent is kept.',
  'settings.application.usageLogs.collected': 'Collected',
  'settings.application.usageLogs.excluded': 'Never collected',
  'settings.application.usageLogs.collected.activity': 'Session activity: tickets, commits, PRs, reviews',
  'settings.application.usageLogs.collected.skills':
    'The skills you run (/magic:start, /magic:pr, …), how long each run takes and how it ended',
  'settings.application.usageLogs.collected.session':
    'End-of-session summary: estimated cost, lines added/removed, duration, model',
  'settings.application.usageLogs.collected.context': 'Ticket id and title, and the repositories you work in',
  'settings.application.usageLogs.excluded.prompts': 'Your prompts and Claude’s answers',
  'settings.application.usageLogs.excluded.code': 'Your code, your diffs, your file contents',
  'settings.application.usageLogs.excluded.terminal': 'Terminal output and command history',
  'settings.application.usageLogs.excluded.secrets': 'Your tokens, keys and credentials',
  'settings.application.usageLogs.excluded.args': 'What you type after a skill’s name',
  'settings.application.usageLogs.excluded.otherSkills': 'Any skill whose name does not start with “magic-”',
  'settings.application.usageLogs.footnote':
    'Every member of your organization can see these figures per person on the Team page.',
  'settings.application.usageLogs.footnote.agents':
    'Whatever this setting says, your sessions (name, branch, ticket, repositories) sync to your team — that is what powers the live view.',
  'settings.application.sidebar.section': 'Sidebar',
  'settings.application.sidebar.label': 'App sidebar',
  'settings.application.sidebar.help': 'Choose which pages the sidebar shows, and in what order.',
  'settings.application.sidebar.customize': 'Customize',
  'settings.application.sidebar.modalTitle': 'Customize sidebar',
  'settings.application.sidebar.show': 'Always show',
  'settings.application.sidebar.hide': 'Don’t show',
  'settings.application.sidebar.move': 'Move {page}',
  'settings.application.sidebar.visibility': '{page} visibility',
  'settings.application.sidebar.footnote': 'Drag a page to move it, or focus its handle and use the arrow keys. A hidden page keeps its keyboard shortcut.',
  'settings.application.sidebar.compact.label': 'Icons only',
  'settings.application.sidebar.compact.help': 'A narrow sidebar: pages as their icons, each session as its status, and a robot for a session with nothing to report. Names show on hover.',
  'settings.application.planSync.section': 'Plan sessions',
  'settings.application.planSync.label': 'Save my plan sessions to the cloud',
  'settings.application.planSync.help':
    'On by default, and yours to turn off at any time. When you run /magic:plan, the spec it writes and the tickets it creates are saved to Magic Slash Cloud so you and your team can read them back from anywhere.',
  'settings.application.planSync.footnote':
    'Turning it off changes nothing on your machine: the spec file is still written in the repository, and the app still follows it live.',
  'settings.application.planSync.error': 'Failed to save that setting.',
  'settings.split.newAgentPane.label': 'New sessions open in',
  'settings.split.newAgentPane.help': 'Which pane a session created with ⌘N, the + button or the File menu lands in.',
  'settings.split.newAgentPane.focused': 'The active pane',
  'settings.split.newAgentPane.focused.help': 'The pane you are working in, the one with the keyboard.',
  'settings.split.newAgentPane.left': 'Always left',
  'settings.split.newAgentPane.left.help': 'New work always starts on the left, whichever pane is active.',
  'settings.split.newAgentPane.right': 'Always right',
  'settings.split.newAgentPane.right.help': 'New work always starts on the right, whichever pane is active.',
  'settings.application.split.section': 'Split View',
  'settings.application.split.label': 'Enable split view',
  'settings.application.split.help': 'Display two sessions side by side on wide screens',
  // The section is about what a NEW agent looks like; the switch itself is only a
  // fallback, since each agent remembers its own panel from the moment it is toggled.
  'settings.application.agentDefaults.section': 'New sessions',
  'settings.displayMode.label': 'Show a new session as',
  'settings.displayMode.help': 'Each session then keeps the view you switch it to, from the button in the title bar',
  'settings.displayMode.terminal': 'Terminal',
  'settings.displayMode.chat': 'Chat',
  'settings.chat.stickyPrompt.label': 'Keep the prompt in sight in the chat',
  'settings.chat.stickyPrompt.help': 'While you scroll, the prompt behind what you are reading stays pinned at the top',
  'settings.application.infoSidebar.label': 'Open the info panel on a new session',
  'settings.application.infoSidebar.help':
    'Each session then remembers whether you left its panel open or closed',
  'settings.application.prWatcher.section': 'PR Review Watcher',
  'settings.application.prWatcher.label': 'Watch PR reviews',
  'settings.application.prWatcher.help': 'Poll GitHub to track review status on sessions’ pull requests',
  'settings.application.prWatcher.intervalLabel': 'Polling interval',
  'settings.application.prWatcher.intervalHelp': 'How often the GitHub API is polled',
  'settings.application.prWatcher.interval30s': '30 seconds',
  'settings.application.prWatcher.interval1m': '1 minute',
  'settings.application.prWatcher.interval2m': '2 minutes',
  'settings.application.prWatcher.interval5m': '5 minutes',
  'settings.application.prWatcher.autoLaunchLabel': 'Auto-launch skills',
  'settings.application.prWatcher.autoLaunchHelp':
    'Send /magic:resolve or /magic:done directly to the session’s terminal. Disabled by default for safety.',
  // ── Settings → Quick settings ────────────────────────────────────────────
  'settings.quickSettings.section': 'Quick settings',
  'settings.quickSettings.enabled.label': 'Show the quick settings',
  'settings.quickSettings.enabled.help': 'The sliders button in the title bar, and ⌘, to pull the sheet down. Off, ⌘, opens this page instead.',
  'settings.quickSettings.arrange.section': 'Switches',
  'settings.quickSettings.arrange.description': 'Drag a switch to move it, drag it down to take it off the sheet, or drag one from below onto the sheet to add it. Pressing a switch below adds it at the end, and the × on a switch removes it.',
  'settings.quickSettings.arrange.menu': 'On the sheet',
  'settings.quickSettings.arrange.menuEmpty': 'Drag switches here',
  'settings.quickSettings.arrange.available': 'Available',
  'settings.quickSettings.arrange.availableEmpty': 'Every switch is on the sheet.',
  'settings.quickSettings.arrange.remove': 'Remove {name}',

  'settings.quickLaunch.launch.section': 'Launch',
  'settings.quickLaunch.repo.label': 'Repository',
  'settings.quickLaunch.repo.help': 'Where the session started from Quick Launch works.',
  'settings.quickLaunch.repo.first': 'First repository',
  'settings.quickLaunch.repo.first.help': 'The first repository in your list, whatever the prompt says.',
  'settings.quickLaunch.repo.match': 'Detect from the prompt',
  'settings.quickLaunch.repo.match.help': 'The repository whose name or keywords the prompt mentions. The first one when it mentions none.',
  'settings.quickLaunch.mode.label': 'Launch mode',
  'settings.quickLaunch.mode.help': 'The permission mode a session started from Quick Launch runs in.',
  'settings.quickLaunch.mode.inherit': 'Same as Sessions ({mode})',
  'settings.quickLaunch.mode.inherit.help': 'The launch mode set on the Sessions page, like any other new session.',
  'settings.quickLaunch.background.label': 'Stay in the background',
  'settings.quickLaunch.background.help': 'Start the session without bringing Magic Slash forward. You stay where you were, and a notification says when the session needs you.',
  'settings.application.spotlight.section': 'Spotlight',
  'settings.application.spotlight.label': 'Enable global shortcut',
  'settings.application.spotlight.help': 'Open the Quick Launch panel from anywhere with a keyboard shortcut',
  'settings.application.spotlight.shortcutLabel': 'Shortcut',
  'settings.application.spotlight.shortcutHelp': 'Choose the keyboard shortcut to toggle Quick Launch',
  'settings.application.spotlight.error':
    'Failed to register shortcut. It may be in use by another application. Try a different shortcut.',
  'settings.application.background.section': 'Background App',
  'settings.application.background.autoStartLabel': 'Launch at login',
  'settings.application.background.autoStartHelp': 'Start Magic Slash automatically when you log in',
  'settings.application.background.menuBarLabel': 'Menu bar',
  'settings.application.background.menuBarHelp':
    'Magic Slash runs in the menu bar. Click the tray icon to see session status, or right-click for quick actions. Closing the window hides it to the tray.',

  // ── Settings → Shortcuts ─────────────────────────────────────────────────
  'settings.shortcuts.section': 'Keyboard Shortcuts',
  'settings.shortcuts.duplicateAgent': 'Duplicate session',
  'settings.shortcuts.closeAgent': 'Archive session',
  'settings.shortcuts.previousAgent': 'Previous session',
  'settings.shortcuts.nextAgent': 'Next session',
  'settings.shortcuts.toggleAgentInfo': 'Toggle session info',
  'settings.shortcuts.toggleAgentsList': 'Toggle sessions list',
  'settings.shortcuts.toggleSplit': 'Toggle Split View',
  'settings.shortcuts.quickLaunch': 'Quick Launch',
  'settings.shortcuts.toggleView': 'Switch chat / terminal',
  'settings.shortcuts.settings': 'Settings',
  'settings.shortcuts.newSession': 'New Claude Code session',
  'settings.shortcuts.help.toggleView': 'Switches the selected session between the chat view and the terminal view.',
  'settings.shortcuts.help.settings': 'Opens the settings window on your account, or closes it.',
  'settings.shortcuts.help.newSession': 'In the chat view, press Ctrl+C twice to start a new Claude Code session in the selected session, as in the terminal.',
  'settings.shortcuts.help.newAgent': 'Starts a new session in the focused pane.',
  'settings.shortcuts.help.duplicateAgent': 'Starts a copy of the selected session, on the same repository and branch.',
  'settings.shortcuts.help.closeAgent': 'Archives the selected session, after asking you to confirm.',
  'settings.shortcuts.help.previousAgent': 'Selects the session above in the list.',
  'settings.shortcuts.help.nextAgent': 'Selects the session below in the list.',
  'settings.shortcuts.help.toggleAgentInfo': 'Shows or hides the panel on the right of the selected session.',
  'settings.shortcuts.help.toggleAgentsList': 'Shows or hides the list of sessions on the left.',
  'settings.shortcuts.help.toggleSplit': 'Splits the window in two panes, or brings it back to one.',
  'settings.shortcuts.help.skills': 'Opens the skills page.',
  'settings.shortcuts.help.tasks': 'Opens your Jira and GitHub tasks.',
  'settings.shortcuts.help.plans': 'Opens the plans page.',
  'settings.shortcuts.help.repositories': 'Opens the repositories window.',
  'settings.shortcuts.help.controlCenter': 'Pulls down the quick settings sheet.',
  'settings.shortcuts.help.quickLaunch': 'Opens the Quick Launch panel from anywhere on the Mac. The chord is set on the Quick Launch page.',
  'settings.shortcuts.disabled': 'Disabled',

  // ── Settings → About ─────────────────────────────────────────────────────
  'settings.about.section': 'About',
  'settings.about.changelog': 'Changelog',
  'settings.about.whatsNew': 'What’s New',

  // ── Settings → About → Usage recording health ────────────────────────────
  'settings.about.telemetry.title': 'Usage recording',
  'settings.about.telemetry.healthy': 'Your runs are being recorded.',
  'settings.about.telemetry.off': 'Recording is turned off, so nothing is counted. Turn it back on under Application.',
  'settings.about.telemetry.degraded': 'Runs are not being recorded:',
  'settings.about.telemetry.issue.hook-missing':
    'The Claude Code hook is missing. Magic Slash could not write to ~/.claude/settings.json — check that the file is writable, then restart the app.',
  'settings.about.telemetry.issue.jq-missing':
    '`jq` is not installed. The hook needs it to read what Claude Code sends, and fails without a word. Install it with `brew install jq`.',
  'settings.about.telemetry.issue.signed-out': 'You are signed out, so there is nowhere to record to.',
  'settings.about.telemetry.issue.queue-overflowed':
    'The retry queue filled up and the oldest events were discarded. Those runs are gone for good.',
  'settings.about.telemetry.pending': '{count} event(s) waiting to be sent. They will go out on their own.',

  // ── First-run setup wizard ───────────────────────────────────────────────
  'setup.wizard.title': 'Set up Magic Slash',
  'setup.wizard.checking': 'Checking your machine…',
  'setup.wizard.applying': 'Applying…',
  'setup.wizard.finish': 'Start using Magic Slash',
  'setup.wizard.integrations.question': 'Where do your tickets live?',
  'setup.wizard.integrations.help': 'This decides which tools the skills are allowed to use.',
  'setup.wizard.integrations.both': 'Jira and GitHub',
  'setup.wizard.integrations.bothHelp': 'Jira tickets, Confluence pages, pull requests, issues and reviews.',
  'setup.wizard.integrations.githubOnly': 'GitHub only',
  'setup.wizard.integrations.githubOnlyHelp': 'Issues, pull requests and reviews. No Jira access is requested.',
  'setup.wizard.integrations.changeable': 'You can change this later in Settings.',
  'setup.wizard.done.skills': 'The nine /magic: skills are installed',
  'setup.wizard.done.mcp': 'Jira and GitHub access is configured',
  'setup.wizard.done.permissions': 'Permissions and hooks are configured',
  'setup.wizard.allSet': 'Nothing else to do — sign in to Jira and GitHub happens in your browser the first time a skill needs it.',
  'setup.wizard.prerequisites.title': 'Tools to install',
  'setup.wizard.prerequisites.blocked': 'The skills cannot run until the tools marked in red are installed.',
  'setup.wizard.prerequisite.required': '— required',
  'setup.wizard.prerequisite.optional': '— optional',
  'setup.wizard.prerequisite.outdated': '— v{version}, needs v{min}+',

  // ── Settings → Application → Machine setup ───────────────────────────────
  'settings.application.setup.title': 'Machine setup',
  'settings.application.setup.healthy': 'Everything the skills need is in place.',
  'settings.application.setup.degraded': 'Some things need your attention:',
  'settings.application.setup.recheck': 'Check again',
  'settings.application.setup.checking': 'Checking Claude Code, the MCP servers and the skills…',
  'settings.application.setup.checkFailed':
    'This machine’s setup could not be read. Use “Check again” to retry.',
  'settings.application.setup.install': 'Install',
  'settings.application.setup.installing': 'Installing…',
  'settings.application.setup.getIt': 'Get it',
  'settings.application.setup.prerequisite.missing': '`{name}` is not installed. The skills cannot run without it.',
  'settings.application.setup.prerequisite.outdated': '`{name}` is v{version}, but v{min} or later is required.',
  'settings.application.setup.mcp.missing': 'The {name} MCP server is not configured, so those tools are unavailable.',
  'settings.application.setup.mcp.legacy':
    'The {name} MCP server is configured differently than this version expects. Migrating switches it to browser sign-in, with no token to store.',
  'settings.application.setup.mcp.configure': 'Configure',
  'settings.application.setup.mcp.migrate': 'Migrate',
  // ── Settings → Connections → optional MCP servers ───────────────────────
  'settings.connections.cli.section': 'CLI',
  'settings.connections.cli.check': 'Check',
  'settings.connections.cli.gh.hint': 'The GitHub MCP server signs in with your gh account: without it, the skills cannot reach GitHub.',
  'settings.connections.cli.state.unchecked': 'Not checked',
  'settings.connections.cli.state.connected': 'Connected',
  'settings.connections.cli.state.loggedOut': 'Not signed in',
  'settings.connections.cli.state.missing': 'Not installed',
  'settings.connections.cli.gh.note.connectedAs': 'Signed in as {account}, gh {version}.',
  'settings.connections.cli.gh.note.connected': 'Signed in to github.com, gh {version}.',
  'settings.connections.cli.gh.note.loggedOut': 'gh is installed but not signed in: run `gh auth login` in a terminal, then check again.',
  'settings.connections.cli.gh.note.missing': 'gh was not found: install it with `brew install gh`, then run `gh auth login`.',
  'settings.connections.mcp.section': 'MCP servers',
  'settings.connections.mcp.check': 'Check',
  'settings.connections.mcp.checkFailed': 'The servers could not be checked: is Claude Code installed?',
  'settings.connections.mcp.checkedAt': 'Last checked at {time}. Checking asks every MCP server you have, so it takes a few seconds.',
  'settings.connections.mcp.claudeMissing': 'Claude Code is not installed, so no MCP server can be added.',
  'settings.connections.mcp.remove': 'Remove',
  'settings.connections.mcp.reinstall': 'Reinstall',
  'settings.connections.mcp.atlassian.hint': 'Required by the skills to read and update your Jira tickets.',
  'settings.connections.mcp.github.hint': 'Required by the skills to open pull requests, read reviews and reply to them.',
  'settings.connections.mcp.slack.hint': 'Used by workflow actions that post on Slack, such as a message once a PR is created.',
  'settings.connections.mcp.state.connectedClaudeAi': 'Connected via claude.ai',
  'settings.connections.mcp.state.connected': 'Connected',
  'settings.connections.mcp.state.needsAuth': 'Sign-in needed',
  'settings.connections.mcp.state.failed': 'Unreachable',
  'settings.connections.mcp.state.installed': 'Installed',
  'settings.connections.mcp.state.legacy': 'Configured differently',
  'settings.connections.mcp.state.missing': 'Not installed',
  'settings.connections.mcp.note.needsAuth': 'Sign in from Claude Code: run /mcp in a session, pick the server and follow the browser.',
  'settings.connections.mcp.note.needsAuthClaudeAi': 'Your claude.ai account has this connector but it is not signed in: connect it in claude.ai settings, or install the server here.',
  'settings.connections.mcp.note.failed': 'The server did not answer: {detail}',
  'settings.connections.mcp.note.claudeAi': 'Your claude.ai account’s connector is available in every Claude Code session: nothing to install.',
  'settings.connections.mcp.note.unchecked': 'Installed on this machine. Press Check to see whether it is signed in.',
  'settings.application.setup.skills.missing': 'Missing skills: {names}.',
  'settings.application.setup.skills.reinstall': 'Reinstall',
  'settings.application.setup.integrations.title': 'Integrations',
  'settings.application.setup.integrations.confirmOff': 'Turn Jira off',
  'settings.application.setup.integrations.offWarning':
    'This unregisters the Jira server and withdraws its permissions. Turning it back on takes one click.',

  // ── Toasts ───────────────────────────────────────────────────────────────
  'toast.launchModeUpdated': 'Launch mode updated',
  'toast.releaseNotesFailed': 'Could not load release notes',
  'toast.invalidFolderName': 'Invalid folder name',
  'toast.repoExists': 'Repository “{name}” already exists',
  'toast.repoAdded': 'Repository “{name}” added',
  'toast.repoAddedWarning': 'Repository “{name}” added ({warning})',
  'toast.repoAddFailed': 'Failed to add repository',
  'toast.pathUpdated': 'Path updated',
  'toast.remoteUrlUpdated': 'Clone address updated',
  'toast.remoteUrlUpdateFailed': 'Failed to update the clone address',
  'toast.pathUpdateFailed': 'Failed to update path',
  'toast.keywordsUpdated': 'Keywords updated',
  'toast.keywordsUpdateFailed': 'Failed to update keywords',
  'toast.repoShared': 'Repository shared with the organization',
  'toast.repoShareFailed': 'Failed to share repository',
  'toast.repoNowPersonal': 'Repository is now personal',
  'toast.repoUpdateFailed': 'Failed to update repository',
  'toast.localFolderSet': 'Local folder set',
  'toast.localFolderFailed': 'Failed to set local folder',
  'toast.languageUpdated': 'Language updated',
  'toast.languageUpdateFailed': 'Failed to update language',
  'toast.settingUpdated': 'Setting updated',
  'toast.settingUpdateFailed': 'Failed to update setting',
  // A write that was applied field by field and refused some of them: the names
  // come from the config writer, so the sentence has to hold a list.
  'toast.settingRejected': 'Some settings were not saved: {keys}',
  'toast.branchSettingUpdated': 'Branch setting updated',
  'toast.branchSettingUpdateFailed': 'Failed to update branch setting',
  'toast.worktreeFilesUpdated': 'Worktree files updated',
  'toast.worktreeFilesUpdateFailed': 'Failed to update worktree files',
  'toast.colorUpdated': 'Color updated',
  'toast.colorUpdateFailed': 'Failed to update color',
  'toast.prTemplateCreated': 'PR template created',
  'toast.prTemplateCreateFailed': 'Failed to create template',
  'toast.prTemplateUpdated': 'PR template updated',
  'toast.prTemplateUpdateFailed': 'Failed to update template',
  'toast.repoDeleted': 'Repository “{name}” deleted',
  'toast.repoDeleteFailed': 'Failed to delete repository',
  'toast.repoRenamed': 'Repository renamed to “{name}”',
  'toast.repoRenameFailed': 'Failed to rename repository',

  // ── Repository detail page ───────────────────────────────────────────────
  'repo.notFound': 'Repository not found',
  'repo.back': 'Back to repositories',
  'repo.subtitle': 'Configure repository settings',
  'repo.subtitleReadOnly': 'Repository settings, read-only',
  'repo.readOnly.title': 'Read-only',
  'repo.readOnly.body':
    'These settings are shared by everyone in {org}, so only its admins change them. You can still set your local folder below — it stays on this machine and is never shared.',
  'repo.readOnly.theOrganization': 'the organization',
  'repo.gitWarning.notGitTitle': 'Not a Git repository',
  'repo.gitWarning.notGitBody':
    'This directory is not initialized as a Git repository. Run "git init" in this folder or select a different path.',
  'repo.gitWarning.missingTitle': 'Directory not found',
  'repo.gitWarning.missingBody':
    'The specified path does not exist. Please update the path to a valid directory.',
  'repo.noLocal.title': 'No local folder set',
  'repo.noLocal.body':
    'This team repository has no local folder on this machine yet. Select where it lives to work on it — the path stays private to you and is never shared with your team.',
  'repo.noLocal.action': 'Select local folder',

  'repo.scope.section': 'Scope',
  'repo.scope.team': 'Team',
  'repo.scope.teamNamed': 'Team — {name}',
  'repo.scope.personal': 'Personal',
  'repo.scope.teamHelp':
    'Shared with the organization — every member sees it and binds their own local folder.',
  'repo.scope.personalHelp':
    'Only you can see this repository. Share it with an organization to make it a team repo.',
  'repo.scope.makePersonal': 'Make personal',
  'repo.scope.sharePlaceholder': 'Share with organization…',
  'repo.scope.joinOrg': 'Join an organization to share repos.',

  'repo.general.section': 'General',
  'repo.general.intro': 'Who owns this repository, how it is shown, and the language Claude speaks with you in.',
  'repo.general.name': 'Name',
  'repo.general.nameHelp': 'Repository display name',
  'repo.general.path': 'Path',
  'repo.general.pathHelp': 'Local path to the repository',
  'repo.general.pathHelpReadOnly': 'Local path on this machine — yours only',
  'repo.general.remoteUrl': 'Clone address',
  'repo.general.remoteUrlHelp': 'Shared with the team, used to clone this repo in one click',
  'repo.general.remoteUrlHelpReadOnly': 'Shared with the team — an admin can change it',
  'repo.general.remoteUrlInvalid': 'Must be https://github.com/owner/repo',
  'repo.general.remoteUrlRefused': 'Only the owner or an org admin can change an address that is already set',
  'repo.general.chooseFolder': 'Choose folder',
  'repo.general.pathValid': 'Valid git repository',
  'repo.general.pathNotGit': 'Not a git repository',
  'repo.general.pathMissing': 'Directory does not exist',
  'repo.general.keywords': 'Keywords',
  'repo.general.keywordsHelp': 'Auto-detection keywords — one per tag',
  'repo.general.discussionLang': 'Discussion Language',
  'repo.general.discussionLangHelp': 'Language used by Claude when discussing with you',
  'repo.general.color': 'Color',
  'repo.general.colorHelp': 'Project color in sidebar',
  'repo.general.colorChange': 'Change color',
  'repo.general.colorModalTitle': 'Repository color',
  'repo.general.colorModalHelp': 'Shown wherever this repository appears — sidebar, tasks and session cards.',
  'repo.general.setColor': 'Set color {color}',

  'repo.tracker.mode': 'Trackers',
  'repo.tracker.modeHelp': 'Where /magic:plan files new tickets, and where /magic:start looks one up',
  'repo.tracker.modeGithub': 'GitHub',
  'repo.tracker.modeJira': 'Jira',
  'repo.tracker.askEachTime': 'Ask on each plan',
  'repo.tracker.askEachTimeHelp': 'Let /magic:plan ask which tracker to file into, instead of always using Jira',
  'repo.tracker.jiraLink': 'Jira link',
  'repo.tracker.jiraLinkHelp': 'Base URL of the Jira tickets (e.g. PROJ-123)',
  'repo.tabs.aria': 'Repository settings',
  'repo.langs.groupChat': 'Conversation',
  'repo.langs.section': 'Languages',
  'repo.start.intro': 'Starts a ticket in its own worktree. On this repository:',
  'repo.start.groupBefore': 'Before coding',
  'repo.start.groupImplementation': 'Implementation',
  'repo.start.groupCritic': 'Critic',
  'repo.start.exploration': 'Codebase exploration',
  'repo.start.explorationHelp': 'Go through the code involved before writing the plan.',
  'repo.start.explorationAuto': 'Depending on the ticket',
  'repo.start.explorationAlways': 'Always',
  'repo.start.explorationNever': 'Never',
  'repo.start.plan': 'Implementation plan',
  'repo.start.planHelp': 'Write a plan before coding. Off, the agent codes straight from the ticket, alone.',
  'repo.start.planReview': 'Plan review',
  'repo.start.planReviewHelp': 'A sub-agent reads the plan and suggests fixes before it is followed.',
  'repo.start.planApproval': 'Plan approval',
  'repo.start.planApprovalHelp': 'Ask you to approve the plan before the first line of code. Off, the agent carries on.',
  'repo.start.execution': 'Execution mode',
  'repo.start.executionHelp': 'Who writes the code: one agent, or several in parallel when the plan allows it.',
  'repo.start.executionAuto': 'Automatic',
  'repo.start.executionSolo': 'Always one agent',
  'repo.start.executionMulti': 'Several agents whenever possible',
  'repo.start.simplify': 'Simplify pass',
  'repo.start.simplifyHelp': 'Run /simplify on the changed files once the code is written.',
  'repo.start.criticIterations': 'Critic iterations',
  'repo.start.criticIterationsHelp': 'How many times the critic may send the work back for fixes. 0: it scores, without fixing.',
  'repo.start.criticMinScore': 'Minimum score',
  'repo.start.criticMinScoreHelp': 'The score out of 10 at which the work is accepted.',
  'repo.start.less': 'Less',
  'repo.start.more': 'More',
  'repo.start.reset': 'Default value',
  'repo.start.step.exploreAuto': 'Explores the code involved when the ticket alone is not enough.',
  'repo.start.step.exploreAlways': 'Always explores the code involved before planning.',
  'repo.start.step.exploreNever': 'Never explores the code: it works from the ticket alone.',
  'repo.start.step.planReviewed': 'Writes an implementation plan, reviewed by a sub-agent.',
  'repo.start.step.planUnreviewed': 'Writes an implementation plan, with no review.',
  'repo.start.step.approvalOn': 'Waits for your approval of the plan before writing any code.',
  'repo.start.step.approvalOff': 'Moves on to the code without waiting for your approval.',
  'repo.start.step.executionAuto': 'Codes alone or with several agents in parallel, depending on the plan.',
  'repo.start.step.executionSolo': 'Codes with a single agent.',
  'repo.start.step.executionMulti': 'Splits the code across several agents whenever the plan allows it.',
  'repo.start.step.noPlan': 'Codes straight from the ticket, with no plan, as a single agent.',
  'repo.start.step.simplify': 'Runs /simplify on the files it changed.',
  'repo.start.step.criticScoreOnly': 'A critic scores the work out of 10, without fixing anything.',
  'repo.start.step.criticOnce': 'A critic scores the work and sends it back once if it is under {score}/10.',
  'repo.start.step.criticLoop': 'A critic scores the work and sends it back up to {iterations} times while it is under {score}/10.',
  'repo.annex.section': 'Side skills configuration',
  'repo.annex.intro': 'The skills you run from wherever you are, outside the workflow’s cycle. For now: /magic:review.',
  'repo.workflow.section': 'Workflow',
  'repo.workflow.intro':
    'The order this repository’s skills run in, and what each one leads to. A coloured link with a dot running along it is an automatic chaining, a grey link is only suggested at the end of the run.',
  'repo.workflow.navigation': 'Drag to move around, pinch to zoom.',
  'repo.workflow.sourceDefault': 'Default workflow: this repository has none of its own yet',
  'repo.workflow.sourceRepository': 'This repository’s own workflow',
  'repo.workflow.canvas': 'Workflow of {name}',
  'repo.workflow.minimap': 'Minimap',
  'repo.workflow.auto': 'Automatic chaining',
  'repo.workflow.suggest': 'Suggested',
  'repo.workflow.loading': 'Loading the workflow',
  'repo.workflow.loadError': 'Couldn’t load this repository’s workflow.',
  'repo.workflow.editHint':
    'Press Edit to open the editor: add your skills as steps, move the cards around and draw links from their ports. The six built-in steps and their default links cannot be removed, but the eye on a card turns its step off.',
  'repo.workflow.readOnlyHint': 'Only the repository’s owner or an admin of its organization can edit this workflow.',
  'repo.workflow.disable': 'Turn off this step',
  'repo.workflow.hide': 'Remove from the canvas',
  'repo.workflow.enable': 'Turn on this step',
  'repo.workflow.alwaysOn': 'Start cannot be turned off: every other step runs from it',
  'repo.workflow.off': 'Turned off',
  'repo.workflow.blocking': 'Stops on failure',
  'repo.workflow.advisory': 'Goes on on failure',
  'repo.workflow.picker.title': 'Add to the workflow',
  'repo.workflow.picker.skills': 'Skills',
  'repo.workflow.picker.skillsHint': 'A step that runs a skill: a built-in one, yours, the repository’s or a plugin’s.',
  'repo.workflow.picker.back': 'Back',
  'repo.workflow.picker.empty': 'No skill to add. Create one in the Skills page first.',
  'repo.workflow.inWorkflow': 'In the workflow',
  'repo.workflow.source.builtin': 'Magic Slash steps',
  'repo.workflow.source.custom': 'Your skills',
  'repo.workflow.source.repo': 'This repository',
  'repo.workflow.source.plugin': 'Plugins',
  'repo.workflow.inspector.title': 'Selection',
  'repo.workflow.inspector.empty': 'Select a step or a link to edit it.',
  'repo.workflow.inspector.emptyReadOnly': 'Select a step or a link to see how it runs.',
  'repo.workflow.inspector.mode': 'If this step fails',
  'repo.workflow.inspector.color': 'Colour',
  'repo.workflow.inspector.kind': 'Chaining',
  'repo.workflow.inspector.outcome': 'Taken on',
  'repo.workflow.inspector.blocking': 'Stop the chain',
  'repo.workflow.inspector.advisory': 'Carry on anyway',
  'repo.workflow.inspector.auto': 'Automatic',
  'repo.workflow.inspector.suggest': 'Suggested',
  'repo.workflow.inspector.remove': 'Remove step',
  'repo.workflow.inspector.removeRow': 'Remove from the workflow',
  'repo.workflow.inspector.removeHint': 'Its links go with it.',
  'repo.workflow.inspector.builtIn': 'Built-in step: the skill it runs does not change.',
  'repo.workflow.inspector.removeBuiltInHint': 'Its links go with it. The + in the dock puts it back, unlinked.',
  'repo.workflow.inspector.offHint': 'Turned off: the skills skip it, and the steps before it lead straight to the ones after it.',
  'repo.workflow.hint.reviewComments': 'Runs only when the PR has review comments.',
  'repo.workflow.hint.skippedFromStart': 'A ticket started from /magic:start skips it.',
  'repo.workflow.hint.modeNoEffect': 'With no automatic link out of it, this setting has no effect: the next step is only suggested anyway.',
  'repo.workflow.hint.intoStart': 'Starting a ticket always opens a new agent, so this link can only be suggested.',
  'repo.workflow.warning.onlyHome': 'Only in your ~/.claude: teammates won’t have it.',
  'repo.workflow.warning.uncommitted': 'Copied into the repository, not committed yet: teammates won’t have it.',
  'repo.workflow.warning.unpushed': 'Committed, not pushed to {branch} yet: teammates won’t have it.',
  'repo.workflow.warning.unpushedNoRemote': 'Committed, not pushed yet: teammates won’t have it.',
  'repo.workflow.warning.noFolder': 'Couldn’t check: this repository has no local folder on this machine.',
  'repo.workflow.problems.one': '1 problem to fix before saving',
  'repo.workflow.problems.other': '{count} problems to fix before saving',
  'repo.workflow.problems.show': 'Show on the canvas',
  'repo.workflow.problem.duplicate': '{skill} is already in the workflow: a skill can run only once.',
  'repo.workflow.problem.autoIntoStart':
    'The link from {from} into Start cannot be automatic: starting a ticket always opens a new agent.',
  'repo.workflow.problem.invalid': 'This workflow cannot be used: {message}',
  'repo.workflow.unsaved': 'Unsaved changes',
  'repo.workflow.discard': 'Discard changes',
  'repo.workflow.saved': 'Workflow saved',
  'repo.workflow.denied': 'You can’t edit this repository’s workflow.',
  'repo.workflow.deniedHint': 'Only its owner or an admin of its organization can.',
  'repo.workflow.saveFailed': 'Couldn’t save the workflow.',
  'repo.workflow.changedElsewhere': 'The workflow was changed by someone else.',
  'repo.workflow.changedElsewhereHint': 'Reload to see their version. Your unsaved changes will be lost.',
  'repo.workflow.reload': 'Reload',
  'repo.workflow.conflict': 'Someone else saved this workflow in the meantime.',
  'repo.workflow.conflictHint': 'Reload to see their version; your changes are kept until you reload.',
  'repo.workflow.copy.title': 'Share these skills with the repository?',
  'repo.workflow.copy.body.one':
    '{skills} is only in your ~/.claude. Copy it into this repository’s .claude so your teammates run it too?',
  'repo.workflow.copy.body.other':
    '{skills} are only in your ~/.claude. Copy them into this repository’s .claude so your teammates run them too?',
  'repo.workflow.copy.commit': 'The copy is an ordinary change in your checkout: commit and push it for your teammates to get it.',
  'repo.workflow.copy.confirm': 'Copy into the repository',
  'repo.workflow.copy.decline': 'Not now',
  'repo.workflow.copy.done': 'Copied into .claude: {skills}. Commit and push them to share them.',
  'repo.workflow.copy.failed': 'Couldn’t copy {skill}: {message}',
  'repo.workflow.anyExit': 'When done',
  'repo.workflow.open': 'View workflow',
  'repo.workflow.edit': 'Edit workflow',
  'repo.workflow.editor.title': 'Editing the workflow of {name}',
  'repo.workflow.editor.close.title': 'Leave the editor?',
  'repo.workflow.editor.repository': 'Repository',
  'repo.workflow.editor.back': 'Back to settings',
  'repo.workflow.duplicate.button': 'Duplicate',
  'repo.workflow.actions': 'More actions',
  'repo.workflow.reset.button': 'Reset to default',
  'repo.workflow.reset.title': 'Reset the workflow of {name}?',
  'repo.workflow.reset.body': 'Its custom steps, links, switches and card positions are removed, unsaved edits included, and the repository follows the default flow again. The history keeps the previous version.',
  'repo.workflow.reset.confirm': 'Reset',
  'repo.workflow.duplicate.title': 'Duplicate the workflow of {name} to',
  'repo.workflow.duplicate.empty': 'No other repository configured',
  'repo.workflow.duplicate.replace.title': 'Replace the workflow of {name}?',
  'repo.workflow.duplicate.replace.body': '{name} already has a workflow of its own. It will be replaced by the one of {from}, as shown in the editor. Its history keeps the previous version.',
  'repo.workflow.duplicate.replace.confirm': 'Replace',
  'repo.workflow.duplicate.done': 'Workflow duplicated to {name}. Its custom skills must exist in that repository too.',
  'repo.workflow.duplicate.open': 'Open',
  'repo.workflow.duplicate.denied': 'You cannot change the workflow of {name}.',
  'repo.workflow.duplicate.conflict': 'The workflow of {name} changed meanwhile. Try again.',
  'repo.workflow.duplicate.invalid': 'The workflow of {name} was refused: fix its problems first.',
  'repo.workflow.duplicate.failed': 'Could not duplicate the workflow to {name}: {message}',
  'repo.workflow.duplicate.hasProblems': 'Fix the problems of this workflow before duplicating it.',
  'repo.workflow.inspector.outcomes': 'Outcomes',
  'repo.workflow.inspector.outcomesHint': 'What this skill can end on, in snake_case (tests_passed, tests_failed). Each one gets its own port on the card, and a link drawn from it is taken only on that outcome. Claude picks the one that happened when the skill ends.',
  'repo.workflow.inspector.outcomesColumn': 'Outcome',
  'repo.workflow.inspector.outcomesLinksColumn': 'Links',
  'repo.workflow.inspector.outcomesEmpty': 'None yet: every link out of this step applies whatever it ends on.',
  'repo.workflow.inspector.outcomesLinks.none': 'No link',
  'repo.workflow.inspector.outcomesLinks.one': '1 link',
  'repo.workflow.inspector.outcomesLinks.other': '{count} links',
  'repo.workflow.history.noteAdded': 'End note « {note} » added',
  'repo.workflow.history.noteRemoved': 'End note « {note} » removed',
  'repo.workflow.history.noteText': 'End note « {before} » now reads « {after} »',
  'repo.workflow.history.actionAdded': 'Slack action « {action} » added',
  'repo.workflow.history.actionRemoved': 'Slack action « {action} » removed',
  'repo.workflow.history.actionChanged': 'Slack action « {before} » now reads « {after} »',
  'repo.workflow.history.frameAdded': 'Frame « {frame} » added',
  'repo.workflow.history.frameRemoved': 'Frame « {frame} » removed',
  'repo.workflow.history.frameTitle': 'Frame « {before} » renamed « {after} »',
  'repo.workflow.inspector.outcomesPlaceholder': 'tests_failed',
  'repo.workflow.inspector.outcomesAdd': 'Add',
  'repo.workflow.inspector.outcomesRemove': 'Remove outcome',
  'repo.workflow.inspector.outcomesRules': 'An outcome is one word or a few, in snake_case: tests_passed, needs_review.',
  'repo.workflow.inspector.outcomesRulesHint': 'Lowercase letters, digits, _ and -, starting with a letter, {max} characters at most. Each one only once, and never failed: a skill that stops on an error already ends on it.',
  'repo.workflow.inspector.outcomeError.start': 'An outcome starts with a letter.',
  'repo.workflow.inspector.outcomeError.chars': 'Only lowercase letters, digits, _ and - (no accents or punctuation).',
  'repo.workflow.inspector.outcomeError.length': '{max} characters at most.',
  'repo.workflow.inspector.outcomeError.failed': 'failed is reserved: a skill that stops on an error already ends on it.',
  'repo.workflow.inspector.outcomeError.duplicate': 'This step already has this outcome.',
  'repo.workflow.inspector.detectRow': 'Declared in its SKILL.md',
  'repo.workflow.inspector.detect': 'Use them',
  'repo.workflow.inspector.detectHint': 'Its frontmatter lists: {outcomes}',
  'repo.workflow.note.add': 'End note',
  'repo.workflow.note.addHint': 'A line shown once a step is done, for what no skill does: “Create the ticket in Jira”.',
  'repo.workflow.note.title': 'End note',
  'repo.workflow.clipboard.stepRefused': 'A skill appears only once in a workflow, so a step cannot be copied. Frames, sticky notes and end notes can.',
  'repo.workflow.note.empty': 'Empty note',
  'repo.workflow.note.text': 'What it says',
  'repo.workflow.note.placeholder': 'Create the ticket in Jira',
  'repo.workflow.note.hint': 'Shown to the user when a link reaches this note: what to do next when no skill does it. Shown, never run, and nothing leaves it.',
  'repo.workflow.note.removeRow': 'Remove from the workflow',
  'repo.workflow.note.removeHint': 'The links into it go with it.',
  'repo.workflow.note.link': 'Leads to an end note: it is shown when the step ends here, never run, so there is no kind to choose.',
  'repo.workflow.problem.emptyNote': 'An end note says nothing yet: write it, or remove it.',
  'repo.workflow.action.add': 'Slack action',
  'repo.workflow.action.addHint': 'Post a message on Slack once a step is done, such as the PR’s link once it is created.',
  'repo.workflow.action.title': 'Slack action',
  'repo.workflow.action.empty': 'Message to write',
  'repo.workflow.action.channel': 'Channel',
  'repo.workflow.action.channelPlaceholder': '#dev',
  'repo.workflow.action.prompt': 'What to post',
  'repo.workflow.action.promptPlaceholder': 'Post that the PR {pr_title} is ready for review, with its link {pr_url} and the ticket {ticket_id}.',
  'repo.workflow.action.hint': 'Carried out by the agent through the Slack MCP of whoever ran the step, so the message goes out in their name. Members who turned actions off in Settings → Workflow never run it.',
  'repo.workflow.action.variables': 'Variables',
  'repo.workflow.action.variablesHint': 'Filled in by the agent from the run. One it does not know is left out, never invented.',
  'repo.workflow.action.removeRow': 'Remove from the workflow',
  'repo.workflow.action.removeHint': 'The links into it go with it.',
  'repo.workflow.action.kindAuto': 'Run on its own',
  'repo.workflow.action.kindSuggest': 'Ask first',
  'repo.workflow.action.linkHint': 'Leads to an action: it runs once the step ends here, before what follows. Ask first, and the agent checks with you before posting.',
  'repo.workflow.problem.emptyAction': 'A Slack action says nothing yet: write what to post, or remove it.',
  'repo.workflow.history.button': 'History',
  'repo.workflow.history.updated': 'Updated {when}',
  'repo.workflow.history.title': 'History',
  'repo.workflow.history.loading': 'Loading the history',
  'repo.workflow.history.empty': 'No change recorded yet. Every save of the workflow and every change of the start settings will show here.',
  'repo.workflow.history.failed': 'Couldn’t load the history.',
  'repo.workflow.history.truncated': 'Only the latest changes are shown.',
  'repo.workflow.history.editedWorkflow': 'edited the workflow',
  'repo.workflow.history.editedStart': 'changed the start settings',
  'repo.workflow.history.stepAdded': 'Added the {step} step',
  'repo.workflow.history.stepRemoved': 'Removed the {step} step',
  'repo.workflow.history.stepBlocking': '{step}: stops the chain on failure',
  'repo.workflow.history.stepAdvisory': '{step}: carries on after a failure',
  'repo.workflow.history.stepOutcomes': '{step}: outcomes {outcomes}',
  'repo.workflow.history.stepNoOutcomes': '{step}: no outcome any more',
  'repo.workflow.history.stepColor': '{step}: new colour',
  'repo.workflow.history.stepOff': 'Turned off {step}',
  'repo.workflow.history.stepOn': 'Turned on {step}',
  'repo.workflow.history.linkAdded': 'Linked {from} → {to} ({kind})',
  'repo.workflow.history.linkRemoved': 'Removed the link {from} → {to}',
  'repo.workflow.history.linkKind': '{from} → {to}: {kind}',
  'repo.workflow.history.linkOutcome': '{from} → {to}: taken on {outcome}',
  'repo.workflow.history.linkAnyOutcome': '{from} → {to}: whatever the outcome',
  'repo.workflow.history.moved.one': 'Moved 1 card on the canvas',
  'repo.workflow.history.moved.other': 'Moved {count} cards on the canvas',
  'repo.workflow.history.unreadable': 'Changed the workflow. This version of the app can’t show the details.',
  'repo.workflow.history.start': '{setting}: {from} → {to}',
  'repo.workflow.history.on': 'on',
  'repo.workflow.history.off': 'off',
  'repo.workflow.editor.switch.title': 'Switch to {name}?',
  'repo.workflow.editor.close.body': 'Your unsaved changes will be lost.',
  'repo.workflow.editor.close.keep': 'Keep editing',
  'repo.workflow.editor.close.leave': 'Leave without saving',
  'repo.workflow.dock.label': 'Workflow tools',
  'repo.workflow.dock.add': 'Add a step',
  'repo.workflow.dock.tools': 'Toolbox',
  'repo.workflow.frame.title': 'Frame',
  'repo.workflow.frame.addHint': 'Group steps under a title',
  'repo.workflow.frame.untitled': 'Untitled frame',
  'repo.workflow.frame.name': 'Title',
  'repo.workflow.frame.placeholder': 'Checks before the PR',
  'repo.workflow.frame.border': 'Border',
  'repo.workflow.frame.background': 'Background',
  'repo.workflow.frame.removeRow': 'Remove from the canvas',
  'repo.workflow.frame.removeHint': 'The steps inside it stay where they are.',
  'repo.workflow.sticky.title': 'Sticky note',
  'repo.workflow.sticky.addHint': 'Free text on the canvas',
  'repo.workflow.sticky.placeholder': 'Double-click to write…',
  'repo.workflow.sticky.empty': 'no text',
  'repo.workflow.sticky.hint': 'Double-click the sticky note to write on it.',
  'repo.workflow.sticky.removeRow': 'Remove from the canvas',
  'repo.workflow.history.stickyAdded': 'Sticky note added',
  'repo.workflow.history.stickyRemoved': 'Sticky note « {text} » removed',
  'repo.workflow.history.stickyText': 'Sticky note edited: « {text} »',
  'repo.workflow.dock.undo': 'Undo (⌘Z)',
  'repo.workflow.dock.redo': 'Redo (⇧⌘Z)',
  'repo.workflow.dock.zoomIn': 'Zoom in',
  'repo.workflow.dock.zoomOut': 'Zoom out',
  'repo.workflow.dock.fit': 'Recenter on the workflow',
  'repo.workflow.dock.close': 'Close the editor (Esc)',
  'repo.workflow.inspector.removeLink': 'Remove the link',
  'repo.workflow.inspector.removeLinkRow': 'Remove from the workflow',
  'repo.workflow.inspector.removeLinkHint': 'The two steps stay, unlinked.',
  'repo.workflow.inspector.linkFrom': 'From',
  'repo.workflow.inspector.linkTo': 'To',
  'repo.workflow.inspector.anyOutcome': 'Whatever the outcome',
  'repo.workflow.inspector.defaultLink': 'Default link: resetting the workflow brings it back if removed.',
  'repo.workflow.inspector.settings': 'Settings',
  'repo.workflow.inspector.settingsHint': 'Saved as soon as they change, not with Save.',
  'repo.workflow.inspector.close': 'Close',
  'repo.workflow.warning.unreachable': 'No link comes into this step, so it never runs. Draw one to it from the step it should follow; the links out of it do not count.',
  'repo.workflow.problem.startDisabled': 'Start is turned off: every other step runs from it, so it has to stay on.',
  'repo.workflow.problem.selfLink': '{step} runs itself again on its own whatever it ends on: it would never stop. Take this link on an outcome, or make it a suggestion.',
  'repo.workflow.problem.duplicateLink': '{from} and {to} are linked twice.',
  'repo.langs.commit': 'Commit Language',
  'repo.langs.pullRequest': 'Pull Request Language',
  'repo.langs.review': 'Review Language',
  'repo.repository.section': 'Repository',
  'repo.repository.intro': 'Where the code lives: the folder on this machine, the address your teammates clone, the branch work starts from and what a fresh worktree needs.',
  'repo.repository.groupLocation': 'Location',
  'repo.repository.groupBranches': 'Branches',
  'repo.repository.groupWorktrees': 'Worktrees',
  'repo.tracker.groupDestination': 'Ticket destination',
  'repo.tracker.groupGithub': 'GitHub',
  'repo.tracker.groupJira': 'Jira',
  'repo.tracker.githubRepoHelpPr': 'Address of the repository — used for pull requests and cloning, not for tickets',
  'repo.tickets.section': 'Tickets',
  'repo.tickets.intro': 'Where this repository’s tickets go, and each tracker’s address.',
  'repo.tracker.githubRepo': 'GitHub Repository',
  'repo.tracker.issuesGoTo': 'Issues are filed in {target}',
  'repo.tracker.githubTargetNone': 'No GitHub remote',
  'repo.branches.development': 'Development Branch',
  'repo.branches.developmentHelp': 'Base branch for comparing commits',
  'repo.branches.select': 'Select branch',

  'repo.worktree.files': 'Files to copy',
  'repo.worktree.filesHelp':
    'Files copied from the main repo to new worktrees (e.g., .env, .env.local)',

  'repo.plan.groupBefore': 'Before proposing',
  'repo.plan.groupBreakdown': 'Breakdown',
  'repo.plan.groupTickets': 'Created tickets',
  'repo.commit.groupMessage': 'Message',
  'repo.commit.groupBranches': 'Branches',
  'repo.pr.groupDescription': 'Description',
  'repo.pr.groupAfter': 'Once open',
  'repo.resolve.groupCommits': 'Fix commits',
  'repo.resolve.groupReplies': 'Replies',
  'repo.commit.intro': 'Turns your working tree into commits. On this repository:',
  'repo.commit.step.atomic':
    'Splits what changed into atomic commits — one logical change each, without asking.',
  'repo.commit.step.formatConventional':
    'Every message is Conventional: the type, then the subject (feat: add login).',
  'repo.commit.step.formatAngular':
    'Every message is Angular: the type, the scope, then the subject (feat(auth): add login).',
  'repo.commit.step.formatGitmoji':
    'Every message opens with a gitmoji, then the subject (✨ add login).',
  'repo.commit.step.formatNone': 'Messages are free form — no type, no scope.',
  'repo.commit.step.styleSingle': 'One line per commit, with no body.',
  'repo.commit.step.styleMulti': 'A subject line, then a body saying why the change was made.',
  'repo.commit.step.protectedAsk':
    'Committing straight onto {branches} is allowed, but it asks you first.',
  'repo.commit.step.protectedBlock':
    'Never commits onto {branches}: it moves the work to a new branch first.',
  'repo.commit.step.push': 'Pushes the branch right after committing.',
  'repo.commit.tail.coAuthor': 'Claude added as co-author',
  'repo.commit.tail.ticketId': 'ticket id added to the message',
  'repo.commit.languageHelp': 'Language used for commit messages',
  'repo.commit.style': 'Style',
  'repo.commit.styleHelp': 'Single line or multi-line with body',
  'repo.commit.styleSingle': 'Single line',
  'repo.commit.styleMulti': 'Multi-line (with body)',
  'repo.commit.format': 'Format',
  'repo.commit.formatHelp': 'Commit message format/convention',
  'repo.commit.formatConventional': 'Conventional (type: description)',
  'repo.commit.formatAngular': 'Angular (type(scope): description)',
  'repo.commit.formatGitmoji': 'Gitmoji (emoji + description)',
  'repo.commit.formatNone': 'None (free form)',
  'repo.commit.coAuthor': 'Co-Author',
  'repo.commit.coAuthorHelp': 'Add Claude as co-author in commits',
  'repo.commit.ticketId': 'Include Ticket ID',
  'repo.commit.ticketIdHelp': 'Add ticket ID from branch name in commit message',
  'repo.commit.push': 'Push after commit',
  'repo.commit.pushHelpOn': '/magic:commit pushes the branch as soon as the commit is made',
  'repo.commit.pushHelpOff': 'The commit stays local until you push it, or /magic:pr does',
  'repo.commit.protectedBranch': 'Commits on main branches',
  'repo.commit.protectedBranchHelpOn':
    'Allowed on main, master, develop and this repo’s development branch — /magic:commit asks first',
  'repo.commit.protectedBranchHelpOff':
    'Blocked on main, master, develop and this repo’s development branch — /magic:commit moves the work to a new branch',
  'repo.example': 'Example',

  'repo.review.intro': 'Reviews a pull request, yours or a colleague’s. On this repository:',
  'repo.review.step.read': 'Reads the whole pull request and the code around it, not just the diff.',
  'repo.review.step.scoreOn': 'Gives a confidence score out of 10, and says what is missing to reach 10.',
  'repo.review.step.scoreOff': 'Gives no confidence score.',
  'repo.review.step.modeAsk': 'Shows you the comments it wants to post, then asks what goes on GitHub.',
  'repo.review.step.modePost': 'Posts its comments on the pull request straight away, without asking.',
  'repo.review.languageHelp': 'Language of the comments /magic:review posts. Follows the pull request language unless set',
  'repo.review.groupDraft': 'Comments',
  'repo.review.confidenceScore': 'Confidence Score',
  'repo.review.confidenceScoreHelp': 'A score out of 10 and the reasons for the missing points, in the draft and on GitHub',
  'repo.review.mode': 'Before Posting',
  'repo.review.modeHelp': 'Whether you approve the comments before they reach the pull request',
  'repo.review.modeAsk': 'Ask me first',
  'repo.review.modePost': 'Post directly',

  'repo.resolve.intro': 'Turns review comments into a pushed fix. On this repository:',
  'repo.resolve.step.read':
    'Reads the review comments on the pull request and fixes what they ask for.',
  'repo.resolve.step.commitNew': 'Adds one commit for the fixes, and pushes it normally.',
  'repo.resolve.step.commitAmend': 'Amends the last commit and pushes with --force-with-lease.',
  'repo.resolve.step.commitAsk':
    'Asks every time: a new commit, or an amend that pushes with --force-with-lease.',
  'repo.resolve.step.formatInherit': 'The fix commit takes its message format from the Commit tab.',
  'repo.resolve.step.formatCustom': 'The fix commit has its own message format: {format}, {style}.',
  'repo.resolve.step.replyMinimal':
    'Replies in each review thread once its comment is addressed — one line, naming the commit.',
  'repo.resolve.step.replyNormal':
    'Replies in each review thread once its comment is addressed, and says why whenever the fix departs from what was asked.',
  'repo.resolve.step.replyDetailed':
    'Replies in each review thread in full, keeping the reasoning behind the fix.',
  'repo.resolve.step.replyOff': 'Posts no reply in the review threads.',
  'repo.resolve.commitMode': 'Commit Mode',
  'repo.resolve.commitModeHelp': 'How to commit resolve changes',
  'repo.resolve.modeNew': 'New commit',
  'repo.resolve.modeAmend': 'Amend last commit',
  'repo.resolve.modeAsk': 'Ask (choose at runtime)',
  'repo.resolve.commitFormat': 'Commit Format',
  'repo.resolve.commitFormatHelp': 'Format source for resolve commit messages',
  'repo.resolve.useCommitConfig': 'Use commit settings',
  'repo.resolve.customConfig': 'Custom',
  'repo.resolve.reply': 'Reply to Comments',
  'repo.resolve.replyHelp': 'Reply in-thread on resolved GitHub comments',
  'repo.resolve.replyVerbosity': 'Reply Detail',
  'repo.resolve.replyVerbosityHelp':
    'How much each reply says on top of the diff the reviewer can already read',
  'repo.resolve.verbosityMinimal': 'Brief — one line',
  'repo.resolve.verbosityNormal': 'Balanced — plus why, when the fix differs',
  'repo.resolve.verbosityDetailed': 'Conversational — keeps the reasoning',
  'repo.resolve.replyLang': 'Review Reply Language',
  'repo.resolve.replyLangHelp': 'Language of the replies /magic:resolve posts in the review threads of the pull request',
  // Both notices end on the literal git flag, rendered as <code> after the text.
  'repo.resolve.amendNotice': 'Push will use',
  'repo.resolve.askNotice':
    'You’ll be asked to choose new commit or amend on each resolve. Choosing amend will push with',

  'repo.pr.intro': 'Turns your commits into a pull request. On this repository:',
  'repo.pr.step.open':
    'Runs the project’s checks, pushes the branch, then opens the pull request with its title and description.',
  'repo.pr.step.autoLinkOn': 'The description links the {tracker} ticket.',
  'repo.pr.step.autoLinkOff': 'The description carries no ticket link.',
  'repo.pr.step.accountsOff': 'Says nothing about test accounts.',
  'repo.pr.step.accountsReference':
    'Tells the reviewer where the test accounts live, without any credentials.',
  'repo.pr.step.accountsInline':
    'Pastes the test-account credentials into the description — and falls back to a reference on a public repository.',
  'repo.pr.step.ticketComment':
    'Updates the linked {tracker} ticket and comments the pull request link on it.',
  'repo.pr.step.ticketQuiet': 'Updates the linked {tracker} ticket, without commenting on it.',
  'repo.pr.step.watchOn':
    'Then stays on the pull request: waits for the checks, fixes what fails, handles review feedback, and adds the preview URL to the test scenarios when the project publishes one.',
  'repo.pr.step.watchOff':
    'Stops once the pull request is open — no checks watched, no preview URL.',
  'repo.pr.tail.accountsSource': 'accounts read from {source}',
  // Only emitted for 'type' and 'all': leaving the boxes alone is the default, and a
  // line saying so would be noise on every repository that never touched the setting.
  'repo.pr.tail.checkboxesType': 'ticks the type of change in the PR template',
  'repo.pr.tail.checkboxesAll': 'ticks the PR template boxes it considers verified',
  // Same rule as the two above: 'concise' is the default, and a line saying so would
  // be noise on every repository that never opened the setting.
  'repo.pr.tail.bodyNormal': 'writes a longer description, with the reasoning on each bullet',
  'repo.pr.tail.bodyDetailed': 'writes a full description, with no length cap',
  // Only emitted when the setting is off: leaving out what does not apply is the default.
  'repo.pr.tail.keepAllSections': 'keeps every section of the PR template, even those the change does not touch',
  'repo.pr.languageHelp': 'Language used for pull request titles and descriptions',
  'repo.pr.autoLink': 'Auto-link Tickets',
  'repo.pr.autoLinkHelp': 'Add Jira/GitHub ticket links in PR description',
  'repo.pr.watchCI': 'Watch CI & Review',
  'repo.pr.watchCIHelp': 'After creating the PR, wait for the checks, fix failures automatically, address review feedback, and add the PR preview URL to the test scenarios when the project publishes one. Without it, the test scenarios stay local-only',
  'repo.pr.testAccounts': 'Test Accounts',
  'repo.pr.testAccountsHelp': 'Whether the PR description mentions the test accounts reviewers can use. Reference is safe on any repository; inline pastes the credentials in the PR body',
  'repo.pr.testAccountsOff': 'Off (never mention)',
  'repo.pr.testAccountsReference': 'Reference (say where they live)',
  'repo.pr.testAccountsInline': 'Inline (paste credentials)',
  'repo.pr.testAccountsPublicWarn': 'Credentials are never pasted on a public repository: inline falls back to reference there',
  'repo.pr.testAccountsSource': 'Test Accounts Source',
  'repo.pr.testAccountsSourceHelp': 'Optional file path or project skill name holding the accounts (auto-detected when empty)',
  'repo.pr.template': 'PR Template',
  'repo.pr.templateHelp': 'Template used when creating pull requests',
  'repo.pr.templateChecking': 'Checking…',
  'repo.pr.templateFound': 'Template found',
  'repo.pr.templateGenerate': 'Generate template',
  'repo.pr.templatePlaceholder': 'PR template content…',
  // A different setting from `repo.pr.template` above, which is the template itself.
  // These govern what the agent is allowed to do with the boxes that template ships.
  'repo.pr.templateCheckboxes': 'PR template checkboxes',
  'repo.pr.templateCheckboxesHelp': 'Whether /magic:pr may tick the checkboxes your repository’s PR template ships. Leaving them empty hands the ticking back to the reviewer',
  'repo.pr.templateCheckboxesNever': 'Never tick',
  'repo.pr.templateCheckboxesType': 'Type of change only',
  'repo.pr.templateCheckboxesAll': 'Tick what is verified',
  // How much goes INTO the body, as opposed to which skeleton it follows. It applies
  // to the repository's own template just as much as to the built-in one.
  'repo.pr.bodyVerbosity': 'PR description length',
  'repo.pr.bodyVerbosityHelp': 'How much /magic:pr writes in the pull request body. Concise keeps it to one screen of bullets a reviewer reads in a minute',
  'repo.pr.bodyVerbosityConcise': 'Concise',
  'repo.pr.bodyVerbosityNormal': 'Normal',
  'repo.pr.bodyVerbosityDetailed': 'Detailed',
  'repo.pr.hideIrrelevantSections': 'Hide sections that do not apply',
  'repo.pr.hideIrrelevantSectionsHelp': 'Leave out the PR template sections the change does not touch: browsers and breakpoints on a backend-only change, data model and permissions on a front-only one',

  'repo.issues.commentLang': 'Ticket Comment Language',
  'repo.issues.commentLangHelp': 'Language of the comments /magic:pr and /magic:done post on the ticket',
  'repo.issues.ticketLang': 'Ticket Language',
  'repo.issues.ticketLangHelp':
    'Language the tickets created by /magic:plan are written in — follows the comment language until you set it',
  'repo.issues.specLang': 'Spec Language',
  'repo.issues.specLangHelp':
    'Language the spec /magic:plan writes is in — follows the ticket language until you set it',
  'repo.issues.commentOnPR': 'Comment the Ticket',
  'repo.issues.commentOnPRHelp': 'Post a comment carrying the pull request link on the ticket, when the PR is created',

  'repo.plan.intro': 'Turns an idea into tickets. On this repository:',
  'repo.plan.step.duplicateOn':
    'Searches the tracker for a ticket that already covers the idea before proposing anything.',
  'repo.plan.step.duplicateOff':
    'Proposes a structure straight away, without looking for an existing ticket.',
  'repo.plan.step.splitConservative':
    'Splits as little as possible — one story when the idea fits in one.',
  'repo.plan.step.splitBalanced':
    'Splits as soon as two parts could be finished on different days.',
  'repo.plan.step.splitEager': 'Prefers several small stories, each one deliverable on its own.',
  'repo.plan.step.acChecklist':
    'Every story gets acceptance criteria as a checklist, in plain language.',
  'repo.plan.step.acGherkin':
    'Every story gets acceptance criteria in Gherkin — Given / When / Then.',
  'repo.plan.step.acNone': 'Stories are written without acceptance criteria.',
  'repo.plan.step.spec':
    'Writes a spec for you to read and waits for your approval — nothing is created before that.',
  'repo.plan.step.createJira':
    'Then creates the epic ({epic}) and its stories ({story}) in the Jira project {project}.',
  'repo.plan.step.createJiraNoProject':
    'Then creates the epic ({epic}) and its stories ({story}) in Jira — the project is asked for during the plan.',
  'repo.plan.step.createGithub': 'Then creates one GitHub issue per story on {target}.',
  'repo.plan.step.createGithubNoTarget':
    'Then creates one GitHub issue per story — no GitHub address is set on this repository yet.',
  'repo.plan.step.createAsk':
    'Asks on every plan where the tickets go: a Jira epic with its stories, or GitHub issues.',
  'repo.plan.tail.assign': 'tickets assigned to you',
  'repo.plan.tail.labels': 'labels: {labels}',
  'repo.plan.tail.templates': 'repository issue templates followed',
  'repo.plan.jiraProject': 'Jira Project',
  'repo.plan.jiraProjectHelp': 'Project key the tickets are created in, e.g. PROJ (asked for when empty)',
  'repo.plan.epicType': 'Epic Issue Type',
  'repo.plan.epicTypeHelp': 'The name your Jira project gives the issue type used for the epic',
  'repo.plan.storyType': 'Story Issue Type',
  'repo.plan.storyTypeHelp': 'The name your Jira project gives the issue type used for each story',
  'repo.plan.splitting': 'Splitting',
  'repo.plan.splittingHelp':
    'How readily an idea becomes an epic with several stories rather than one single ticket',
  'repo.plan.splittingConservative': 'Conservative (few, bigger tickets)',
  'repo.plan.splittingBalanced': 'Balanced (split when the work has distinct parts)',
  'repo.plan.splittingEager': 'Eager (many small tickets)',
  'repo.plan.acceptanceCriteria': 'Acceptance Criteria',
  'repo.plan.acceptanceCriteriaHelp':
    'The form the “how do we know it’s done” list takes at the bottom of each ticket',
  'repo.plan.acceptanceCriteriaChecklist': 'Checklist (one tick box per condition)',
  'repo.plan.acceptanceCriteriaGherkin': 'Gherkin (Given / When / Then)',
  'repo.plan.acceptanceCriteriaNone': 'None (description only)',
  'repo.plan.useRepoTemplates': 'Use Repository Templates',
  'repo.plan.useRepoTemplatesHelp':
    'Fill in the issue templates the project already ships instead of writing a generic ticket',
  'repo.plan.duplicateCheck': 'Duplicate Check',
  'repo.plan.duplicateCheckHelp': 'Look for tickets that already cover the idea before proposing a structure',
  'repo.plan.assignToMe': 'Assign to Me',
  'repo.plan.assignToMeHelp': 'Put your name on the created tickets instead of leaving them unassigned',
  'repo.plan.defaultLabels': 'Default Labels',
  'repo.plan.defaultLabelsHelp': 'Labels added to every ticket /magic:plan creates',

  'repo.danger.section': 'Danger Zone',
  'repo.danger.delete': 'Delete this repository',
  'repo.danger.deleteHelp': 'Remove this repository from Magic Slash configuration',
  'repo.danger.deleteAction': 'Delete repository',
  'repo.delete.title': 'Delete repository',
  'repo.delete.deleting': 'Deleting…',
  'repo.delete.confirm': 'Are you sure you want to delete “{name}”?',
  'repo.delete.irreversible': 'This action cannot be undone.',

  // ── Settings → Organization ──────────────────────────────────────────────
  'org.section': 'Organization',
  'org.sectionPlural': 'Organizations',
  'org.cloudDisabled': 'Cloud features are not configured in this build.',
  'org.cloudDisabledHint': 'Magic Slash works fully offline — no account required.',
  'org.signInTitle': 'Sign in to manage your organization.',
  'org.signInHint': 'Settings → Account → Cloud account.',
  'org.emptyTitle': 'You do not belong to any organization.',
  'org.emptyHint': 'Create one, or join with an invitation.',

  'org.members': 'Members',
  'org.membersEmpty': 'No members yet.',
  'org.colMember': 'Member',
  'org.colRole': 'Role',
  'org.colActions': 'Actions',
  'org.you': ' (you)',
  'org.removeMember': 'Remove member',
  'org.role.admin': 'admin',
  'org.role.user': 'user',

  'org.invitations': 'Invitations',
  'org.invite': 'Invite',
  'org.invitationsEmpty': 'No pending invitation.',
  'org.copyInviteLink': 'Copy invitation link',
  'org.inviteLink': 'Invite link',
  'org.deleteInvitation': 'Delete invitation',
  'org.inviteStatus.pending': 'pending',
  'org.inviteStatus.accepted': 'accepted',
  'org.inviteStatus.expired': 'expired',
  'org.inviteStatus.revoked': 'revoked',

  'org.soleAdmin':
    'You are the last admin. Promote another member before leaving, or archive the organization.',
  'org.leave': 'Leave organization',
  'org.archive': 'Archive organization',
  'org.create': 'Create an organization',
  'org.join': 'Join an organization',

  'org.inviteModal.title': 'Invite to {name}',
  'org.inviteModal.titleFallback': 'Invite',
  'org.inviteModal.send': 'Send invitation',
  'org.inviteModal.help':
    'An invitation link is generated — copy it from the list and send it to your colleague.',
  'org.inviteModal.emailPlaceholder': 'colleague@example.com',

  'org.createModal.help':
    'You become its admin. It is not made active — use “Switch to” on the card when you want to work in it.',
  'org.createModal.namePlaceholder': 'Organization name',
  'org.createModal.submit': 'Create',

  'org.joinModal.help': 'Paste the invitation link you received, or just its token.',
  'org.joinModal.tokenPlaceholder': 'https://invite.magic-slash.io/…',
  'org.joinModal.submit': 'Join',

  'org.archiveModal.confirm': 'Archive {name}?',
  'org.archiveModal.thisOrganization': 'this organization',
  'org.archiveModal.body':
    'The organization and its members lose access — it disappears for everyone. Its data is retained, not deleted, but this cannot be undone from the app.',

  'toast.roleUpdated': 'Role updated',
  'toast.roleUpdateFailed': 'Failed to update role',
  'toast.memberRemoved': 'Member removed',
  'toast.memberRemoveFailed': 'Failed to remove member',
  'toast.orgLeft': 'You left the organization',
  'toast.orgLeaveFailed': 'Failed to leave organization',
  'toast.orgArchived': 'Organization archived',
  'toast.orgArchiveFailed': 'Failed to archive organization',
  'toast.invitationCreated': 'Invitation created',
  'toast.invitationCreateFailed': 'Failed to create invitation',
  'toast.invitationDeleted': 'Invitation deleted',
  'toast.invitationDeleteFailed': 'Failed to delete invitation',
  'toast.orgCreated': 'Organization “{name}” created',
  'toast.orgCreateFailed': 'Failed to create organization',
  'toast.orgJoined': 'You joined the organization',
  'toast.orgJoinFailed': 'Failed to join organization',

  // ── Settings → Account → Account status checklist ────────────────────────
  'account.checklist.ready': 'Ready to use',
  'account.checklist.readyHint': 'Onboarding is complete — every skill can run end to end.',
  'account.checklist.pending': 'Setup in progress',
  'account.checklist.pendingHint': '{done} of {total} steps done.',
  'account.checklist.step.account': 'Cloud account connected',
  'account.checklist.step.atlassian': 'Atlassian account linked',
  'account.checklist.step.profile': 'Profile filled in',
  'account.checklist.step.repository': 'At least one usable repository',
  'account.checklist.step.setup': 'Machine setup complete',
  // ── What unfolds under a step that is NOT ticked ─────────────────────────
  // One sentence each, naming the place that fixes it. The card itself stays
  // read-only: every repair already lives one tab away or lower on this one, and a
  // second set of controls here would be two places to keep in sync. A ticked step
  // has no fold at all, so none of these is ever read for a done row.
  'account.checklist.todo.account':
    'Sign in from the card just below. Magic Slash works without an account, but your plans and repositories will not follow you from one machine to the next.',
  'account.checklist.todo.atlassian':
    'Connect Atlassian from the Connections tab, so the skills can read your Jira tickets and move them along.',
  'account.checklist.todo.profile':
    'Fill in your profile on the Profile page, right below Account. The skills read it to pitch their vocabulary and their level of detail at you.',
  'account.checklist.todo.repository':
    'Add a repository from the Repositories tab, or point an existing one back at a folder that still exists.',
  'account.checklist.todo.setup':
    'Finish the machine setup from the Application tab: the prerequisites, the MCP servers and the skills.',

  // ── Settings → Account → Cloud account ───────────────────────────────────
  'cloud.signedInFallback': 'Signed in',
  'cloud.signedInHint': 'Signed in to Magic Slash cloud',
  // ── The label column of the card's table ─────────────────────────────────
  // The name of each setting, and nothing else: the VALUE is the next column over and
  // comes from the account, not from here. They are one group because they are one
  // column, and they line up on screen — so a word that reads fine alone but breaks
  // the set is a mistake visible here before it is visible in the app. The fifth is
  // `cloud.deleteAccount` further down, where the rest of that dialog lives.
  //
  // NO COLONS. An earlier pass put "Email:" in this column because the label and the
  // value shared one line; they are two columns now, the alignment is what separates
  // them, and a colon would be punctuation pointing at a gap.
  'cloud.row.username': 'Username',
  'cloud.row.avatar': 'Avatar',
  'cloud.row.email': 'Email',
  'cloud.row.password': 'Password',
  // ── The avatar's value ───────────────────────────────────────────────────
  // The date comes from Storage's own `updated_at` on the object, so it is the photo's
  // own row rather than something this app remembers to write.
  'cloud.avatar.updatedOn': 'Updated on {date}',
  // An avatar whose date could not be read. There IS one — the bytes are on screen — so
  // the cell says the fact it is sure of rather than going blank. "Picture" and not
  // "photo": the stored bytes are now just as likely to be one of the thirty portraits,
  // and the row cannot tell which without loading the whole catalogue to compare.
  'cloud.avatar.set': 'Picture set',
  // Nothing stored — which is no longer nothing SHOWN: every surface draws the default
  // portrait in its place, so the cell names what is on screen rather than reporting an
  // absence the user cannot see.
  'cloud.avatar.none': 'Default portrait',
  // The handle's line while there is none. Drawn quiet by the card, so it does not
  // read as a handle someone actually picked.
  'cloud.username.none': 'No username yet',
  'cloud.username.hint': 'Shown instead of your email address',
  'cloud.username.title': 'Choose a username',
  'cloud.username.placeholder': 'username',
  'cloud.username.help':
    'Between {min} and {max} characters: letters, digits, dot, dash and underscore, starting with a letter or a digit.',
  'cloud.username.submit': 'Save username',
  'cloud.username.checking': 'Checking availability…',
  'cloud.username.available': '{username} is available',
  // The one refusal the form cannot pre-empt: it is the unique index that decides,
  // so this is shown both while typing and after a save that lost the race.
  'cloud.username.taken': '{username} is already taken',
  'cloud.username.tooShort': 'At least {min} characters.',
  'cloud.username.tooLong': 'At most {max} characters.',
  'cloud.username.badCharacters':
    'Letters, digits, dot, dash and underscore only, starting with a letter or a digit.',
  'cloud.avatar.alt': 'Account photo',
  'cloud.avatar.crop.title': 'Frame your photo',
  // Names the surface being dragged, which `cloud.avatar.alt` does not: that one
  // labels the photo already on the account. It NAMES only: the instructions are
  // `.hint`, which the canvas points at with `aria-describedby`, so the sentence a
  // screen reader reads and the sentence on screen cannot drift apart.
  'cloud.avatar.crop.canvas': 'Photo to frame',
  'cloud.avatar.crop.hint': 'Drag to move, scroll to zoom.',
  'cloud.avatar.crop.zoomIn': 'Zoom in',
  'cloud.avatar.crop.zoomOut': 'Zoom out',
  'cloud.avatar.crop.confirm': 'Use this photo',
  // ── The portrait grid ────────────────────────────────────────────────────
  'cloud.avatar.picker.title': 'Choose your avatar',
  'cloud.avatar.picker.hint': 'Pick one of our portraits, or use a photo of your own.',
  // The radiogroup's name. It is the QUESTION the thirty tiles answer, which is not the
  // dialog's title said twice: a screen reader announces the group on entering it, after
  // the title has already been read.
  'cloud.avatar.picker.group': 'Portraits',
  // Each tile's name. A number rather than a description — see `AvatarPickerModal` on
  // why thirty drawn strangers are better numbered than adjectived.
  'cloud.avatar.portrait': 'Portrait {number}',
  'cloud.avatar.picker.upload': 'Use a photo',
  'cloud.avatar.picker.confirm': 'Use this portrait',
  'cloud.signOut': 'Sign out',
  'cloud.changePassword': 'Change password',
  'cloud.changeEmail': 'Change email',
  'cloud.deleteAccount': 'Delete my account',
  'cloud.notSignedIn': 'Not signed in',
  'cloud.notSignedInHint': 'Sign in to manage your organization (optional)',
  'cloud.joinWithInvitation': 'Join with invitation',
  'cloud.signIn': 'Sign in',
  // ── What the password LINE says, under "Password" ────────────────────────
  // Two sentences and not one with a fallback date in it, because they make
  // different claims and only one of them is provable.
  'cloud.password.changedOn': 'Last changed on {date}',
  // NOT "never changed". GoTrue stores no password timestamp, so the app records its
  // own — and that column postdates most accounts: somebody who changed their
  // password last year still reads as null here, and always will. "No change
  // recorded" is the whole of what a null supports, so it is the whole of what this
  // says. The creation date is still worth showing: it is the earliest the current
  // password can possibly date from.
  'cloud.password.notRecorded': 'No change recorded since the account was created on {date}',
  // ── The line at the top of the change-password dialog ────────────────────
  // The same two facts the card's password line carries, turned around: the row states
  // WHEN it last changed, the dialog states how long it has stood — which is the thing
  // worth knowing at the moment somebody is deciding whether to change it. Neither
  // claims more than the column supports; see `cloud.password.notRecorded`.
  'cloud.password.modalHelp': 'You have not changed it since {date}.',
  'cloud.password.modalHelpNotRecorded':
    'No change has been recorded since your account was created on {date}.',
  'cloud.password.submit': 'Update password',
  'cloud.password.newPlaceholder': 'New password',
  'cloud.password.confirmPlaceholder': 'Confirm new password',
  // ── The change-email dialog ──────────────────────────────────────────────
  // ONE STEP AND NO CODE. The project is on Supabase's free tier with their own mail
  // provider, which forbids custom templates, so the message that goes out is the
  // stock one and it carries a LINK. The code keys below it are kept, unused: they
  // are what comes back the day a custom SMTP provider unlocks {{ .Token }}.
  'cloud.email.sendLink': 'Send confirmation link',
  'cloud.email.linkHelp':
    'We’ll email a confirmation link to your new address. Your account moves the moment you open it, from wherever you read your mail.',
  'cloud.email.changed.title': 'Email address changed',
  'cloud.email.changed.body': 'Your account now signs in as {email}.',
  'cloud.email.sendCode': 'Send code',
  'cloud.email.confirmChange': 'Confirm change',
  'cloud.email.requestHelp': 'We’ll email a 6-digit confirmation code to your new address.',
  'cloud.email.newPlaceholder': 'New email',
  'cloud.email.confirmHelp': 'Check {email} for the confirmation code and enter it below.',
  'cloud.email.codePlaceholder': '6-digit code',
  // What the LINE says, under "Delete my account", before anything is pressed.
  //
  // It names the consequence a person cannot guess and would not find out until it
  // had happened: an organization they are alone in goes with them, and one they
  // share does NOT — it is handed to another member (delete_account picks an admin
  // first, else the oldest member). The modal's own body repeats the irreversibility
  // and adds that the app keeps working locally; this line is for the reader who is
  // deciding whether to open it at all.
  'cloud.delete.rowHint':
    'Organizations where you are the only member are deleted with their data. The others pass to another member. This cannot be undone.',
  'cloud.delete.submit': 'Delete permanently',
  'cloud.delete.warning': 'This permanently deletes your account and personal data.',
  'cloud.delete.body':
    'Organizations you created will be removed along with their data. This cannot be undone. Magic Slash keeps working locally without an account.',

  'toast.passwordMismatch': 'Passwords do not match',
  'toast.passwordUpdated': 'Password updated',
  'toast.passwordUpdateFailed': 'Failed to update password',
  'toast.emailInvalid': 'That does not look like an email address',
  'toast.emailRequired': 'Enter a new email',
  'toast.emailLinkSent': 'Confirmation link sent. Open it from your new address.',
  'toast.emailCodeSent': 'Check your new email for the confirmation code',
  'toast.emailCodeRequired': 'Enter the code',
  'toast.emailUpdated': 'Email updated',
  'toast.emailChangeFailed': 'Failed to change email',
  'toast.accountDeleted': 'Your account has been deleted',
  'toast.accountDeleteFailed': 'Failed to delete account',
  // The file picker offers SVG among the images, so a refusal has to say which
  // formats actually work rather than only that this one does not.
  'toast.avatarTooLarge': 'That image is too large (maximum {limit}). Pick a smaller PNG, JPEG or WebP.',
  'toast.avatarBadFormat': 'That file is not a supported image. Pick a PNG, JPEG or WebP (SVG is not supported).',
  'toast.avatarUnreadable': 'That image could not be read. Pick a PNG, JPEG or WebP.',
  // Reached only when the encoded bytes are not a WebP container — the app encodes
  // one itself, so this is a "something is wrong with this build" message, not a
  // "pick a different file" one. It still has to be a sentence a user can act on.
  'toast.avatarNotWebp': 'That photo could not be encoded correctly. Try another image.',
  // No claim about what the photo is now: a failed save may have already replaced
  // the stored bytes, and the card re-reads the server rather than guess.
  'toast.usernameUpdated': 'Username updated',
  'toast.usernameSaveFailed': 'Failed to save your username. Please try again.',
  'toast.usernameOffline': 'Sign in to choose a username',
  'toast.avatarSaveFailed': 'Failed to save your photo. Please try again.',
  'toast.avatarRemoveFailed': 'Failed to remove your photo',
  // The photo's `usernameOffline`, and worded like it: nothing was written, and what
  // the person has to do is sign back in rather than try a different picture.
  'toast.avatarSignedOut': 'Sign in to change your photo',

  // ── Settings → Connections → Atlassian account ───────────────────────────
  // This credential is what the APP reads Jira with — the Tasks page, a ticket's
  // own page. It is not what the skills use: those go through the Atlassian MCP
  // server, registered with Claude Code in Application → Machine setup. Two
  // different connections, and the copy below has to keep saying so — someone who
  // reads "the skills need this" will disconnect it and wonder why /magic:start
  // still works.
  'jira.section': 'Atlassian account',
  'jira.notConfigured': 'Atlassian sign-in is not available in this build',
  'jira.notConfiguredHint': 'This copy of Magic Slash was built without an Atlassian application id.',
  'jira.notConnected': 'Not connected',
  'jira.notConnectedHint':
    'Shows your Jira tickets in the app. The skills read Jira through the MCP server instead (Application → Machine setup).',
  'jira.connect': 'Connect Atlassian',
  'jira.connecting': 'Waiting for your browser…',
  'jira.connectedFallback': 'Atlassian account connected',
  'jira.connectedHint': 'Connected to {site}',
  'jira.connectedHintNoSite': 'Connected to your Atlassian site',
  'jira.disconnect': 'Disconnect',
  'jira.unverified': 'Atlassian refused this connection',
  'jira.unverifiedHint':
    'The stored credential is no longer accepted — most likely the app was removed from your Atlassian account. Reconnect to grant access again.',
  'jira.reconnect': 'Reconnect',
  'jira.privacy':
    'The credential is nominative, encrypted by your operating system keychain, and stays on this machine. It is never sent to Magic Slash servers.',
  'jira.toast.cancelled': 'Connection cancelled in your browser',
  'jira.toast.timeout': 'Your browser never came back — the connection attempt expired',
  'jira.toast.failed': 'Could not connect your Atlassian account',
  'jira.toast.keychain':
    'Your operating system keychain is unavailable, so the Atlassian credential could not be stored encrypted. Nothing was saved — unlock your keychain and try again.',
  'jira.toast.notConfigured':
    'This build of Magic Slash has no Atlassian application id, so there is nothing to connect to.',
  'jira.toast.noCallbackServer':
    'Magic Slash cannot listen for your browser to come back. Restart the app and try again.',
  'jira.toast.connectFailed': 'Could not open the Atlassian sign-in page',
  'jira.toast.connectUnexpected': 'Could not start the Atlassian connection',
  'jira.toast.disconnectFailed': 'Could not disconnect your Atlassian account',

  // ── Membership roles (RoleSelect) ────────────────────────────────────────
  'role.user': 'User',
  'role.user.help': 'Can see the team and work on shared repositories',
  'role.admin': 'Admin',
  'role.admin.help': 'Can invite, change roles and archive the organization',

  // ── Settings → Agents ────────────────────────────────────────────────────
  'settings.agents.model.label': 'Model',
  'settings.agents.model.help': 'The Claude model a new session starts on. The list is the one your Claude Code offers in /model.',
  'settings.agents.model.cliDefault': 'Claude Code default',
  'settings.agents.model.cliDefaultHelp': 'Whatever /model is set to in Claude Code.',
  'settings.agents.model.loading': 'Asking Claude Code for its models…',
  'settings.agents.model.unavailable': 'Claude Code did not answer, so only its default is offered.',
  'settings.agents.list.section': 'Sessions list',
  'settings.agents.sort.label': 'Order',
  'settings.agents.sort.help': 'How the sessions are ordered in the left sidebar. Also in the menu at the top of the list.',
  'settings.agents.panel.section': 'Session panel',
  'settings.agents.archive.section': 'Archiving',
  'settings.agents.archive.confirm.label': 'Confirm before archiving',
  'settings.agents.archive.confirm.help': 'Ask before ⌘W or the title bar button archives a session. Off, the session is archived at once.',

  // ── Settings → Workflow ──────────────────────────────────────────────────
  'settings.workflow.section': 'Automatic chaining',
  'settings.workflow.confirm.label': 'Ask before chaining',
  'settings.workflow.confirm.help': 'When a step ends on an automatic link, the next skill starts on its own. These settings are yours, on every repository: the workflow itself is the repository’s.',
  'settings.workflow.confirm.never': 'Never',
  'settings.workflow.confirm.custom': 'Before a custom step',
  'settings.workflow.confirm.always': 'Always',
  'settings.workflow.limit.label': 'Steps chained in a row',
  'settings.workflow.limit.help': 'How many steps may follow each other on their own before the next one waits for you. Sending a message starts the count again.',
  'settings.workflow.limit.option': '{count} steps',
  'settings.workflow.limit.none': 'No limit',
  'settings.workflow.missing.label': 'Skill missing on this machine',
  'settings.workflow.missing.help': 'When the next step runs a custom skill you don’t have, such as one a teammate keeps in their own ~/.claude.',
  'settings.workflow.missing.stop': 'Stop and tell me',
  'settings.workflow.missing.skip': 'Skip that step',
  'settings.workflow.actions.section': 'Actions',
  'settings.workflow.actions.label': 'Run the repository’s actions',
  'settings.workflow.actions.help': 'A workflow can post on Slack once a step is done, such as the PR’s link once it is created. Actions go through your own Slack connection and are sent in your name: turn this off to never run them on your machine.',

  // ── Settings → Code & reviews ────────────────────────────────────────────
  'settings.code.section': 'Code',
  'settings.code.syntax.label': 'Code theme',
  'settings.code.syntax.help': 'Matches your interface theme unless overridden. The light or dark variant always follows the theme.',
  'settings.code.syntax.auto': 'Auto: {name}',
  'settings.code.font.label': 'Font size',
  'settings.code.font.help': 'File previews, diffs and plan history.',
  'settings.code.font.option': '{size}px',
  'settings.code.preview.language': 'Preview language',
  'settings.code.preview.failed': 'The preview could not be highlighted.',

  // ── Themes (registry labels) ─────────────────────────────────────────────
  'theme.dark': 'Dark',
  'theme.dark.help': 'The original, near-black.',
  'theme.midnight': 'Midnight',
  'theme.midnight.help': 'Dark, in deep blue.',
  'theme.espresso': 'Graphite',
  'theme.espresso.help': 'A softer, lighter dark grey.',
  'theme.highContrast': 'High contrast',
  'theme.highContrast.help': 'White on black, hard edges.',
  'theme.light': 'Light',
  'theme.light.help': 'Bright and neutral.',
  'theme.mist': 'Sky',
  'theme.mist.help': 'A bright sky blue.',
  'theme.sepia': 'Sepia',
  'theme.sepia.help': 'A warm ivory page.',
  'theme.daylight': 'Daylight',
  'theme.daylight.help': 'Black on white, hard edges.',

  // ── Settings → Notifications ─────────────────────────────────────────────
  'settings.notifications.section': 'Notifications',
  'settings.notifications.master.label': 'Enable notifications',
  'settings.notifications.master.help':
    'Everything below, plus the ones with no switch of their own: a colleague picking up a ticket you are on. Notifications never appear while the window is focused.',
  'settings.notifications.allOff':
    'Everything is silenced. Your per-kind choices are kept — turn this back on to see them again.',
  'settings.notifications.agents.section': 'Your sessions',
  'settings.notifications.agentWaiting.label': 'Session waiting for you',
  'settings.notifications.agentWaiting.help':
    'A session has stopped and needs an answer or a permission before it can carry on.',
  'settings.notifications.agentCompleted.label': 'Session finished',
  'settings.notifications.agentCompleted.help': 'A session has finished the task it was given.',
  'settings.notifications.pr.section': 'Pull requests',
  'settings.notifications.prReview.label': 'Review status changed',
  'settings.notifications.prReview.help':
    'The PR watcher saw the review status of one of your open PRs move — approved, changes requested, back to pending. Only on an actual change: switching the watcher on, or restarting the app, never notifies on its own.',
  'settings.notifications.prChangesRequested.label': 'Changes requested on your PR',
  'settings.notifications.prChangesRequested.help':
    'A reviewer asked for changes on one of your PRs. Comes from your team’s activity, so it arrives even for a PR no session on this machine is watching.',
  'settings.notifications.team.section': 'Team',
  'settings.notifications.digest.label': 'Daily team digest',
  'settings.notifications.digest.help':
    'Off by default. One notification at 9:00 AM summarizing your team’s last 24 hours (PRs shipped, tickets moved to Done). Nothing is sent when there was no activity.',
  'settings.notifications.team.footnote':
    'A colleague picking up a ticket you also have a session on follows the master switch above — it is rare enough not to need one of its own.',
  'toast.notificationsFailed': 'Failed to change the notification settings',

  // ── Settings → Appearance ────────────────────────────────────────────────
  'settings.appearance.themeSection': 'Theme',
  'settings.appearance.followsAccount':
    'The theme follows your account — every machine you sign in on uses it.',
  'settings.appearance.sidebars.section': 'Sidebars',
  'settings.appearance.sidebars.usageCard.label': 'Usage card',
  'settings.appearance.sidebars.usageCard.help':
    'The connected account and the Session (5h) / Weekly (7d) gauges, at the bottom of the left sidebar.',
  'settings.appearance.sidebars.agentContext.label': 'Session context',
  'settings.appearance.sidebars.agentContext.help':
    'The selected session’s context gauge, model, cost and elapsed time, at the top of the right sidebar.',
  'settings.appearance.sidebars.format.label': 'Format',
  'settings.appearance.sidebars.format.full': 'Expanded',
  'settings.appearance.sidebars.format.minimized': 'Compact',
  'settings.appearance.claudeTheme.label': 'Match Claude Code to the theme',
  'settings.appearance.claudeTheme.help':
    'Claude Code takes the chosen theme’s colours in the app’s terminals, repainting sessions that are already open. Claude Code started from a real terminal is left alone.',
  'settings.appearance.displaySection': 'Display',
  'settings.appearance.scale': 'Interface scale',
  // Written towards the two accelerator caps the row draws at the end of it — see
  // `SettingRow`'s `hintKeys`. Where the value is KEPT is the card's own note, below.
  'settings.appearance.scaleHelp':
    'Scales the whole window, terminal included — like a browser’s zoom. Also on',
  'settings.appearance.scaleNote': 'Stays on this machine, since it compensates for this screen.',
  'settings.appearance.zoomReset': 'Reset to 100%',
  'toast.themeChangeFailed': 'Failed to change theme',
  'toast.claudeThemeSyncFailed': 'Failed to change the Claude Code theme',
  'toast.sidebarPanelFailed': 'Failed to change the sidebar panels',

  // ── User profile fields ──────────────────────────────────────────────────
  'profile.role.product': 'Product',
  'profile.role.dev': 'Dev',
  'profile.role.design': 'Design',
  'profile.role.qa': 'QA',
  'profile.role.ops': 'Ops',
  'profile.role.manager': 'Manager',
  'profile.role.other': 'Other',
  'profile.level.beginner': 'Beginner',
  'profile.level.intermediate': 'Intermediate',
  'profile.level.expert': 'Expert',
  'profile.style.simple': 'Simple',
  'profile.style.technical': 'Technical',
  'profile.style.detailed': 'Detailed',

  'profile.section': 'Profile',
  'profile.description':
    'How Claude should talk to you. Every /magic:* skill reads this profile before it answers: your technical level sets how plain or precise the vocabulary is, your role how deep it goes (a summary for a manager, code-level detail for a developer), your communication style how long and how structured the answers are, and your languages which language it writes in. Your first name is used when it reads naturally. The profile follows your account, so every machine you sign in on uses the same one.',
  'profile.form.requiredWarning':
    'A name, a role and a technical level are required — nothing is saved until all three are filled in.',
  'profile.form.intro':
    'No profile yet. Claude uses it to adapt its vocabulary, level of detail and language to you.',
  'profile.form.firstName': 'First name',
  'profile.form.firstNamePlaceholder': 'Your first name',
  'profile.form.role': 'Role',
  'profile.form.level': 'Technical level',
  'profile.form.style': 'Communication style',
  'profile.form.languages': 'Languages',
  'profile.form.freeText': 'Anything else',
  'profile.form.freeTextPlaceholder': 'e.g., I prefer short answers, I work on mobile apps…',
  // ── What a row says when the field is empty ──────────────────────────────
  // An absence is NAMED rather than left blank: an empty value cell reads as a
  // rendering fault, where a row saying "Not set" reads as a fact about the profile
  // and is the one that tells somebody there is something here worth filling in. The
  // card draws these quiet, so a placeholder cannot be mistaken for an answer.
  'profile.form.notSet': 'Not set',
  // Its own wording, because "Not set" is the language of a field with options and
  // this one is prose.
  'profile.form.freeTextEmpty': 'Nothing written yet',
  // Likewise: "None chosen" is what an empty multi-select means, where "Not set"
  // would suggest a single answer nobody gave.
  'profile.form.noLanguages': 'None chosen',
  // Under the optional group of options, which is the only one that can be emptied
  // again. The two required groups deliberately cannot, so they do not say this.
  'profile.form.clearHint': 'Press the selected one again to clear it.',
  'profile.form.save': 'Save profile',
  'toast.profileSaved': 'Profile saved',
  'toast.profileSaveFailed': 'Failed to save profile',

  // ── Profile onboarding wizard ────────────────────────────────────────────
  'profile.wizard.titleEdit': 'Edit Profile',
  'profile.wizard.titleWelcome': 'Welcome to Magic Slash',
  'profile.wizard.nameQuestion': 'What’s your first name?',
  'profile.wizard.nameHelp': 'Claude will use this to personalize responses',
  'profile.wizard.roleQuestion': 'What’s your role?',
  'profile.wizard.roleHelp': 'Helps Claude adapt the level of detail',
  'profile.wizard.levelQuestion': 'Technical level',
  'profile.wizard.levelHelp': 'Claude adjusts vocabulary and explanations accordingly',
  'profile.wizard.level.beginner.help': 'New to development or technical concepts',
  'profile.wizard.level.intermediate.help': 'Comfortable with code and tooling',
  'profile.wizard.level.expert.help': 'Deep technical knowledge and experience',
  'profile.wizard.styleQuestion': 'Communication style',
  'profile.wizard.styleHelp': 'Optional — how should Claude communicate?',
  'profile.wizard.style.simple.help': 'Concise answers, minimal jargon',
  'profile.wizard.style.technical.help': 'Code-focused, precise terminology',
  'profile.wizard.style.detailed.help': 'Thorough explanations with context',
  'profile.wizard.languagesQuestion': 'Preferred languages',
  'profile.wizard.languagesHelp': 'Optional — Claude will communicate in these languages',
  'profile.wizard.freeTextQuestion': 'Anything else?',
  'profile.wizard.freeTextHelp': 'Optional — anything else Claude should know about you',
  'profile.wizard.finish': 'Finish',

  // ── Invitation onboarding wizard ─────────────────────────────────────────
  'invite.wizard.title': 'Join your team',
  'invite.wizard.acceptTitle': 'Accept your invitation',
  'invite.wizard.acceptHelp':
    'Paste the invitation token you received, then sign in or create your account. You’ll inherit your team’s configuration automatically.',
  'invite.wizard.tokenPlaceholder': 'Invitation token',
  'invite.wizard.newAccount': 'New account',
  'invite.wizard.existingAccount': 'Existing account',
  'invite.wizard.emailPlaceholder': 'Email (must match the invitation)',
  'invite.wizard.passwordPlaceholder': 'Password',
  'invite.wizard.accept': 'Accept',
  'invite.wizard.orgReposTitle': 'Your team’s repositories',
  'invite.wizard.orgReposHelp':
    'Point each one at its folder on this machine — the folder can be named anything. This is the only thing you set locally; everything else is inherited from your org.',
  'invite.wizard.noOrgRepos': 'Your team hasn’t shared any repository yet.',
  'invite.wizard.linkFolder': 'Link folder',
  'invite.wizard.changeFolder': 'Change',
  'invite.wizard.clone': 'Clone',
  'invite.wizard.cloning': 'Cloning…',
  'invite.wizard.cloneDestination': 'Clones go to',
  'invite.wizard.changeDestination': 'Change',
  'invite.wizard.mismatchWarning':
    'The folder “{folder}” doesn’t look like “{name}”. Link it anyway?',
  'invite.wizard.belongsToOther':
    'The folder “{folder}” looks like “{name}”, not this repository. Link it anyway?',
  'invite.wizard.linkAnyway': 'Link anyway',
  'invite.wizard.linkInvalid': 'Folder linked, but it can’t be used: {reason}',
  'invite.wizard.addOtherRepo': 'Add a repository your team doesn’t have',
  'invite.wizard.continue': 'Continue',
  'invite.wizard.doneTitle': 'You’re all set!',
  'invite.wizard.doneNamed': 'You’ve joined {name} and inherited its configuration.',
  'invite.wizard.doneFallback': 'You’ve joined your team and inherited its configuration.',
  'invite.error.tokenRequired': 'Invitation token is required',
  'invite.error.credentialsRequired': 'Email and password are required',
  'invite.error.confirmEmail': 'Please confirm your email, then reopen this wizard to continue.',
  'invite.error.acceptFailed': 'Failed to accept invitation',
  'invite.error.repoExists': '“{name}” already added',
  'invite.error.addReposFailed': 'Failed to add repositories',

  // ── Cloning a repository ─────────────────────────────────────────────────
  // Thrown by the main process as KEYS, not sentences: it has no language of its
  // own. See CLONE_ERROR_CODES in types.ts — anything not listed there is a git
  // message shown verbatim.
  'clone.error.noRemote': 'This repository has no known address — link an existing folder instead.',
  'clone.error.invalidRemote': 'This repository’s address isn’t a valid GitHub URL.',
  'clone.error.targetExists': 'A folder of that name already exists there — pick another destination, or link it.',
  'clone.error.ghMissing': 'The GitHub CLI (gh) isn’t installed. Install it, then run “gh auth login”.',
  'clone.error.notAuthenticated': 'You’re not signed in to GitHub. Run “gh auth login” in a terminal, then try again.',
  'clone.error.unknownRepo': 'This repository is no longer in your configuration.',

  // ── Durations ────────────────────────────────────────────────────────────
  'duration.lessThanMinute': '< 1 min',
  'duration.minutes': '{count} min',
  'duration.minutesShort': '{count}m',
  'duration.hours': '{count}h',
  'duration.hoursMinutes': '{hours}h {minutes}m',
  'duration.days': '{count}d',
  'duration.daysHours': '{days}d {hours}h',
  'duration.minutesSeconds': '{minutes}m {seconds}s',

  // ── PR review status (badges) ────────────────────────────────────────────
  'prReview.pending': 'Awaiting review',
  'prReview.commented': 'Commented',
  'prReview.changesRequested': 'Changes requested',
  'prReview.approved': 'Approved',

  // ── Plans ───────────────────────────────────────────────────────────────────
  'workspace.tabs.aria': 'Pages',
  'plans.title': 'Plans',
  'plans.section': 'Planning sessions',
  'plans.count.one': '1 plan',
  'plans.count.other': '{count} plans',
  'plans.filter.all': 'All repositories',
  'plans.filter.allStatuses': 'All statuses',
  'plans.filter.searchPlaceholder': 'Search by title or idea…',
  'plans.filter.clearSearch': 'Clear the search',
  'plans.status.planning': 'Being written',
  'plans.status.planned': 'Tickets filed',
  'plans.status.inProgress': 'In progress',
  'plans.status.done': 'Done',
  'plans.status.abandoned': 'Abandoned',
  'plans.tickets.none': 'no ticket',
  'plans.tickets.one': '1 ticket',
  'plans.tickets.other': '{count} tickets',
  // Beside the ticket count on a row of the list, and ONLY when there is at least one:
  // "no comment" on every plan nobody has written on would be a column of nothing.
  'plans.comments.one': '1 comment',
  'plans.comments.other': '{count} comments',
  'plans.noRepo': 'Unknown repository',
  // The last line of a list that came back at its cap. The read is newest-first, so what
  // is missing is always the old end of it.
  'plans.truncated': 'Only the most recent plans are listed. Older sessions are not shown here.',
  'plans.empty.title': 'No plan here yet',
  // Two situations in one sentence, because the page cannot tell them apart: nobody has
  // planned anything, or somebody has and their upload is off. `user_settings` is
  // own-rows-only by RLS, so a colleague's setting is unreadable from here.
  'plans.empty.body':
    'Run /magic:plan in Claude Code: it turns an idea into a reviewable spec, then into an epic and its stories. Every session lands here as it is written. If a teammate has planned something you cannot see, check that plan syncing is on in Settings.',
  'plans.empty.filteredTitle': 'No plan matches',
  'plans.empty.filteredBody':
    'No plan matches these filters. Change the search, or go back to all statuses and all repositories.',
  'plans.empty.noOrgTitle': 'No organization yet',
  'plans.empty.noOrgBody':
    'Plans are read from your account. Sign in, then join or create an organization: every session written on a repository you share shows up here.',
  // The one cause of an empty list the page can actually name: the reader's own
  // `planSyncEnabled` is an explicit false, so nothing they write is ever uploaded.
  'plans.empty.syncOffTitle': 'Your plan syncing is off',
  'plans.empty.syncOffBody':
    'Your plan sessions are not saved to the cloud, so nothing you write with /magic:plan can be listed here. Turn plan syncing back on in Settings, under Plan sessions, and your next sessions will show up.',
  // Drawn INSTEAD of any of the four empty states above: a read that errored is not an
  // empty account, and saying "no plan" over it would be inventing an answer.
  'plans.error.title': 'Plans could not be loaded',
  'plans.error.body':
    'The read did not go through, so nothing here reflects what your account holds. Check your connection, then try again.',

  // ── Plans · one plan ────────────────────────────────────────────────────────
  // Word for word the webapp's `/plans/[id]` wording (webapp/lib/i18n/en.ts): the two
  // surfaces show the same session to the same people, so a reader moving between them
  // must not have to re-learn what "no epic" or "spec pending" means here.
  'plans.detail.back': 'All plans',
  // The heading's button that opens a new agent on `/magic:plan-change <spec path>`. Not
  // the webapp's wording: the webapp has no agent to open. The three reasons are what the
  // button's tooltip and the line under the heading say when it is disabled.
  'plans.detail.change': 'Rework the plan',
  'plans.detail.changeHint': 'Opens a new session with /magic:plan-change on this spec. Add what should change, then send.',
  'plans.detail.changeNotOwner': 'Only the author can rework this plan: its spec file is on their machine.',
  'plans.detail.changeNoFile': 'The spec file of this plan is not on this machine.',
  'plans.detail.changeFailed': 'Could not check where the spec file of this plan is.',
  // The faces in the plan's bar: the colleagues who have it open right now (#306). The
  // stack's tooltip and its accessible name; each face is named by its own tooltip.
  'plans.presence.label': 'On this plan',
  'plans.detail.notFound': 'This plan is not available',
  'plans.detail.notFoundHint':
    'It does not exist, or it belongs to a repository none of your organizations share.',
  'plans.detail.idea': 'Idea',
  // Beside the Idea heading: what the section is.
  'plans.detail.ideaHint': 'The initial prompt given to /magic:plan',
  'plans.detail.noIdea': 'No idea was recorded for this plan.',
  'plans.detail.tickets': 'Created tickets',
  'plans.detail.noTickets': 'No ticket has been created from this plan yet.',
  'plans.detail.noEpic': 'No epic',
  'plans.kind.epic': 'Epic',
  // The row's one target, worded as the destination it is: the ticket opens HERE, in
  // the app, and nothing on this page goes out to the tracker any more.
  'plans.detail.openInTasks': 'Open this ticket in Tasks',
  'plans.detail.spec': 'Spec',
  'plans.detail.tabs': 'Plan sections',
  'plans.detail.statusFailed': 'The status could not be changed.',
  'plans.detail.statusDenied': 'You cannot change the status of this plan.',
  'plans.detail.specPending':
    'The spec has not been uploaded yet. It appears here as the session writes it.',
  // NEVER "truncated": the uploader stats the file before reading it, so nothing is ever
  // cut in half. The document is whole, on the author's machine, and simply never left
  // it. Said plainly because the reader's next move is to ask them for it.
  'plans.detail.specOversize':
    'The spec is too large to sync, so its content was never uploaded. Only the machine it was written on holds it.',
  // The OTHER oversize state, and the one the flag alone cannot tell you about: the spec
  // synced while it was still small enough, then grew past the ceiling. The row keeps the
  // last good markdown — the write path omits the column rather than nulling it — so the
  // reader gets a real document that is simply no longer the current one. Said above the
  // markdown, because a note under it would be read after the stale content it warns about.
  'plans.detail.specOversizeStale':
    'This copy is out of date. The spec has since grown too large to sync, so newer changes stay on the machine it was written on.',
  'plans.detail.syncedAt': 'Spec updated {when}',

  // ── Comments on a plan's spec ───────────────────────────────────────────────
  // The verb after the author's name in a comment's strip, exactly as a ticket's comments
  // carry one: "ada@example.com commented" is a sentence, where a bare address over a
  // paragraph is a header.
  // The comments did not load. Said out loud, because a page that silently drew none over
  // a failed read would be telling the reader their colleagues said nothing. The spec
  // itself is still readable, so this is a line under it rather than a block over it.
  'plans.comments.failed': 'The comments on this plan could not be loaded.',
  // The read worked and brought back only part of the thread. A separate line from the
  // failure above, because nothing here went wrong: every comment on screen is real. The
  // list is ordered oldest first, so what is missing is the most recent end, which is the
  // part a reader who has just written something would go looking for.
  'plans.comments.truncated':
    'This plan has more comments than the page can show. The most recent ones are not listed here.',

  // ── Editing a plan's spec ───────────────────────────────────────────────────
  // Beside the section heading, while nothing is being written: the only sign that the
  // text takes a caret. Any member of the plan's organization may edit it, so the sentence
  // does not say whose plan it is.
  'plans.edit.clickToEdit': 'Click the text to edit it',
  // The block being written in, for a screen reader: the field has no visible label.
  'plans.edit.field': 'Edit this passage (Markdown)',
  'plans.decisions.decision': 'Decision made',
  'plans.decisions.reason': 'Why',
  'plans.decisions.expand': 'Show the decision and why',
  'plans.decisions.collapse': 'Fold this question',
  'plans.sizing.verdict': 'Verdict',
  'plans.sizing.deliverables': 'Deliverables counted',
  'plans.sizing.splitting': 'Splitting mode',
  'plans.sizing.justification': 'Justification',
  'plans.specHeader.repository': 'Repository',
  'plans.specHeader.tracker': 'Tracker',
  'plans.specHeader.created': 'Created',
  'plans.specHeader.status': 'Status',
  'plans.specHeader.statuses.drafting': 'Drafting',
  'plans.specHeader.statuses.awaiting': 'Awaiting approval',
  'plans.specHeader.statuses.created': 'Tickets created',
  'plans.specHeader.statuses.abandoned': 'Abandoned',
  // Where the autosave is, beside the heading. It saves a few seconds after the last
  // keystroke, for everyone in the organization.
  'plans.edit.unsaved': 'Not saved yet',
  'plans.edit.saved': 'Saved',
  // Somebody saved between the reader's last save and this one. Nothing was written: the
  // text is still on screen, and Reload is the one action that throws it away.
  'plans.edit.conflict': 'Someone else changed this plan while you were writing. Your latest changes were not saved.',
  'plans.edit.conflictHint':
    'Copy your changes if you want to keep them, then reload to see the latest version.',
  'plans.edit.reload': 'Reload',
  'plans.edit.denied': 'You can no longer edit this plan. Nothing was saved.',
  'plans.edit.failed': 'The plan could not be saved. Your changes are still here.',
  // After a save that reached the cloud and not the file. `diverged` is the case worth
  // explaining: the file held work that was never synced, and it was kept on purpose.
  'plans.edit.fileDiverged':
    'Saved. The spec file on this machine was not updated, because it holds changes that have not been synced yet.',
  'plans.edit.fileError': 'Saved. The spec file on this machine could not be updated.',

  // A plan's external links: prototypes, mock-ups, notes kept in another tool. Stored
  // apart from the spec, drawn under the tickets.
  'plans.links.title': 'External links',
  'plans.links.add': 'Add a link',
  'plans.links.empty': 'No external link yet. Add a Figma prototype, a Notion page, a Claude artifact…',
  'plans.links.readFailed': 'The links of this plan could not be loaded.',
  'plans.links.other': 'Link',
  'plans.links.auto': 'Automatic',
  'plans.links.autoDetected': 'Automatic · {kind}',
  'plans.links.urlPlaceholder': 'Paste a link (Figma, Notion, Claude artifact…)',
  'plans.links.titlePlaceholder': 'Name (optional)',
  'plans.links.submit': 'Add',
  'plans.links.failed': 'The link could not be added.',
  'plans.links.remove': 'Remove this link',
  'plans.links.addedBy': '{kind} · added by {author}',
  'plans.access.title': 'Who can see and edit',
  'plans.access.share': 'Share',
  'plans.access.invitedHeading': 'Invited',
  'plans.access.inviteNamed': 'Invite {name}',
  'plans.access.personal': 'Personal',
  'plans.access.org': 'The whole organization',
  'plans.access.admins': 'Admins only',
  'plans.access.invited': 'Invited people',
  'plans.access.personalHint': 'Only you can see and edit this plan. The organization does not see it, admins included.',
  'plans.access.personalHintNoOrg': 'Only you can see and edit this plan.',
  'plans.access.invitedHintNoOrg': 'Only you and the people invited here can see, comment on and edit this plan.',
  'plans.access.inviteMenuNoOrg': 'Invite a member of your organizations',
  'plans.access.membersFailedNoOrg': 'The members of your organizations could not be loaded.',
  'plans.access.noOrgToShare': 'Nobody is available to share with: you are not part of any organization.',
  'plans.access.orgHint': 'The whole organization can see and edit this plan.',
  'plans.access.adminsHint': 'The organization can read and comment. Only its author and the admins can edit.',
  'plans.access.invitedHint': 'The organization can read and comment. Only its author, the admins and the people invited here can edit.',
  'plans.access.noneInvited': 'Nobody is invited yet.',
  'plans.access.collaboratorsFailed': 'The people invited to this plan could not be loaded. Reopen the plan to try again.',
  'plans.access.inviteMenu': 'Invite a member',
  'plans.access.noOneToInvite': 'Every member who can be invited already is.',
  'plans.access.membersFailed': 'The members of the organization could not be loaded.',
  'plans.access.remove': 'Remove {name}',
  'plans.access.denied': 'You cannot change who can edit this plan.',
  'plans.access.failed': 'The change could not be saved.',
  'plans.access.readOnly': 'You can read and comment on this plan, but not edit it.',
  'plans.access.readOnlyAdmins': 'Its author has kept editing to the organization admins.',
  'plans.access.readOnlyInvited': 'Its author has kept editing to the people they invited.',
  'plans.history.title': 'History',
  'plans.history.empty': 'No change recorded yet.',
  'plans.history.failed': 'The history of this plan could not be loaded.',
  'plans.history.truncated': 'Only the most recent changes are shown.',
  'plans.history.edited': 'edited the spec',
  'plans.history.statusChanged': 'changed the status',
  'plans.history.byHand': 'By hand',
  'plans.history.withClaude': 'With Claude',
  'plans.history.withClaudeAgent': 'With Claude · {agent}',
  'plans.history.pinned': 'pinned',
  'plans.history.removed': 'removed',
  'plans.history.formerMember': 'A former member',
  'plans.history.diffPrevious': 'What this revision changed',
  'plans.history.diffFirst': 'The first recorded revision, in full',
  'plans.history.diffOldestShown': 'The oldest revision shown',
  'plans.history.olderHidden': 'Older revisions exist but are not shown, so this one cannot be compared with the one before it.',
  'plans.history.diffFailed': 'This comparison could not be computed.',
  'plans.history.noChange': 'No difference between these revisions.',
  'plans.history.wholeSpec': 'Show the whole spec',
  'plans.history.changesOnly': 'Show the changes only',
  'plans.history.unfoldDiff': 'Show all changes ({count} lines)',
  'plans.history.foldDiff': 'Fold the changes',

  // The toolbar over a selection in a plan's spec: the kind of block, the marks, a link,
  // and the one way to comment on a passage.
  'plans.format.text': 'Text',
  'plans.format.h1': 'Heading 1',
  'plans.format.h2': 'Heading 2',
  'plans.format.h3': 'Heading 3',
  'plans.format.bullets': 'Bulleted list',
  'plans.format.numbers': 'Numbered list',
  'plans.format.todo': 'To-do list',
  'plans.format.quote': 'Quote',
  'plans.format.bold': 'Bold',
  'plans.format.italic': 'Italic',
  'plans.format.underline': 'Underline',
  'plans.format.strike': 'Strikethrough',
  'plans.format.code': 'Code',
  'plans.format.link': 'Link',
  'plans.format.comment': 'Comment',
  'plans.format.linkPlaceholder': 'Paste or type a link',
  'plans.format.linkApply': 'Apply',

  // ── Hours spent inside the skills ───────────────────────────────────────────
  'skillHours.hours': '{count}h',
  'skillHours.minutes': '{count} min',
  'skillHours.label.total': 'Total time',
  'skillHours.label.week': 'Time spent this week',
  'skillHours.label.last': 'Last used',
  'skillHours.since': 'since {date}',
  'skillHours.sinceMonday': 'since Monday',
  'skillHours.byAgent': 'on {name}',
  'skillHours.hint':
    'Counts runs that reported finishing, so an interrupted run adds nothing and a single run counts at most four hours — the real figure is higher.',

  // ── Team dashboard · hours, activity recording off ────────────────────────
  'skillHours.optIn.title': 'Your hours, once recording is on',
  'skillHours.optIn.body':
    'Activity recording is off, so no skill run is being logged and there is nothing to count here. Turn it on and the total starts again at your next run — the ones made in the meantime are not backfilled.',
  'skillHours.optIn.cta': 'Turn on recording',
  'skillHours.optIn.saving': 'Turning it on…',
  'skillHours.optIn.savedTitle': 'Recording is on.',
  'skillHours.optIn.savedBody':
    'Your hours show up here after your next skill run. Nothing to restart — the switch takes effect straight away.',
  'skillHours.optIn.note':
    'This is the “Share my activity with my team” switch. What it records is listed under Settings → Application, where you can turn it back off whenever you like.',
  'skillHours.optIn.failed': 'Could not save that. Try again.',

  // ── Skills ───────────────────────────────────────────────────────────────
  'skills.budget.section': 'Skills Budget',
  'skills.budget.help': 'What your skill descriptions cost in every single message.',
  'skills.budget.tokens': 'Tokens (estimate)',
  'skills.budget.chars': 'Characters (enforced)',
  'skills.budget.unitTokens': 'tokens',
  'skills.budget.unitChars': 'chars',
  'skills.budget.window.label': 'Context window',
  'skills.budget.window.small': '200K tokens',
  'skills.budget.window.large': '1M tokens',
  'skills.budget.window.auto': 'Auto',
  'skills.budget.window.autoValue': 'Auto · {window}',
  'skills.budget.window.autoDetected': 'Detected from the running session.',
  'skills.budget.window.autoNoAgent': 'No session running, falling back to {window}.',
  'skills.budget.window.forced': 'Forced to {window}, whatever is running.',
  'skills.budget.over':
    'Over budget by {over} characters. Claude Code is already listing some skills by name only: it can still run them, but it can no longer tell when they apply.',
  'skills.budget.truncated.one':
    '{count} skill has a description longer than {max} characters. Everything past that is cut before Claude sees it, so it is counted at {max} here.',
  'skills.budget.truncated.other':
    '{count} skills have descriptions longer than {max} characters. Everything past that is cut before Claude sees it, so they are counted at {max} here.',
  'skills.budget.cut': 'cut',
  'skills.budget.how': 'How this is computed',
  'skills.budget.card.scope.title': 'Every listed skill counts',
  'skills.budget.card.scope.body':
    'Claude Code injects a listing of every skill it can reach into the system prompt on every turn: its name, its description and its when_to_use. That means your plugins and the skills synced from your organisation too, not only the ones this page manages. The body of a SKILL.md is not in it: that loads only when the skill runs. Skills with disable-model-invocation, or set to off or user-invocable-only in skillOverrides, are left out; name-only ones cost their name. The skills bundled inside Claude Code have no file to read and are not counted, so /doctor stays the exact figure.',
  'skills.budget.card.formula.title': 'The budget follows the model',
  'skills.budget.card.formula.body':
    'budget = context window × 4 characters per token × {percent}%. For a {context}-token window that is {chars} characters, or about {tokens} tokens.',
  'skills.budget.card.cap.title': '{max} characters per skill',
  'skills.budget.card.cap.body':
    'Each entry’s description and when_to_use are capped at {max} characters combined (skillListingMaxDescChars). A longer description is truncated before it reaches Claude, which is why this page bills it at the cap and not at its real length. Put the key use case first.',
  'skills.budget.card.overflow.title': 'Over budget, descriptions vanish',
  'skills.budget.card.overflow.body':
    'The listing is not trimmed evenly. Claude Code drops whole descriptions, starting with the skills you invoke least, and lists those by name only. Claude can still run them if you name them, but it no longer knows when to reach for them on its own.',
  'skills.budget.card.why.title': 'Where the window comes from',
  'skills.budget.card.why.body':
    'Since the budget is a fraction of the context window, the same set of skills is comfortable on a 1M-token model and over budget on a 200K one. On Auto, the window is read from the session you have running: the real one, reported by Claude Code itself. The two presets override it, to see what your skills would look like on another model or when nothing is running. Either way it changes the gauges here and nothing else.',
  'skills.budget.card.override.title': 'Changing the budget itself',
  'skills.budget.card.override.body':
    'In settings.json, skillListingBudgetFraction raises the 1% share and skillListingMaxDescChars the per-skill cap; the SLASH_COMMAND_TOOL_CHAR_BUDGET environment variable replaces the whole computation with a fixed character count. Run /doctor to see what the listing really costs.',
  'skills.budget.details': 'Details by skill',
  'skills.budget.card.formula.fixed':
    'SLASH_COMMAND_TOOL_CHAR_BUDGET is set, so the budget is a fixed {chars} characters, or about {tokens} tokens, whatever the model.',
  'skills.budget.nameOnly':
    'name only',
  'skills.budget.tok': '{count} tok',
  'skills.weight.high': 'High',
  'skills.weight.medium': 'Medium',
  'skills.weight.low': 'Low',
  'skills.source.builtIn': 'built-in',
  'skills.source.custom': 'custom',
  'skills.source.repo': 'repo',
  'skills.source.plugin':
    'plugin',
  'skills.source.repoNamed': 'repo ({name})',

  'skills.warnings': 'Warnings',
  'skills.duplicates.one':
    '{count} skill name is used in multiple sources. Duplicates may cause unexpected behavior.',
  'skills.duplicates.other':
    '{count} skill names are used in multiple sources. Duplicates may cause unexpected behavior.',
  'skills.duplicates.times': '{count}x',
  'skills.longDesc.one':
    '{count} skill with a description longer than 110 words. Consider optimizing it for better performance.',
  'skills.longDesc.other':
    '{count} skills with descriptions longer than 110 words. Consider optimizing them for better performance.',
  'skills.longDesc.words': '{count} words',
  'skills.openInVSCode': 'Open in VS Code',
  'skills.fixWithAgent': 'Fix in a session',
  'skills.fixAgentName': 'Fix skill descriptions',

  'skills.editor.newTitle': 'New Skill',
  'skills.editor.editTitle': 'Edit {name}',
  'skills.editor.share': 'Share',
  'skills.editor.sharing': 'Sharing…',
  'skills.editor.name': 'Name',
  'skills.editor.nameHelp': 'Lowercase letters, numbers, and hyphens only',
  'skills.editor.description': 'Description',
  'skills.editor.descriptionPlaceholder': 'Describe when this skill should be triggered…',
  'skills.editor.allowedTools': 'Allowed Tools',
  'skills.editor.image': 'Image (optional)',
  'skills.editor.change': 'Change',
  'skills.editor.upload': 'Upload',
  'skills.editor.content': 'Content (Markdown)',
  'skills.editor.contentPlaceholder': 'Write the skill instructions in markdown…',
  'skills.editor.deleting': 'Deleting…',
  'skills.doc.readOnly': 'Read-only',
  'skills.doc.rendered': 'Rendered',
  'skills.doc.raw': 'Raw',
  'skills.doc.argumentHint': 'Argument:',
  'skills.doc.empty': 'This skill has no instructions.',

  'skills.error.nameRequired': 'Skill name is required',
  'skills.error.nameFormat': 'Skill name must contain only lowercase letters, numbers, and hyphens',

  'skills.allSkills': 'All skills',
  'skills.builtIn': 'Built-in',
  'skills.builtInHelp': 'Magic Slash core skills, powering the development workflow',
  'skills.custom': 'Custom',
  'skills.customHelp': 'User-level skills, available across all projects',
  'skills.import': 'Import',
  'skills.new': 'New skill',
  'skills.customEmpty': 'No custom skills yet',
  'skills.create': 'Create skill',
  'skills.importFolder': 'Import folder',
  'skills.repos': 'Repository Skills',
  'skills.reposHelp':
    'Skills defined in your registered repositories (.claude/skills/ and .claude/commands/)',
  'skills.reposEmpty': 'No skills found in registered repositories',

  // ── Terminal state (tray popover) ────────────────────────────────────────
  'agentState.working': 'Working',
  'agentState.waiting': 'Waiting for input',
  'agentState.idle': 'Idle',
  'agentState.completed': 'Completed',
  'agentState.error': 'Error',
  'duration.seconds': '{count}s',

  // ── Terminals page ───────────────────────────────────────────────────────
  'terminals.emptyTitle': 'Ready to work',
  'terminals.emptyHint': 'Launch a Claude Code session to start a ticket, open a pull request or run a review.',
  'terminals.launch': 'New session',
  'terminals.launching': 'Launching…',
  'terminals.paneEmpty': 'Drag a session here or create a new one',
  'chat.placeholder': 'Message Claude. Enter to send, Shift+Enter for a new line',
  'chat.send': 'Send',
  'chat.empty': 'Nothing said yet in this session.',
  'chat.greeting': 'Hello!',
  'chat.started': 'Conversation started on {date} at {time}',
  'chat.working': 'Claude is working…',
  'chat.waiting': 'Claude needs you in the terminal to carry on.',
  'chat.showTerminal': 'Open the terminal',
  'chat.mode.toTerminal': 'Switch to the terminal view',
  'chat.mode.toChat': 'Switch to the chat view',
  'chat.diff.truncated': 'Cut short here. The rest is in the file.',
  'chat.diff.showAll': 'Show all {count} lines',
  'chat.diff.close': 'Close',
  'chat.attach': 'Attach files',
  'chat.attach.remove': 'Remove',
  'chat.attach.drop': 'Drop to attach',
  'chat.queue.open': 'Queued prompts',
  'chat.queue.title': 'Queued',
  'chat.queue.hint': 'Sent to Claude in this order as soon as it can take them.',
  'chat.command.interactive': 'Opens in the terminal',
  'chat.question.unsupported': 'This one has to be answered in the terminal.',
  'chat.question.other': 'Or type your own answer…',
  'chat.command.clear': 'Start a new conversation',
  'chat.command.compact': 'Summarise the conversation to free up context',
  'chat.command.context': 'Show what fills the context window',
  'chat.command.cost': 'Show the cost of this session',
  'chat.command.init': 'Write a CLAUDE.md for this codebase',
  'chat.command.review': 'Review a pull request',
  'chat.command.security-review': 'Review the pending changes for security issues',
  'chat.command.release-notes': 'Show the Claude Code release notes',
  'chat.command.mcp': 'Manage MCP servers',
  'chat.command.model': 'Change the model',
  'chat.command.agents': 'Manage subagents',
  'chat.command.config': 'Open the Claude Code settings',
  'chat.command.permissions': 'Manage tool permissions',
  'chat.command.hooks': 'Manage hooks',
  'chat.command.memory': 'Edit the memory files',
  'chat.command.resume': 'Resume an earlier conversation',
  'chat.command.rewind': 'Go back to an earlier point of the conversation',
  'chat.command.status': 'Show the version, account and connection',
  'chat.command.usage': 'Show the plan usage limits',
  'chat.command.plugin': 'Manage plugins',
  'chat.command.doctor': 'Check the Claude Code installation',
  'chat.command.login': 'Sign in to Claude',
  'chat.command.logout': 'Sign out of Claude',
  'chat.command.help': 'List the commands',
  'terminals.invalidRepos.one':
    '{count} repository path is invalid. Re-point it in Settings before launching a session.',
  'terminals.invalidRepos.other':
    '{count} repository paths are invalid. Re-point them in Settings before launching a session.',
  'terminals.openSettings': 'Open settings',
  'terminals.maxAgents': 'Maximum of {count} sessions reached',
  'terminals.createFailed': 'Failed to create terminal',
  'terminals.duplicateFailed': 'Failed to duplicate session',

  // ── Quick launch ─────────────────────────────────────────────────────────
  'quickLaunch.placeholder': 'PROJ-123 /start',
  'quickLaunch.cmd.plan': 'Turn an idea into tickets',
  'quickLaunch.cmd.planChange': 'Rework a plan and its tickets',
  'quickLaunch.cmd.start': 'Start a new task',
  'quickLaunch.cmd.continue': 'Resume work on a task',
  'quickLaunch.cmd.commit': 'Create a commit',
  'quickLaunch.cmd.pr': 'Create a Pull Request',
  'quickLaunch.cmd.review': 'Review a PR',
  'quickLaunch.cmd.resolve': 'Address review feedback',
  'quickLaunch.cmd.done': 'Finalize after merge',

  // ── Tray popover ─────────────────────────────────────────────────────────
  'tray.popover.empty': 'No active sessions',
  'tray.popover.account': 'Account and settings',
  'tray.popover.quit': 'Quit the app',

  // ── Pending questions, answered from the panel ───────────────────────────
  // "Allow" and "Deny" are ours, not the TUI's: a permission prompt reaches us as
  // a one-line notification, never as the wording of its own buttons.
  'tray.question.waiting': '{count} awaiting an answer',
  'tray.question.allow': 'Allow',
  'tray.question.deny': 'Deny',
  'tray.question.openAgent': 'Open the session',
  // Shown when the question was answered elsewhere between two polls. Nothing was
  // written to the agent — that is the point of saying so.
  'tray.question.stale': 'Already answered — nothing was sent',
  'tray.question.unsupported': 'Answer this one in the app',
  // A question that takes several answers: the boxes are ticked here and sent in one
  // go, so it needs a button of its own — the rows no longer answer on click.
  'tray.question.multiHint': 'Pick as many as you like',
  'tray.question.send': 'Send',
  // The card renders at most four rows. Saying how many it left out beats a list that
  // silently looks complete — "Open the agent" right below is where the rest is.
  'tray.question.moreOptions': '{count} more in the session',

  // ── Compact relative time (agent info sidebar) ───────────────────────────
  // Abbreviations, one key per unit: French shortens a day to "j" and a week to
  // "sem", so a shared suffix table would not survive translation.
  'relative.now': 'now',
  'relative.minutes': '{count}min',
  'relative.hours': '{count}h',
  'relative.days': '{count}d',
  'relative.weeks': '{count}w',
  'relative.months': '{count}mo',
  'relative.years': '{count}y',
  'relative.seconds': '{count}s',
  'relative.justNow': 'just now',
  'relative.ago': '{time} ago',

  // ── Agent info sidebar ───────────────────────────────────────────────────
  'agentInfo.closeAgent': 'Archive the session',
  'agentInfo.notGitRepo': 'Not a git repo',
  'agentInfo.unknownError': 'Unknown error',
  'agentInfo.selectRepositories': 'Select repositories',
  'agentInfo.removeRepository': 'Remove repository',
  'agentInfo.copyBranch': 'Copy branch name',
  'agentInfo.uncommittedChanges': 'Uncommitted changes',
  'agentInfo.noUncommittedChanges': 'No file being modified or waiting to be committed',
  'agentInfo.commits': 'Commits',
  // The tail of the commits card, which opens the rows it is counting. `count` is the
  // HIDDEN ones — total minus what stands at rest — so the line says what pressing it
  // gains rather than restating the summary already on the heading.
  'agentInfo.commitsMore': '+{count} more commits',
  'agentInfo.commitsLess': 'Show fewer',
  'agentInfo.viewOnGitHub': 'View on GitHub',
  'agentInfo.viewPullRequest': 'View Pull Request',
  'agentInfo.addTicket': 'Add a ticket',
  'agentInfo.addTicketHint': 'Pick a ticket to attach to this session',
  'agentInfo.plan': 'Plan',
  'agentInfo.planNumber': 'Plan #{number}',
  'agentInfo.planOpen': 'Open this plan in Plans',
  'agentInfo.addPlan': 'Add plan',
  'agentInfo.addPlanHint': 'Pick a plan to attach to this session',
  'agentInfo.ticketOpenInTasks': 'Open this ticket in Tasks',
  'agentInfo.titlePlaceholder': 'Enter title…',
  'agentInfo.addTitle': 'Click to add title',
  'agentInfo.descriptionPlaceholder': 'Enter description…',
  'agentInfo.descriptionHint': 'Enter to save, Shift+Enter for a new line, Esc to cancel',
  'agentInfo.addDescription': 'Click to add description',
  'agentInfo.noScripts': 'No scripts found',
  'agentInfo.context': 'Context',
  'agentInfo.tokensOf': '{used} / {total} tokens',
  'agentInfo.model.change': 'Change model',
  'agentInfo.restart': 'Restart Claude Code',
  'sessions.title': 'Claude Code sessions',
  'sessions.loading': 'Loading sessions…',
  'sessions.empty': 'No session history',
  'sessions.untitled': 'Untitled session',
  'sessions.elsewhere': 'Other machine',
  'sessions.resumeFailed': 'Could not resume this session',
  'sessions.new': 'New session',
  'chat.resuming': 'Resuming the session…',
  'chat.newSessionHint': 'Press Ctrl+C again to start a new session',
  'sessions.newFailed': 'Could not start a new session',
  'agentInfo.model.loading': 'Claude Code is listing its models…',
  'agentInfo.model.unavailable': 'Claude Code did not answer',
  'agentInfo.noActiveAgent': 'No active session',
  'agentInfo.addRepository': 'Add a repository',
  'agentInfo.noRepositories': 'No repositories configured',
  'agentInfo.openRepoInEditor': 'Open the repository in VS Code',
  'agentInfo.openRepoOnGitHub': 'Open the repository on GitHub',
  'agentInfo.runScripts': 'Run a script',
  'agentInfo.stopScript': 'Stop script',
  'agentInfo.openServerInBrowser': 'Open {url} in the browser',
  'agentInfo.launchDone': 'Launch magic-done',
  'agentInfo.files.one': '{count} file',
  'agentInfo.files.other': '{count} files',

  // ── Live spec panel (agent info sidebar, planning agents) ────────────────
  // Shown while an agent is `planning`, and again beside the ticket once it is
  // `planned`. The panel reads the LOCAL file at metadata.specPath, so every one
  // of these has to read sensibly with the file still half-written — or absent.
  // Not an error: /magic:plan announces where the spec WILL be before it writes
  // a byte, so "no such file" is the normal first state of a planning agent.
  'agentInfo.spec.drafting': 'Drafting the spec…',
  'agentType.coder': 'Coder',
  'toast.defaultAgentTypeUpdated': 'Default session type updated',
  'agentType.planner': 'Planner',
  'agentType.coderHint': 'Implementation cycle: start, commit, PR, review, done',
  'agentType.plannerHint': 'Planning: turn an idea into a spec, then into tickets',
  'settings.defaultAgentType.title': 'Default session type',
  'settings.defaultAgentType.description': 'What a new session is, before any skill says otherwise. You can still switch it from the title bar until the session reports a status.',
  'agentInfo.spec.open': 'Open the spec full screen',
  'agentInfo.spec.scrollToTop': 'Back to top',
  'toast.commandSent': 'Sent {command} to the session',
  'toast.commandCopied': 'Auto-launch disabled — {command} copied to clipboard',
  'toast.commandFailed': 'Failed to launch command',

  // ── Pull request card (agent info sidebar) ───────────────────────────────
  // The card renders from `prUrl` alone, so most of these have to read sensibly
  // against a snapshot with almost nothing in it.
  'agentInfo.pr.title': 'Pull request',
  'agentInfo.pr.number': 'Pull request #{number}',
  'agentInfo.pr.state.open': 'Open',
  'agentInfo.pr.state.draft': 'Draft',
  'agentInfo.pr.state.merged': 'Merged',
  'agentInfo.pr.state.closed': 'Closed',
  // The checklist line; the count rides beside it as '{passed}/{total} passed'.
  'agentInfo.pr.checksLabel': 'CI checks',
  'agentInfo.pr.checksPassed': '{passed}/{total} passed',
  'agentInfo.pr.noChecks': 'no checks',
  'agentInfo.pr.checkPassed': 'Passed',
  'agentInfo.pr.checkFailed': 'Failed',
  'agentInfo.pr.checkRunning': 'Running',
  'agentInfo.pr.checkSkipped': 'Skipped',
  // The watcher caps the list it persists; whatever it left out is counted here
  // rather than silently missing.
  'agentInfo.pr.checksMore': '+{count} not listed',
  // GitHub computes mergeability lazily and answers UNKNOWN on the first read
  // after a push, so the absence of an answer is its own state — never a conflict.
  'agentInfo.pr.mergeable': 'No conflicts',
  'agentInfo.pr.conflicts': 'Conflicts to resolve',
  'agentInfo.pr.mergeableUnknown': 'Mergeability unknown',
  // The checklist line; the total rides beside it and the breakdown below it.
  'agentInfo.pr.commentsLabel': 'Comments',
  'agentInfo.pr.comments': 'comments',
  'agentInfo.pr.commentsInline': 'inline',
  'agentInfo.pr.commentsConversation': 'in conversation',
  'agentInfo.pr.commentsReviews': 'review summaries',
  'agentInfo.pr.commentCount': '{count} comment',
  'agentInfo.pr.commentsCount': '{count} comments',
  'agentInfo.pr.commentsLoading': 'Reading the comments…',
  'agentInfo.pr.commentsEmpty': 'Nothing written — approvals only.',
  // Shared by the thread rows: a resolved thread and a resolved comment are the
  // same state, so there is one word for it.
  'agentInfo.pr.commentResolved': 'Resolved',
  // On a thread row: how many answers the exchange has drawn. Two keys because the
  // catalogue interpolates but does not pluralise.
  'agentInfo.pr.threadReply': '{count} reply',
  'agentInfo.pr.threadReplies': '{count} replies',
  // The diff moved under the thread, so the line it was left on is gone.
  'agentInfo.pr.threadOutdated': 'outdated',
  'agentInfo.pr.threadOpen': 'open',
  'agentInfo.pr.threadReview': 'review',
  // Handing a thread to the agent. The row's own action first: it composes the context —
  // the file, the line, the hunk and every message — and pastes it into the prompt. It does
  // NOT send it, which is why the label says "prepare" rather than "resolve": the reader
  // reads the paste, asks for what they want, and presses Enter themselves.
  //
  // The command it used to name is gone from the label because it is gone from the paste:
  // `/magic:resolve` reads its argument as a ticket id and re-fetches the whole pull request,
  // so leading with it would resolve everything and ignore the thread (`prThreadContext`
  // carries the finding). A label promising a command the paste no longer carries would be
  // the one place a reader could still believe it does.
  //
  // `prepare*`, never `send*`, and the keys are held to it: `filePreview.sendToAgent` below
  // is a control that really does hand text over, and a key here that borrowed its verb
  // would put the catalogue at odds with the one thing this whole feature promises.
  // The same action over the whole fold. Only the inline threads still open go — a resolved
  // or outdated one is settled, and the conversation and review rows have no state of their
  // own to be open or not.
  //
  // `prepareAllThreads` rather than the plural of the key above: elsewhere in this namespace
  // a singular/plural pair (`threadReply`/`threadReplies`) is one message counted two ways,
  // and these two are different actions — one row against the whole list.
  'agentInfo.pr.prepareAllThreads': 'Prepare the unresolved threads',
  // Why the two controls above can be dead. The target is ONE named agent — the one this
  // card belongs to — so "no agent is running" would be a plain falsehood whenever another
  // agent happens to be selected. Nothing to point at instead: a thread row has no Copy.
  'agentInfo.pr.prepareThreadNoAgent': 'The session this pull request belongs to is no longer running',
  // The write did not reach a pty. A toast rather than a state in the row: 500 px of row
  // has no space for a sentence, and this card already reports its failures this way.
  'agentInfo.pr.prepareThreadFailed': 'Could not reach the session — nothing was pasted',
  'agentInfo.pr.lastChecked': 'checked {time}',
  'agentInfo.pr.neverChecked': 'never checked',
  'agentInfo.pr.refresh': 'Refresh now',
  // On the button itself, beside the "checked …" stamp it moves — the tooltip
  // above carries the "now".
  'agentInfo.pr.refreshAction': 'Refresh',
  'agentInfo.pr.refreshFailed': 'Could not refresh the pull request',
  // The watcher being off is a setting, not a failure — so it gets its own band,
  // and the band carries the switch rather than sending anyone to Settings.
  'agentInfo.pr.watcherOff': 'PR watching is off',
  'agentInfo.pr.watcherOffStale': 'Everything below is from the last reading.',
  'agentInfo.pr.watcherOffEmpty': 'Turn it on to see state, checks and reviews.',
  'agentInfo.pr.enableWatcher': 'Turn on',
  'agentInfo.pr.enableWatcherFailed': 'Could not turn PR watching on',
  // Every failure names its remedy: an error without one leaves the same dead end
  // as the blank card this replaced.
  'agentInfo.pr.error.noToken': 'No GitHub token',
  'agentInfo.pr.error.noTokenFix': 'Run `gh auth login` in a terminal, then refresh.',
  'agentInfo.pr.error.notFound': 'Pull request not found',
  'agentInfo.pr.error.notFoundFix': 'It may have been deleted, or the URL points at another repository.',
  'agentInfo.pr.error.forbidden': 'Access denied',
  'agentInfo.pr.error.forbiddenFix': 'Your token lacks the `repo` scope — run `gh auth refresh -s repo`.',
  'agentInfo.pr.error.rateLimited': 'GitHub rate limit reached',
  'agentInfo.pr.error.rateLimitedFix': 'Wait for the quota to reset, or slow the polling down in Settings.',
  'agentInfo.pr.error.network': 'GitHub unreachable',
  'agentInfo.pr.error.networkFix': 'Check your internet connection, then refresh.',

  // ── Pull request comments panel ──────────────────────────────────────────
  // The sliding drawer the card's thread rows open. Its own namespace rather than
  // more `agentInfo.pr.*`: that block is copy for a 500 px card, written to read
  // against a snapshot with almost nothing in it, and this is a reading surface.
  // The few strings the two genuinely share — "resolved", "outdated", the reply
  // counts — are reused from there rather than restated here.
  'prComments.openThread': 'Open the conversation',
  // Beside the repo slug in the header. Two keys: the catalogue interpolates but
  // does not pluralise.
  'prComments.threadCount': '{count} thread',
  'prComments.threadsCount': '{count} threads',
  // The three groups, in reading order. "Review threads" are the comments left on
  // specific lines; the other two are the PR's own conversation and the verdicts.
  'prComments.codeCommentCounter': '{current} / {total} code comments',
  'prComments.previousCodeComment': 'Previous code comment',
  'prComments.nextCodeComment': 'Next code comment',
  // On an outdated thread: the line it was written against, which is the only
  // location it still has — the current file no longer has one.
  'prComments.outdatedAnchor': 'originally line {line}',
  // The fold over the run-up of a long hunk — a comment on a hundred-line range
  // arrives as a hundred-line excerpt. Both counts are offered so the label can say
  // what appears and how much there is in total; see `foldHunk`.
  'prComments.hunkUnfold': 'Show all {total} lines',
  'prComments.hunkFold': 'Hide the {count} lines above',
  // The fold on a thread heading. A resolved thread starts shut.
  'prComments.showThread': 'Show this thread',
  'prComments.hideThread': 'Hide this thread',
  'prComments.empty': 'Nothing to read — this pull request has no comments.',

  // ── Status picker (agent info sidebar) ───────────────────────────────────
  // Lower-case on purpose — these render inside a small inline pill, not as a
  // sentence, and they are a different register from the `status.*` badges.
  'statusPill.none': 'no status',
  'statusPill.planning': 'planning',
  'statusPill.planned': 'planned',
  'statusPill.inProgress': 'in progress',
  'statusPill.committed': 'committed',
  'statusPill.readyForPR': 'ready for PR',
  'statusPill.prCreated': 'PR created',
  'statusPill.ciGreen': 'CI green',
  'statusPill.inReview': 'in review',
  'statusPill.changesRequested': 'changes requested',
  'statusPill.reviewAddressed': 'review addressed',
  'statusPill.prMerged': 'PR merged',

  // ── Repository scripts ───────────────────────────────────────────────────
  'scripts.dev': 'Dev',
  'scripts.build': 'Build',
  'scripts.test': 'Test',
  'scripts.lint': 'Lint',
  'scripts.other': 'Other',

  // ── Script terminal modal ────────────────────────────────────────────────
  'scriptModal.exited': 'Script ended — output kept',

  // ── App shell ────────────────────────────────────────────────────────────
  'app.connecting': 'Connecting…',
  'app.closeAgent.title': 'Archive this session?',
  'app.closeAgent.body': 'It leaves your list, and its history is kept.',
  'app.closeAgent.confirm': 'Yes, archive it',
  'app.later': 'Later',
  'app.errorBoundary.title': 'Something went wrong',
  'app.errorBoundary.body': 'An unexpected error occurred.',
  'app.errorBoundary.retry': 'Try again',

  'gate.cloudNotConfigured.title': 'Cloud not configured',
  'gate.cloudNotConfigured.body':
    'Magic Slash requires its cloud backend, but it isn’t configured in this build. Please reinstall an official build or set the Supabase environment before launching.',
  'gate.connectionLost.title': 'Connection lost',
  'gate.connectionLost.body':
    'Magic Slash can’t reach its backend. Check your internet connection — the app stays locked until the connection is restored.',

  // ── Repository setup onboarding ──────────────────────────────────────────
  'repoSetup.title.empty': 'Add your first repository',
  'repoSetup.title.fix': 'Finish setting up your repositories',
  'repoSetup.body.empty':
    'Magic Slash needs at least one repository to launch sessions on. Pick a local folder to get started.',
  'repoSetup.body.fix':
    'These repositories have no usable local folder yet. Pick one for each so sessions can run on them.',
  'repoSetup.reason.noLocalPath': 'No folder on this machine',
  'repoSetup.reason.missing': 'Folder no longer exists',
  'repoSetup.reason.notGit': 'Not a git repository',
  'repoSetup.chooseFolder': 'Choose folder',
  'repoSetup.addRepo': 'Add a repository',
  'repoSetup.resolved': 'Ready',
  'repoSetup.error': 'Could not use this folder',
  'repoSetup.unverified': 'Folder saved, but its state could not be checked — try again',

  // ── Invalid repositories ─────────────────────────────────────────────────
  'toast.repoRepointed': 'Re-pointed “{name}”',
  'toast.repoRepointFailed': 'Failed to re-point “{name}”',
  'toast.repoInvalidMissing': 'Repository “{name}” folder is missing ({path})',
  'toast.repoInvalidNotGit': 'Repository “{name}” is not a git repository ({path})',
  'toast.repointFolder': 'Re-point folder',
  'toast.cloudWriteFailed':
    'Failed to save your {kind} to the cloud. Your latest change may not have been saved — reloaded from the server.',
  'toast.cloudWriteKind.config': 'settings',
  'toast.cloudWriteKind.agents': 'sessions',
  'toast.connectionLost':
    'Lost the connection to the cloud — retrying. Your changes won’t be saved until it is back.',
  'toast.connectionRestored': 'Back online',

  // ── Agent relaunched in its repository ───────────────────────────────────
  'toast.cwdRelaunched': 'Session relaunched in “{dir}”',
  'toast.cwdRelaunchOffer':
    'This session is still running in “{current}”. Relaunching it in “{dir}” will clear its current conversation.',
  'toast.cwdRelaunchAction': 'Relaunch in “{dir}”',

  // ── Login screen ─────────────────────────────────────────────────────────
  'login.signinTitle': 'Sign in to Magic Slash',
  'login.resetTitle': 'Reset your password',
  'login.resetHelp':
    'Reset your password with a 6-digit code sent to your email — no link to click.',
  'login.signinHelp':
    'Sign in to continue. Magic Slash keeps your config, sessions and history in your organization’s cloud.',
  'login.emailPlaceholder': 'Email',
  'login.codePlaceholder': '6-digit code',
  'login.passwordPlaceholder': 'Password',
  'login.newPasswordPlaceholder': 'New password',
  'login.signIn': 'Sign in',
  'login.sendCode': 'Send code',
  'login.resetPassword': 'Reset password',
  'login.forgotPassword': 'Forgot password?',
  'login.backToSignIn': 'Back to sign in',
  'login.error.emailRequired': 'Email is required',
  'login.error.resetEmailFailed': 'Could not send the reset email',
  'login.error.codeAndPasswordRequired': 'Code and new password are required',
  'login.error.resetFailed': 'Could not reset your password',
  'login.error.credentialsRequired': 'Email and password are required',
  'login.error.authFailed': 'Authentication failed',

  // ── Terminal view ────────────────────────────────────────────────────────
  'terminalView.scrollToBottom': 'Scroll to bottom',
  'terminalView.dropFiles': 'Drop files here',

  // ── Update splash ────────────────────────────────────────────────────────
  'update.checking': 'Checking for updates…',
  'update.downloading': 'Downloading the new version…',
  'update.downloadingVersion': 'Downloading Magic Slash v{version}',
  'update.restartingIn': 'Magic Slash will restart in {seconds}…',
  'update.failed': 'Download failed',
  'update.retry': 'Try again',

  // ── Update overlay & What’s New ──────────────────────────────────────────
  'update.installFailed': 'The update was downloaded, but the restart failed. Please quit and reopen the app.',
  'update.debugMenu': 'Debug menu',
  'whatsNew.title': 'What’s New',
  // The three headings `CHANGELOG.md` uses, and the dialog prints whichever ones the
  // release has. A heading this build does not know is drawn under its own raw English
  // word and a neutral dot rather than dropped — a release note is worth more than a
  // category label. The webapp's `/changelog` keeps the same three under
  // `site.changelog.*`, which is the page this dialog is typeset after.
  'whatsNew.added': 'Added',
  'whatsNew.changed': 'Changed',
  'whatsNew.fixed': 'Fixed',

  // ── Modals & file preview ────────────────────────────────────────────────
  'modal.closeEsc': 'Close (Esc)',
  'modal.fullScreen': 'Full screen (⌘⇧F)',
  'modal.exitFullScreen': 'Exit full screen (⌘⇧F)',
  'live.live': 'Live',
  'live.reconnecting': 'Reconnecting…',
  'live.liveTitle': 'Real-time updates',
  'live.reconnectingTitle': 'Reconnecting to the real-time feed…',
  'filePreview.binary': 'Binary file',
  'filePreview.unreadable': 'Cannot read file',
  'filePreview.changeCounter': '{current} / {total} changes',
  'filePreview.previous': 'Previous',
  'filePreview.next': 'Next',
  'filePreview.previousChange': 'Previous change',
  'filePreview.nextChange': 'Next change',
  'filePreview.linesAdded': '{count} lines added',
  'filePreview.linesRemoved': '{count} lines removed',
  // Repo-wide since the drawer stacks every changed file of a repository: the ruler
  // spans the whole review, and the counter walks its changes across file boundaries.
  'filePreview.changeRuler': 'Changes in this repository',
  'filePreview.showWholeFile': 'Show the whole file',
  'filePreview.showChangesOnly': 'Show only the changes',
  'filePreview.linesHidden': '{count} lines hidden',
  'filePreview.filesChanged.one': '1 file changed',
  'filePreview.filesChanged.other': '{count} files changed',
  'filePreview.collapseFile': 'Collapse this file',
  'filePreview.expandFile': 'Expand this file',
  'filePreview.noChangedFiles': 'No changed files',
  // Two segments naming both readings of a markdown file. "Raw" is the diff — the
  // default — and "Rendered" the formatted document, which has no diff to show.
  'filePreview.markdownMode': 'Markdown display mode',
  'filePreview.markdownRaw': 'Raw',
  'filePreview.markdownRendered': 'Rendered',
  // Commenting on a diff. `commentLine` and `commentLines` are two keys rather than one
  // with a plural rule: "Lines 12–12" reads as a bug, and a suffix rule that works in
  // English does not survive translation.
  'filePreview.commentPlaceholder': 'What should the session know about these lines?',
  // Its twin for a comment on the RENDERED markdown, where there are no lines to ask about
  // — the passage is the whole of the anchor. A second key rather than a vaguer sentence
  // covering both: the composer prompt is where a reader learns what the comment will be
  // attached to, and "these lines" over a quotation says something false about it.
  //
  // This whole quote-anchored family now serves the agent sidebar's LIVE SPEC as well as a
  // review card, and it needed nothing added for it — which is worth writing down, because a
  // reader looking for the spec panel's own strings would otherwise go looking for keys that
  // do not exist. Not one of them names a diff, a review or a pull request: they speak of a
  // passage, of a document, and of an anchor that can no longer be found, which is exactly
  // what a spec rewritten under the reader produces. `filePreview` is the namespace of the
  // component doing the rendering, not of the review it was first written for.
  'filePreview.commentQuotePlaceholder': 'What should the session know about this passage?',
  'filePreview.commentDelete': 'Delete',
  // Two forms again, and the plural one carries the count as well as the gesture: the pill
  // on a commented line draws an icon rather than a number, so this tooltip is the only
  // thing that tells a reader a line holds more than one comment — and that clicking its
  // marker again is how they reach the next.
  'filePreview.commentMarker': 'Read this comment',
  'filePreview.commentMarkers': '{count} comments on these lines',
  // The gutter mark on a document drawn as lines, in its three states. The first is the one
  // that appears under the cursor on a line nobody has written about: it names the gesture,
  // because there is nothing there to read yet. The other two name what is already there,
  // and the plural carries the count for the same reason the markers above do: the mark
  // draws a number only from two upwards, so this is where a reader learns there is one.
  'filePreview.commentOnLine': 'Comment on this line',
  'filePreview.commentsOnLine.one': 'Read this comment',
  'filePreview.commentsOnLine.other': '{count} comments on this line',
  'filePreview.commentLine': 'Line {start}',
  'filePreview.commentLines': 'Lines {start}–{end}',
  // The third form of the same label, for a comment on the rendered markdown. It names the
  // KIND of anchor and not its position, because a quotation has none to name: the card and
  // the list both show the passage itself right underneath, which is what says which one.
  'filePreview.commentQuoted': 'Quoted passage',
  // What the RAW diff says about the quote-anchored comments on the same file. They are
  // still there — toggling a view is not a way to delete a comment — but their anchor is a
  // passage of the rendered document, which this view is not showing. Two keys rather than a
  // plural rule, the convention this catalogue keeps: the singular carries no count at all,
  // since "1 comment" is a number a reader has to read before learning there is one.
  'filePreview.commentQuoteOtherView.one':
    'A comment here is anchored to a quoted passage — switch to the rendered view to see it in place.',
  'filePreview.commentQuoteOtherView.other':
    '{count} comments here are anchored to quoted passages — switch to the rendered view to see them in place.',
  // And what the RENDERED view says about a quotation it can no longer find, the document
  // having been rewritten under it. The comment is kept and says so: losing the text a
  // comment was about is not a reason to lose the comment, and a marker silently missing
  // would leave a reader to work out for themselves that anything had happened.
  'filePreview.commentQuoteLost.one':
    'A comment’s quoted passage is no longer in this document — the comment is kept, its anchor is lost.',
  'filePreview.commentQuoteLost.other':
    '{count} comments’ quoted passages are no longer in this document — the comments are kept, their anchors are lost.',
  // What the disclosure's summary offers, beside the sentence above. The comments
  // themselves are the only place an orphan can be drawn at all — it has no passage to be
  // drawn beside — so this is the way into them.
  'filePreview.commentQuoteLostShow': 'Show them',
  // The thread. `Reply` is the button that opens a box under a comment; the placeholder is
  // what that box asks for. Separate from `commentPlaceholder` above because a reply is not
  // asked about a passage — the passage is the comment it is answering.
  'filePreview.commentReply': 'Reply',
  'filePreview.commentReplyPlaceholder': 'Reply to this comment…',
  // A write that did not land, on the card it was attempted from. Said out loud for
  // `plans.comments.failed`'s reason read the other way round: a page that closed the box
  // over a refused write would be telling the reader they had said something they have
  // not. Two keys and not one, because "could not be saved" over a comment that is still
  // there after a refused Delete names the wrong action.
  // No button on the strip: the text is still in the box, so pressing Save again IS the
  // retry, and a second way to do it would be a control the reader has to choose between.
  'filePreview.commentSaveFailed': 'This comment could not be saved. It stays here until it is.',
  'filePreview.commentDeleteFailed': 'This comment could not be deleted. It is still stored.',
  // What the bar's trigger reads. Spelled out rather than left as a bare digit beside the
  // icon: a speech bubble and a number make the reader infer what is being counted, and the
  // one control that hands a whole review to the agent is worth naming. Two keys rather
  // than a plural rule, the convention this catalogue keeps throughout — a suffix rule that
  // works in English does not survive translation.
  // `none` is its own key, not `other` with a zero in it: "0 comments" is a number a
  // reader has to parse before learning there is nothing there, and this label sits on a
  // control that is disabled in exactly that state.
  'filePreview.commentCount.none': 'No comments',
  'filePreview.commentCount.one': '1 comment',
  'filePreview.commentCount.other': '{count} comments',
  // The list itself, as the trigger's tooltip and the panel's heading. It says what the
  // button opens, where the label above says what the button counts.
  'filePreview.reviewComments': 'Comments on this review',
  // The same list, opened from a card HEADER rather than from a review's footer bar — the
  // live spec in the agent sidebar. A separate sentence and not the one above: what it opens
  // there is one document's comments, and a spec is not a review. The COUNT beside it is the
  // `commentCount.*` triple, shared with the bar — the header changes the type scale, not the
  // wording.
  'filePreview.documentComments': 'Comments on this document',
  // What a comment with no line range is about. Nothing creates one today; the list has
  // to name it anyway, since the store's shape allows it.
  'filePreview.commentOnFile': 'Whole file',
  // Sending, and the reason it cannot be done. Two keys rather than one sentence with a
  // condition in it: the second is a tooltip on a disabled control, and its whole job is
  // to say which of the two states this is.
  'filePreview.sendToAgent': 'Send to the session',
  'filePreview.sendNoAgent': 'No session is running — copy the comments instead',
  // The same disabled control, one placement over, where the reason is a different one: the
  // send has ONE possible target — the agent the document belongs to — so "no agent is
  // running" would be false in the ordinary case of another agent being selected. This names
  // what actually happened, and points at Copy beside it.
  'filePreview.sendAgentGone':
    'The session this document belongs to is no longer running — copy the comments instead',
  // The send did not reach a pty. TWO keys, on the pattern above: the short one is the button's
  // own text, the hint is its tooltip — and the hint says the part that actually matters, which
  // is that nothing was thrown away. The store cannot warn about this in advance: an exited
  // terminal keeps its entry with `state` set to `completed`/`error`, the same two values an
  // agent idle at its prompt reports, so the failure is only knowable after the write.
  'filePreview.sendFailed': 'Not delivered',
  'filePreview.sendFailedHint':
    'Could not reach the session — your comments were kept, copy them instead',

  // ── Tasks ────────────────────────────────────────────────────────────────
  'tasks.title': 'Tasks',
  // Neutral on purpose. This header sits above BOTH halves of the page, and it read
  // "Open issues" — GitHub's word — over a card listing a Jira sprint's To Do
  // column, where "open" is not a state a ticket has.
  'tasks.section': 'To do',
  'tasks.loading': 'Reading your backlog…',
  'tasks.reload': 'Reload',
  'tasks.openIssue': 'Open on GitHub',
  // The row's copy control, and what it says once the write has landed. Two keys
  // rather than one with a state suffix: "Copied" is a sentence about what just
  // happened, not a variant of the verb, and a locale may not phrase it as one.
  'tasks.copyLink': 'Copy the link',
  'tasks.copyLinkDone': 'Link copied',
  // The per-repository counter, and the page total above it. `.one` keeps `{count}`
  // so both catalogues can decide whether to spell the number out.
  'tasks.openCount.one': '{count} to do',
  'tasks.openCount.other': '{count} to do',
  // The query reads one capped page, so a big backlog comes back truncated. Saying
  // "50" there would be a wrong number; this one says what was actually read.
  'tasks.openCount.truncated': 'showing {count} of {total}',
  // The sprint's own form. Jira's search returns no total at all, so a truncated
  // sprint can say there is more and never how much more — see `sprintCountLabel`.
  'tasks.sprintCount.truncated': 'showing the first {count}',
  // GitHub's native issue hierarchy, both read in the same query as the rows.
  // The badge carries the number because that is what fits on a row; the parent's
  // title goes in the hover text, where there is room for it.
  // The author is shown as a bare `@login` on the row — the sentence that says what
  // that login IS lives in the hover text, where there is room for it.
  'tasks.authorHint': 'Opened by {login}',
  'tasks.parent': '↳ #{number}',
  'tasks.parentHint': 'Sub-issue of #{number} — {title}',
  // Shown only on an issue that HAS sub-issues, so `.one` starts at 1, never 0.
  'tasks.subIssues.one': '{count} sub-issue · {completed} done',
  'tasks.subIssues.other': '{count} sub-issues · {completed} done',
  // Said of a repository that ANSWERED and has nothing waiting. Distinct from
  // `tasks.jira.error.noSprint`, which is a board with no sprint running at all.
  'tasks.noOpenIssues': 'nothing to do',
  'tasks.failed': 'could not be read',
  // No repository resolves to a tracker at all — a different situation from an empty
  // backlog, and the fix is a per-repository setting, so the hint says where it is.
  'tasks.noRepos': 'No repository is tracked on GitHub or in Jira.',
  'tasks.noReposHint':
    'Open Settings → Repositories → Tracker and point a repository at GitHub or Jira; what is waiting on it shows up here.',
  // Repositories ARE tracked on GitHub — none of them has an address this page can
  // turn into an owner and a repo, which is a different fix from the one above.
  'tasks.noAddress': 'No GitHub-tracked repository has a readable address.',
  'tasks.noAddressHint':
    'Their issues URL does not look like `https://github.com/owner/repo` — fix it in Settings → Repositories → Issues, or clear it to use the repository’s own remote.',
  // Both trackers are in use and neither side has usable coordinates. Naming only
  // one of the two fixes would send half the repositories to the wrong field.
  'tasks.noCoordinates': 'No repository here has coordinates this page can read.',
  'tasks.noCoordinatesHint':
    'A GitHub repository needs an issues URL like `https://github.com/owner/repo`; a Jira one needs its project key. Both live in Settings → Repositories.',

  // ── Tasks · the board's four columns ─────────────────────────────────────
  // Deliberately the plainest words available. These are headings on a board read at a
  // glance, not a vocabulary — every Jira site already has its own names for its
  // columns, and the ticket's own status pill is where those are shown.
  'tasks.board.blocked': 'Blocked',
  'tasks.board.backlog': 'Backlog',
  // Everything in flight, whatever a site calls it: "In Review", "QA", "Waiting for
  // deploy" all land here. Splitting them into columns nobody here can name is detail
  // that belongs on the board the tickets came from.
  'tasks.board.progress': 'In progress',
  'tasks.board.done': 'Done',
  // One word for all four empty columns. What is interesting about an empty Blocked
  // column is that it is empty; four different sentences would make the reader read
  // them all to find out nothing is there.
  'tasks.board.empty': 'Nothing here',
  // A column's count when its read stopped at the budget — `100+` rather than `100`.
  // Jira's cursor pagination returns no total, so "100 of 412" is a sentence this side
  // cannot write; the `+` is the whole of what can honestly be said.
  'tasks.board.cappedCount': '{count}+',
  'tasks.board.cappedHint': 'This column has more tickets than the sprint read could load. Search to reach them.',

  // ── Tasks · the controls at the top of the board ─────────────────────────
  // They narrow what is ON SCREEN and read nothing: the page already holds every
  // open ticket of every repository, so this is a pass over an array in memory.
  'tasks.filter.searchPlaceholder': 'Search by ticket ID or title…',
  // The same box on a board some column of which was cut short. It says how far the box
  // reaches BEFORE anything is typed, which is when "will this find the ticket I cannot
  // see" is the question being asked.
  'tasks.filter.searchSprintPlaceholder': 'Search the whole sprint by ticket ID or title…',
  'tasks.filter.searchingSprint': 'Searching the whole sprint…',
  // The reach past the board failed. Worded so it cannot be read as "the board is
  // broken": everything on screen is real, and only the tickets beyond it are missing.
  'tasks.filter.searchFailed': 'Could not search beyond the loaded tickets. What is shown is still accurate.',
  // The repository picker with nothing to name — only reachable before the first read
  // lands, or on an account with no readable repository at all. It is not a "no filter"
  // state: the board always shows exactly one repository.
  'tasks.filter.pickRepo': 'Pick a repository',
  // The two orders the sort picker offers, and its own default. "Newest" is what the
  // page has always done; "Priority" is the other question asked of a sprint. Only
  // the Jira half can be reordered — a GitHub issue has no priority — so a mixed page
  // changes only where there is something to change.
  'tasks.filter.sortRecent': 'Newest',
  'tasks.filter.sortPriority': 'Priority',
  // The epic picker's cleared state. Shown only when some visible ticket actually
  // hangs off an epic, so a GitHub-only page never sees this control at all.
  'tasks.filter.allEpics': 'All epics',
  // The agent picker: its cleared state, then its two halves. Shown only on a board
  // somebody actually has an agent on — with none, "With an agent" would empty the page
  // and "Without" would change nothing. Both entries are about the TICKET rather than
  // about the person: a teammate's agent counts, which is what the board's own marker
  // says too.
  'tasks.filter.anyAgent': 'Any session',
  'tasks.filter.withAgent': 'With a session',
  'tasks.filter.withoutAgent': 'Without a session',
  'tasks.filter.clearSearch': 'Clear the search',
  // The filters matched nothing. Deliberately NOT one of the four states above:
  // those send the reader to a settings field, which would be the page blaming its
  // own configuration for a mistyped ticket id.
  'tasks.filter.noMatch': 'No ticket matches these filters.',
  'tasks.filter.clearAll': 'Clear the filters',

  // ── Tasks · the issue page ───────────────────────────────────────────────
  // Opened by clicking a row, it REPLACES the list and shows the half of an issue
  // the list deliberately does not carry: the body, the state, the labels, who it
  // is assigned to.
  'tasks.detail.loading': 'Reading the ticket…',
  // The way back to the backlog. Says where it goes rather than "Back", which on a
  // page reached from one place is a wasted word.
  'tasks.detail.back': 'To do',
  // The list only ever holds OPEN issues, but the page re-reads by number and the
  // issue may have been closed since — so both states have a word here.
  'tasks.detail.stateOpen': 'Open',
  'tasks.detail.stateClosed': 'Closed',
  // The byline under the title. Two forms because GitHub reports no author for an
  // issue opened by an account that has since been deleted, and "opened this" with
  // nobody in front of it is not a sentence.
  'tasks.detail.openedBy': '@{login} opened this on {date}',
  'tasks.detail.openedOn': 'Opened on {date}',
  // ── The ticket's conversation, rendered in full on BOTH halves ───────────
  // How many comments the ticket HAS, in the byline under the title. Both trackers
  // send the bodies back in the response the panel already makes, so both are shown
  // — the GitHub half used to carry this count alone and send the reader to
  // github.com to read what it was counting.
  'tasks.detail.commentCount.one': '{count} comment',
  'tasks.detail.commentCount.other': '{count} comments',
  // The header strip of the body box, GitHub's own wording: "@login commented".
  // `description` is what it says when there is no author to attribute it to.
  'tasks.detail.commented': 'commented',
  // The strip over a comment the tracker attributes to nobody — an app or an
  // automation posting through Jira's API, a GitHub account since deleted.
  // `tasks.detail.commented` covers the ones with an author.
  'tasks.detail.comment': 'Comment',
  // A comment somebody rewrote after posting it. The word on the strip, the date in
  // the hover text: the strip has one line and a name already on it.
  'tasks.detail.edited': 'edited',
  'tasks.detail.editedOn': 'Edited on {date}',
  // A comment with no body at all — an attachment, a reaction, or a transition Jira
  // recorded as one. Still a turn in the conversation, so it keeps its card and says so.
  'tasks.detail.emptyComment': 'This comment has no text.',
  // Said only when the thread is longer than the page that arrived — a reader who
  // reaches the bottom of a truncated thread must not believe they have read all of
  // it. WHICH END differs by tracker and the two sentences say so: Jira pages its
  // comment field from the start, while `ISSUE_DETAIL_QUERY` deliberately asks GitHub
  // for the last N, because a long GitHub issue is read for where it got to.
  'tasks.detail.commentsShowingFirst': 'showing the first {count}',
  'tasks.detail.commentsShowingLast': 'showing the last {count}',
  'tasks.detail.description': 'Description',
  'tasks.detail.labels': 'Labels',
  'tasks.detail.assignees': 'Assigned to',
  // Both shown only when GitHub reported the hierarchy: an empty "Sub-issues" block
  // on the vast majority of issues would be a row of nothing on every page.
  'tasks.detail.subIssues': 'Sub-issues',
  'tasks.detail.subIssuesDone': '{completed} of {count} done',
  // The plan a ticket came out of. "Planned in" rather than "Plan", because the block
  // names a session someone ran, not a document attached to the ticket.
  'tasks.detail.plannedIn': 'Planned in',
  'tasks.detail.openPlan': 'Open this plan',
  'tasks.detail.parent': 'Parent issue',
  // Said rather than left blank: an empty row next to a label reads as "not loaded
  // yet", which is a different thing from "there are none".
  'tasks.detail.none': 'none',
  'tasks.detail.emptyBody': 'This ticket has no description.',
  // The page's one affirmative action: a terminal in the repository's local
  // folder, pre-filled with `/magic:start` and this issue's URL. The second line
  // is that sentence said plainly — the label alone says what the button IS, and
  // people hesitate over a button whose consequence they have to guess.
  'tasks.startAgent': 'Start a session',
  'tasks.detachAgent': 'Detach',
  'tasks.detachAgentHint': 'Take this session off the ticket. The session keeps running.',
  'tasks.pick.title': 'Pick a ticket for {name}',
  'tasks.pick.hint': 'Click a card to attach it. Nothing is started.',
  'tasks.pick.cancel': 'Cancel',
  'tasks.pick.fallbackAgent': 'this session',
  'plans.pick.title': 'Pick a plan for {name}',
  'plans.pick.hint': 'Click a plan to attach it. Nothing is started.',
  'plans.hasAgentHint': 'A session is working on this plan.',
  'plans.detachAgentHint': 'Take this session off the plan. The session keeps running.',
  // The alternative to starting the work: an agent that reads the issue and talks about it.
  // "Discuss with", not "Start a discussion with" — it sits directly under "Start an agent",
  // and two labels both opening on the same verb read as two ways of doing one thing.
  'tasks.discussAgent': 'Discuss in a session',
  // Why the action is unavailable, said in place instead of failing on the click.
  // A team repository that nobody has bound to a folder on THIS machine has no
  // directory to open a terminal in, and the fix is a setting.
  'tasks.noLocalRepo': 'No local folder is bound to this repository on this machine.',
  'tasks.noLocalRepoHint':
    'Set its folder in Settings → Repositories, and a session can be started on its issues from here.',
  // The backstop, for the case the check above passed and the launch still failed.
  // Deliberately generic: the underlying error is an untranslated English sentence.
  'tasks.startFailed': 'This ticket could not be handed to a session.',
  // The same fact as `tasks.noLocalRepo`, in the length a card's hover text has. The
  // card has no room for the sentence and its fix, so it says why the button is off and
  // the ticket's own page says what to do about it.
  'tasks.startNoPath': 'No local folder is bound to this repository.',
  // The row marker: an issue somebody is already working on. A word next to the
  // dot, because a bare coloured dot says nothing on its own.
  'tasks.viewAgent': 'View the session',
  'tasks.hasAgentHint': 'A session is already working on this ticket.',

  // ── Tasks · GitHub is not connected ──────────────────────────────────────
  'tasks.github.title': 'GitHub is not connected.',
  'tasks.github.body': 'Tasks reads your backlog through the GitHub CLI’s login.',
  'tasks.github.checking': 'Checking GitHub…',
  'tasks.github.notInstalled': 'The `gh` command is not installed on this machine.',
  'tasks.github.install': 'Install gh',
  'tasks.github.installing': 'Installing…',
  // The login is interactive and browser-bound: nothing here can run it, so the
  // step is stated as a command rather than offered as a button.
  'tasks.github.loginStep': 'Then run this in a terminal, and reload:',
  // The one-line form, shown above the Jira cards when GitHub is the only half that
  // could not be read. The full panel would cover a sprint that is perfectly fine.
  'tasks.github.partialFix': 'Run `gh auth login` in a terminal and reload to see your GitHub issues too.',

  // ── Tasks · why one repository could not be read ─────────────────────────
  // Deliberately NOT `agentInfo.pr.error.*`: that copy says "Pull request not
  // found", which is the wrong sentence on a repository group.
  'tasks.error.noToken': 'No GitHub token',
  'tasks.error.noTokenFix': 'Run `gh auth login` in a terminal, then reload.',
  'tasks.error.notFound': 'Repository not found',
  'tasks.error.notFoundFix': 'It may have been renamed or deleted, or your token cannot see it.',
  'tasks.error.forbidden': 'Access denied',
  'tasks.error.forbiddenFix': 'Your token lacks the `repo` scope — run `gh auth refresh -s repo`.',
  'tasks.error.rateLimited': 'GitHub rate limit reached',
  'tasks.error.rateLimitedFix': 'Wait for the quota to reset, then reload.',
  'tasks.error.network': 'GitHub unreachable',
  'tasks.error.networkFix': 'Check your internet connection, then reload.',

  // ── Tasks · the Jira half ────────────────────────────────────────────────
  // A Jira-tracked repository contributes its project's ACTIVE SPRINT: the To Do
  // column, plus the In Progress tickets an agent is already on.
  'tasks.jira.openIssue': 'Open in Jira',
  // The card header's word for the two Jira outcomes that are not failures. Both
  // are states of the board or of this machine, so neither wears "could not be read".
  'tasks.jira.noSprintBadge': 'no active sprint',
  'tasks.jira.notConnectedBadge': 'not connected',
  // The way out of the `not-connected` card: the Connections tab, where the
  // Atlassian connection lives.
  'tasks.jira.connect': 'Open Settings',
  // Jira repositories ARE configured, and none of them names a project — the Jira
  // twin of `tasks.noAddress`, and a different field from the GitHub one.
  'tasks.jira.noProject': 'No Jira-tracked repository has a project key.',
  'tasks.jira.noProjectHint':
    'Set it in Settings → Repositories → Jira; the active sprint of that project shows up here.',

  // ── Tasks · one Jira ticket's page ───────────────────────────────────────
  // The Jira half of the issue page. Almost every word on it is already in
  // `tasks.detail.*` and is reused verbatim — the ones here are the ones a GitHub
  // issue has no equivalent of, plus the one failure that means something else on
  // a ticket than it does on a project.
  // Jira names both people on a ticket and the page shows both. GitHub's panel says
  // "Assigned to" and nothing else, which is why only this one is new.
  'tasks.jira.detail.reporter': 'Reported by',
  // The row's hover text for the same person. A NAME and not a handle, so the
  // sentence names them rather than prefixing an `@` the way the GitHub row does.
  'tasks.jira.reporterHint': 'Reported by {name}',
  // The priority badge's hover text, on both the row and the ticket page. Names the
  // FIELD, because the badge shows only its value — a site whose priorities are
  // called "P1"…"P4" gives the reader nothing to recognise it by otherwise.
  'tasks.jira.priorityHint': 'Priority: {name}',
  // The epic badge's hover text, on both the row and the ticket page. Names the FIELD
  // for `priorityHint`'s reason, and carries the KEY as well: the title is what the
  // badge truncates first, and the key is what identifies the epic in Jira itself.
  'tasks.jira.epicHint': 'Epic {key}: {title}',
  // The two blocks the side card grows once the byline has scrolled behind the pinned
  // bar. They are the byline's own fields, said again where they are still readable —
  // which is why they are LABELS here and bare badges up there: in a card of named rows
  // a pill with no row title is the one thing that has to be guessed at.
  'tasks.jira.detail.epic': 'Epic',
  'tasks.jira.detail.priority': 'Priority',
  // WHICH sprint the board is showing, on the chip beside the repository picker. It
  // sat next to the repository name until the page became one board per repository —
  // which made the sprint a property of the whole page rather than of a card, and left
  // it with no card to hang off. Untranslated VALUE — the name is whatever the team
  // called the sprint in Jira — so only the hover text is a sentence.
  'tasks.jira.sprintHint': 'Active sprint: {sprint}',
  // HTTP 404 on the ONE-TICKET read, where `tasks.jira.error.notFound` is about the
  // project: "check the project key" is the wrong advice for a ticket that was
  // deleted or moved, and the key is demonstrably right — the list read used it.
  'tasks.jira.detail.notFound': 'Ticket not found',
  'tasks.jira.detail.notFoundFix':
    'It may have been deleted, or moved to another project — reload the list to see what is still in the sprint.',

  // ── Tasks · why one Jira project could not be read ───────────────────────
  // Deliberately NOT `tasks.error.*`: every fix there is about the GitHub CLI, and
  // "run `gh auth login`" is not advice about an Atlassian account.
  'tasks.jira.error.notConnected': 'No Atlassian account connected',
  'tasks.jira.error.notConnectedFix':
    'Connect your Atlassian account in Settings → Connections to read this project’s sprint.',
  // Not a failure: the project answered, and its board has nothing running. Said
  // apart from "nothing to do", which is a sprint that IS running.
  'tasks.jira.error.noSprint': 'No active sprint',
  'tasks.jira.error.noSprintFix': 'This project has no sprint in progress — start one in Jira, then reload.',
  'tasks.jira.error.unauthorized': 'Atlassian refused the credential',
  'tasks.jira.error.unauthorizedFix': 'Reconnect your Atlassian account in Settings → Connections, then reload.',
  'tasks.jira.error.forbidden': 'Access denied',
  'tasks.jira.error.forbiddenFix':
    'Your Atlassian account cannot browse this project — ask a Jira administrator for access.',
  'tasks.jira.error.notFound': 'Project not found',
  'tasks.jira.error.notFoundFix':
    'It may have been renamed or deleted — check the project key in Settings → Repositories → Jira.',
  'tasks.jira.error.rateLimited': 'Jira rate limit reached',
  'tasks.jira.error.offline': 'Jira unreachable',
  'tasks.jira.error.serverError': 'Jira could not answer',
  'tasks.jira.error.serverErrorFix': 'The site returned something we could not read — try again in a few minutes.',
  // HTTP 400, and the likeliest Jira failure of the lot: a project key that does not
  // exist, or a project with no Jira Software in it — where `sprint` is not a field.
  'tasks.jira.error.invalidQuery': 'Jira rejected the query',
  'tasks.jira.error.invalidQueryFix':
    'Check the project key in Settings → Repositories → Jira; a project without Jira Software has no sprints.',
  // ── Settings → Security & Access ─────────────────────────────────────────
  'security.current': 'This device',
  'security.others': 'Other devices and browsers',
  'security.app': 'Magic Slash app',
  'security.appOn': 'Magic Slash on {name}',
  'security.browserOn': '{browser} on {os}',
  'security.unknown': 'Unknown device',
  'security.activeNow': 'Active now',
  'security.lastActive': 'Last active {time}',
  'security.signedInOn': 'signed in {date}',
  'security.revoke': 'Sign out',
  'security.revoked': 'Device signed out',
  'security.revokeAll': 'Sign out everywhere else',
  'security.revokeAllHint': 'Every device and browser above will have to sign in again.',
  'security.revokedAll': 'Every other device is signed out',
  'security.noOthers': 'No other device or browser is signed in to your account.',
  'security.loading': 'Loading your devices…',
  'security.loadFailed': 'Could not load your devices',
  'security.retry': 'Retry',
  'security.signedOut': 'Sign in to see the devices connected to your account.',
  'security.note': 'A device you sign out may keep access for up to an hour, until its current token expires.',
  'security.geoCredit': 'Locations are approximate, from the IP address (IP geolocation by DB-IP).',
}
