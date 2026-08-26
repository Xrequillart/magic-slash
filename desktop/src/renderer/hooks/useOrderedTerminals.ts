import { useMemo } from 'react'
import { useStore } from '../store'
import { orderTerminals } from './terminalOrder'
import { DEFAULT_AGENT_SORT } from '../../types'

export type { TerminalWithRepos } from './terminalOrder'
export { orderTerminals } from './terminalOrder'

export function useOrderedTerminals() {
  const { terminals, config } = useStore()
  // Pulled out of the config rather than read inside the memo, so the sort is named in
  // the dependency list: the list re-orders when the CHOICE changes — including when it
  // changes on this account's other machine, since the config arrives over Realtime.
  const sort = config?.agentSort ?? DEFAULT_AGENT_SORT

  return useMemo(() => {
    const ordered = orderTerminals(terminals, config, sort)
    const projectNames: string[] = config ? Object.keys(config.repositories) : []

    // The list is flat, so what the sidebar renders IS the keyboard-nav order.
    return { ordered, projectNames, flatVisualOrder: ordered }
  }, [terminals, config, sort])
}

export function useSplitOrderedTerminals() {
  const { terminals, config, rightPaneTerminalIds } = useStore()
  const sort = config?.agentSort ?? DEFAULT_AGENT_SORT

  return useMemo(() => {
    const ordered = orderTerminals(terminals, config, sort)
    const projectNames: string[] = config ? Object.keys(config.repositories) : []

    return {
      leftTerminals: ordered.filter(t => !rightPaneTerminalIds.includes(t.id)),
      rightTerminals: ordered.filter(t => rightPaneTerminalIds.includes(t.id)),
      projectNames,
    }
  }, [terminals, config, sort, rightPaneTerminalIds])
}
