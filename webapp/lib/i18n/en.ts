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
  'common.saving': 'Saving…',
  'common.create': 'Create',
  'common.creating': 'Creating…',
  'common.copied': 'Copied',
  'common.close': 'Close',
  'common.download': 'Download',
  'common.add': 'Add',
  'common.next': 'Next',
  'common.back': 'Back',
  'common.finish': 'Finish',
  'common.saveFailed': 'Failed to save.',
  'common.remove': 'Remove {item}',
  'common.notSignedIn': 'Not signed in.',

  // ── Language switcher ──────────────────────────────────────────────────────
  'language.label': 'Interface language',
  'language.hint': 'Applies to this website, in this browser.',

  // ── App chrome ─────────────────────────────────────────────────────────────
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
  'onboarding.repoPath.title': 'Point a repository at its folder',
  'onboarding.repoPath.hintDone.one': '1 repository bound to a local folder',
  'onboarding.repoPath.hintDone.many': '{count} repositories bound to a local folder',
  'onboarding.repoPath.hintPending':
    'An agent works in your clone — without its path, /magic:start has nowhere to run',
  'onboarding.repoPath.step.1': 'Open Magic Slash on your machine',
  'onboarding.repoPath.step.2': 'Go to the Repositories tab',
  'onboarding.repoPath.step.3': 'Pick a repository — or add one, if the list is empty',
  'onboarding.repoPath.step.4': 'Choose the folder you cloned it into',
  'onboarding.repoPath.note':
    'It happens in the app rather than here because choosing a folder means browsing your disk. And where each person cloned a repository is their own business, so one shared with your organization still waits for your folder.',

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
  'team.status.ciGreen': 'CI green',
  'team.status.inReview': 'in review',
  'team.status.changesRequested': 'changes requested',
  'team.status.reviewAddressed': 'review addressed',
  'team.status.prMerged': 'PR merged',
  'team.unmatched.one': '1 agent on a repository this view cannot resolve',
  'team.unmatched.many': '{count} agents on repositories this view cannot resolve',

  // ── Plans ──────────────────────────────────────────────────────────────────
  'plans.title': 'Plans',
  'plans.noRepo': 'Unknown repository',

  // ── Skill stats ────────────────────────────────────────────────────────────
  'skills.title': 'Skills run',
  'skills.titlePersonal': 'Your skills run',
  'skills.runs.one': '1 run',
  'skills.runs.many': '{count} runs',
  'skills.empty':
    'No run recorded for this organization yet. Runs are attributed through the repositories of the agent that launches them, so work on a personal repository is not counted here.',
  'skills.emptyPersonal':
    'No run recorded outside an organization yet. A run lands here only when the agent that launched it works on personal repositories alone — one started in a terminal the desktop app did not open is attributed to your organization instead.',

  // ── Skill hours ────────────────────────────────────────────────────────────
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

  // ── Skill hours · activity recording off ───────────────────────────────────
  'skillHours.optIn.title': 'Your hours, once recording is on',
  'skillHours.optIn.body':
    'Activity recording is off, so no skill run is being logged and there is nothing to count here. Turn it on and the total starts again at your next run — the ones made in the meantime are not backfilled.',
  'skillHours.optIn.cta': 'Turn on recording',
  'skillHours.optIn.saving': 'Turning it on…',
  'skillHours.optIn.savedTitle': 'Recording is on.',
  'skillHours.optIn.savedBody':
    'Your hours show up here after your next skill run. The desktop app follows this switch live, so there is nothing to restart.',
  'skillHours.optIn.note':
    'This is the “Share my activity with my team” switch. What it records is listed in the desktop app under Settings → Application, where you can turn it back off whenever you like.',

  // ── Cloud account ──────────────────────────────────────────────────────────
  'cloud.signOut': 'Sign out',

  // ── Profile ────────────────────────────────────────────────────────────────
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

  // ── Relative time ──────────────────────────────────────────────────────────
  'time.unknown': 'unknown',
  'time.justNow': 'just now',
  'time.minutes.one': '1 minute ago',
  'time.minutes.many': '{count} minutes ago',
  'time.hours.one': '1 hour ago',
  'time.hours.many': '{count} hours ago',
  'time.days.one': '1 day ago',
  'time.days.many': '{count} days ago',

  // ── Settings ───────────────────────────────────────────────────────────────
  'settings.saveFailed': 'Your settings could not be saved — please sign in again and retry.',

  // ── Settings · Appearance ──────────────────────────────────────────────────
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

  // ── Settings · Language & Region ───────────────────────────────────────────
  'settings.language.label': 'Interface language',
  'settings.language.help':
    'The language of the app itself — menus, settings, notifications, and how dates and numbers are written.',

  // ── Settings · Claude Code ─────────────────────────────────────────────────
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

  // ── Organizations ───────────────────────────────────────────────────────────
  'org.inviteModal.title': 'Invite to {name}',
  'org.inviteModal.help':
    'An invitation link is generated — copy it from the list and send it to your colleague.',
  'org.inviteModal.emailPlaceholder': 'colleague@example.com',
  'org.inviteModal.send': 'Send invitation',
  'org.error.nameRequired': 'An organization needs a name.',

  // ── Organization card ──────────────────────────────────────────────────────
  'org.members': 'Members',
  'org.membersEmpty': 'No members yet.',
  'org.colMember': 'Member',
  'org.colRole': 'Role',
  'org.colActions': 'Actions',
  'org.you': ' (you)',

  // ── Repository ─────────────────────────────────────────────────────────────
  'repo.back': 'Back to organizations',

  // ── Repository settings ────────────────────────────────────────────────────
  'repo.general.keywords': 'Keywords',
  'repo.general.keywordsHelp': 'Auto-detection keywords — one per tag',
  'repo.example': 'Example',

  // Only emitted when the setting is off: leaving out what does not apply is the default.
  'repo.plan.intro': 'Turns an idea into tickets. On this repository:',

  // ── The email-confirmation landing ───────────────────────────────────────
  // Read by components/EmailConfirmed.tsx, which draws over whatever the root of the
  // app host rendered. The visitor got here by opening a link in a mailbox and may
  // not be signed in on the web at all, so the copy says what happened and sends them
  // back to the app rather than offering anything to do here.
  'emailConfirmed.title': 'Email address confirmed',
  'emailConfirmed.body':
    'Your Magic Slash account now signs in with this address. Nothing else has changed.',
  'emailConfirmed.hint': 'You can close this tab and go back to the app.',
} as const
