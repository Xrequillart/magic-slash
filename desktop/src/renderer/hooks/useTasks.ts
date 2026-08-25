import { useState, useEffect, useCallback } from 'react'
import type { TasksSnapshot } from '../../types'

/**
 * The open GitHub issues of every GitHub-tracked repository, read once when the
 * page opens and again only when the reader asks.
 *
 * NO POLLER, deliberately, and no realtime feed: a backlog does not move the way a
 * PR under review does, and a page nobody is looking at has no business spending
 * GraphQL budget. `reload` is the whole refresh story.
 *
 * Everything goes through `window.electronAPI.tasks` — the renderer never calls
 * GitHub itself. The token lives in the main process, and a `fetch()` from here
 * would put it on the wrong side of the bridge.
 */
export function useTasks() {
  const [snapshot, setSnapshot] = useState<TasksSnapshot | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setSnapshot(await window.electronAPI.tasks.listOpenIssues())
    } catch {
      // The IPC call itself failed — which is not the same as "GitHub said no", a
      // state the snapshot carries per repository. Nothing to show but the
      // disconnected panel, which is also the honest reading of it.
      setSnapshot({ githubConnected: false, groups: [] })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return { snapshot, loading, reload }
}
