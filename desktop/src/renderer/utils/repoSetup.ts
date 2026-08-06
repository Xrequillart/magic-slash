import type { MessageKey } from '../../i18n'
import type { InvalidRepo } from '../../preload'
import type { RepositoryConfig } from '../../types'

/** Why the main process considers a configured repository unusable. */
export type RepoSetupReason = InvalidRepo['reason']

/**
 * What the launch onboarding modal is being opened FOR: an account with no
 * repository at all ('empty', so the only sensible action is "add one"), or an
 * account whose repositories exist but need a folder bound or re-bound ('fix').
 */
export type RepoSetupMode = 'empty' | 'fix'

/** One repository the user has to act on, as the modal presents it. */
export interface RepoSetupRow {
  name: string
  path: string
  reason: RepoSetupReason
}

/** What the launch modal shows: which flow it is in, and the rows to act on. */
export interface RepoSetup {
  mode: RepoSetupMode
  rows: RepoSetupRow[]
}

/** Everything the UI decides per reason, so a new reason is one row to fill in. */
interface ReasonMeta {
  /**
   * Row order. A team repo never bound on this machine comes first because it is
   * the most common case and the cheapest to fix; a folder that has gone missing
   * next; "not a git repo" last, since that one usually means the user pointed at
   * the wrong place and needs to think about it.
   */
  priority: number
  /** Badge tone on the row. */
  severity: 'warning' | 'error'
  /** Badge label on the row. */
  labelKey: MessageKey
  /**
   * Launch toast for the reason, or null when the state is expected and must not
   * nag — a team repo with no folder bound yet is surfaced gently, in the modal
   * and in Settings, never as a persistent error toast.
   */
  toastKey: MessageKey | null
}

/**
 * The single place a reason's meaning lives. Kept exhaustive on purpose: adding a
 * reason in the main process fails to compile here until ordering, tone, label and
 * toast policy have all been decided, instead of silently defaulting to "not a git
 * repository" in the toast and to red in the modal.
 */
export const REASON_META: Record<RepoSetupReason, ReasonMeta> = {
  'no-local-path': {
    priority: 0,
    severity: 'warning',
    labelKey: 'repoSetup.reason.noLocalPath',
    toastKey: null,
  },
  'missing': {
    priority: 1,
    severity: 'error',
    labelKey: 'repoSetup.reason.missing',
    toastKey: 'toast.repoInvalidMissing',
  },
  'not-git': {
    priority: 2,
    severity: 'error',
    labelKey: 'repoSetup.reason.notGit',
    toastKey: 'toast.repoInvalidNotGit',
  },
}

/**
 * Decide what the launch repository-setup modal should show.
 *
 * The invalid list comes from the main process (it is the only side that can
 * stat the filesystem), and the config is what the renderer holds. Cross-checking
 * the two matters: a repo can be deleted locally while an older `repos:invalid`
 * payload still names it, and listing a repository the user no longer has would
 * offer a "choose folder" button that writes into nothing.
 *
 * A null/undefined config is deliberately NOT treated as "no repositories": on
 * launch the config arrives asynchronously, and mapping that first frame to
 * `empty` would flash an "add a repository" modal at users who have ten.
 */
export function buildRepoSetup(
  repositories: Record<string, RepositoryConfig> | null | undefined,
  invalid: InvalidRepo[],
): RepoSetup {
  if (!repositories) return { mode: 'fix', rows: [] }

  if (Object.keys(repositories).length === 0) return { mode: 'empty', rows: [] }

  const seen = new Set<string>()
  const rows: RepoSetupRow[] = []
  for (const repo of invalid) {
    if (!(repo.name in repositories)) continue
    if (seen.has(repo.name)) continue
    seen.add(repo.name)
    rows.push({ name: repo.name, path: repo.path, reason: repo.reason })
  }

  rows.sort((a, b) =>
    REASON_META[a.reason].priority - REASON_META[b.reason].priority || a.name.localeCompare(b.name))

  return { mode: 'fix', rows }
}

/**
 * Fold a freshly computed setup into the one the open modal is already showing.
 *
 * `repos:invalid` is re-emitted every 20s and on every window focus, so the live
 * setup is a moving target while the modal is open. Rendering it directly would
 * make a row the user has just fixed vanish mid-session — the green "Ready" state
 * erased by the very success that produced it, and an empty list under a "fix
 * these" heading when it was the last row. So the modal keeps the snapshot it
 * opened with and merges into it:
 *
 * - a displayed row is NEVER dropped, whatever later payloads say. Its absence is
 *   the expected outcome of a successful fix, not a reason to hide the proof;
 * - a repository that shows up later and is not displayed yet is APPENDED — an
 *   organization's repositories only land once the connectivity check passes, and
 *   a late arrival still has to be surfaced. Appending (rather than re-sorting the
 *   whole list) keeps the rows the user is aiming at from moving under the cursor;
 * - a displayed row's reason and path still follow later payloads, so a row the
 *   user has not touched never shows a verdict the main process has superseded.
 *
 * The mode comes from the snapshot: the body the modal opened with is the body it
 * closes with, for the same reason the wizard pins `effectiveMode`.
 *
 * Returns the displayed setup unchanged (same identity) when nothing moved, so a
 * poll that reports the status quo costs no re-render.
 */
export function mergeRepoSetup(displayed: RepoSetup, incoming: RepoSetup): RepoSetup {
  const incomingByName = new Map(incoming.rows.map((row) => [row.name, row] as const))
  let changed = false

  const rows = displayed.rows.map((row) => {
    const update = incomingByName.get(row.name)
    if (!update) return row
    if (update.reason === row.reason && update.path === row.path) return row
    changed = true
    return { ...row, path: update.path, reason: update.reason }
  })

  const seen = new Set(displayed.rows.map((row) => row.name))
  for (const row of incoming.rows) {
    if (seen.has(row.name)) continue
    seen.add(row.name)
    rows.push(row)
    changed = true
  }

  return changed ? { mode: displayed.mode, rows } : displayed
}

/**
 * Whether the modal has anything to say: no repository at all is worth one even
 * though it produces no rows, and rows are worth one even though the user already
 * has repositories.
 */
export function needsRepoSetup(setup: RepoSetup): boolean {
  return setup.mode === 'empty' || setup.rows.length > 0
}
