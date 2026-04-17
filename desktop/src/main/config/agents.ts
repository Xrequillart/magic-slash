import * as fs from 'fs'
import * as path from 'path'
import type { Agent, TerminalMetadata } from '../../types'
import { filterValidRepositories, CONFIG_DIR } from './config'

const AGENTS_FILE = path.join(CONFIG_DIR, 'agents.json')

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

/**
 * Merges new metadata into existing metadata, deep-merging repositoryMetadata.
 */
export function mergeMetadata(existing: TerminalMetadata | undefined, incoming: Partial<TerminalMetadata>): TerminalMetadata {
  const existingRepoMetadata = existing?.repositoryMetadata || {}
  const newRepoMetadata = incoming.repositoryMetadata || {}
  const mergedRepoMetadata = { ...existingRepoMetadata, ...newRepoMetadata }

  const merged: TerminalMetadata = {
    ...existing,
    ...incoming,
    repositoryMetadata: Object.keys(mergedRepoMetadata).length > 0 ? mergedRepoMetadata : undefined
  }

  // Clean undefined values
  for (const key of Object.keys(merged) as Array<keyof TerminalMetadata>) {
    if (merged[key] === undefined) {
      delete merged[key]
    }
  }

  return merged
}

/**
 * Reads agents from the dedicated agents.json file.
 * Returns [] if the file is absent or malformed.
 * Performs deduplication, normalization, and validation on load.
 */
export function readAgents(): Agent[] {
  try {
    if (!fs.existsSync(AGENTS_FILE)) {
      return []
    }
    const content = fs.readFileSync(AGENTS_FILE, 'utf8')
    const raw = JSON.parse(content)

    if (!Array.isArray(raw)) {
      console.warn('agents.json is not an array, returning empty list')
      return []
    }

    const agentsMap = new Map<string, Agent>()
    for (const agent of raw) {
      if (!agent.id || typeof agent.id !== 'string') {
        continue
      }
      if (!agent.repositories) {
        agent.repositories = []
      }
      agent.metadata = {
        ...createDefaultMetadata(),
        ...agent.metadata
      }
      if (!agent.splitPane) {
        agent.splitPane = 'left'
      }
      agentsMap.set(agent.id, agent)
    }

    return Array.from(agentsMap.values())
  } catch (error) {
    console.error('Error reading agents:', error)
    return []
  }
}

/**
 * Writes the agents array to agents.json atomically.
 */
export function writeAgents(agents: Agent[]): void {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true })
    }
    fs.writeFileSync(AGENTS_FILE, JSON.stringify(agents, null, 2))
  } catch (error) {
    console.error('Error writing agents:', error)
    throw error
  }
}

export function saveAgent(id: string, name: string, repositories: string[], metadata?: TerminalMetadata, tsCreate?: number): void {
  const agents = readAgents()
  const validRepositories = filterValidRepositories(repositories)
  const existingAgent = agents.find(a => a.id === id)
  const filtered = agents.filter(a => a.id !== id)

  const agent: Agent = {
    id,
    name,
    repositories: validRepositories,
    tsCreate: tsCreate ?? existingAgent?.tsCreate ?? Date.now(),
    metadata: {
      ...createDefaultMetadata(),
      ...metadata
    },
    ...(existingAgent?.splitPane ? { splitPane: existingAgent.splitPane } : {}),
  }
  filtered.push(agent)

  writeAgents(filtered)
}

export function updateAgentMetadata(id: string, metadata: Partial<TerminalMetadata>): void {
  const agents = readAgents()

  const agent = agents.find(a => a.id === id)
  if (agent) {
    agent.metadata = mergeMetadata(agent.metadata, metadata)
    writeAgents(agents)
  }
}

export function updateAgentRepositories(id: string, repositories: string[]): void {
  const agents = readAgents()

  const agent = agents.find(a => a.id === id)
  if (agent) {
    agent.repositories = filterValidRepositories(repositories)
    writeAgents(agents)
  }
}

export function removeAgent(id: string): void {
  const agents = readAgents()
  const filtered = agents.filter(a => a.id !== id)
  writeAgents(filtered)
}

export function updateAgentSplitPane(id: string, pane: 'left' | 'right'): void {
  const agents = readAgents()
  const agent = agents.find(a => a.id === id)
  if (agent) {
    agent.splitPane = pane
    writeAgents(agents)
  }
}

export { AGENTS_FILE }
