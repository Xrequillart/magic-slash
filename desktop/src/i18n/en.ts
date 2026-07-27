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

  // ── Tray menu ────────────────────────────────────────────────────────────
  'tray.version': 'Magic Slash v{version}',
  'tray.noAgents': 'No active agents',
  'tray.showWindow': 'Show Window',
  'tray.settings': 'Settings',
  'tray.changelog': 'Changelog',
  'tray.documentation': 'Documentation',
  'tray.github': 'GitHub',
  'tray.quit': 'Quit Magic Slash',
  'tray.update.checking': 'Checking for updates…',
  'tray.update.downloadingVersion': 'Downloading v{version}…',
  'tray.update.downloadingProgress': 'Downloading update… {percent}%',
  'tray.update.restart': '↻ Restart to update (v{version})',
  'tray.update.checkFailed': 'Check for Updates (last check failed)',
  'tray.update.check': 'Check for Updates',

  // ── OS notifications ─────────────────────────────────────────────────────
  'notification.waiting.title': 'Claude Code needs attention',
  'notification.waiting.body': 'Agent "{name}" is waiting for your input',
  'notification.completed.title': 'Task completed',
  'notification.completed.body': 'Agent "{name}" has finished',
  'notification.prReview.title': 'PR review update',
  'notification.prReview.body': '{url}: {status}',
  'notification.pickup.title': 'A colleague picked up {ticket}',
  'notification.pickup.body': 'A teammate is now working on {ticket} — you also have an agent on it.',
  'notification.changesRequested.title': 'Changes requested on your PR',
  'notification.changesRequested.body': '{subject}: a reviewer requested changes.',

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
  'settings.tab.appearance': 'Appearance',
  'settings.tab.language': 'Language & Region',
  'settings.tab.features': 'Features',
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

  // ── History ──────────────────────────────────────────────────────────────
  'history.today': 'Today — {date}',
  'history.yesterday': 'Yesterday — {date}',
}
