import { useState, useEffect, useCallback } from 'react'
import type { JiraAuthStatus, JiraConnectResult, JiraDisconnectReason } from '../../types'

/**
 * The state of the user's Atlassian connection, as `useAuth` does for the cloud
 * identity — with one addition the cloud does not need.
 *
 * `jira:connect` cannot report its own outcome: it opens a browser and returns, and
 * the credential lands minutes later through the loopback callback. So the
 * subscription is not a nicety here, it is the only way this hook ever sees a
 * success — and `lastEvent` carries the reason a failed attempt failed.
 *
 * `lastEvent` is an object rather than a bare reason code so that two identical
 * outcomes in a row still change identity: every push builds a fresh literal, so a
 * user who cancels the browser twice sees the explanation twice, where a `useEffect`
 * keyed on the code alone would fire only once.
 */
const INITIAL: JiraAuthStatus = { connected: false, configured: false }

export interface JiraAuthEvent {
  reason: JiraDisconnectReason
}

export function useJiraAuth() {
  const [status, setStatus] = useState<JiraAuthStatus>(INITIAL)
  const [loading, setLoading] = useState(true)
  const [lastEvent, setLastEvent] = useState<JiraAuthEvent | null>(null)

  const refresh = useCallback(async () => {
    try {
      const s = await window.electronAPI.jira.authStatus()
      setStatus(s)
    } catch {
      setStatus(INITIAL)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const unsubscribe = window.electronAPI.jira.onStatusChanged((next, reason) => {
      setStatus(next)
      // Only a FAILED outcome carries a reason; a success pushes the status alone and
      // must not leave a stale explanation behind it.
      setLastEvent(reason ? { reason } : null)
    })
    return () => { unsubscribe() }
  }, [])

  /**
   * Ask the main process to open the consent screen.
   *
   * NEVER REJECTS, and never surfaces an `Error` to its caller. A flow that could not
   * start already resolves to `{ started: false, failure }`; the one thing left that can
   * reject is the bridge call itself, and its message is Electron's own
   * `Error invoking remote method 'jira:connect': …` wrapper — untranslated, and about
   * our plumbing rather than about the user's problem. So it is reduced to the
   * `unexpected` code and the component translates it like any other outcome.
   */
  const connect = useCallback(async (): Promise<JiraConnectResult> => {
    try {
      const result = await window.electronAPI.jira.connect()
      // Still "not connected" at this point — the browser has only just opened. Kept so
      // a caller that awaits gets the same object the push will later replace.
      if (result.started) setStatus(result.status)
      return result
    } catch {
      return { started: false, failure: 'unexpected' }
    }
  }, [])

  const disconnect = useCallback(async () => {
    const s = await window.electronAPI.jira.disconnect()
    setStatus(s)
    return s
  }, [])

  return { status, loading, lastEvent, refresh, connect, disconnect }
}
