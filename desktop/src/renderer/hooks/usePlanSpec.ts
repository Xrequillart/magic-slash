import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * How long to wait after a `plan:specChanged` ping before re-reading the file.
 *
 * Claude Code rewrites a spec in bursts — a heading, then a paragraph, then a
 * list, each its own write — and the hook is signalled on every one. 200ms is
 * short enough to read as live and long enough that a burst costs one read.
 */
const SPEC_REFRESH_DEBOUNCE_MS = 200

interface PlanSpec {
  /**
   * The spec path in force for this agent, or undefined when none is known yet.
   * The event payload wins over the metadata — see below.
   */
  specPath: string | undefined
  /** Hand straight to `FileContentRenderer`'s `refreshToken`. */
  refreshToken: number
}

/**
 * Follow one agent's `/magic:plan` spec file, live.
 *
 * Subscribes to `plan:specChanged` — the ping the status server fires on every
 * spec write — and turns it into a token the file view re-reads on. No `fs.watch`
 * is involved anywhere: the renderer never watches a path, and the main process
 * holds no handle per agent. That is also why this keeps working with cloud sync
 * off and with no network at all — the signal is local IPC and the read is a
 * local file.
 *
 * The event's `specPath` takes precedence over `metadata.specPath` when it is
 * present. The ping and `terminal:metadata` travel on two channels with no
 * ordering guarantee between them, so the FIRST ping routinely lands before the
 * renderer knows where the spec is; preferring the payload is what makes the
 * panel appear on the first write rather than on the second.
 *
 * `enabled` is false whenever nothing is displaying the spec — a non-planning
 * agent, or the info sidebar closed. The hook then subscribes to nothing and
 * bumps nothing: the token only ever paces work someone can actually see.
 *
 * The token is bumped on an agent switch and on window focus. The focus bump is
 * the safety net: the ping is emitted best-effort and a lost one would otherwise
 * freeze the panel until the next write. Mount and path changes need no bump —
 * the file view already re-reads when the path it is given changes.
 */
export function usePlanSpec(
  terminalId: string | undefined,
  specPathFromMetadata: string | undefined,
  enabled: boolean,
): PlanSpec {
  // Keyed by agent id rather than reset in an effect: a stale path must never be
  // shown for one render after a switch, which is exactly the window an effect
  // would leave open.
  const [announced, setAnnounced] = useState<{ id: string; specPath: string } | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const specPath = (terminalId && announced?.id === terminalId ? announced.specPath : undefined)
    ?? specPathFromMetadata

  const bump = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      setRefreshToken(token => token + 1)
    }, SPEC_REFRESH_DEBOUNCE_MS)
  }, [])

  useEffect(() => {
    if (!terminalId || !enabled) return

    const unsubscribe = window.electronAPI.terminal.onPlanSpecChanged((data) => {
      // One channel carries every agent's pings, so two planning agents on the
      // same repository each get their own file: the id decides, never a
      // directory scan and never "the newest spec on disk".
      if (data.id !== terminalId) return
      // Same path on every ping of a session, so hold the object identity: a fresh
      // one would re-render the whole sidebar per write and undo the debounce.
      if (data.specPath) {
        const { id, specPath: path } = data
        setAnnounced(prev => (prev?.id === id && prev.specPath === path ? prev : { id, specPath: path }))
      }
      bump()
    })

    // Wrapped rather than returned directly: the preload closure hands back the
    // IpcRenderer, and React reads a non-void return from a cleanup as a mistake.
    return () => { unsubscribe() }
  }, [terminalId, enabled, bump])

  // An agent switch re-reads: a spec that grew while its agent was off screen must
  // show what is on disk now. Skipped on the first run — the file view reads once
  // by itself when it mounts, and bumping here too would read the same bytes twice.
  const lastTerminalId = useRef(terminalId)
  useEffect(() => {
    if (!enabled) return
    if (lastTerminalId.current === terminalId) return
    lastTerminalId.current = terminalId
    bump()
  }, [terminalId, enabled, bump])

  useEffect(() => {
    if (!enabled) return
    const handleFocus = () => bump()
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [enabled, bump])

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
  }, [])

  return { specPath, refreshToken }
}
