import { readConfig } from './config'
import { isGitRepository } from './validation'

export type InvalidRepoReason = 'missing' | 'not-git'

export interface InvalidRepo {
  name: string
  path: string
  reason: InvalidRepoReason
}

/**
 * Strict repo-path check: the directory must exist AND contain a `.git` entry.
 * Built on isGitRepository (not the lenient validateRepoPath, which only warns).
 */
export function checkRepoPath(repoPath: string): { valid: boolean; reason?: InvalidRepoReason } {
  const res = isGitRepository(repoPath)
  if (!res.exists) return { valid: false, reason: 'missing' }
  if (!res.isGit) return { valid: false, reason: 'not-git' }
  return { valid: true }
}

/** Every configured repository whose path is missing or is not a git repository. */
export function validateAllRepoPaths(): InvalidRepo[] {
  const config = readConfig()
  const invalid: InvalidRepo[] = []
  for (const [name, repo] of Object.entries(config.repositories ?? {})) {
    const { valid, reason } = checkRepoPath(repo.path)
    if (!valid && reason) invalid.push({ name, path: repo.path, reason })
  }
  return invalid
}
