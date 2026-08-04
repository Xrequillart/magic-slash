/**
 * The webapp's message catalogue, and the reference every other language is typed
 * against — `fr.ts` is a `Record<keyof typeof en, string>`, so a missing key is a
 * tsc error rather than a hole on screen.
 *
 * Wording is the desktop app's wherever the two surfaces say the same thing
 * (`desktop/src/i18n/en.ts`): the webapp deliberately mirrors its settings and
 * organization copy, and two catalogues that drift would tell users different
 * things about the same toggle.
 *
 * Interpolation is minimal — `{name}` placeholders, no plurals, no dates. Anything
 * that varies grammatically gets one entry per form (`.one` / `.many`), because a
 * suffix rule that works in English does not survive translation.
 *
 * The back-office (`app/admin`) is NOT translated: it is an internal console, it is
 * written in French throughout, and it has no language switcher to obey.
 */

export const en = {
  // ── Common ─────────────────────────────────────────────────────────────────
  'common.loading': 'Loading…',
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.saving': 'Saving…',
  'common.create': 'Create',
  'common.creating': 'Creating…',
  'common.copy': 'Copy',
  'common.copied': 'Copied',
  'common.close': 'Close',
  'common.download': 'Download',
  'common.add': 'Add',
  'common.next': 'Next',
  'common.back': 'Back',
  'common.finish': 'Finish',
  'common.deleting': 'Deleting…',
  'common.select': 'Select…',
  'common.saveFailed': 'Failed to save.',
  'common.remove': 'Remove {item}',
  'common.notSignedIn': 'Not signed in.',

  // ── Language switcher ──────────────────────────────────────────────────────
  'language.label': 'Interface language',
  'language.hint': 'Applies to this website, in this browser.',

  // ── App chrome ─────────────────────────────────────────────────────────────
  'nav.application': 'Application',
  'nav.organization': 'Organization',
  'nav.account': 'Account',
  'nav.admin': 'Admin',
  'nav.signOut': 'Sign out',

  // ── Login ──────────────────────────────────────────────────────────────────
  'login.title': 'Welcome back',
  'login.subtitle': 'Sign in to your Magic Slash account.',
  'login.email': 'Email',
  'login.emailPlaceholder': 'you@company.com',
  'login.password': 'Password',
  'login.submit': 'Sign in',
  'login.submitting': 'Signing in…',
  'login.failed': 'Incorrect email or password.',
  'login.invited': 'Invited to a team? Open your invitation link to create your account.',

  // ── Invitation ─────────────────────────────────────────────────────────────
  'invite.asideTitle': 'Your team is waiting for you.',
  'invite.asideBody':
    'Join your organization on Magic Slash and start shipping with your AI dev agents.',
  'invite.loading': 'Loading your invitation…',
  'invite.notFound.title': 'Invitation not found',
  'invite.notFound.body': 'This invitation link is invalid. Ask an admin to send you a new one.',
  'invite.unavailable.title': 'Invitation unavailable',
  'invite.unavailable.accepted':
    'This invitation has already been accepted. Just download the app and sign in.',
  'invite.unavailable.revoked':
    'This invitation has been revoked. Ask an admin to send you a new one.',
  'invite.unavailable.expired': 'This invitation has expired. Ask an admin to send you a new one.',
  'invite.unavailable.fallback': 'This invitation can no longer be used.',
  'invite.downloadApp': 'Download the app',
  'invite.badge.admin': 'Admin invitation',
  'invite.badge.team': 'Team invitation',
  'invite.joinLead': 'Join',
  'invite.subtitle': 'Create your Magic Slash account to accept this invitation.',
  'invite.email': 'Email',
  'invite.password': 'Password',
  'invite.passwordPlaceholder': 'At least 8 characters',
  'invite.submit': 'Accept & join {org}',
  'invite.submitting': 'Joining…',
  'invite.error.exists':
    'An account already exists for this email. Check your password and try again.',
  'invite.error.confirmEmail':
    'Check your inbox to confirm your email, then reopen this link to finish.',
  'invite.error.generic': 'Something went wrong. Please try again.',

  // ── Dashboard ──────────────────────────────────────────────────────────────
  'dashboard.greeting': 'Hey {name}.',
  'dashboard.greetingFallback': 'there',

  // ── Onboarding checklist ───────────────────────────────────────────────────
  'onboarding.title': 'Get started',
  'onboarding.org.title': 'Join an organization',
  'onboarding.org.hintPending': 'Create your own, or open the invite link a teammate sent you',
  'onboarding.org.hintCount': '{count} organizations',
  'onboarding.org.expand':
    'Create an organization — or just open the invite link a teammate sent you.',
  'onboarding.org.namePlaceholder': 'Organization name',
  'onboarding.org.failed': 'Failed to create the organization.',
  'onboarding.profile.title': 'Fill in your profile',
  'onboarding.profile.hintDone': 'Claude tailors its tone and depth to you',
  'onboarding.profile.hintPending': 'A few questions so Claude adapts to how you work',
  'onboarding.install.title': 'Install the desktop app',
  'onboarding.install.hintDone': 'Running on {devices}',
  'onboarding.install.device.one': '1 device',
  'onboarding.install.device.many': '{count} devices',
  'onboarding.install.hintPending':
    'Magic Slash runs on your machine — download it and sign in',
  'onboarding.install.downloadHint':
    'Drag it into Applications and open it. It installs the skills and configures Claude Code on first launch.',

  // ── Team repositories ──────────────────────────────────────────────────────
  'team.repositories': 'Repositories',
  'team.personal': 'Personal',
  'team.agents.none': 'no agent',
  'team.agents.one': '1 agent',
  'team.agents.many': '{count} agents',
  'team.onPr': '{count} on a PR',
  'team.unassigned': 'Unassigned',
  'team.openPr': 'Open the pull request',
  'team.viewPr': 'View PR',
  'team.emptyScope': 'No repository here yet.',
  'team.empty': 'No repository shared with your team yet.',
  'team.emptyHint':
    'Repos shared to an org from the desktop app appear here, with everyone working on them.',
  // Lower-case on purpose — these render inside a small inline pill, not as a
  // sentence. Same register and same wording as the desktop's `statusPill.*`.
  'team.status.inProgress': 'in progress',
  'team.status.committed': 'committed',
  'team.status.readyForPR': 'ready for PR',
  'team.status.prCreated': 'PR created',
  'team.status.inReview': 'in review',
  'team.status.changesRequested': 'changes requested',
  'team.status.reviewAddressed': 'review addressed',
  'team.status.prMerged': 'PR merged',
  'team.unmatched.one': '1 agent on a repository this view cannot resolve',
  'team.unmatched.many': '{count} agents on repositories this view cannot resolve',

  // ── Skill stats ────────────────────────────────────────────────────────────
  'skills.title': 'Skills run',
  'skills.titlePersonal': 'Your skills run',
  'skills.runs.one': '1 run',
  'skills.runs.many': '{count} runs',
  'skills.empty':
    'No run recorded for this organization yet. Runs are attributed through the repositories of the agent that launches them, so work on a personal repository is not counted here.',
  'skills.emptyPersonal':
    'No run recorded outside an organization yet. A run lands here only when the agent that launched it works on personal repositories alone — one started in a terminal the desktop app did not open is attributed to your organization instead.',

  // ── Account page ───────────────────────────────────────────────────────────
  'account.title': 'Account',

  // ── Cloud account ──────────────────────────────────────────────────────────
  'cloud.title': 'Cloud account',
  'cloud.signedIn': 'Signed in to Magic Slash cloud',
  'cloud.signOut': 'Sign out',
  'cloud.changePassword': 'Change password',
  'cloud.changeEmail': 'Change email',
  'cloud.deleteAccount': 'Delete my account',
  'cloud.password.newPlaceholder': 'New password',
  'cloud.password.confirmPlaceholder': 'Confirm new password',
  'cloud.password.submit': 'Update password',
  'cloud.password.tooShort': 'Use at least 8 characters.',
  'cloud.password.mismatch': 'Passwords do not match.',
  'cloud.password.failed': 'Failed to update password.',
  'cloud.email.requestHint': 'We’ll email a 6-digit confirmation code to your new address.',
  'cloud.email.newPlaceholder': 'New email',
  'cloud.email.confirmBefore': 'Check',
  'cloud.email.confirmAfter': 'for the confirmation code and enter it below.',
  'cloud.email.codePlaceholder': '6-digit code',
  'cloud.email.sendCode': 'Send code',
  'cloud.email.confirmChange': 'Confirm change',
  'cloud.email.working': 'Working…',
  'cloud.email.codeSent': 'Code sent. Check your new inbox.',
  'cloud.email.failed': 'Failed to change email.',
  'cloud.email.noSession': 'The email change did not return a session — please sign in again.',
  'cloud.delete.submit': 'Delete permanently',
  'cloud.delete.warning': 'This permanently deletes your account and personal data.',
  'cloud.delete.body':
    'Organizations you created will be removed along with their data. This cannot be undone. Magic Slash keeps working locally without an account.',
  'cloud.delete.failed': 'Failed to delete account.',

  // ── Profile ────────────────────────────────────────────────────────────────
  'profile.title': 'Profile',
  'profile.clickToEdit': 'Click to edit',
  'profile.editAria': 'Edit your profile',
  'profile.fillAria': 'Fill in your profile',
  'profile.fillTitle': 'Fill in your profile',
  'profile.fillHint': 'A few questions so Claude adapts its tone and depth to how you work.',
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
  'profile.wizard.titleEdit': 'Edit your profile',
  'profile.wizard.titleWelcome': 'Welcome to Magic Slash',
  'profile.wizard.nameQuestion': 'What’s your first name?',
  'profile.wizard.nameHint': 'Claude will use this to personalize responses.',
  'profile.wizard.namePlaceholder': 'Your first name',
  'profile.wizard.roleQuestion': 'What’s your role?',
  'profile.wizard.roleHint': 'Helps Claude adapt the level of detail.',
  'profile.wizard.levelQuestion': 'Technical level',
  'profile.wizard.levelHint': 'Claude adjusts vocabulary and explanations accordingly.',
  'profile.wizard.level.beginner.hint': 'New to development or technical concepts',
  'profile.wizard.level.intermediate.hint': 'Comfortable with code and tooling',
  'profile.wizard.level.expert.hint': 'Deep technical knowledge and experience',
  'profile.wizard.styleQuestion': 'Communication style',
  'profile.wizard.styleHint': 'Optional — how should Claude communicate?',
  'profile.wizard.style.simple.hint': 'Concise answers, minimal jargon',
  'profile.wizard.style.technical.hint': 'Code-focused, precise terminology',
  'profile.wizard.style.detailed.hint': 'Thorough explanations with context',
  'profile.wizard.languagesQuestion': 'Preferred languages',
  'profile.wizard.languagesHint': 'Optional — Claude will communicate in these languages.',
  'profile.wizard.freeTextQuestion': 'Anything else?',
  'profile.wizard.freeTextHint': 'Optional — anything else Claude should know about you.',
  'profile.wizard.freeTextPlaceholder': 'e.g. I prefer short answers, I work on mobile apps…',
  'profile.wizard.failed': 'Failed to save profile.',

  // ── Devices ────────────────────────────────────────────────────────────────
  'devices.title': 'Devices',
  'devices.empty': 'No device yet. Install the app and sign in to see it here.',
  'devices.unknown': 'Unknown device',
  'devices.lastSeen': 'last seen {when}',

  // ── Desktop app status ─────────────────────────────────────────────────────
  'appStatus.title': 'Desktop app',
  'appStatus.notInUse': 'Not in use yet',
  'appStatus.notInUseHint':
    'Install the desktop app and sign in — it will show up here on its first launch.',
  'appStatus.inUse': 'In use',
  'appStatus.updateAvailable': 'v{version} available',
  'appStatus.lastActive': 'last active {when}',

  // ── Relative time ──────────────────────────────────────────────────────────
  'time.unknown': 'unknown',
  'time.justNow': 'just now',
  'time.minutes.one': '1 minute ago',
  'time.minutes.many': '{count} minutes ago',
  'time.hours.one': '1 hour ago',
  'time.hours.many': '{count} hours ago',
  'time.days.one': '1 day ago',
  'time.days.many': '{count} days ago',

  // ── Application page ───────────────────────────────────────────────────────
  'application.title': 'Application',
  'application.footnote':
    'These settings belong to the desktop app and follow your account onto every machine you sign in on. An app that is already running picks them up right away.',
  'settings.saveFailed': 'Your settings could not be saved — please sign in again and retry.',

  // ── Settings · Appearance ──────────────────────────────────────────────────
  'settings.appearance': 'Appearance',
  'settings.appearance.note':
    'The theme follows your account — every machine you sign in on uses it. Interface scale stays on each machine, since it compensates for that screen.',
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

  // ── Settings · Language & Region ───────────────────────────────────────────
  'settings.language.section': 'Language & Region',
  'settings.language.label': 'Interface language',
  'settings.language.help':
    'The language of the app itself — menus, settings, notifications, and how dates and numbers are written.',
  'settings.language.noteBefore':
    'It is not what Claude writes in: commit messages, pull requests and Jira comments follow each',
  'settings.language.noteLink': 'repository’s own language settings',
  'settings.language.noteAfter':
    ', and your profile’s languages decide how Claude talks to you.',

  // ── Settings · Features ────────────────────────────────────────────────────
  'settings.features': 'Features',
  'settings.usageCard.label': 'Show usage card in sidebar',
  'settings.usageCard.help':
    'Display the connected account and the Session (5h) / Weekly (7d) gauges at the bottom of the sidebar.',
  'settings.usageLogs.label': 'Share my activity with my team',
  'settings.usageLogs.help':
    'On by default, and yours to turn off at any time. What you do with your agents is sent to Magic Slash Cloud so your team’s dashboard reflects your work. Turning it off stops new records; what was already sent is kept.',
  'settings.usageLogs.collected': 'Collected',
  'settings.usageLogs.excluded': 'Never collected',
  'settings.usageLogs.collected.activity': 'Agent activity: tickets, commits, PRs, reviews',
  'settings.usageLogs.collected.skills':
    'The skills you run (/magic:start, /magic:pr, …), how long each run takes and how it ended',
  'settings.usageLogs.collected.session':
    'End-of-session summary: estimated cost, lines added/removed, duration, model',
  'settings.usageLogs.collected.context':
    'Ticket id and title, and the repositories you work in',
  'settings.usageLogs.excluded.prompts': 'Your prompts and Claude’s answers',
  'settings.usageLogs.excluded.code': 'Your code, your diffs, your file contents',
  'settings.usageLogs.excluded.terminal': 'Terminal output and command history',
  'settings.usageLogs.excluded.secrets': 'Your tokens, keys and credentials',
  'settings.usageLogs.excluded.args': 'What you type after a skill’s name',
  'settings.usageLogs.excluded.otherSkills': 'Any skill whose name does not start with “magic-”',
  'settings.usageLogs.footnote':
    'Every member of your organization can see these figures per person on the Team page.',
  'settings.usageLogs.footnoteAgents':
    'Whatever this setting says, your agents (name, branch, ticket, repositories) sync to your team — that is what powers the live view.',
  'settings.digest.label': 'Daily team digest',
  'settings.digest.help':
    'Off by default. When enabled, you get one notification at 9:00 AM summarizing your team’s activity from the last 24 hours (PRs shipped, tickets moved to Done). Nothing is sent when there was no activity.',
  'settings.split.label': 'Enable split view',
  'settings.split.help': 'Display two agents side by side on wide screens.',

  // ── Settings · PR Review Watcher ───────────────────────────────────────────
  'settings.prWatcher.section': 'PR Review Watcher',
  'settings.prWatcher.label': 'Watch PR reviews',
  'settings.prWatcher.help': 'Poll GitHub to track review status on agents’ pull requests.',
  'settings.prWatcher.intervalLabel': 'Polling interval',
  'settings.prWatcher.intervalHelp': 'How often the GitHub API is polled.',
  'settings.prWatcher.interval30s': '30 seconds',
  'settings.prWatcher.interval1m': '1 minute',
  'settings.prWatcher.interval2m': '2 minutes',
  'settings.prWatcher.interval5m': '5 minutes',
  'settings.prWatcher.autoLaunchLabel': 'Auto-launch skills',
  'settings.prWatcher.autoLaunchHelp':
    'Send /magic:resolve or /magic:done directly to the agent’s terminal. Disabled by default for safety.',

  // ── Settings · Claude Code ─────────────────────────────────────────────────
  'settings.claudeCode': 'Claude Code',
  'settings.launchMode.label': 'Permission mode',
  'settings.launchMode.help': 'Controls the level of autonomy for all Claude Code agents.',
  'settings.launchMode.plan': 'Plan',
  'settings.launchMode.plan.help':
    'Read-only — Claude explores and analyzes but never modifies anything',
  'settings.launchMode.default': 'Standard',
  'settings.launchMode.default.help': 'Claude asks permission for every sensitive action',
  'settings.launchMode.acceptEdits': 'Accept Edits',
  'settings.launchMode.acceptEdits.help':
    'Auto-accepts file edits, still asks for bash commands',
  'settings.launchMode.auto': 'Auto',
  'settings.launchMode.auto.help':
    'Auto-approves most actions based on configured allowlists',
  'settings.launchMode.bypass': 'Bypass',
  'settings.launchMode.bypass.help':
    'No permission checks — for sandboxed environments only',
  'settings.launchMode.bypassInline':
    'Bypass mode disables all permission checks. Only use it in sandboxed environments with no internet access.',
  'settings.launchMode.bypassTitle': 'Enable Bypass mode?',
  'settings.launchMode.bypassConfirm': 'I understand, enable Bypass',
  'settings.launchMode.bypassWarning':
    'Security warning: Bypass mode disables all permission checks. Every agent on every machine you sign in on will run commands and edit files without ever asking. Only use in sandboxed environments with no internet access.',

  // ── Organizations page ─────────────────────────────────────────────────────
  'org.title': 'Organizations',
  'org.yourOrgs': 'Your organizations',
  'org.yourOrgsCount': 'Your organizations ({count})',
  'org.emptyTitle': 'You do not belong to any organization.',
  'org.emptyHint': 'Create one, or join with an invitation.',
  'org.create': 'Create an organization',
  'org.join': 'Join an organization',
  'org.inviteModal.title': 'Invite to {name}',
  'org.inviteModal.titleFallback': 'Invite',
  'org.inviteModal.help':
    'An invitation link is generated — copy it from the list and send it to your colleague.',
  'org.inviteModal.emailPlaceholder': 'colleague@example.com',
  'org.inviteModal.role': 'Role',
  'org.inviteModal.send': 'Send invitation',
  'org.inviteModal.sending': 'Sending…',
  'org.createModal.help': 'You become its admin and can invite members right away.',
  'org.createModal.namePlaceholder': 'Organization name',
  'org.joinModal.help': 'Paste the invitation link you received, or just its token.',
  'org.joinModal.placeholder': 'https://app.magic-slash.io/invite/…',
  'org.joinModal.submitting': 'Joining…',
  'org.archiveModal.title': 'Archive organization',
  'org.archiveModal.confirm': 'Archive {name}?',
  'org.archiveModal.thisOrganization': 'this organization',
  'org.archiveModal.body':
    'The organization and its members lose access — it disappears for everyone. Its data is retained, not deleted, but this cannot be undone from the app.',
  'org.archiveModal.archiving': 'Archiving…',
  'org.error.role': 'Failed to update role.',
  'org.error.removeMember': 'Failed to remove member.',
  'org.error.leave': 'Failed to leave organization.',
  'org.error.deleteInvitation': 'Failed to delete invitation.',
  'org.error.createInvitation': 'Failed to create invitation.',
  'org.error.createOrg': 'Failed to create organization.',
  'org.error.join': 'Failed to join organization.',
  'org.error.archive': 'Failed to archive organization.',
  'org.error.nameRequired': 'An organization needs a name.',

  // ── Organization card ──────────────────────────────────────────────────────
  'org.role.admin': 'Admin',
  'org.role.member': 'Member',
  'org.role.member.help': 'Can see the team and work on shared repositories',
  'org.role.admin.help': 'Can invite, change roles and archive the organization',
  'org.members': 'Members',
  'org.membersEmpty': 'No members yet.',
  'org.colMember': 'Member',
  'org.colRole': 'Role',
  'org.colActions': 'Actions',
  'org.you': ' (you)',
  'org.removeMember': 'Remove member',
  'org.repositories': 'Repositories',
  'org.reposEmpty':
    'No shared repository. Repos shared to this org from the desktop app appear here.',
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

  // ── Repository page ────────────────────────────────────────────────────────
  'repo.back': 'Back to organizations',
  'repo.notFound': 'This repository doesn’t exist, or you don’t have access.',
  'repo.notFoundHint':
    'Team repos are only visible to members of the organization they belong to.',
  'repo.readOnly.title': 'Read-only',
  'repo.readOnly.body':
    'These settings are shared by everyone in {org}, so only its admins change them. Your own local folder is set in the desktop app — it stays on your machine and is never shared.',
  'repo.readOnly.theOrganization': 'the organization',
  'repo.delete.title': 'Delete repository',
  'repo.delete.confirmBefore': 'Delete',
  'repo.delete.confirmAfter': '?',
  'repo.delete.thisRepository': 'this repository',
  'repo.delete.teamBody':
    'It disappears for every member of the organization. This cannot be undone.',
  'repo.delete.personalBody': 'This cannot be undone.',
  'repo.delete.failed': 'Failed to delete repository.',
  'repo.updateFailed':
    'This repository could not be updated — you may not have permission to change it.',
  'repo.deleteForbidden':
    'This repository could not be deleted — only its owner or an org admin can remove it.',

  // ── Repository settings ────────────────────────────────────────────────────
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
  'repo.general.keywords': 'Keywords',
  'repo.general.keywordsHelp': 'Auto-detection keywords (comma-separated)',
  'repo.general.discussionLang': 'Discussion language',
  'repo.general.discussionLangHelp': 'Language Claude uses when talking with you',
  'repo.general.color': 'Color',
  'repo.general.colorHelp': 'Project color in the app sidebar',
  'repo.general.setColor': 'Set color {color}',
  'repo.branches.section': 'Branches',
  'repo.branches.development': 'Development branch',
  'repo.branches.developmentHelp':
    'Base branch for comparing commits. Typed by hand here — the web app can’t list the repo’s branches.',
  'repo.worktree.section': 'Worktree',
  'repo.worktree.files': 'Files to copy',
  'repo.worktree.filesHelp':
    'Files copied from the main repo into new worktrees (e.g. .env, .env.local)',
  'repo.commit.section': 'Commit',
  'repo.commit.language': 'Language',
  'repo.commit.languageHelp': 'Language used for commit messages',
  'repo.commit.style': 'Style',
  'repo.commit.styleHelp': 'Single line, or multi-line with a body',
  'repo.commit.styleSingle': 'Single line',
  'repo.commit.styleMulti': 'Multi-line (with body)',
  'repo.commit.format': 'Format',
  'repo.commit.formatHelp': 'Commit message convention',
  'repo.commit.formatConventional': 'Conventional',
  'repo.commit.formatAngular': 'Angular',
  'repo.commit.formatGitmoji': 'Gitmoji',
  'repo.commit.formatNone': 'None',
  'repo.commit.formatNoneHelp': 'Free form',
  'repo.commit.coAuthor': 'Co-author',
  'repo.commit.coAuthorHelp': 'Add Claude as co-author in commits',
  'repo.commit.ticketId': 'Include ticket ID',
  'repo.commit.ticketIdHelp': 'Add the ticket ID from the branch name',
  'repo.commit.protectedBranch': 'Commits on main branches',
  'repo.commit.protectedBranchHelpOn':
    'Allowed on main, master, develop and this repo’s development branch — /magic:commit asks first',
  'repo.commit.protectedBranchHelpOff':
    'Blocked on main, master, develop and this repo’s development branch — /magic:commit moves the work to a new branch',
  'repo.example': 'Example',
  'repo.resolve.section': 'Resolve',
  'repo.resolve.commitMode': 'Commit mode',
  'repo.resolve.commitModeHelp': 'How review fixes are committed',
  'repo.resolve.modeNew': 'New commit',
  'repo.resolve.modeNewHelp': 'Add a commit for the fixes',
  'repo.resolve.modeAmend': 'Amend last commit',
  'repo.resolve.modeAmendHelp': 'Rewrites history, pushes with force',
  'repo.resolve.modeAsk': 'Ask',
  'repo.resolve.modeAskHelp': 'Choose at runtime, on each resolve',
  'repo.resolve.commitFormat': 'Commit format',
  'repo.resolve.commitFormatHelp': 'Where resolve commit messages take their format from',
  'repo.resolve.useCommitConfig': 'Use commit settings',
  'repo.resolve.customConfig': 'Custom',
  'repo.resolve.reply': 'Reply to comments',
  'repo.resolve.replyHelp': 'Reply in-thread on resolved GitHub comments',
  'repo.resolve.replyLang': 'Reply language',
  'repo.resolve.replyLangHelp': 'Language for replies posted on GitHub',
  'repo.resolve.amendNotice': 'Push will use',
  'repo.resolve.askNoticeBefore': 'You’ll be asked to choose',
  'repo.resolve.askNoticeNew': 'new commit',
  'repo.resolve.askNoticeOr': 'or',
  'repo.resolve.askNoticeAmend': 'amend',
  'repo.resolve.askNoticeAfter': 'on each resolve. Amending pushes with',
  'repo.pr.section': 'Pull request',
  'repo.pr.language': 'Language',
  'repo.pr.languageHelp': 'Language used for PR titles and descriptions',
  'repo.pr.autoLink': 'Auto-link tickets',
  'repo.pr.autoLinkHelp': 'Add Jira / GitHub ticket links in the PR description',
  'repo.pr.watchCI': 'Watch CI & review',
  'repo.pr.watchCIHelp':
    'After creating the PR, wait for the checks, fix failures automatically, and address review feedback',
  'repo.pr.testAccounts': 'Test accounts',
  'repo.pr.testAccountsHelp':
    'Whether the PR description tells reviewers which account to log in with. Reference is safe on any repository; inline pastes the credentials into the PR body and is ignored on public repositories.',
  'repo.pr.testAccountsOff': 'Off',
  'repo.pr.testAccountsOffHelp': 'Never mention test accounts',
  'repo.pr.testAccountsReference': 'Reference',
  'repo.pr.testAccountsReferenceHelp': 'Say where they live, no credentials',
  'repo.pr.testAccountsInline': 'Inline',
  'repo.pr.testAccountsInlineHelp': 'Paste the credentials in the PR body',
  'repo.pr.testAccountsSource': 'Test accounts source',
  'repo.pr.testAccountsSourceHelp':
    'Optional file path or project skill name holding the accounts — auto-detected when empty',
  'repo.pr.testAccountsPublicWarn':
    'Credentials are never pasted on a public repository: inline falls back to reference there.',
  'repo.pr.template': 'PR template',
  'repo.pr.templateHelp':
    'Edited in the desktop app — the template is a file in the repository (.github/pull_request_template.md), not a setting.',
  'repo.issues.section': 'Jira / GitHub issues',
  'repo.issues.commentLang': 'Comment language',
  'repo.issues.commentLangHelp': 'Language used for Jira and GitHub issue comments',
  'repo.issues.commentOnPR': 'Comment on PR creation',
  'repo.issues.commentOnPRHelp': 'Post a comment with the PR link on the ticket',
  'repo.issues.jiraUrl': 'Jira URL',
  'repo.issues.jiraUrlHelp': 'Base URL for Jira tickets (e.g. PROJ-123)',
  'repo.issues.githubUrl': 'GitHub issues URL',
  'repo.issues.githubUrlHelp': 'Base URL for GitHub issues (e.g. #456)',
  'repo.danger.section': 'Danger zone',
  'repo.danger.delete': 'Delete this repository',
  'repo.danger.deleteTeamHelp': 'Removes it for every member of the organization.',
  'repo.danger.deletePersonalHelp': 'Removes it from your Magic Slash configuration.',
  'repo.danger.deleteAction': 'Delete repository',
  'repo.teamNote': 'Changes here apply for every member of {org}.',
} as const
