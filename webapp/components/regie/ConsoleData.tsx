'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import {
  listInstallations,
  listOrgs,
  listUsers,
  type AdminInstallation,
  type AdminOrgSummary,
  type AdminUser,
} from '@/lib/admin'

/**
 * The three platform-wide lists, fetched once and shared by the whole console.
 *
 * They live here rather than in each page because they are needed in more than one
 * place at once: the nav shows a count for each, the Users table needs the FLEET to
 * decide which version badge is current, and Fleet needs the same rows for its
 * rollups. Fetching per page would mean calling admin_list_installations twice to
 * render one screen.
 *
 * Next.js keeps a layout mounted across the routes nested in it, so this fetches
 * on ARRIVAL in /admin and not again when switching sections — which is also what
 * makes `refresh` meaningful: after a write, one call puts every consumer
 * (including the nav counts) back in step.
 *
 * `loading` is true only for the FIRST load. A refresh leaves the previous rows on
 * screen while it runs, because replacing a table with "Chargement…" after every
 * archive makes a two-click action feel like a page reload.
 */

interface ConsoleData {
  users: AdminUser[]
  orgs: AdminOrgSummary[]
  installations: AdminInstallation[]
  loading: boolean
  refresh: () => Promise<void>
}

const EMPTY: ConsoleData = {
  users: [],
  orgs: [],
  installations: [],
  loading: true,
  refresh: async () => {},
}

const ConsoleDataContext = createContext<ConsoleData>(EMPTY)

export function ConsoleDataProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [orgs, setOrgs] = useState<AdminOrgSummary[]>([])
  const [installations, setInstallations] = useState<AdminInstallation[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    // In parallel: three independent RPCs, and the console is not readable until
    // the slowest lands either way.
    const [nextUsers, nextOrgs, nextFleet] = await Promise.all([
      listUsers(),
      listOrgs(),
      listInstallations(),
    ])
    setUsers(nextUsers)
    setOrgs(nextOrgs)
    setInstallations(nextFleet)
  }, [])

  useEffect(() => {
    let cancelled = false
    load().finally(() => {
      // Guarded because the guard in the layout can unmount this mid-flight when a
      // session resolves to "not an admin".
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [load])

  return (
    <ConsoleDataContext.Provider value={{ users, orgs, installations, loading, refresh: load }}>
      {children}
    </ConsoleDataContext.Provider>
  )
}

export function useConsoleData(): ConsoleData {
  return useContext(ConsoleDataContext)
}
