import { getSupabase } from './supabase'
import { t } from './i18n'
import { DEFAULT_LANGUAGE, type LanguageId } from './i18n/languages'

/**
 * Repositories: the shared identity of a repo (name, keywords, conventions)
 * without any local filesystem path. Paths live in a separate own-rows-only
 * table because where each member cloned a repo is private — and the webapp,
 * having no filesystem to pick one from, never WRITES one. It reads its own
 * rows, which is all `countBoundRepositories` below needs.
 *
 * `org_id` NULL means a personal repo; set means shared with that org.
 *
 * This table is the desktop app's source of truth for repo config (its CloudStore
 * assembles the local config from these rows) and it is in the realtime
 * publication, so edits made here reach every running app live.
 */

/** Project colors, same palette as the desktop sidebar. */
export const REPO_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
]

export interface RepoLanguages {
  commit?: string
  pullRequest?: string
  jiraComment?: string
  discussion?: string
  /**
   * The language created tickets are WRITTEN IN — distinct from `discussion`, which
   * is the language a skill TALKS TO YOU in. Head of a fallback chain
   * (`ticket` -> `jiraComment` -> DEFAULTS.language), so it has no entry in DEFAULTS:
   * materialising one would pin every repo to English and make the chain unreachable.
   */
  ticket?: string
}

export interface RepoCommit {
  style?: string
  format?: string
  coAuthor?: boolean
  includeTicketId?: boolean
  /** Allow committing straight onto main/master/develop. True (the default) still
   *  makes /magic:commit ask; false makes it branch off first. */
  allowOnProtectedBranch?: boolean
}

export interface RepoResolve {
  commitMode?: string
  format?: string
  style?: string
  useCommitConfig?: boolean
  replyToComments?: boolean
  replyLanguage?: string
}

export interface RepoPullRequest {
  autoLinkTickets?: boolean
  watchCI?: boolean
  /** 'off' | 'reference' | 'inline' */
  testAccounts?: string
  testAccountsSource?: string
}

export interface RepoIssues {
  commentOnPR?: boolean
  jiraUrl?: string
  githubIssuesUrl?: string
}

export interface RepoBranches {
  development?: string
}

export interface Repository {
  id: string
  orgId: string | null
  ownerId: string | null
  name: string
  keywords: string[]
  color: string | null
  languages: RepoLanguages
  commit: RepoCommit
  resolve: RepoResolve
  pullRequest: RepoPullRequest
  issues: RepoIssues
  branches: RepoBranches
  worktreeFiles: string[]
  createdAt: string | null
}

interface RepositoryRow {
  id: string
  org_id: string | null
  owner_id: string | null
  name: string
  keywords: string[] | null
  color: string | null
  languages: RepoLanguages | null
  commit: RepoCommit | null
  resolve: RepoResolve | null
  pull_request: RepoPullRequest | null
  issues: RepoIssues | null
  branches: RepoBranches | null
  worktree_files: string[] | null
  created_at: string | null
}

const COLUMNS =
  'id, org_id, owner_id, name, keywords, color, languages, commit, resolve, pull_request, issues, branches, worktree_files, created_at'

function toRepository(r: RepositoryRow): Repository {
  return {
    id: r.id,
    orgId: r.org_id,
    ownerId: r.owner_id,
    name: r.name,
    keywords: r.keywords ?? [],
    color: r.color,
    languages: r.languages ?? {},
    commit: r.commit ?? {},
    resolve: r.resolve ?? {},
    pullRequest: r.pull_request ?? {},
    issues: r.issues ?? {},
    branches: r.branches ?? {},
    worktreeFiles: r.worktree_files ?? [],
    createdAt: r.created_at,
  }
}

/**
 * Repos shared with an org, alphabetical. RLS limits SELECT to orgs the caller
 * belongs to, so a non-member gets [] rather than an error.
 */
export async function fetchOrgRepositories(orgId: string): Promise<Repository[]> {
  const { data, error } = await getSupabase()
    .from('repositories')
    .select(COLUMNS)
    .eq('org_id', orgId)
    .order('name', { ascending: true })
  if (error || !data) return []
  return (data as RepositoryRow[]).map(toRepository)
}

/** A single repo by id, or null when it doesn't exist or isn't visible. */
export async function fetchRepository(id: string): Promise<Repository | null> {
  const { data, error } = await getSupabase()
    .from('repositories')
    .select(COLUMNS)
    .eq('id', id)
    .maybeSingle()
  if (error || !data) return null
  return toRepository(data as RepositoryRow)
}

/**
 * How many repositories the caller has bound to a folder on their disk.
 *
 * The onboarding checklist needs the NUMBER and never the paths, so this asks for a
 * count and no rows. `repository_paths` is own-rows-only by RLS: a teammate's binding
 * cannot be counted here, and a repo shared with the whole org counts only once it is
 * this user who bound it — which is the honest question, since the binding is per
 * person (the table's key is `repo_id, user_id`) and an agent runs in the caller's
 * clone.
 *
 * 0 on failure, matching the other fetchers here: they resolve to an empty result and
 * leave `null` to mean "not fetched yet". A step that reads as not-done when the
 * request failed asks someone to do something they have already done; the reverse
 * would tick off a step that never happened and send them to /magic:start to find out.
 */
export async function countBoundRepositories(): Promise<number> {
  const { count, error } = await getSupabase()
    .from('repository_paths')
    .select('repo_id', { count: 'exact', head: true })
  if (error) return 0
  return count ?? 0
}

/**
 * Fields the webapp may patch. Deliberately excludes `owner_id` (set once at
 * creation) and anything path-related (which lives in `repository_paths`).
 */
export interface RepositoryPatch {
  name?: string
  keywords?: string[]
  color?: string | null
  orgId?: string | null
  languages?: RepoLanguages
  commit?: RepoCommit
  resolve?: RepoResolve
  pullRequest?: RepoPullRequest
  issues?: RepoIssues
  branches?: RepoBranches
  worktreeFiles?: string[]
}

/**
 * Expands a *shallow* patch into the full-column patch to persist: each jsonb
 * block is merged key-by-key over `repo`, scalar columns pass through untouched.
 *
 * This exists so a caller can send only the setting it changed. Building the
 * merged block at the call site instead would capture whatever `repo` that render
 * closed over, and two settings changed before the next render would each write a
 * block based on the same stale snapshot — the second silently dropping the
 * first. Expanding against an explicitly supplied `repo` lets the caller pass the
 * freshest row it has.
 *
 * The result is safe both to spread into local state and to hand to
 * updateRepository, since blocks are stored whole.
 */
export function expandPatch(repo: Repository, patch: RepositoryPatch): RepositoryPatch {
  const out: RepositoryPatch = { ...patch }
  if (patch.languages) out.languages = { ...repo.languages, ...patch.languages }
  if (patch.commit) out.commit = { ...repo.commit, ...patch.commit }
  if (patch.resolve) out.resolve = { ...repo.resolve, ...patch.resolve }
  if (patch.pullRequest) out.pullRequest = { ...repo.pullRequest, ...patch.pullRequest }
  if (patch.issues) out.issues = { ...repo.issues, ...patch.issues }
  if (patch.branches) out.branches = { ...repo.branches, ...patch.branches }
  return out
}

/**
 * Writes a patch and returns the stored row. The jsonb blocks are replaced
 * wholesale rather than merged, so callers pass the full block — that matches how
 * the desktop writes them. Use expandPatch to build one from a single setting.
 *
 * Returning the row lets a caller keep its state on what was actually stored,
 * rather than on what it hoped would be, without a second round trip.
 *
 * Throws when the write touched no row. PostgREST reports an RLS-filtered
 * UPDATE as a success with zero rows affected, not as an error, so checking
 * `error` alone would let a forbidden write look like it saved; selecting the
 * affected rows back is what makes that observable.
 *
 * Returns null when the patch was empty and no write was issued.
 */
export async function updateRepository(
  id: string,
  patch: RepositoryPatch,
  lang: LanguageId = DEFAULT_LANGUAGE,
): Promise<Repository | null> {
  const row: Record<string, unknown> = {}
  if (patch.name !== undefined) row.name = patch.name.trim()
  if (patch.keywords !== undefined) row.keywords = patch.keywords
  if (patch.color !== undefined) row.color = patch.color
  if (patch.orgId !== undefined) row.org_id = patch.orgId
  if (patch.languages !== undefined) row.languages = patch.languages
  if (patch.commit !== undefined) row.commit = patch.commit
  if (patch.resolve !== undefined) row.resolve = patch.resolve
  if (patch.pullRequest !== undefined) row.pull_request = patch.pullRequest
  if (patch.issues !== undefined) row.issues = patch.issues
  if (patch.branches !== undefined) row.branches = patch.branches
  if (patch.worktreeFiles !== undefined) row.worktree_files = patch.worktreeFiles
  if (Object.keys(row).length === 0) return null

  const { data, error } = await getSupabase()
    .from('repositories')
    .update(row)
    .eq('id', id)
    .select(COLUMNS)
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) {
    throw new Error(t('repo.updateFailed', lang))
  }
  return toRepository(data[0] as RepositoryRow)
}

/**
 * Deletes a repo. RLS allows this for the owner or an admin of the org it is
 * shared with; `repository_paths` rows cascade.
 *
 * Throws when nothing was deleted, for the same reason updateRepository does: a
 * DELETE that RLS filtered out returns no error and zero rows, which would
 * otherwise read as "deleted" and send the caller off to a success screen.
 */
export async function deleteRepository(
  id: string,
  lang: LanguageId = DEFAULT_LANGUAGE,
): Promise<void> {
  const { data, error } = await getSupabase()
    .from('repositories')
    .delete()
    .eq('id', id)
    .select('id')
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) {
    throw new Error(t('repo.deleteForbidden', lang))
  }
}

// ── Defaults ─────────────────────────────────────────────────────────────────
// The desktop stores null/absent to mean "use the default" and resolves it at
// read time. These mirror those fallbacks so both surfaces agree on what an
// unset setting means.

export const DEFAULTS = {
  language: 'en',
  commitStyle: 'single-line',
  commitFormat: 'angular',
  coAuthor: true,
  includeTicketId: false,
  allowOnProtectedBranch: true,
  resolveCommitMode: 'new',
  resolveUseCommitConfig: true,
  resolveStyle: 'single-line',
  resolveFormat: 'angular',
  replyToComments: true,
  autoLinkTickets: true,
  watchCI: true,
  testAccounts: 'off',
  commentOnPR: true,
} as const

/**
 * Renders the commit message a given format/style produces, for the live example
 * shown under the commit settings. Ported from the desktop.
 */
export function commitExample(format: string, style: string, includeTicketId: boolean): string {
  const examples: Record<string, { type?: string; scope?: string; emoji?: string; msg: string }> = {
    conventional: { type: 'feat', msg: 'add user authentication' },
    angular: { type: 'feat', scope: 'auth', msg: 'add user authentication' },
    gitmoji: { emoji: '✨', msg: 'add user authentication' },
    none: { msg: 'Add user authentication' },
  }
  const example = examples[format] ?? examples.conventional

  let firstLine: string
  switch (format) {
    case 'angular':
      firstLine = `${example.type}(${example.scope}): ${example.msg}`
      break
    case 'gitmoji':
      firstLine = `${example.emoji} ${example.msg}`
      break
    case 'none':
      firstLine = example.msg
      break
    default:
      firstLine = `${example.type}: ${example.msg}`
  }

  if (includeTicketId) firstLine += ' [PROJ-123]'
  if (style === 'multi-line') return `${firstLine}\n\nImplement login flow with session management`
  return firstLine
}
