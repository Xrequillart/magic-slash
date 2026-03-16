export type TerminalState = 'idle' | 'working' | 'waiting' | 'completed' | 'error'

export interface RepositoryMetadata {
  prUrl?: string
}

export interface TerminalMetadata {
  title?: string
  branchName?: string
  ticketId?: string
  description?: string
  status?: '' | 'in progress' | 'committed' | 'ready for PR' | 'PR created' | 'in review' | 'changes requested' | 'PR merged'
  baseBranch?: string
  fullStackTaskId?: string
  relatedWorktrees?: string[]
  repositoryMetadata?: Record<string, RepositoryMetadata>
}

export interface TerminalInfo {
  id: string
  name: string
  state: TerminalState
  repositories: string[]  // List of attached repository paths
  branchName?: string
  createdAt?: Date
  tsCreate?: number
  metadata?: TerminalMetadata
}

export interface RepositoryConfig {
  path: string
  keywords: string[]
  color?: string  // hex color, e.g. '#3B82F6'
  languages?: {
    commit?: string
    pullRequest?: string
    jiraComment?: string
    discussion?: string
  }
  commit?: {
    style?: string
    format?: string
    coAuthor?: boolean
    includeTicketId?: boolean
  }
  pullRequest?: {
    autoLinkTickets?: boolean
  }
  issues?: {
    commentOnPR?: boolean
    jiraUrl?: string
    githubIssuesUrl?: string
  }
  branches?: {
    development?: string  // e.g., "develop", "dev" - defaults to "develop"
  }
}

export interface Agent {
  id: string
  name: string
  repositories: string[]  // List of attached repository paths
  tsCreate?: number
  metadata?: TerminalMetadata
}

export interface Config {
  version: string
  repositories: Record<string, RepositoryConfig>
  agents?: Agent[]
  snippets?: Snippet[]
}

export interface PRTemplate {
  exists: boolean
  path?: string
  fullPath?: string
  content?: string
}

export interface GitCheckResult {
  isGit: boolean
  exists: boolean
  expandedPath?: string
}

export interface Snippet {
  id: string
  name: string
  content: string
  shortcut?: number // 1-9 for ⌘1-⌘9
}

export interface WorkspaceTerminal {
  id: string
  paneIndex: number // 0-3
  name: string
  repositories: string[]
}

export type WorkspaceLayout = 1 | 2 | 4

export interface CommandHistoryEntry {
  command: string
  timestamp: number
  count: number  // Usage frequency
}

export type ScriptCategory = 'dev' | 'build' | 'test' | 'lint' | 'other'
export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun'

export interface PackageScript {
  name: string
  command: string
  category: ScriptCategory
}

export interface ProjectScripts {
  packageManager: PackageManager
  scripts: PackageScript[]
}

export interface ScriptTerminalInfo {
  id: string
  scriptName: string
  fullCommand: string
  agentId: string
  agentName: string
  projectPath: string
  state: 'running' | 'error'
}

export interface BranchCommit {
  hash: string
  shortHash: string
  subject: string
  author: string
  date: string
  relativeDate: string
  isPushed: boolean
}
