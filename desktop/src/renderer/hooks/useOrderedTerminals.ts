import { useMemo } from 'react'
import { useStore } from '../store'
import { orderTerminals } from './terminalOrder'
import { getProjectColorMap } from '../utils/projectColors'
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
    // `colorMap` is built here, inside the memo, and NOT in the hook body: a fresh
    // object on every render would defeat `AgentList`'s memo unconditionally. It is
    // built from the FULL repository list — the palette fallback is assigned BY
    // INDEX, so a filtered subset would give a repo a different colour here than
    // the one it has everywhere else in the app.
    return {
      ordered,
      projectNames,
      flatVisualOrder: ordered,
      colorMap: getProjectColorMap(projectNames, config?.repositories),
      sort,
    }
  }, [terminals, config, sort])
}

export function useSplitOrderedTerminals() {
  const { terminals, config, rightPaneTerminalIds } = useStore()
  const sort = config?.agentSort ?? DEFAULT_AGENT_SORT

  return useMemo(() => {
    const ordered = orderTerminals(terminals, config, sort)
    const projectNames: string[] = config ? Object.keys(config.repositories) : []

    // Same rules as above: computed inside the memo so the identity is stable, and
    // over the FULL repository list because the palette fallback is indexed.
    return {
      leftTerminals: ordered.filter(t => !rightPaneTerminalIds.includes(t.id)),
      rightTerminals: ordered.filter(t => rightPaneTerminalIds.includes(t.id)),
      projectNames,
      colorMap: getProjectColorMap(projectNames, config?.repositories),
    }
  }, [terminals, config, sort, rightPaneTerminalIds])
}
