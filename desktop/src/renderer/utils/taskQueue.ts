/**
 * A gate that lets only so many async tasks run at once.
 *
 * Written for one caller and one problem: the review drawer mounts a card per changed
 * file, and every card reads its file over IPC. `config:readFile` shells out to
 * `git diff HEAD -- <file>` SYNCHRONOUSLY in the main process, so forty cards mounting
 * together put forty read messages in the main process's queue at once — ahead of every
 * PTY data message behind them. The reads would be serialised anyway; what floods is
 * the queue, and the symptom is the terminals freezing for the length of the whole
 * batch rather than for one read.
 *
 * Holding the tail in the RENDERER is what fixes that: at most a few reads are ever
 * queued in the main process, so anything else that needs the main loop gets it between
 * them. It does not make the batch finish sooner, and it is not meant to.
 *
 * Free of DOM and of React, so the renderer's node suite can cover it.
 */

export interface TaskQueue {
  /** Run `task` once the gate lets it through, and resolve with (or reject as) it does. */
  run<T>(task: () => Promise<T>): Promise<T>
  /** How many tasks are running right now — for tests and for debugging. */
  readonly active: number
  /** How many are waiting for a slot. */
  readonly pending: number
}

export function createTaskQueue(limit: number): TaskQueue {
  // A limit of zero would deadlock every caller forever, and a negative one is not a
  // question with an answer. One task at a time is the honest reading of "as little
  // concurrency as possible".
  const max = Math.max(1, Math.floor(limit))
  const waiting: Array<() => void> = []
  let active = 0

  /**
   * The counter is incremented HERE, inside the waiter's own callback, rather than by
   * the task after it wakes up.
   *
   * `release` runs synchronously, but resuming an awaited promise does not — it is a
   * microtask. If the slot were only taken once the woken task resumed, a `run` called
   * synchronously in between would look at an `active` that had been decremented and
   * not yet re-incremented, find room, and take a slot that was already promised. The
   * gate would then admit more than `max` under exactly the burst it exists to hold
   * back.
   */
  function acquire(): Promise<void> {
    if (active < max) {
      active++
      return Promise.resolve()
    }
    return new Promise<void>(resolve => waiting.push(() => {
      active++
      resolve()
    }))
  }

  function release(): void {
    active--
    waiting.shift()?.()
  }

  return {
    get active() { return active },
    get pending() { return waiting.length },
    async run<T>(task: () => Promise<T>): Promise<T> {
      await acquire()
      // `finally`, so a task that throws still hands its slot back. A queue that leaks
      // a slot per failed read stops admitting anything at all after `max` failures,
      // and a repository with a few unreadable files is an ordinary case.
      try {
        return await task()
      } finally {
        release()
      }
    },
  }
}
