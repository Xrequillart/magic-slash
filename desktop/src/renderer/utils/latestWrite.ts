/**
 * A writer that lets only the NEWEST value reach the store.
 *
 * THE PROBLEM IT SOLVES. A control that records the reader's choice by calling an async
 * write on every click issues those writes in parallel, and parallel requests have no
 * arrival order. Click A then B and the two race: if A's round trip happens to be the
 * slower one, A lands SECOND and the account keeps A. Nothing on screen says so, because
 * the visible state was set locally on click. The damage only shows up on the next
 * launch, when the page restores a choice the reader replaced.
 *
 * WHY A "LATEST WINS" TOKEN IS NOT ENOUGH on its own. Discarding the stale RESPONSE does
 * keep a late answer from overwriting local state, but it does nothing about the stale
 * REQUEST: the older write has already reached the server, and it still lands last. The
 * only way the newest value can be the one stored is for it to be the last one SENT, so
 * this serializes instead of tagging.
 *
 * HOW. One write in flight at a time. Calls made while one is running do not queue up —
 * they overwrite a single slot, so a burst of ten clicks issues at most two writes: the
 * one already going, and the last value of the burst. The intermediate values are not
 * lost in any sense that matters; they were never the reader's answer, only the frames
 * they clicked through.
 *
 * FAILURES ARE SWALLOWED, deliberately. The caller has already shown the new state and
 * has no better move than to keep it: a write that fails leaves the account on the
 * previous value, which the next successful write corrects. Rejecting here would only
 * produce an unhandled rejection, since nothing awaits the result.
 *
 * Pure and framework-free: no React, no IPC. Hold the returned function across renders
 * (`useMemo`/`useRef`) — a new one per render would have its own empty slot and be back
 * to firing in parallel.
 */
export function createLatestWriter<T>(write: (value: T) => Promise<unknown>): (value: T) => void {
  let running = false
  // A one-slot box rather than the value itself, so that `undefined` is a storable value
  // and not a synonym for "nothing waiting".
  let pending: { value: T } | null = null

  const run = (value: T): void => {
    running = true
    write(value)
      .catch(() => { /* see above: the view is already right, and nothing awaits this */ })
      .then(() => {
        running = false
        const next = pending
        pending = null
        if (next) run(next.value)
      })
  }

  return (value: T): void => {
    if (running) {
      pending = { value }
      return
    }
    run(value)
  }
}
