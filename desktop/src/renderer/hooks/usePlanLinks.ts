import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { NewPlanLink, PlanLinksRead } from '../../types'

const NOTHING: PlanLinksRead = { links: [], emailByAuthor: {}, failed: false }
const BRIDGE_FAILED: PlanLinksRead = { ...NOTHING, failed: true }

/**
 * The external links pinned to one plan, and the two ways of changing them.
 *
 * `usePlanComments`' shape, one table over: `undefined` is "no plan" and answers an empty
 * list rather than a pending read; every write is followed by a refetch, EVEN WHEN IT FAILED,
 * because a refusal is usually the page being out of date and the read shows the reader why;
 * and an answer that arrives after the reader moved to another plan is dropped.
 *
 * `read` is `null` while the first read is in flight.
 */
export function usePlanLinks(sessionId: string | undefined) {
  const [read, setRead] = useState<PlanLinksRead | null>(null)
  const sessionRef = useRef(sessionId)
  sessionRef.current = sessionId

  const load = useCallback(async (id: string) => {
    const next = await window.electronAPI.plans.links.list(id).catch(() => BRIDGE_FAILED)
    if (sessionRef.current === id) setRead(next)
  }, [])

  useEffect(() => {
    if (!sessionId) {
      setRead(NOTHING)
      return
    }
    setRead(null)
    void load(sessionId)
  }, [sessionId, load])

  const after = useCallback(async (ok: boolean) => {
    const id = sessionRef.current
    if (id) await load(id)
    return ok
  }, [load])

  const add = useCallback(async (input: NewPlanLink) => {
    const ok = await window.electronAPI.plans.links.create(input).catch(() => false)
    return after(ok)
  }, [after])

  const remove = useCallback(async (id: string) => {
    const ok = await window.electronAPI.plans.links.remove(id).catch(() => false)
    return after(ok)
  }, [after])

  const retry = useCallback(() => {
    const id = sessionRef.current
    if (!id) return
    setRead(null)
    void load(id)
  }, [load])

  return useMemo(() => ({ read, add, remove, retry }), [read, add, remove, retry])
}
