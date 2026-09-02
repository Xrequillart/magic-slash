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
  'menu.newAgent': 'New Agent',
  'menu.tasks': 'Tasks',
  'menu.skills': 'Skills',
  'menu.team': 'Team',
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
  'notification.waiting.title': 'An agent is waiting for you',
  'notification.waiting.body': '{subject} needs your answer to continue',
  'notification.completed.title': 'An agent has finished',
  'notification.completed.body': '{subject} finished its task',
  /**
   * How an agent is named in the two bodies above — see notifications/agent-message.ts.
   * The quotes live in the catalogue because they are not the same character in
   * every language, and `subject.namedWithRepo` exists because the name an agent is
   * created with is a generated counter ("Claude 3") that says nothing on its own.
   */
  'notification.agent.subject.named': '"{name}"',
  'notification.agent.subject.namedWithRepo': '"{name}" ({repo})',
  'notification.agent.subject.unknown': 'An agent',
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
  'notification.pickup.body': 'A teammate is now working on {ticket} — you have an agent on it too',

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
  'settings.tab.account': 'Account',
  'settings.tab.connections': 'Connections',
  'settings.tab.organization': 'Organization',
  'settings.tab.repositories': 'Repositories',
  'settings.tab.claudeCode': 'Claude Code',
  'settings.tab.notifications': 'Notifications',
  'settings.tab.appearance': 'Appearance',
  'settings.tab.language': 'Language & Region',
  'settings.tab.application': 'Application',
  'settings.tab.shortcuts': 'Shortcuts',
  'settings.tab.about': 'About',
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
  'titlebar.toggleAgentsList': 'Toggle agents list (⌘B)',
  'titlebar.normalViewTitle': 'Normal view (⌘/)',
  'titlebar.splitViewTitle': 'Split view (⌘/)',
  'titlebar.info': 'Info',

  // ── Left sidebar ─────────────────────────────────────────────────────────
  'sidebar.newAgent': 'New agent',
  // The same action as a compact chip on the AGENTS header, where there is no room
  // for the visible shortcut hint the full-width entries carry — so the shortcut
  // moves into the tooltip and the accessible name.
  'sidebar.newAgentShortcut': 'New agent ({shortcut})',
  'sidebar.skills': 'Skills',
  'sidebar.tasks': 'Tasks',
  'sidebar.team': 'Team',
  'sidebar.settings': 'Settings',
  'sidebar.login': 'Login / Sign up',
  'sidebar.accountFallback': 'Account',
  'sidebar.agents': 'Agents',
  // The sort control on the AGENTS header. Icon only, so the current mode is named in
  // the tooltip and the accessible name — and each option carries the one line that
  // says what it costs, since two of the three let the list move under the cursor.
  'sidebar.sort.title': 'Sort agents — {mode}',
  'sidebar.sort.recent': 'Newest first',
  'sidebar.sort.recent.help': 'An agent keeps its row for as long as it lives.',
  'sidebar.sort.status': 'By status',
  'sidebar.sort.status.help': 'Waiting and failed first. The list moves as agents work.',
  'sidebar.sort.repository': 'By repository',
  'sidebar.sort.repository.help': 'Grouped by project, A to Z. Unlinked agents last.',
  // A count above the list, not a group header: the agents it counts keep their row.
  'sidebar.needsAttention': 'Needs attention',
  'sidebar.paneLeft': 'Left',
  'sidebar.paneRight': 'Right',
  'sidebar.empty': 'No agents yet. Click “New agent” to start.',
  'sidebar.dropAgents': 'Drop agents here',

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
  'usage.noDataHint': 'No usage data yet — Claude.ai Pro/Max after the first agent activity.',
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
  'settings.repos.section': 'Repositories',
  'settings.repos.add': 'Add repository',
  'settings.repos.adding': 'Adding…',
  'settings.repos.emptyTitle': 'No repositories configured',
  'settings.repos.emptyHint': 'Click to add your first project',
  'settings.repos.personal': 'Personal',
  'settings.repos.noPersonal': 'No personal repository — use “Add repository” above.',
  'settings.repos.noTeam': 'No shared repository in this organization yet.',
  'settings.repos.connected': 'Connected',
  'settings.repos.noRemote': 'No remote',
  'settings.repos.noLocalFolder': 'No local folder — click to set it',
  'settings.repos.agents.one': '{count} agent',
  'settings.repos.agents.other': '{count} agents',

  // ── Settings → Claude Code ───────────────────────────────────────────────
  'settings.claude.account': 'Account',
  'settings.claude.name': 'Name',
  'settings.claude.email': 'Email',
  'settings.claude.organization': 'Organization',
  'settings.claude.plan': 'Plan',
  'settings.claude.noAccount': 'No Claude account detected.',

  'settings.launchMode.section': 'Launch mode',
  'settings.launchMode.label': 'Permission mode',
  'settings.launchMode.help': 'Controls the level of autonomy for all Claude Code agents',
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

  'settings.rate.section': 'Rate usage',
  'settings.rate.empty':
    'No live rate-limit data yet — available for Claude.ai Pro/Max after the first agent activity.',

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
    'On by default, and yours to turn off at any time. What you do with your agents is sent to Magic Slash Cloud so your team’s dashboard reflects your work. Turning it off stops new records; what was already sent is kept.',
  'settings.application.usageLogs.collected': 'Collected',
  'settings.application.usageLogs.excluded': 'Never collected',
  'settings.application.usageLogs.collected.activity': 'Agent activity: tickets, commits, PRs, reviews',
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
    'Whatever this setting says, your agents (name, branch, ticket, repositories) sync to your team — that is what powers the live view.',
  'settings.application.planSync.section': 'Plan sessions',
  'settings.application.planSync.label': 'Save my plan sessions to the cloud',
  'settings.application.planSync.help':
    'On by default, and yours to turn off at any time. When you run /magic:plan, the spec it writes and the tickets it creates are saved to Magic Slash Cloud so you and your team can read them back from anywhere.',
  'settings.application.planSync.footnote':
    'Turning it off changes nothing on your machine: the spec file is still written in the repository, and the app still follows it live.',
  'settings.application.planSync.error': 'Failed to save that setting.',
  'settings.application.split.section': 'Split View',
  'settings.application.split.label': 'Enable split view',
  'settings.application.split.help': 'Display two agents side by side on wide screens',
  'settings.application.prWatcher.section': 'PR Review Watcher',
  'settings.application.prWatcher.label': 'Watch PR reviews',
  'settings.application.prWatcher.help': 'Poll GitHub to track review status on agents’ pull requests',
  'settings.application.prWatcher.intervalLabel': 'Polling interval',
  'settings.application.prWatcher.intervalHelp': 'How often the GitHub API is polled',
  'settings.application.prWatcher.interval30s': '30 seconds',
  'settings.application.prWatcher.interval1m': '1 minute',
  'settings.application.prWatcher.interval2m': '2 minutes',
  'settings.application.prWatcher.interval5m': '5 minutes',
  'settings.application.prWatcher.autoLaunchLabel': 'Auto-launch skills',
  'settings.application.prWatcher.autoLaunchHelp':
    'Send /magic:resolve or /magic:done directly to the agent’s terminal. Disabled by default for safety.',
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
    'Magic Slash runs in the menu bar. Click the tray icon to see agent status, or right-click for quick actions. Closing the window hides it to the tray.',

  // ── Settings → Shortcuts ─────────────────────────────────────────────────
  'settings.shortcuts.section': 'Keyboard Shortcuts',
  'settings.shortcuts.duplicateAgent': 'Duplicate agent',
  'settings.shortcuts.closeAgent': 'Archive agent',
  'settings.shortcuts.previousAgent': 'Previous agent',
  'settings.shortcuts.nextAgent': 'Next agent',
  'settings.shortcuts.toggleAgentInfo': 'Toggle agent info',
  'settings.shortcuts.toggleAgentsList': 'Toggle agents list',
  'settings.shortcuts.toggleSplit': 'Toggle Split View',
  'settings.shortcuts.quickLaunch': 'Quick Launch',
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
  'setup.wizard.done.skills': 'The eight /magic: skills are installed',
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
  'repo.langs.groupCode': 'Code and pull requests',
  'repo.langs.groupTickets': 'Tickets',
  'repo.langs.section': 'Languages',
  'repo.langs.commit': 'Commit Language',
  'repo.langs.pullRequest': 'Pull Request Language',
  'repo.repository.section': 'Repository',
  'repo.repository.groupLocation': 'Location',
  'repo.repository.groupBranches': 'Branches',
  'repo.repository.groupWorktrees': 'Worktrees',
  'repo.tracker.groupDestination': 'Ticket destination',
  'repo.tracker.groupGithub': 'GitHub',
  'repo.tracker.groupJira': 'Jira',
  'repo.tracker.githubRepoHelpPr': 'Address of the repository — used for pull requests and cloning, not for tickets',
  'repo.tickets.section': 'Tickets',
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
  'repo.commit.section': 'Commit',
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
  'repo.commit.protectedBranch': 'Commits on main branches',
  'repo.commit.protectedBranchHelpOn':
    'Allowed on main, master, develop and this repo’s development branch — /magic:commit asks first',
  'repo.commit.protectedBranchHelpOff':
    'Blocked on main, master, develop and this repo’s development branch — /magic:commit moves the work to a new branch',
  'repo.example': 'Example',

  'repo.resolve.section': 'Resolve',
  'repo.resolve.intro': 'Turns review comments into a pushed fix. On this repository:',
  'repo.resolve.step.read':
    'Reads the review comments on the pull request and fixes what they ask for.',
  'repo.resolve.step.commitNew': 'Adds one commit for the fixes, and pushes it normally.',
  'repo.resolve.step.commitAmend': 'Amends the last commit and pushes with --force-with-lease.',
  'repo.resolve.step.commitAsk':
    'Asks every time: a new commit, or an amend that pushes with --force-with-lease.',
  'repo.resolve.step.formatInherit': 'The fix commit takes its message format from the Commit tab.',
  'repo.resolve.step.formatCustom': 'The fix commit has its own message format: {format}, {style}.',
  'repo.resolve.step.replyOn': 'Replies in each review thread once its comment is addressed.',
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
  'repo.resolve.replyLang': 'Review Reply Language',
  'repo.resolve.replyLangHelp': 'Language of the replies /magic:resolve posts in the review threads of the pull request',
  // Both notices end on the literal git flag, rendered as <code> after the text.
  'repo.resolve.amendNotice': 'Push will use',
  'repo.resolve.askNotice':
    'You’ll be asked to choose new commit or amend on each resolve. Choosing amend will push with',

  'repo.pr.section': 'Pull Request',
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

  'repo.plan.section': 'Planning',
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
  'org.sectionCount': 'Organizations ({count})',
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
  'account.checklist.section': 'Account status',
  'account.checklist.ready': 'Ready to use',
  'account.checklist.readyHint': 'Onboarding is complete — every skill can run end to end.',
  'account.checklist.pending': 'Setup in progress',
  'account.checklist.pendingHint': '{done} of {total} steps done.',
  'account.checklist.step.account': 'Cloud account connected',
  'account.checklist.step.atlassian': 'Atlassian account linked',
  'account.checklist.step.profile': 'Profile filled in',
  'account.checklist.step.repository': 'At least one usable repository',
  'account.checklist.step.setup': 'Machine setup complete',

  // ── Settings → Account → Cloud account ───────────────────────────────────
  'cloud.section': 'Cloud account',
  'cloud.signedInFallback': 'Signed in',
  'cloud.signedInHint': 'Signed in to Magic Slash cloud',
  'cloud.signOut': 'Sign out',
  'cloud.changePassword': 'Change password',
  'cloud.changeEmail': 'Change email',
  'cloud.deleteAccount': 'Delete my account',
  'cloud.notSignedIn': 'Not signed in',
  'cloud.notSignedInHint': 'Sign in to manage your organization (optional)',
  'cloud.joinWithInvitation': 'Join with invitation',
  'cloud.signIn': 'Sign in',
  'cloud.password.submit': 'Update password',
  'cloud.password.newPlaceholder': 'New password',
  'cloud.password.confirmPlaceholder': 'Confirm new password',
  'cloud.email.sendCode': 'Send code',
  'cloud.email.confirmChange': 'Confirm change',
  'cloud.email.requestHelp': 'We’ll email a 6-digit confirmation code to your new address.',
  'cloud.email.newPlaceholder': 'New email',
  'cloud.email.confirmHelp': 'Check {email} for the confirmation code and enter it below.',
  'cloud.email.codePlaceholder': '6-digit code',
  'cloud.delete.submit': 'Delete permanently',
  'cloud.delete.warning': 'This permanently deletes your account and personal data.',
  'cloud.delete.body':
    'Organizations you created will be removed along with their data. This cannot be undone. Magic Slash keeps working locally without an account.',

  'toast.passwordMismatch': 'Passwords do not match',
  'toast.passwordUpdated': 'Password updated',
  'toast.passwordUpdateFailed': 'Failed to update password',
  'toast.emailRequired': 'Enter a new email',
  'toast.emailCodeSent': 'Check your new email for the confirmation code',
  'toast.emailCodeRequired': 'Enter the code',
  'toast.emailUpdated': 'Email updated',
  'toast.emailChangeFailed': 'Failed to change email',
  'toast.accountDeleted': 'Your account has been deleted',
  'toast.accountDeleteFailed': 'Failed to delete account',

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

  // ── Themes (registry labels) ─────────────────────────────────────────────
  'theme.dark': 'Dark',
  'theme.dark.help': 'The original, near-black.',
  'theme.midnight': 'Midnight',
  'theme.midnight.help': 'Dark, in deep blue.',
  'theme.espresso': 'Espresso',
  'theme.espresso.help': 'Warm brown-black.',
  'theme.highContrast': 'High contrast',
  'theme.highContrast.help': 'White on black, hard edges.',
  'theme.light': 'Light',
  'theme.light.help': 'Bright and neutral.',
  'theme.mist': 'Mist',
  'theme.mist.help': 'Cool blue-grey daylight.',
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
  'settings.notifications.agents.section': 'Your agents',
  'settings.notifications.agentWaiting.label': 'Agent waiting for you',
  'settings.notifications.agentWaiting.help':
    'An agent has stopped and needs an answer or a permission before it can carry on.',
  'settings.notifications.agentCompleted.label': 'Agent finished',
  'settings.notifications.agentCompleted.help': 'An agent has finished the task it was given.',
  'settings.notifications.pr.section': 'Pull requests',
  'settings.notifications.prReview.label': 'Review status changed',
  'settings.notifications.prReview.help':
    'The PR watcher saw the review status of one of your open PRs move — approved, changes requested, back to pending. Only on an actual change: switching the watcher on, or restarting the app, never notifies on its own.',
  'settings.notifications.prChangesRequested.label': 'Changes requested on your PR',
  'settings.notifications.prChangesRequested.help':
    'A reviewer asked for changes on one of your PRs. Comes from your team’s activity, so it arrives even for a PR no agent on this machine is watching.',
  'settings.notifications.team.section': 'Team',
  'settings.notifications.digest.label': 'Daily team digest',
  'settings.notifications.digest.help':
    'Off by default. One notification at 9:00 AM summarizing your team’s last 24 hours (PRs shipped, tickets moved to Done). Nothing is sent when there was no activity.',
  'settings.notifications.team.footnote':
    'A colleague picking up a ticket you also have an agent on follows the master switch above — it is rare enough not to need one of its own.',
  'toast.notificationsFailed': 'Failed to change the notification settings',

  // ── Settings → Appearance ────────────────────────────────────────────────
  'settings.appearance.themeSection': 'Theme',
  'settings.appearance.followsAccount':
    'The theme follows your account — every machine you sign in on uses it.',
  'settings.appearance.sidebars.section': 'Sidebars',
  'settings.appearance.sidebars.usageCard.label': 'Usage card',
  'settings.appearance.sidebars.usageCard.help':
    'The connected account and the Session (5h) / Weekly (7d) gauges, at the bottom of the left sidebar.',
  'settings.appearance.sidebars.agentContext.label': 'Agent context',
  'settings.appearance.sidebars.agentContext.help':
    'The selected agent’s context gauge, model, cost and elapsed time, at the top of the right sidebar.',
  'settings.appearance.sidebars.format.label': 'Format',
  'settings.appearance.sidebars.format.full': 'Expanded',
  'settings.appearance.sidebars.format.minimized': 'Compact',
  'settings.appearance.claudeTheme.label': 'Match Claude Code to the theme',
  'settings.appearance.claudeTheme.help':
    'Claude Code takes the chosen theme’s colours in the app’s terminals, repainting sessions that are already open. Claude Code started from a real terminal is left alone.',
  'settings.appearance.codeTheme.label': 'Syntax highlighting',
  'settings.appearance.codeTheme.help':
    'Which appearance the file preview paints code in. Following the theme is right for almost everyone; pin one to read dark code on a light interface, or the other way round.',
  'settings.appearance.codeTheme.auto': 'Follows the theme',
  'settings.appearance.codeTheme.light': 'Always light',
  'settings.appearance.codeTheme.dark': 'Always dark',
  'settings.appearance.displaySection': 'Display',
  'settings.appearance.scale': 'Interface scale',
  // Split around the two <kbd> accelerators rendered between them.
  'settings.appearance.scaleHelpBefore':
    'Scales the whole window, terminal included — like a browser’s zoom. Also on',
  'settings.appearance.scaleHelpAfter': '. Stays on this machine, since it compensates for this screen.',
  'settings.appearance.zoomReset': 'Reset to 100%',
  'toast.themeChangeFailed': 'Failed to change theme',
  'toast.claudeThemeSyncFailed': 'Failed to change the Claude Code theme',
  'toast.codeThemeFailed': 'Failed to change the syntax highlighting',
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
  'profile.form.optional': 'optional',
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

  // ── Agent workflow status (badges) ───────────────────────────────────────
  'status.planning': 'Planning',
  'status.planned': 'Planned',
  'status.inProgress': 'In progress',
  'status.committed': 'Committed',
  'status.readyForPR': 'Ready for PR',
  'status.prCreated': 'PR created',
  'status.ciGreen': 'CI green',
  'status.inReview': 'In review',
  'status.changesRequested': 'Changes requested',
  'status.reviewAddressed': 'Review addressed',
  'status.prMerged': 'PR merged',

  // ── PR review status (badges) ────────────────────────────────────────────
  'prReview.pending': 'Awaiting review',
  'prReview.commented': 'Commented',
  'prReview.changesRequested': 'Changes requested',
  'prReview.approved': 'Approved',

  // ── Team dashboard ───────────────────────────────────────────────────────
  'dashboard.unassigned': 'Unassigned',
  'dashboard.openPR': 'Open the pull request',
  'dashboard.viewPR': 'View PR',
  'dashboard.repos.section': 'Repositories',
  'dashboard.repos.personal': 'Personal',
  'dashboard.repos.noReposInScope': 'No repository here yet.',
  'dashboard.repos.agentCount.one': '{count} agent',
  'dashboard.repos.agentCount.other': '{count} agents',
  'dashboard.repos.noAgents': 'no agent',
  'dashboard.repos.onPr': '{count} on a PR',
  'dashboard.repos.noRepos': 'No repository shared with your team yet.',
  'dashboard.repos.noReposHint':
    'Share a repository with your organization in Settings → Repositories, and every teammate’s agents on it show up here.',
  'dashboard.repos.unmatched.one': '1 agent on a personal or unlinked repository',
  'dashboard.repos.unmatched.other': '{count} agents on personal or unlinked repositories',
  'dashboard.skills.section': 'Skills run',
  'dashboard.skills.sectionPersonal': 'Your skills run',
  'dashboard.skills.runs.one': '{count} run',
  'dashboard.skills.runs.other': '{count} runs',
  'dashboard.skills.empty':
    'No run recorded for this organization yet. Runs are attributed through the repositories of the agent that launches them, so work on a personal repository is not counted here.',
  'dashboard.skills.emptyPersonal':
    'No run recorded outside an organization yet. A run lands here when the agent that launched it works on personal repositories alone, and when it was started in a terminal the app did not open — one with no agent belongs to no organization.',
  'dashboard.usage.section': 'Cost & usage',
  'dashboard.usage.cost': 'Cost',
  'dashboard.usage.sessions': 'Sessions',
  'dashboard.usage.lines': 'Lines',
  'dashboard.usage.duration': 'Time',
  'dashboard.usage.byMember': 'By member',
  'dashboard.usage.byModel': 'By model',
  'dashboard.usage.unknownModel': 'Unknown model',
  'dashboard.usage.empty': 'No usage to show here.',
  // `{count}` is the row count actually returned, which IS the cap whenever this line
  // shows — `loadOrgUsageStats` only sets `capped` when the read came back full. Derived
  // rather than written out, so raising the limit cannot leave this sentence lying.
  'dashboard.usage.capped':
    'Only the {count} most recent sessions are read, so these totals are a floor rather than the whole picture.',
  'dashboard.usage.failed': 'Usage could not be read.',

  // ── Team dashboard · hours spent inside the skills ────────────────────────
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
  'skills.budget.window.autoDetected': 'Detected from the running agent.',
  'skills.budget.window.autoNoAgent': 'No agent running — falling back to {window}.',
  'skills.budget.window.forced': 'Forced to {window}, whatever is running.',
  'skills.budget.over':
    'Over budget by {over} characters. Claude Code is already listing some skills by name only — it can still run them, but it can no longer tell when they apply.',
  'skills.budget.truncated.one':
    '{count} skill has a description longer than {max} characters. Everything past that is cut before Claude sees it, so it is counted at {max} here.',
  'skills.budget.truncated.other':
    '{count} skills have descriptions longer than {max} characters. Everything past that is cut before Claude sees it, so they are counted at {max} here.',
  'skills.budget.cut': 'cut',
  'skills.budget.how': 'How this is computed',
  'skills.budget.card.scope.title': 'Only descriptions are counted',
  'skills.budget.card.scope.body':
    'Claude Code injects a listing of every skill — name plus description — into the system prompt on every turn. The body of a SKILL.md is not in it: that loads only when the skill actually runs. So this gauge measures your descriptions, not your instructions.',
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
    'Since the budget is a fraction of the context window, the same set of skills is comfortable on a 1M-token model and over budget on a 200K one. On Auto, the window is read from the agent you have running — the real one, reported by Claude Code itself. The two presets override it, to see what your skills would look like on another model or when nothing is running. Either way it changes the gauges here and nothing else.',
  'skills.budget.card.override.title': 'Changing the budget itself',
  'skills.budget.card.override.body':
    'In settings.json, skillListingBudgetFraction raises the 1% share and skillListingMaxDescChars the per-skill cap; the SLASH_COMMAND_TOOL_CHAR_BUDGET environment variable replaces the whole computation with a fixed character count. Run /doctor to see what the listing really costs.',
  'skills.budget.details': 'Details by skill',
  'skills.budget.tok': '{count} tok',
  'skills.weight.high': 'High',
  'skills.weight.medium': 'Medium',
  'skills.weight.low': 'Low',
  'skills.source.builtIn': 'built-in',
  'skills.source.custom': 'custom',
  'skills.source.repo': 'repo',
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
  'skills.fixWithAgent': 'Fix with agent',
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
  'terminals.emptyHint': 'Launch a Claude agent to start a ticket, open a pull request or run a review.',
  'terminals.launch': 'New agent',
  'terminals.launching': 'Launching…',
  'terminals.paneEmpty': 'Drag an agent here or create a new one',
  'terminals.invalidRepos.one':
    '{count} repository path is invalid. Re-point it in Settings before launching an agent.',
  'terminals.invalidRepos.other':
    '{count} repository paths are invalid. Re-point them in Settings before launching an agent.',
  'terminals.openSettings': 'Open settings',
  'terminals.maxAgents': 'Maximum of {count} agents reached',
  'terminals.createFailed': 'Failed to create terminal',
  'terminals.duplicateFailed': 'Failed to duplicate agent',

  // ── Quick launch ─────────────────────────────────────────────────────────
  'quickLaunch.placeholder': 'PROJ-123 /start',
  'quickLaunch.cmd.plan': 'Turn an idea into tickets',
  'quickLaunch.cmd.start': 'Start a new task',
  'quickLaunch.cmd.continue': 'Resume work on a task',
  'quickLaunch.cmd.commit': 'Create a commit',
  'quickLaunch.cmd.pr': 'Create a Pull Request',
  'quickLaunch.cmd.review': 'Review a PR',
  'quickLaunch.cmd.resolve': 'Address review feedback',
  'quickLaunch.cmd.done': 'Finalize after merge',

  // ── Tray popover ─────────────────────────────────────────────────────────
  'tray.popover.empty': 'No active agents',
  'tray.popover.account': 'Account and settings',
  'tray.popover.quit': 'Quit the app',

  // ── Pending questions, answered from the panel ───────────────────────────
  // "Allow" and "Deny" are ours, not the TUI's: a permission prompt reaches us as
  // a one-line notification, never as the wording of its own buttons.
  'tray.question.waiting': '{count} awaiting an answer',
  'tray.question.allow': 'Allow',
  'tray.question.deny': 'Deny',
  'tray.question.openAgent': 'Open the agent',
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
  'tray.question.moreOptions': '{count} more in the agent',

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
  'agentInfo.closeAgent': 'Archive the agent',
  'agentInfo.notGitRepo': 'Not a git repo',
  'agentInfo.unknownError': 'Unknown error',
  'agentInfo.selectRepositories': 'Select repositories',
  'agentInfo.removeRepository': 'Remove repository',
  'agentInfo.copyBranch': 'Copy branch name',
  'agentInfo.uncommittedChanges': 'Uncommitted changes',
  'agentInfo.noUncommittedChanges': 'No uncommitted changes',
  'agentInfo.commits': 'Commits',
  'agentInfo.viewOnGitHub': 'View on GitHub',
  'agentInfo.viewPullRequest': 'View Pull Request',
  'agentInfo.noTicket': 'No ticket',
  'agentInfo.titlePlaceholder': 'Enter title…',
  'agentInfo.addTitle': 'Click to add title',
  'agentInfo.descriptionPlaceholder': 'Enter description…',
  'agentInfo.addDescription': 'Click to add description',
  'agentInfo.noScripts': 'No scripts found',
  'agentInfo.sessionContext': 'Session context',
  'agentInfo.session': 'Session',
  'agentInfo.context': 'Context',
  'agentInfo.tokensOf': '{used} / {total} tokens',
  'agentInfo.noActiveAgent': 'No active agent',
  'agentInfo.addRepository': 'Add a repository',
  'agentInfo.noRepositories': 'No repositories configured',
  'agentInfo.openInEditor': 'Open',
  'agentInfo.openOnGitHub': 'Open',
  'agentInfo.openRepoOnGitHub': 'Open the repository on GitHub',
  'agentInfo.scripts': 'Scripts',
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
  'toast.defaultAgentTypeUpdated': 'Default agent type updated',
  'agentType.planner': 'Planner',
  'agentType.coderHint': 'Implementation cycle: start, commit, PR, review, done',
  'agentType.plannerHint': 'Planning: turn an idea into a spec, then into tickets',
  'settings.defaultAgentType.title': 'Default agent type',
  'settings.defaultAgentType.description': 'What a new agent is, before any skill says otherwise. You can still switch it from the title bar until the agent reports a status.',
  'agentInfo.spec.open': 'Open the spec full screen',
  'agentInfo.spec.scrollToTop': 'Back to top',
  'toast.commandSent': 'Sent {command} to the agent',
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
  'agentInfo.pr.prepareThread': 'Prepare this thread for the agent',
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
  'agentInfo.pr.prepareThreadNoAgent': 'The agent this pull request belongs to is no longer running',
  // The write did not reach a pty. A toast rather than a state in the row: 500 px of row
  // has no space for a sentence, and this card already reports its failures this way.
  'agentInfo.pr.prepareThreadFailed': 'Could not reach the agent — nothing was pasted',
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
  'app.closeAgent.title': 'Archive this agent?',
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
    'Magic Slash needs at least one repository to launch agents on. Pick a local folder to get started.',
  'repoSetup.body.fix':
    'These repositories have no usable local folder yet. Pick one for each so agents can run on them.',
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
  'toast.cloudWriteKind.agents': 'agents',

  // ── Agent relaunched in its repository ───────────────────────────────────
  'toast.cwdRelaunched': 'Agent relaunched in “{dir}”',
  'toast.cwdRelaunchOffer':
    'This agent is still running in “{current}”. Relaunching it in “{dir}” will clear its current conversation.',
  'toast.cwdRelaunchAction': 'Relaunch in “{dir}”',

  // ── Login screen ─────────────────────────────────────────────────────────
  'login.signinTitle': 'Sign in to Magic Slash',
  'login.resetTitle': 'Reset your password',
  'login.resetHelp':
    'Reset your password with a 6-digit code sent to your email — no link to click.',
  'login.signinHelp':
    'Sign in to continue. Magic Slash keeps your config, agents and history in your organization’s cloud.',
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

  // ── Sidebar update row ───────────────────────────────────────────────────
  'sidebar.update.available': 'Update available',
  'sidebar.update.availableTitle': 'Version {version} found — downloading it now',
  'sidebar.update.downloading': 'Downloading…',
  'sidebar.update.ready': 'Update ready',
  'sidebar.update.restart': 'Restart to install',
  'sidebar.update.restartNow': 'Restart',
  'sidebar.update.restartTitle': 'Restart to install v{version}',
  'sidebar.update.retry': 'Download failed — retry',

  // ── Update overlay & What’s New ──────────────────────────────────────────
  'update.installFailed': 'The update was downloaded, but the restart failed. Please quit and reopen the app.',
  'update.debugMenu': 'Debug menu',
  'whatsNew.gotIt': 'Got it',

  // ── Modals & file preview ────────────────────────────────────────────────
  'modal.closeEsc': 'Close (Esc)',
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
  'filePreview.commentPlaceholder': 'What should the agent know about these lines?',
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
  'filePreview.commentQuotePlaceholder': 'What should the agent know about this passage?',
  'filePreview.commentDelete': 'Delete',
  // Two forms again, and the plural one carries the count as well as the gesture: the pill
  // on a commented line draws an icon rather than a number, so this tooltip is the only
  // thing that tells a reader a line holds more than one comment — and that clicking its
  // marker again is how they reach the next.
  'filePreview.commentMarker': 'Read this comment',
  'filePreview.commentMarkers': '{count} comments on these lines',
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
  'filePreview.sendToAgent': 'Send to the agent',
  'filePreview.sendNoAgent': 'No agent is running — copy the comments instead',
  // The same disabled control, one placement over, where the reason is a different one: the
  // send has ONE possible target — the agent the document belongs to — so "no agent is
  // running" would be false in the ordinary case of another agent being selected. This names
  // what actually happened, and points at Copy beside it.
  'filePreview.sendAgentGone':
    'The agent this document belongs to is no longer running — copy the comments instead',
  // The send did not reach a pty. TWO keys, on the pattern above: the short one is the button's
  // own text, the hint is its tooltip — and the hint says the part that actually matters, which
  // is that nothing was thrown away. The store cannot warn about this in advance: an exited
  // terminal keeps its entry with `state` set to `completed`/`error`, the same two values an
  // agent idle at its prompt reports, so the failure is only knowable after the write.
  'filePreview.sendFailed': 'Not delivered',
  'filePreview.sendFailedHint':
    'Could not reach the agent — your comments were kept, copy them instead',

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

  // ── Tasks · the two filters at the top of the backlog ────────────────────
  // They narrow what is ON SCREEN and read nothing: the page already holds every
  // open ticket of every repository, so this is a pass over an array in memory.
  'tasks.filter.searchPlaceholder': 'Search by ticket ID or title…',
  // The repository picker's neutral entry, and the state it opens on. Named rather
  // than left blank: a picker showing nothing reads as one that failed to load.
  'tasks.filter.allRepos': 'All repositories',
  // The two orders the sort picker offers, and its own default. "Newest" is what the
  // page has always done; "Priority" is the other question asked of a sprint. Only
  // the Jira half can be reordered — a GitHub issue has no priority — so a mixed page
  // changes only where there is something to change.
  'tasks.filter.sortRecent': 'Newest',
  'tasks.filter.sortPriority': 'Priority',
  // The epic picker's cleared state. Shown only when some visible ticket actually
  // hangs off an epic, so a GitHub-only page never sees this control at all.
  'tasks.filter.allEpics': 'All epics',
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
  'tasks.detail.parent': 'Parent issue',
  // Said rather than left blank: an empty row next to a label reads as "not loaded
  // yet", which is a different thing from "there are none".
  'tasks.detail.none': 'none',
  'tasks.detail.emptyBody': 'This ticket has no description.',
  // The page's one affirmative action: a terminal in the repository's local
  // folder, pre-filled with `/magic:start` and this issue's URL. The second line
  // is that sentence said plainly — the label alone says what the button IS, and
  // people hesitate over a button whose consequence they have to guess.
  'tasks.startAgent': 'Start an agent',
  'tasks.startAgentHint': 'Opens a terminal in this repository and runs /magic:start on this ticket.',
  // The alternative to starting the work: an agent that reads the issue and talks about it.
  // "Discuss with", not "Start a discussion with" — it sits directly under "Start an agent",
  // and two labels both opening on the same verb read as two ways of doing one thing.
  'tasks.discussAgent': 'Discuss with an agent',
  'tasks.discussAgentHint': 'Types the opening prompt into a terminal — add what you want to talk about, then press Return.',
  // Why the action is unavailable, said in place instead of failing on the click.
  // A team repository that nobody has bound to a folder on THIS machine has no
  // directory to open a terminal in, and the fix is a setting.
  'tasks.noLocalRepo': 'No local folder is bound to this repository on this machine.',
  'tasks.noLocalRepoHint':
    'Set its folder in Settings → Repositories, and an agent can be started on its issues from here.',
  // The backstop, for the case the check above passed and the launch still failed.
  // Deliberately generic: the underlying error is an untranslated English sentence.
  'tasks.startFailed': 'This ticket could not be handed to an agent.',
  // The row marker: an issue somebody is already working on. A word next to the
  // dot, because a bare coloured dot says nothing on its own.
  'tasks.hasAgent': 'agent',
  'tasks.hasAgentHint': 'An agent is already working on this ticket.',

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
  // The sprint the card's rows are in, next to the repository name. Untranslated
  // VALUE — the name is whatever the team called the sprint in Jira — so only the
  // hover text is a sentence.
  // The priority badge's hover text, on both the row and the ticket page. Names the
  // FIELD, because the badge shows only its value — a site whose priorities are
  // called "P1"…"P4" gives the reader nothing to recognise it by otherwise.
  'tasks.jira.priorityHint': 'Priority: {name}',
  // The epic badge's hover text, on both the row and the ticket page. Names the FIELD
  // for `priorityHint`'s reason, and carries the KEY as well: the title is what the
  // badge truncates first, and the key is what identifies the epic in Jira itself.
  'tasks.jira.epicHint': 'Epic {key}: {title}',
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
}
