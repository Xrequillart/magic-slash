import { useState, useEffect, useCallback, useRef } from 'react'
import type { TasksSnapshot } from '../../types'

/**
 * What is waiting on ONE repository — its open GitHub issues, its Jira sprint, or
 * both — read when the page opens on it, when the reader picks it, and again only
 * when the reader asks.
 *
 * `configKey` is the repository picked, or null to let the main process choose (the
 * saved `Config.tasksRepo`, then the first on offer). The snapshot says which one it
 * settled on, and names every other repository for the picker without reading them.
 *
 * EACH REPOSITORY IS READ ONCE PER PAGE OPEN. Switching back to one already on
 * screen answers from what it was read with, the way the page behaved when it read
 * them all at once; `reload` is what re-reads it.
 *
 * NO POLLER, deliberately, and no realtime feed: a backlog does not move the way a
 * PR under review does, and a page nobody is looking at has no business spending
 * GraphQL or Jira budget. `reload` is the whole refresh story, and the main process
 * puts a thirty-second floor under the Jira half of it.
 *
 * Everything goes through `window.electronAPI.tasks` — the renderer never calls
 * GitHub or Atlassian itself. Both credentials live in the main process, and a
 * `fetch()` from here would put them on the wrong side of the bridge.
 */
export function useTasks(configKey: string | null) {
  const [snapshot, setSnapshot] = useState<TasksSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  /**
   * Sequence number of the most recently STARTED read.
   *
   * `reload` is wired to two buttons — the page's own and the disconnected
   * panel's retry — as well as to the effect below, so two reads are genuinely
   * able to overlap. Reads are not equally fast (a repo that times out takes far
   * longer than one that answers), so the older one can resolve LAST, and without
   * this it would apply its response over the newer snapshot: a stale issue list,
   * the repository picked before last, or the disconnected panel restored on top of
   * a perfectly good result.
   *
   * A response is therefore applied only while it still carries the latest
   * sequence number. There is nothing to abort on the other side of the bridge —
   * the IPC call has no cancellation — so the fix is to ignore what came back,
   * which is equivalent from here.
   */
  const latestRequest = useRef(0)
  /** Every repository read since the page opened, by the key it resolved to. */
  const cache = useRef(new Map<string, TasksSnapshot>())
  /** The repository asked for, for `reload`, which has no argument of its own. */
  const requested = useRef(configKey)
  requested.current = configKey

  const read = useCallback(async (key: string | null) => {
    const request = ++latestRequest.current
    setLoading(true)
    try {
      const next = await window.electronAPI.tasks.listOpenIssues(key)
      if (request !== latestRequest.current) return
      cache.current.set(next.configKey, next)
      setSnapshot(next)
    } catch {
      // The IPC call itself failed — which is not the same as "GitHub said no" or
      // "Jira said no", states the snapshot carries per repository. Neither source
      // was reached, so neither is reported as connected, and the page falls back to
      // saying it has nothing rather than inventing a cause.
      if (request !== latestRequest.current) return
      setSnapshot({ connected: { github: false, jira: false }, groups: [], repos: [], configKey: '' })
    } finally {
      // `finally` runs even on the early returns above, so it needs the same
      // guard: an outdated read must not clear the spinner a newer one raised.
      if (request === latestRequest.current) setLoading(false)
    }
  }, [])

  const reload = useCallback(() => read(requested.current), [read])

  useEffect(() => {
    const cached = configKey ? cache.current.get(configKey) : undefined
    if (cached) {
      // Retires a read still out for the repository left, so it cannot land on top.
      latestRequest.current++
      setSnapshot(cached)
      setLoading(false)
      return
    }
    void read(configKey)
  }, [configKey, read])

  // Bumping the counter on unmount retires whatever is still in flight, so a
  // response arriving after the page closed applies nothing.
  useEffect(() => () => {
    latestRequest.current++
  }, [])

  return { snapshot, loading, reload }
}
