import type { Agent, TerminalMetadata } from '../../types'
import { filterValidRepositories } from './config'
import { getStore, reportWriteError } from '../store/Store'

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
 * Deduplicate + normalize a raw agent list (fill default metadata, repositories
 * and splitPane, drop entries without a valid id). Applied when hydrating from
 * the store.
 */
function normalizeAgents(raw: unknown): Agent[] {
  if (!Array.isArray(raw)) return []
  const agentsMap = new Map<string, Agent>()
  for (const agent of raw as Agent[]) {
    if (!agent.id || typeof agent.id !== 'string') continue
    if (!agent.repositories) agent.repositories = []
    agent.metadata = { ...createDefaultMetadata(), ...agent.metadata }
    if (!agent.splitPane) agent.splitPane = 'left'
    agentsMap.set(agent.id, agent)
  }
  return Array.from(agentsMap.values())
}

// ---------------------------------------------------------------------------
// In-memory agents cache. Agents live in the Supabase `agents` table (see
// store/CloudStore.ts) — there is no local agents.json. readAgents() serves the
// cache synchronously; writeAgents() updates it and writes through to the store.
// ---------------------------------------------------------------------------

let agentsCache: Agent[] = []

/** Load agents from the store into the cache. Call after auth is established. */
export async function hydrateAgents(): Promise<Agent[]> {
  try {
    agentsCache = normalizeAgents(await getStore().loadAgents())
  } catch (error) {
    console.error('Error hydrating agents:', error)
    agentsCache = []
  }
  return agentsCache
}

/** Drop the cached agents (on sign-out). */
export function resetAgentsCache(): void {
  agentsCache = []
}

/**
 * Returns the in-memory agents cache (deduplicated + normalized on hydration).
 */
export function readAgents(): Agent[] {
  return agentsCache
}

/**
 * Replace the agents cache and write through to the store.
 */
export function writeAgents(agents: Agent[]): void {
  agentsCache = agents
  void getStore()
    .saveAgents(agents)
    .catch((error) => {
      console.error('Error persisting agents:', error)
      reportWriteError('agents', error)
    })
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
