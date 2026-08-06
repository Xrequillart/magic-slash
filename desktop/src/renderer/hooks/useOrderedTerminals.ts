import { useMemo } from 'react'
import { useStore } from '../store'
import { orderTerminals } from './terminalOrder'

export type { TerminalWithRepos } from './terminalOrder'
export { orderTerminals } from './terminalOrder'

export function useOrderedTerminals() {
  const { terminals, config } = useStore()

  return useMemo(() => {
    const ordered = orderTerminals(terminals, config)
    const projectNames: string[] = config ? Object.keys(config.repositories) : []

    // The list is flat, so what the sidebar renders IS the keyboard-nav order.
    return { ordered, projectNames, flatVisualOrder: ordered }
  }, [terminals, config])
}

export function useSplitOrderedTerminals() {
  const { terminals, config, rightPaneTerminalIds } = useStore()

  return useMemo(() => {
    const ordered = orderTerminals(terminals, config)
    const projectNames: string[] = config ? Object.keys(config.repositories) : []

    return {
      leftTerminals: ordered.filter(t => !rightPaneTerminalIds.includes(t.id)),
      rightTerminals: ordered.filter(t => rightPaneTerminalIds.includes(t.id)),
      projectNames,
    }
  }, [terminals, config, rightPaneTerminalIds])
}
