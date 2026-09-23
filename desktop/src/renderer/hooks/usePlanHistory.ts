import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EMPTY_PLAN_HISTORY, type PlanHistoryRead, type PlanRevisionDiff } from '../../types'

const BRIDGE_FAILED: PlanHistoryRead = { ...EMPTY_PLAN_HISTORY, failed: true }

/**
 * One plan's history — its spec revisions and its link events — read-only.
 *
 * `usePlanLinks`' shape: `undefined` is "no plan" and answers an empty history rather than a
 * pending read, `read` is `null` while the FIRST read is in flight, and an answer that
 * arrives after the reader moved to another plan is dropped.
 *
 * `version` IS THE PAGE SAYING SOMETHING CHANGED: a spec save landed, a link was added or
 * removed. The history is written by the main process and the database, never through this
 * hook, so it cannot know on its own; the page bumps the value and the history is read again
 * QUIETLY — what is on screen stays until the new answer replaces it, instead of the section
 * blinking to "Loading" on every autosave.
 */
export function usePlanHistory(sessionId: string | undefined, version: string | number) {
  const [read, setRead] = useState<PlanHistoryRead | null>(null)
  const sessionRef = useRef(sessionId)
  sessionRef.current = sessionId

  const load = useCallback(async (id: string) => {
    const next = await window.electronAPI.plans.history.list(id).catch(() => BRIDGE_FAILED)
    if (sessionRef.current === id) setRead(next)
  }, [])

  // A new plan: start from nothing, loudly.
  useEffect(() => {
    if (!sessionId) {
      setRead(EMPTY_PLAN_HISTORY)
      return
    }
    setRead(null)
    void load(sessionId)
  }, [sessionId, load])

  // Something changed on this plan: read again, quietly. Skips the first run, which the
  // effect above already covers.
  const seenVersion = useRef(version)
  useEffect(() => {
    if (seenVersion.current === version) return
    seenVersion.current = version
    if (sessionRef.current) void load(sessionRef.current)
  }, [version, load])

  const retry = useCallback(() => {
    const id = sessionRef.current
    if (!id) return
    setRead(null)
    void load(id)
  }, [load])

  return useMemo(() => ({ read, retry }), [read, retry])
}

/**
 * The diff between two revisions, asked for whenever the pair changes. `null` while it is
 * being computed; `to` undefined (nothing selected) answers `null` and asks nothing.
 *
 * Keyed on the pair, and an answer for a pair the reader has since changed is dropped — two
 * clicks in quick succession must not end on the first click's diff.
 *
 * `stamp` is the pair's latest write (their `updatedAt`s). A run of saves folds into one
 * revision, so its text can move while its id stays: the stamp is what asks again.
 */
export function usePlanRevisionDiff(from: string | null | undefined, to: string | undefined, stamp = '') {
  const [diff, setDiff] = useState<PlanRevisionDiff | null>(null)

  useEffect(() => {
    setDiff(null)
    if (!to) return
    let live = true
    window.electronAPI.plans.history.diff(from ?? null, to)
      .catch((): PlanRevisionDiff => ({ failed: true }))
      .then((next) => {
        if (live) setDiff(next)
      })
    return () => { live = false }
  }, [from, to, stamp])

  return diff
}
