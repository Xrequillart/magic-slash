import { useMemo } from 'react'
import { useStore } from '../store'
import type { TerminalInfo } from '../../types'

export type WorkflowGroupKey =
  | 'needs_attention'
  | 'in_review'
  | 'in_progress'
  | 'done'
  | 'backlog'

export interface TerminalWithRepos extends TerminalInfo {
  matchingProjects: string[]
}

export const WORKFLOW_GROUPS: {
  key: WorkflowGroupKey
  label: string
  collapsedByDefault: boolean
}[] = [
  { key: 'backlog',          label: 'Backlog',          collapsedByDefault: false },
  { key: 'needs_attention',  label: 'Needs attention',  collapsedByDefault: false },
  { key: 'in_progress',      label: 'In progress',      collapsedByDefault: false },
  { key: 'in_review',        label: 'In review',        collapsedByDefault: false },
  { key: 'done',             label: 'Done',             collapsedByDefault: true },
]

export function classifyTerminal(terminal: TerminalInfo): WorkflowGroupKey {
  const { state } = terminal
  const status = terminal.metadata?.status || ''

  // Real-time state: only error/waiting override workflow status
  if (state === 'error' || state === 'waiting') return 'needs_attention'

  // Workflow status
  if (['PR created', 'in review', 'changes requested'].includes(status)) return 'in_review'
  if (['in progress', 'committed', 'ready for PR'].includes(status)) return 'in_progress'
  if (status === 'PR merged') return 'done'

  return 'backlog'
}

function groupTerminals(terminalList: TerminalInfo[], config: any) {
  const groups: Record<WorkflowGroupKey, TerminalWithRepos[]> = {
    needs_attention: [],
    in_review: [],
    in_progress: [],
    done: [],
    backlog: [],
  }

  for (const terminal of terminalList) {
    const repos = terminal.repositories || []
    const matchingProjects: string[] = []

    if (config) {
      for (const [repoName, repoConfig] of Object.entries(config.repositories)) {
        if (repos.some(repo => repo.startsWith((repoConfig as any).path))) {
          matchingProjects.push(repoName)
        }
      }
    }

    const enriched: TerminalWithRepos = { ...terminal, matchingProjects }
    const groupKey = classifyTerminal(terminal)
    groups[groupKey].push(enriched)
  }

  return groups
}

export function useGroupedTerminals() {
  const { terminals, config } = useStore()

  return useMemo(() => {
    const groups = groupTerminals(terminals, config)
    const projectNames: string[] = config ? Object.keys(config.repositories) : []

    // Build flatVisualOrder following WORKFLOW_GROUPS order (for keyboard nav)
    const seenIds = new Set<string>()
    const flatVisualOrder: TerminalInfo[] = []

    for (const { key } of WORKFLOW_GROUPS) {
      for (const terminal of groups[key]) {
        if (!seenIds.has(terminal.id)) {
          seenIds.add(terminal.id)
          flatVisualOrder.push(terminal)
        }
      }
    }

    return { groups, projectNames, flatVisualOrder }
  }, [terminals, config])
}

export function useSplitGroupedTerminals() {
  const { terminals, config, rightPaneTerminalIds } = useStore()

  return useMemo(() => {
    const leftTerminals = terminals.filter(t => !rightPaneTerminalIds.includes(t.id))
    const rightTerminals = terminals.filter(t => rightPaneTerminalIds.includes(t.id))

    const leftGroups = groupTerminals(leftTerminals, config)
    const rightGroups = groupTerminals(rightTerminals, config)
    const projectNames: string[] = config ? Object.keys(config.repositories) : []

    return { leftGroups, rightGroups, projectNames }
  }, [terminals, config, rightPaneTerminalIds])
}
