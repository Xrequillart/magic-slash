import { useEffect, useRef, useState } from 'react'
import type { JiraTaskIssue } from '../../types'
import { isJiraStatusError } from '../../types'

/**
 * The tickets a Jira sprint holds BEYOND what the board could load — fetched from the
 * site, on a debounced keystroke, and only when the board admits it is short.
 *
 * WHY THE PAGE NEEDS THIS AT ALL. The search box narrows what is already in memory,
 * which is exact and instant and, on a column the read had to cap, quietly incomplete:
 * a ticket past the budget is not on the board, so typing its title matches nothing and
 * the box gives no sign it is looking at a fraction of the sprint. That is the failure
 * this hook exists to close — not to replace the in-memory filter, which still runs over
 * everything already loaded and is what makes the common case instant.
 *
 * ONLY WHILE `enabled`. A board whose every column came back whole holds every ticket
 * its sprint has, so reaching for the network on a keystroke would spend a round trip to
 * be told what is already on screen. The page passes the answer from
 * `JiraTaskRepoGroup.truncatedColumns`.
 *
 * WHAT IT DOES NOT DO is own the result. The issues come back as a plain list and the
 * page merges them into the row they belong to (`mergeSearchIssues`), so the board is
 * always built from one set of rows — a second, parallel list of "search results" drawn
 * beside the columns would be a second answer to what is in this sprint.
 */
export interface SprintSearch {
  /**
   * What the site returned for the current query. Empty while idle, and deliberately
   * KEPT during a re-search so the board does not flicker back to its capped rows
   * between two keystrokes.
   */
  issues: JiraTaskIssue[]
  /** A read is in flight. The bar shows it; nothing on the board moves until it lands. */
  loading: boolean
  /**
   * The read came back as a named Jira failure.
   *
   * Reported as one boolean rather than the error itself, because there is exactly one
   * thing the page can say about it: the board is still showing what it loaded, and the
   * reach past that did not work. Which of the nine failures it was changes no advice a
   * search box could give — and the board's own rows are already carrying the error
   * ladder for anything that is really broken.
   */
  failed: boolean
}

/** Nothing typed, nothing found: one identity, so an idle page does not re-render. */
const IDLE: SprintSearch = { issues: [], loading: false, failed: false }

/**
 * How long a keystroke waits before it costs a round trip.
 *
 * Long enough that typing a ticket key straight through sends ONE search rather than
 * eight, short enough that it lands before somebody who has stopped typing starts
 * wondering. The in-memory filter is not debounced and never should be — it is a pass
 * over an array and runs on every keystroke, so the board narrows instantly while this
 * is still waiting.
 */
const DEBOUNCE_MS = 350

/**
 * Below this, a query is not a search.
 *
 * One character matches most of a sprint, which is a hundred rows over the bridge to
 * tell the reader nothing. It is also the length a search box is at while somebody is
 * still starting to type.
 */
const MIN_QUERY = 2

export function useSprintSearch({
  configKey,
  query,
  enabled,
}: {
  /** The repository whose board is on screen. A change clears everything. */
  configKey: string
  /** The search box, raw. Trimming and reduction to JQL terms happen in the main process. */
  query: string
  /** Whether any column reported itself short. See `truncatedColumns`. */
  enabled: boolean
}): SprintSearch {
  const [state, setState] = useState<SprintSearch>(IDLE)

  /**
   * The read this hook is still interested in.
   *
   * A counter and not an `AbortController`, because the round trip is an
   * `ipcRenderer.invoke` and there is nothing to abort: the main process will answer
   * whatever happens. What matters is that a SLOW answer to an OLD query cannot
   * overwrite a fast answer to the current one — which is exactly what typing produces,
   * since a shorter query matches more and takes longer.
   */
  const latest = useRef(0)

  useEffect(() => {
    const trimmed = query.trim()
    if (!enabled || !configKey || trimmed.length < MIN_QUERY) {
      latest.current += 1
      // Compared before setting, so an idle page does not re-render on every keystroke
      // that fails the guard above — which, while somebody deletes a query character by
      // character, is most of them.
      setState((current) => (current === IDLE ? current : IDLE))
      return
    }

    const ticket = ++latest.current
    let cancelled = false
    const timer = setTimeout(() => {
      // `loading` alone: the previous query's issues stay on the board while this one is
      // in flight. Clearing them here would drop the reader back to the capped rows for
      // as long as the round trip takes, which reads as the ticket they were looking at
      // disappearing as they type.
      setState((current) => ({ ...current, loading: true, failed: false }))
      void window.electronAPI.tasks
        .searchSprint(configKey, trimmed)
        .then((result) => {
          if (cancelled || latest.current !== ticket) return
          if (isJiraStatusError(result)) {
            setState({ issues: [], loading: false, failed: true })
            return
          }
          setState({ issues: result.issues, loading: false, failed: false })
        })
        .catch(() => {
          if (cancelled || latest.current !== ticket) return
          // A rejection at the bridge itself, which the handler is written never to
          // produce. Reported as the same failure as a named one: from the box's side
          // "the reach past the board did not work" is the whole of what happened.
          setState({ issues: [], loading: false, failed: true })
        })
    }, DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [configKey, query, enabled])

  return state
}
