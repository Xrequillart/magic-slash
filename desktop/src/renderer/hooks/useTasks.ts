import { useState, useEffect, useCallback, useRef } from 'react'
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
  /**
   * Sequence number of the most recently STARTED read.
   *
   * `reload` is wired to two buttons — the page's own and the disconnected
   * panel's retry — as well as to the mount effect, so two reads are genuinely
   * able to overlap. Reads are not equally fast (a repo that times out takes far
   * longer than one that answers), so the older one can resolve LAST, and without
   * this it would apply its response over the newer snapshot: a stale issue list,
   * or the disconnected panel restored on top of a perfectly good result.
   *
   * A response is therefore applied only while it still carries the latest
   * sequence number. There is nothing to abort on the other side of the bridge —
   * the IPC call has no cancellation — so the fix is to ignore what came back,
   * which is equivalent from here.
   */
  const latestRequest = useRef(0)

  const reload = useCallback(async () => {
    const request = ++latestRequest.current
    setLoading(true)
    try {
      const next = await window.electronAPI.tasks.listOpenIssues()
      if (request !== latestRequest.current) return
      setSnapshot(next)
    } catch {
      // The IPC call itself failed — which is not the same as "GitHub said no", a
      // state the snapshot carries per repository. Nothing to show but the
      // disconnected panel, which is also the honest reading of it.
      if (request !== latestRequest.current) return
      setSnapshot({ githubConnected: false, groups: [] })
    } finally {
      // `finally` runs even on the early returns above, so it needs the same
      // guard: an outdated read must not clear the spinner a newer one raised.
      if (request === latestRequest.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
    // Bumping the counter on unmount retires whatever is still in flight, so a
    // response arriving after the page closed applies nothing.
    return () => {
      latestRequest.current++
    }
  }, [reload])

  return { snapshot, loading, reload }
}
