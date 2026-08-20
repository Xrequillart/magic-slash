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
    includeTicketId: true,
    // Permitted by default: an update must not silently take away the ability to
    // commit on develop. The guard still speaks up — it asks first (see types.ts).
    allowOnProtectedBranch: true
  },
  resolve: {
    commitMode: 'new',
    format: 'angular',
    style: 'single-line',
    useCommitConfig: true,
    replyToComments: true,
    replyLanguage: 'en'
  },
  pullRequest: {
    autoLinkTickets: true,
    watchCI: true,
    testAccounts: 'off',
    testAccountsSource: ''
  },
  issues: {
    commentOnPR: true
  },
  // The repo's Jira coordinates, in one place — see types.ts and
  // supabase/migrations/20260820090000_repositories_jira.sql.
  //
  // `issues.jiraUrl` and `plan.jiraProject`, the keys these two replaced, are
  // deliberately NOT defaulted any more. They are read-only fallbacks now, and a
  // default is precisely what would materialise them onto every repo at first
  // launch — persistRepoIdentity writes each block wholesale, so defaulting a key
  // IS writing it, and the app has promised to stop touching those two.
  //
  // '' here is safe where 'en' would not have been: both resolvers chain with `||`,
  // so an empty default falls through to the legacy key instead of shadowing it.
  // A truthy default would win the chain and silently discard the old value —
  // that is the trap `languages.ticket` avoids by staying absent entirely.
  //
  // `githubIssuesUrl` goes for a third reason: it is an override meaning "the
  // issues are NOT in this repo", and defaulting it to '' made it look like a
  // field waiting to be filled. resolveGitHubIssuesUrl() derives it from
  // `remoteUrl` when it is absent, which is the answer for everyone who never
  // needed the override.
  jira: {
    siteUrl: '',
    projectKey: ''
  },
  // NOTE: `languages.ticket` is deliberately NOT defaulted here. It heads a
  // fallback chain (`ticket` -> `jiraComment` -> 'en'), and deepMergeDefaults
  // would materialise 'en' on every existing repo — pinning them to English and
  // making the chain unreachable. Resolve it at read time instead, with
  // resolveTicketLanguage() from `desktop/src/languages.ts`.
  plan: {
    tracker: 'ask',
    issueTypes: {
      epic: 'Epic',
      story: 'Story'
    },
    useRepoTemplates: true,
    splitting: 'balanced',
    acceptanceCriteria: 'checklist',
    // deepMergeDefaults copies one level, so this array — and `issueTypes` above —
    // is the exact instance handed to every repo missing the key. Writers must
    // REPLACE, never mutate in place; same contract as worktreeFiles below.
    defaultLabels: [],
    assignToMe: false,
    duplicateCheck: true
  },
  branches: {
    development: ''
  },
  worktreeFiles: []
}
