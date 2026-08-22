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

  // ── Menu bar panel ───────────────────────────────────────────────────────
  // The tray opens the app's own window (renderer/pages/TrayPopover), not a
  // native menu — the entries that menu had and this one does not (Changelog,
  // Documentation, GitHub) took their strings with them.
  'tray.showWindow': 'Show Window',
  'tray.update.checking': 'Checking for updates…',
  'tray.update.download': '↓ Download v{version}',
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
  'sidebar.skills': 'Skills',
  'sidebar.team': 'Team',
  'sidebar.settings': 'Settings',
  'sidebar.login': 'Login / Sign up',
  'sidebar.accountFallback': 'Account',
  'sidebar.agents': 'Agents',
  // A count above the list, not a group header: the agents it counts keep their row.
  'sidebar.needsAttention': 'Needs attention',
  'sidebar.paneLeft': 'Left',
  'sidebar.paneRight': 'Right',
  'sidebar.empty': 'No agents yet. Click “New agent” to start.',
  'sidebar.dropAgents': 'Drop agents here',
  'sidebar.scripts': 'Scripts',
  'sidebar.stopScript': 'Stop script',
  'sidebar.docs': 'Docs',
  'sidebar.changelog': 'Changelog',
  'sidebar.github': 'GitHub',

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
  'settings.appearance.displaySection': 'Display',
  'settings.appearance.scale': 'Interface scale',
  // Split around the two <kbd> accelerators rendered between them.
  'settings.appearance.scaleHelpBefore':
    'Scales the whole window, terminal included — like a browser’s zoom. Also on',
  'settings.appearance.scaleHelpAfter': '. Stays on this machine, since it compensates for this screen.',
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
  'sidebar.update.downloadTitle': 'Download version {version}',
  'sidebar.update.downloading': 'Downloading…',
  'sidebar.update.restart': 'Restart to install',
  'sidebar.update.restartTitle': 'Restart to install v{version}',
  'sidebar.update.retry': 'Download failed — retry',

  // ── Update overlay & What’s New ──────────────────────────────────────────
  'update.checking': 'Checking for updates…',
  'update.downloading': 'Downloading update…',
  'update.ready': 'Update ready!',
  'update.restartNow': 'Restart now',
  'update.checkFailed': 'Update check failed. Continuing…',
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
}
