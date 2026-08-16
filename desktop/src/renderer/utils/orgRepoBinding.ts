import type { RepositoryConfig } from '../../types'
import { repoBasename } from '../../repoMatch'
import type { RepoScope } from './repoRows'

/**
 * One organization repository, as the invitation wizard presents it: something
 * to bind to a local folder, never something to create.
 *
 * `key` is the record key in `Config.repositories` — the argument every config
 * write takes — while `displayName` is the repository's real name in the cloud.
 * The two differ when the key carries an org suffix (`api (Acme)`), so binding
 * must use the key and the UI must show the name. An empty `path` is the
 * "no folder on this machine yet" state, the same rule the main process
 * validates by (`main/config/repo-validation.ts`).
 */
export interface OrgRepoRow {
  key: string
  displayName: string
  path: string
}

/** What a picked folder says about the repository it is about to be bound to. */
export type FolderNameVerdict =
  | { kind: 'none' }
  | { kind: 'mismatch' }
  | { kind: 'belongs-to-other'; otherRepoName: string }

/**
 * The name a folder would get if it were added as a repository — the exact
 * normalization `addRepository` callers apply, kept here so the comparison and
 * the escape hatch cannot drift apart.
 */
export function slugifyRepoName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase()
}

/**
 * The organization's repositories, as rows to bind.
 *
 * Scoped exactly like the Team page: `RepoScope` is an org id, or null for the
 * repositories that belong to no org.
 */
export function listBindableOrgRepos(
  repositories: Record<string, RepositoryConfig>,
  scope: RepoScope,
): OrgRepoRow[] {
  const rows = Object.entries(repositories)
    .filter(([, repo]) => (repo.orgId ?? null) === scope)
    .map(([key, repo]) => ({
      key,
      displayName: repo.name ?? key,
      path: repo.path ?? '',
    }))

  rows.sort((a, b) => a.displayName.localeCompare(b.displayName))
  return rows
}

/**
 * Whether the folder the user just picked looks like the repository they picked
 * it for.
 *
 * The folder name is only a hint — a mismatch is surfaced, never enforced,
 * because a local clone is allowed to be named anything. 'belongs-to-other' is
 * the sharper case: the folder matches ANOTHER repository of the list, so the
 * user most likely clicked the wrong row.
 *
 * A `targetKey` absent from `rows` yields 'none': rows outside the org list
 * (the ones added from the escape hatch) have nothing to be compared against.
 */
export function detectFolderNameMismatch(
  pickedPath: string,
  targetKey: string,
  rows: OrgRepoRow[],
): FolderNameVerdict {
  const target = rows.find((row) => row.key === targetKey)
  if (!target) return { kind: 'none' }

  const picked = slugifyRepoName(repoBasename(pickedPath))
  if (!picked || picked === slugifyRepoName(target.displayName)) return { kind: 'none' }

  const other = rows.find(
    (row) => row.key !== targetKey && slugifyRepoName(row.displayName) === picked,
  )
  if (other) return { kind: 'belongs-to-other', otherRepoName: other.displayName }

  return { kind: 'mismatch' }
}

/**
 * Whether adding a repository under `slug` would collide with something the user
 * already has. Repositories are keyed by name, so an unchecked add silently
 * overwrites — and a slug matching one of the org's repositories is exactly the
 * duplicate this wizard exists to prevent, even when the keys differ.
 */
export function isKeyTaken(
  repositories: Record<string, RepositoryConfig>,
  rows: OrgRepoRow[],
  slug: string,
): boolean {
  if (slug in repositories) return true
  return rows.some((row) => slugifyRepoName(row.displayName) === slug)
}
