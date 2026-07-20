import { useMemo } from 'react'
import { useStore } from '../store'
import type { TerminalInfo, Config, RepositoryConfig } from '../../types'

export type WorkflowGroupKey =
  | 'needs_attention'
  | 'active'
  | 'in_review'
  | 'done'

export interface TerminalWithRepos extends TerminalInfo {
  matchingProjects: string[]
}

export const WORKFLOW_GROUPS: {
  key: WorkflowGroupKey
  label: string
}[] = [
  { key: 'needs_attention',  label: 'Needs attention' },
  { key: 'active',           label: 'Active' },
  { key: 'in_review',        label: 'In review' },
  { key: 'done',             label: 'Done' },
]

export function classifyTerminal(terminal: TerminalInfo): WorkflowGroupKey {
  const { state } = terminal
  const status = terminal.metadata?.status || ''

  if (state === 'error' || state === 'waiting') return 'needs_attention'

  if (['PR created', 'in review', 'changes requested', 'Review addressed'].includes(status)) return 'in_review'
  if (status === 'PR merged') return 'done'
  if (['', 'in progress', 'committed', 'ready for PR'].includes(status)) return 'active'

  // Safety net: a non-empty status we don't explicitly recognize means the
  // workflow has progressed past the known "active" states (e.g. a newer skill
  // sent a value the desktop app doesn't know yet). Treat it as in_review rather
  // than letting it silently fall back to "active" and relocate the card.
  return 'in_review'
}

function groupTerminals(terminalList: TerminalInfo[], config: Config | null) {
  const groups: Record<WorkflowGroupKey, TerminalWithRepos[]> = {
    needs_attention: [],
    active: [],
    in_review: [],
    done: [],
  }

  for (const terminal of terminalList) {
    const repos = terminal.repositories || []
    const matchingProjects: string[] = []

    if (config) {
      for (const [repoName, repoConfig] of Object.entries(config.repositories)) {
        if (repos.some(repo => repo.startsWith((repoConfig as RepositoryConfig).path))) {
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
