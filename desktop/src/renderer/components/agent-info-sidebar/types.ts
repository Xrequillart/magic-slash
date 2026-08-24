import type { ChangedFile } from '../../../types'

export interface BranchCommit {
  hash: string
  shortHash: string
  subject: string
  author: string
  date: string
  relativeDate: string
  isPushed: boolean
}

export interface GitStats {
  additions: number
  deletions: number
  filesChanged: number
  isGitRepo: boolean
  /**
   * Declared in the shared types module rather than inline here: the store keeps a
   * frozen COPY of this array for the review drawer, and it cannot import a shape
   * out of a component folder.
   */
  files: ChangedFile[]
}

export interface BranchCommits {
  commits: BranchCommit[]
  baseBranch: string
  currentBranch: string
}

export interface RepoGitData {
  stats: GitStats | null
  commits: BranchCommits | null
  branch: string | null
  error: string | null
  gitHubUrl: string | null
}
