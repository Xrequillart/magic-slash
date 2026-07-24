import { useState, useEffect, useCallback } from 'react'
import type { OrgAgent, OrgAgentChange } from '../../types'
import { useStore } from '../store'

/**
 * Org-wide agents roster for the team dashboard ("who is working on what").
 * Initial load via org.listAgents(), then kept live by the org-agents realtime
 * feed (org.onAgentsChanged). Realtime rows are reconciled by the DB row uuid
 * (OrgAgent.id) — NOT the app-level metadata id. Reloads on org switch.
 *
 * Deliberately kept separate from the local terminals list: these are teammates'
 * agents (read-only) and must never feed local terminal restoration. Channel
 * health (live / reconnecting) is surfaced separately by <LiveIndicator />.
 */
export function useOrgAgents() {
  const activeOrgId = useStore((s) => s.activeOrg?.id)
  const [agents, setAgents] = useState<OrgAgent[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setAgents(await window.electronAPI.org.listAgents())
    } catch {
      setAgents([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load + reload whenever the active org changes.
  useEffect(() => {
    load()
  }, [load, activeOrgId])

  // Live realtime propagation — reconcile by DB uuid.
  useEffect(() => {
    const unsubscribe = window.electronAPI.org.onAgentsChanged((change: OrgAgentChange) => {
      setAgents((prev) => {
        if (change.eventType === 'DELETE') {
          return prev.filter((a) => a.id !== change.id)
        }
        if (!change.agent) return prev
        const idx = prev.findIndex((a) => a.id === change.agent!.id)
        if (idx === -1) return [...prev, change.agent]
        const next = [...prev]
        next[idx] = change.agent
        return next
      })
    })
    return () => { unsubscribe() }
  }, [])

  return { agents, loading }
}
