import type { RepositoryConfig, SpotlightConfig, SpotlightShortcut, LaunchMode } from '../../types'

export const VALID_SPOTLIGHT_SHORTCUTS: readonly SpotlightShortcut[] = [
  'Control+Space',
  'Control+Shift+Space',
  'Alt+Space',
  'Alt+Shift+Space',
  'Control+M',
  'Control+Shift+M',
  'Alt+M',
  'Alt+Shift+M',
] as const

export function isValidSpotlightShortcut(value: unknown): value is SpotlightShortcut {
  return typeof value === 'string' && (VALID_SPOTLIGHT_SHORTCUTS as readonly string[]).includes(value)
}

export function isValidSpotlightConfig(obj: unknown): obj is SpotlightConfig {
  if (typeof obj !== 'object' || obj === null) return false
  const record = obj as Record<string, unknown>
  return typeof record.enabled === 'boolean' && isValidSpotlightShortcut(record.shortcut)
}

export const DEFAULT_SPOTLIGHT: SpotlightConfig = { enabled: true, shortcut: 'Control+Space' }

const VALID_LAUNCH_MODES: readonly LaunchMode[] = [
  'plan',
  'default',
  'acceptEdits',
  'auto',
  'bypassPermissions',
] as const

export function isValidLaunchMode(value: unknown): value is LaunchMode {
  return typeof value === 'string' && (VALID_LAUNCH_MODES as readonly string[]).includes(value)
}

export const DEFAULT_REPOSITORY_FIELDS: Omit<RepositoryConfig, 'path' | 'keywords'> = {
  color: '#3B82F6',
  languages: {
    commit: 'en',
    pullRequest: 'en',
    jiraComment: 'en',
    discussion: 'en'
  },
  commit: {
    style: 'single-line',
    format: 'angular',
    coAuthor: true,
    includeTicketId: true
  },
  resolve: {
    commitMode: 'new',
    format: 'angular',
    style: 'single-line',
    useCommitConfig: true,
    replyToComments: true,
    replyLanguage: 'en'
  },
  // KNOWN DEFECT (issue #161): a key an org can share — the SHARED_KEYS of
  // store/CloudStore.ts — can never be inherited from the organization once it
  // carries a concrete default HERE, because the default is already set locally by
  // the time mergeOrgSharedConfig runs (see config-merge.test.ts for the mechanism).
  // `pullRequest` was therefore dropped: the renderer already falls back to exactly
  // these values (RepoPage: autoLinkTickets/watchCI true, testAccounts 'off'), so
  // removing them changes nothing a user sees while making inheritance possible.
  // `languages` and `commit` above still carry defaults and still have the bug —
  // known follow-ups, not an exception to the rule.
  issues: {
    commentOnPR: true,
    jiraUrl: '',
    githubIssuesUrl: ''
  },
  branches: {
    development: ''
  },
  worktreeFiles: []
}
