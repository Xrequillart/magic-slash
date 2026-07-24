import { useState, useEffect, useCallback } from 'react'
import type { UsageStatRow } from '../../types'
import { useStore } from '../store'

/**
 * Org-wide usage stats for the team dashboard. Loaded via org.getUsageStats() and
 * reloaded whenever the active org changes. Reading is open to any org member (RLS
 * scopes it to the org) — the usage-logs opt-in only gates WRITING your own data,
 * not viewing the team aggregate. Rows come newest-first and are aggregated by the
 * consuming component.
 */
export function useOrgUsageStats() {
  const activeOrgId = useStore((s) => s.activeOrg?.id)
  const [rows, setRows] = useState<UsageStatRow[]>([])
  const [capped, setCapped] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const stats = await window.electronAPI.org.getUsageStats()
      setRows(stats.rows)
      setCapped(stats.capped)
    } catch {
      setRows([])
      setCapped(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load, activeOrgId])

  return { rows, capped, loading }
}
