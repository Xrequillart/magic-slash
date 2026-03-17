import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as crypto from 'crypto'
import type { RepositoryConfig, TerminalMetadata, Agent, Snippet } from '../../types'

const CONFIG_DIR = path.join(os.homedir(), '.config', 'magic-slash')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')

/**
 * Checks if a path should be excluded from repository persistence.
 * Excludes generic paths like Documents, Desktop, Home that are not real project directories.
 */
export function isExcludedRepositoryPath(repoPath: string): boolean {
  const home = os.homedir()

  // Expand ~ to home directory
  const expandedPath = repoPath.startsWith('~')
    ? path.join(home, repoPath.slice(1))
    : repoPath

  // Normalize path (remove trailing slashes)
  const normalizedPath = path.normalize(expandedPath)

  const excludedPaths = [
    path.join(home, 'Documents'),
    path.join(home, 'Desktop'),
    path.join(home, 'Downloads'),
    home,  // Home directory itself
    '/tmp',
    '/var/tmp',
    '/private/tmp'  // macOS /tmp symlink target
  ]

  return excludedPaths.some(excluded => normalizedPath === excluded)
}

/**
 * Filters out excluded paths from a list of repositories.
 */
export function filterValidRepositories(repositories: string[]): string[] {
  return repositories.filter(repo => !isExcludedRepositoryPath(repo))
}

export interface Config {
  version: string
  repositories: Record<string, RepositoryConfig>
  agents?: Agent[]
  snippets?: Snippet[]
}

export function createDefaultMetadata(): TerminalMetadata {
  return {
    title: '',
    branchName: '',
    ticketId: '',
    description: '',
    status: '',
    fullStackTaskId: '',
    relatedWorktrees: [],
    repositoryMetadata: {}
  }
}

export function readConfig(): Config {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return {
        version: 'unknown',
        repositories: {}
      }
    }
    const content = fs.readFileSync(CONFIG_FILE, 'utf8')
    return JSON.parse(content)
  } catch (error) {
    console.error('Error reading config:', error)
    return {
      version: 'unknown',
      repositories: {}
    }
  }
}

export function writeConfig(config: Config): void {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true })
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
  } catch (error) {
    console.error('Error writing config:', error)
    throw error
  }
}

export function addRepository(name: string, repoPath: string, keywords: string[] = []): Config {
  const config = readConfig()
  config.repositories = config.repositories || {}
  config.repositories[name] = {
    path: repoPath,
    keywords: keywords.length > 0 ? keywords : [name],
    color: '#3B82F6',
    languages: { commit: 'en', pullRequest: 'en', jiraComment: 'en', discussion: 'en' },
    commit: { style: 'single-line', format: 'angular', coAuthor: true, includeTicketId: true },
    resolve: {
      commitMode: 'new', format: 'angular', style: 'single-line',
      useCommitConfig: true, replyToComments: true, replyLanguage: 'en'
    },
    pullRequest: { autoLinkTickets: true },
    issues: { commentOnPR: true, jiraUrl: '', githubIssuesUrl: '' },
    branches: { development: '' }
  }
  writeConfig(config)
  return config
}

export function updateRepository(name: string, updates: Partial<RepositoryConfig>): Config {
  const config = readConfig()
  if (!config.repositories || !config.repositories[name]) {
    throw new Error(`Repository '${name}' not found`)
  }

  if (updates.path !== undefined) {
    config.repositories[name].path = updates.path
  }
  if (updates.keywords !== undefined) {
    config.repositories[name].keywords = updates.keywords
  }
  if (updates.color !== undefined) {
    config.repositories[name].color = updates.color
  }
  if (updates.languages !== undefined) {
    config.repositories[name].languages = updates.languages
  }

  writeConfig(config)
  return config
}

export function updateRepositoryLanguages(name: string, languages: Record<string, string | null>): Config {
  const config = readConfig()
  if (!config.repositories || !config.repositories[name]) {
    throw new Error(`Repository '${name}' not found`)
  }

  const validKeys = ['commit', 'pullRequest', 'jiraComment', 'discussion']
  const validValues = ['en', 'fr', null]

  config.repositories[name].languages = config.repositories[name].languages || {}

  for (const [key, value] of Object.entries(languages)) {
    if (validKeys.includes(key)) {
      if (value === null || value === 'default') {
        delete config.repositories[name].languages![key as keyof typeof config.repositories[string]['languages']]
      } else if (validValues.includes(value)) {
        (config.repositories[name].languages as any)[key] = value
      }
    }
  }

  // Clean up empty languages object
  if (Object.keys(config.repositories[name].languages || {}).length === 0) {
    delete config.repositories[name].languages
  }

  writeConfig(config)
  return config
}

export function updateRepositoryCommitSettings(name: string, settings: Record<string, any>): Config {
  const config = readConfig()
  if (!config.repositories || !config.repositories[name]) {
    throw new Error(`Repository '${name}' not found`)
  }

  config.repositories[name].commit = config.repositories[name].commit || {}

  // Validate and set style
  if (settings.style !== undefined) {
    if (settings.style === 'default' || settings.style === null) {
      delete config.repositories[name].commit!.style
    } else if (['single-line', 'multi-line'].includes(settings.style)) {
      config.repositories[name].commit!.style = settings.style
    }
  }

  // Validate and set format
  if (settings.format !== undefined) {
    if (settings.format === 'default' || settings.format === null) {
      delete config.repositories[name].commit!.format
    } else if (['conventional', 'angular', 'gitmoji', 'none'].includes(settings.format)) {
      config.repositories[name].commit!.format = settings.format
    }
  }

  // Validate and set coAuthor
  if (settings.coAuthor !== undefined) {
    if (settings.coAuthor === 'default' || settings.coAuthor === null) {
      delete config.repositories[name].commit!.coAuthor
    } else if (typeof settings.coAuthor === 'boolean') {
      config.repositories[name].commit!.coAuthor = settings.coAuthor
    }
  }

  // Validate and set includeTicketId
  if (settings.includeTicketId !== undefined) {
    if (settings.includeTicketId === 'default' || settings.includeTicketId === null) {
      delete config.repositories[name].commit!.includeTicketId
    } else if (typeof settings.includeTicketId === 'boolean') {
      config.repositories[name].commit!.includeTicketId = settings.includeTicketId
    }
  }

  // Clean up empty commit object
  if (Object.keys(config.repositories[name].commit || {}).length === 0) {
    delete config.repositories[name].commit
  }

  writeConfig(config)
  return config
}

export function updateRepositoryResolveSettings(name: string, settings: Record<string, any>): Config {
  const config = readConfig()
  if (!config.repositories || !config.repositories[name]) {
    throw new Error(`Repository '${name}' not found`)
  }

  config.repositories[name].resolve = config.repositories[name].resolve || {}

  // Validate and set commitMode
  if (settings.commitMode !== undefined) {
    if (settings.commitMode === 'default' || settings.commitMode === null) {
      delete config.repositories[name].resolve!.commitMode
    } else if (['new', 'amend'].includes(settings.commitMode)) {
      config.repositories[name].resolve!.commitMode = settings.commitMode
    }
  }

  // Validate and set format
  if (settings.format !== undefined) {
    if (settings.format === 'default' || settings.format === null) {
      delete config.repositories[name].resolve!.format
    } else if (['conventional', 'angular', 'gitmoji', 'none'].includes(settings.format)) {
      config.repositories[name].resolve!.format = settings.format
    }
  }

  // Validate and set style
  if (settings.style !== undefined) {
    if (settings.style === 'default' || settings.style === null) {
      delete config.repositories[name].resolve!.style
    } else if (['single-line', 'multi-line'].includes(settings.style)) {
      config.repositories[name].resolve!.style = settings.style
    }
  }

  // Validate and set useCommitConfig
  if (settings.useCommitConfig !== undefined) {
    if (settings.useCommitConfig === 'default' || settings.useCommitConfig === null) {
      delete config.repositories[name].resolve!.useCommitConfig
    } else if (typeof settings.useCommitConfig === 'boolean') {
      config.repositories[name].resolve!.useCommitConfig = settings.useCommitConfig
    }
  }

  // Validate and set replyToComments
  if (settings.replyToComments !== undefined) {
    if (settings.replyToComments === 'default' || settings.replyToComments === null) {
      delete config.repositories[name].resolve!.replyToComments
    } else if (typeof settings.replyToComments === 'boolean') {
      config.repositories[name].resolve!.replyToComments = settings.replyToComments
    }
  }

  // Validate and set replyLanguage
  if (settings.replyLanguage !== undefined) {
    if (settings.replyLanguage === 'default' || settings.replyLanguage === null) {
      delete config.repositories[name].resolve!.replyLanguage
    } else if (['en', 'fr'].includes(settings.replyLanguage)) {
      config.repositories[name].resolve!.replyLanguage = settings.replyLanguage
    }
  }

  // Clean up empty resolve object
  if (Object.keys(config.repositories[name].resolve || {}).length === 0) {
    delete config.repositories[name].resolve
  }

  writeConfig(config)
  return config
}

export function updateRepositoryPullRequestSettings(name: string, settings: Record<string, any>): Config {
  const config = readConfig()
  if (!config.repositories || !config.repositories[name]) {
    throw new Error(`Repository '${name}' not found`)
  }

  config.repositories[name].pullRequest = config.repositories[name].pullRequest || {}

  // Validate and set autoLinkTickets
  if (settings.autoLinkTickets !== undefined) {
    if (settings.autoLinkTickets === 'default' || settings.autoLinkTickets === null) {
      delete config.repositories[name].pullRequest!.autoLinkTickets
    } else if (typeof settings.autoLinkTickets === 'boolean') {
      config.repositories[name].pullRequest!.autoLinkTickets = settings.autoLinkTickets
    }
  }

  // Clean up empty pullRequest object
  if (Object.keys(config.repositories[name].pullRequest || {}).length === 0) {
    delete config.repositories[name].pullRequest
  }

  writeConfig(config)
  return config
}

export function updateRepositoryIssuesSettings(name: string, settings: Record<string, any>): Config {
  const config = readConfig()
  if (!config.repositories || !config.repositories[name]) {
    throw new Error(`Repository '${name}' not found`)
  }

  config.repositories[name].issues = config.repositories[name].issues || {}

  // Validate and set commentOnPR
  if (settings.commentOnPR !== undefined) {
    if (settings.commentOnPR === 'default' || settings.commentOnPR === null) {
      delete config.repositories[name].issues!.commentOnPR
    } else if (typeof settings.commentOnPR === 'boolean') {
      config.repositories[name].issues!.commentOnPR = settings.commentOnPR
    }
  }

  // Validate and set jiraUrl
  if (settings.jiraUrl !== undefined) {
    if (settings.jiraUrl === '' || settings.jiraUrl === null) {
      delete config.repositories[name].issues!.jiraUrl
    } else if (typeof settings.jiraUrl === 'string') {
      config.repositories[name].issues!.jiraUrl = settings.jiraUrl
    }
  }

  // Validate and set githubIssuesUrl
  if (settings.githubIssuesUrl !== undefined) {
    if (settings.githubIssuesUrl === '' || settings.githubIssuesUrl === null) {
      delete config.repositories[name].issues!.githubIssuesUrl
    } else if (typeof settings.githubIssuesUrl === 'string') {
      config.repositories[name].issues!.githubIssuesUrl = settings.githubIssuesUrl
    }
  }

  // Clean up empty issues object
  if (Object.keys(config.repositories[name].issues || {}).length === 0) {
    delete config.repositories[name].issues
  }

  writeConfig(config)
  return config
}

export function updateRepositoryBranchSettings(name: string, settings: Record<string, any>): Config {
  const config = readConfig()
  if (!config.repositories || !config.repositories[name]) {
    throw new Error(`Repository '${name}' not found`)
  }

  config.repositories[name].branches = config.repositories[name].branches || {}

  // Validate and set development branch
  if (settings.development !== undefined) {
    if (settings.development === '' || settings.development === null) {
      delete config.repositories[name].branches!.development
    } else if (typeof settings.development === 'string') {
      config.repositories[name].branches!.development = settings.development
    }
  }

  // Clean up empty branches object
  if (Object.keys(config.repositories[name].branches || {}).length === 0) {
    delete config.repositories[name].branches
  }

  writeConfig(config)
  return config
}

export function updateRepositoryWorktreeFilesSettings(name: string, settings: Record<string, any>): Config {
  const config = readConfig()
  if (!config.repositories || !config.repositories[name]) {
    throw new Error(`Repository '${name}' not found`)
  }

  // Validate and set worktreeFiles
  if (settings.worktreeFiles !== undefined) {
    if (Array.isArray(settings.worktreeFiles)) {
      const filtered = settings.worktreeFiles.filter((f: any) => typeof f === 'string' && f.trim().length > 0)
      config.repositories[name].worktreeFiles = filtered.length > 0 ? filtered : []
    } else if (settings.worktreeFiles === null) {
      config.repositories[name].worktreeFiles = []
    }
  }

  writeConfig(config)
  return config
}

export function deleteRepository(name: string): Config {
  const config = readConfig()
  if (!config.repositories || !config.repositories[name]) {
    throw new Error(`Repository '${name}' not found`)
  }

  delete config.repositories[name]
  writeConfig(config)
  return config
}

export function renameRepository(oldName: string, newName: string): Config {
  const config = readConfig()
  if (!config.repositories || !config.repositories[oldName]) {
    throw new Error(`Repository '${oldName}' not found`)
  }

  if (config.repositories[newName]) {
    throw new Error(`Repository '${newName}' already exists`)
  }

  // Copy the repo config to the new name and delete the old one
  config.repositories[newName] = config.repositories[oldName]
  delete config.repositories[oldName]

  writeConfig(config)
  return config
}

export function saveAgent(id: string, name: string, repositories: string[], metadata?: TerminalMetadata, tsCreate?: number): Config {
  const config = readConfig()
  config.agents = config.agents || []

  // Filter out excluded paths (Documents, Desktop, etc.)
  const validRepositories = filterValidRepositories(repositories)

  // Preserve existing tsCreate if re-saving
  const existingAgent = config.agents.find(a => a.id === id)

  // Remove existing agent with same id
  config.agents = config.agents.filter(a => a.id !== id)

  // Add new agent with complete metadata (default values merged with provided)
  const agent: Agent = {
    id,
    name,
    repositories: validRepositories,
    tsCreate: tsCreate ?? existingAgent?.tsCreate ?? Date.now(),
    metadata: {
      ...createDefaultMetadata(),
      ...metadata
    }
  }
  config.agents.push(agent)

  writeConfig(config)
  return config
}

export function updateAgentMetadata(id: string, metadata: Partial<TerminalMetadata>): Config {
  const config = readConfig()
  config.agents = config.agents || []

  const agent = config.agents.find(a => a.id === id)
  if (agent) {
    // Merge repositoryMetadata instead of replacing it
    const existingRepoMetadata = agent.metadata?.repositoryMetadata || {}
    const newRepoMetadata = metadata.repositoryMetadata || {}
    const mergedRepoMetadata = { ...existingRepoMetadata, ...newRepoMetadata }

    agent.metadata = {
      ...agent.metadata,
      ...metadata,
      repositoryMetadata: Object.keys(mergedRepoMetadata).length > 0 ? mergedRepoMetadata : undefined
    }
    // Clean undefined values
    Object.keys(agent.metadata).forEach(key => {
      if (agent.metadata![key as keyof TerminalMetadata] === undefined) {
        delete agent.metadata![key as keyof TerminalMetadata]
      }
    })
    writeConfig(config)
  }
  return config
}

export function updateAgentRepositories(id: string, repositories: string[]): Config {
  const config = readConfig()
  config.agents = config.agents || []

  const agent = config.agents.find(a => a.id === id)
  if (agent) {
    // Filter out excluded paths (Documents, Desktop, etc.)
    agent.repositories = filterValidRepositories(repositories)
    writeConfig(config)
  }
  return config
}

export function removeAgent(id: string): Config {
  const config = readConfig()
  if (config.agents) {
    config.agents = config.agents.filter(a => a.id !== id)
    writeConfig(config)
  }
  return config
}

export function getAgents(): Agent[] {
  const config = readConfig()
  // Deduplicate agents by ID (keep last occurrence)
  const agentsMap = new Map<string, Agent>()
  for (const agent of config.agents || []) {
    // Migration: if agent doesn't have repositories, create empty array
    if (!agent.repositories) {
      agent.repositories = []
    }
    // Migration: ensure complete metadata structure
    agent.metadata = {
      ...createDefaultMetadata(),
      ...agent.metadata
    }
    agentsMap.set(agent.id, agent)
  }
  return Array.from(agentsMap.values())
}

export function clearAllAgents(): Config {
  const config = readConfig()
  config.agents = []
  writeConfig(config)
  return config
}

// Snippet functions
export function getSnippets(): Snippet[] {
  const config = readConfig()
  return config.snippets || []
}

export function addSnippet(snippet: Omit<Snippet, 'id'>): Snippet {
  const config = readConfig()
  config.snippets = config.snippets || []

  const newSnippet: Snippet = {
    ...snippet,
    id: crypto.randomUUID()
  }

  config.snippets.push(newSnippet)
  writeConfig(config)
  return newSnippet
}

export function updateSnippet(id: string, updates: Partial<Omit<Snippet, 'id'>>): Snippet {
  const config = readConfig()
  config.snippets = config.snippets || []

  const index = config.snippets.findIndex(s => s.id === id)
  if (index === -1) {
    throw new Error(`Snippet '${id}' not found`)
  }

  config.snippets[index] = { ...config.snippets[index], ...updates }
  writeConfig(config)
  return config.snippets[index]
}

export function deleteSnippet(id: string): void {
  const config = readConfig()
  if (!config.snippets) return

  config.snippets = config.snippets.filter(s => s.id !== id)
  writeConfig(config)
}

export { CONFIG_FILE }
