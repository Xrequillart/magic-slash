import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { NewPlanComment, PlanCommentsRead } from '../../types'
import { createLatestWriter } from '../utils/latestWrite'

/**
 * The comments on one plan, and the three ways of changing them.
 *
 * SHAPED LIKE `pages/Plans/index.tsx`'s own read, deliberately: `null` while nothing has
 * come back — which is a THIRD state, distinct from a read that came back empty — an
 * `attempt` counter rather than a refetch callback for the retry, and a `failed` flag
 * carried in the payload instead of a rejection. The page that mounts this draws the same
 * three branches over it that the plans list draws over its own, so the two cannot come to
 * disagree about what an empty answer means.
 *
 * NO REALTIME, and the refetch is not a poor substitute for one. `plan_comments` is
 * deliberately not published (see the migration's closing note); live propagation is issue
 * #298, with its own questions about what happens to a card somebody is typing in when the
 * passage under it moves. What this hook promises is narrower and is stated plainly on the
 * page: the comments as they were when the plan was opened, plus every change made from
 * here.
 */

/** An answer with nothing in it and nothing wrong — no plan open, or nothing said yet. */
const NOTHING: PlanCommentsRead = {
  comments: [], emailByAuthor: {}, avatarByAuthor: {}, truncated: false, failed: false,
}

/** What the bridge itself failing looks like. A read that did not happen, not an empty one. */
const BRIDGE_FAILED: PlanCommentsRead = { ...NOTHING, failed: true }

export interface PlanComments {
  /** `null` until the first read lands. Not an empty thread — see the docblock. */
  read: PlanCommentsRead | null
  /** Ask again. The one thing a reader can do about a failed read. */
  retry: () => void
  /**
   * The three writes. Each resolves to whether it went through and then refetches, so a
   * caller can leave a card open on a failure instead of closing it over a comment that
   * was never stored.
   */
  create: (input: NewPlanComment) => Promise<boolean>
  update: (id: string, body: string) => Promise<boolean>
  remove: (id: string) => Promise<boolean>
}

export function usePlanComments(sessionId: string | undefined): PlanComments {
  const [read, setRead] = useState<PlanCommentsRead | null>(null)
  /**
   * Bumped by `retry`, for the reason `Plans/index.tsx` gives: ONE effect owns the state,
   * so the reset to `null`, the cancellation and the failure fallback are written once and
   * a retry cannot race the read it was fired during.
   */
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  /**
   * Which plan the state on screen belongs to, and whether this hook is still mounted.
   *
   * Refs rather than the effect's usual `cancelled` closure, because the read is issued
   * from TWO places — the effect below, and every write — and a flag owned by one effect
   * run cannot speak for a refetch fired from a click. These two are what stop a late
   * answer from landing on an unmounted page, or on a different plan.
   */
  const aliveRef = useRef(true)
  const sessionRef = useRef(sessionId)
  sessionRef.current = sessionId

  useEffect(() => {
    aliveRef.current = true
    return () => { aliveRef.current = false }
  }, [])

  /**
   * The read, serialized — at most one in flight, and the newest request is the one that
   * lands last.
   *
   * `createLatestWriter` is used for the READ and pointedly NOT for the writes, and that
   * distinction is the whole of why this is worth a comment. The writer keeps only the
   * latest value of a burst and drops the ones in between, which is exactly right for a
   * refetch — the intermediate answers were never anything a reader needed — and exactly
   * wrong for a comment: two people's notes are not two frames of one choice, and a
   * "latest wins" serializer over `create` would silently discard one of them.
   *
   * So a reader who writes three times quickly issues at most two reads rather than three,
   * and the last one reflects all three writes.
   *
   * `useMemo` because the writer holds its in-flight slot in a closure: a new one per
   * render would have its own empty slot and be back to firing in parallel, which is the
   * one thing it exists to stop.
   */
  const load = useMemo(() => createLatestWriter<string>(async (id) => {
    const next = await window.electronAPI.plans.comments.list(id).catch(() => BRIDGE_FAILED)
    // The plan may have changed under the request — the reader went back and opened
    // another — in which case this answer is about a page nobody is looking at.
    if (aliveRef.current && sessionRef.current === id) setRead(next)
  }), [])

  useEffect(() => {
    if (!sessionId) {
      // No plan means nothing to read, which is an ANSWER and not a pending read: the
      // page would otherwise sit on the loading line forever.
      setRead(NOTHING)
      return
    }
    // Back to the loading state for the duration of a retry, the courtesy the plans list
    // extends for the same reason: a stale failure block sitting there with its button
    // looks like the click did nothing.
    setRead(null)
    load(sessionId)
  }, [sessionId, attempt, load])

  /**
   * One write, then a refetch — `useOrg`'s `invite` shape, and for its reason: the server
   * is the only thing that knows what the row ended up as, and rebuilding the thread
   * locally would be a second implementation of the threading the refetch supplies for
   * free.
   *
   * REFETCHED EVEN WHEN THE WRITE FAILED. A refusal is often the page being out of date —
   * the comment was deleted by its author from the webapp, the plan was unshared — and
   * showing the reader why costs one read they were about to want anyway.
   */
  const after = useCallback(async (ok: boolean): Promise<boolean> => {
    const id = sessionRef.current
    if (id) load(id)
    return ok
  }, [load])

  const create = useCallback(async (input: NewPlanComment) => {
    const ok = await window.electronAPI.plans.comments.create(input).catch(() => false)
    return after(ok)
  }, [after])

  const update = useCallback(async (id: string, body: string) => {
    const ok = await window.electronAPI.plans.comments.update(id, body).catch(() => false)
    return after(ok)
  }, [after])

  const remove = useCallback(async (id: string) => {
    const ok = await window.electronAPI.plans.comments.remove(id).catch(() => false)
    return after(ok)
  }, [after])

  /**
   * MEMOISED, and this is not tidiness: the plans detail page feeds this straight into a
   * `useMemo` that builds the spec's comment source, which in turn is a prop of a
   * `memo`-wrapped body whose whole reason for existing is that react-markdown re-parses
   * the document on every render it is handed. A fresh object here would be a new identity
   * on every scroll frame, and the spec would be re-parsed on each one.
   */
  return useMemo(
    () => ({ read, retry, create, update, remove }),
    [read, retry, create, update, remove],
  )
}
