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
  files: Array<{
    path: string
    additions: number
    deletions: number
    status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked'
  }>
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
