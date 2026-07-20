import { useMemo } from 'react'
import { useStore } from '../store'
import type { TerminalInfo } from '../../types'
import { WORKFLOW_GROUPS, groupTerminals } from './groupedTerminals'

export type { WorkflowGroupKey, TerminalWithRepos } from './groupedTerminals'
export { WORKFLOW_GROUPS, classifyTerminal, groupTerminals } from './groupedTerminals'

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
