import { describe, it, expect } from 'vitest'
import { createTaskQueue } from './taskQueue'

/** A promise with its settle functions pulled out, so a test can decide when a task ends. */
function deferred<T = void>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

/** Let every already-scheduled microtask run. */
const flush = () => Promise.resolve().then(() => {}).then(() => {}).then(() => {})

describe('createTaskQueue', () => {
  it('runs a lone task and hands back its value', async () => {
    const queue = createTaskQueue(3)
    await expect(queue.run(async () => 'read')).resolves.toBe('read')
  })

  it('never runs more than the limit at once', async () => {
    const queue = createTaskQueue(3)
    const gates = Array.from({ length: 10 }, () => deferred())
    let started = 0
    let peak = 0

    const all = gates.map(gate => queue.run(async () => {
      started++
      peak = Math.max(peak, queue.active)
      await gate.promise
    }))

    await flush()
    // Ten cards mounted, three reads in flight — the other seven are held here.
    expect(started).toBe(3)
    expect(queue.active).toBe(3)
    expect(queue.pending).toBe(7)

    for (const gate of gates) {
      gate.resolve()
      await flush()
    }
    await Promise.all(all)
    expect(peak).toBeLessThanOrEqual(3)
    expect(queue.active).toBe(0)
    expect(queue.pending).toBe(0)
  })

  it('admits the next task as soon as one finishes, not once the batch does', async () => {
    const queue = createTaskQueue(2)
    const gates = Array.from({ length: 3 }, () => deferred())
    const started: number[] = []

    const all = gates.map((gate, i) => queue.run(async () => {
      started.push(i)
      await gate.promise
    }))

    await flush()
    expect(started).toEqual([0, 1])

    gates[0].resolve()
    await flush()
    expect(started).toEqual([0, 1, 2])

    gates[1].resolve()
    gates[2].resolve()
    await Promise.all(all)
  })

  it('does not over-admit when a task is queued synchronously as a slot frees', async () => {
    // The bug the counter's placement exists to stop: `release` runs synchronously,
    // but waking an awaited task does not. A `run` landing in that window must not
    // find a slot that has already been promised to a waiter.
    const queue = createTaskQueue(1)
    const first = deferred()
    let concurrent = 0
    let peak = 0

    const body = async (gate: Promise<void>) => {
      concurrent++
      peak = Math.max(peak, concurrent)
      await gate
      concurrent--
    }

    const a = queue.run(() => body(first.promise))
    await flush()
    const b = queue.run(() => body(Promise.resolve()))
    // Resolving `a` frees the slot; `b` was already waiting for it.
    first.resolve()
    const c = queue.run(() => body(Promise.resolve()))

    await Promise.all([a, b, c])
    expect(peak).toBe(1)
  })

  it('hands the slot back when a task rejects', async () => {
    // A repository with a few unreadable files is ordinary. A queue that leaked a slot
    // per failure would stop admitting anything after `max` of them.
    const queue = createTaskQueue(2)
    await expect(queue.run(async () => { throw new Error('unreadable') })).rejects.toThrow('unreadable')
    await expect(queue.run(async () => { throw new Error('unreadable') })).rejects.toThrow('unreadable')
    await expect(queue.run(async () => { throw new Error('unreadable') })).rejects.toThrow('unreadable')
    expect(queue.active).toBe(0)
    await expect(queue.run(async () => 'still working')).resolves.toBe('still working')
  })

  it('treats a limit below one as one rather than deadlocking', async () => {
    const queue = createTaskQueue(0)
    const gate = deferred()
    let started = 0

    const a = queue.run(async () => { started++; await gate.promise })
    const b = queue.run(async () => { started++ })
    await flush()
    expect(started).toBe(1)

    gate.resolve()
    await Promise.all([a, b])
    expect(started).toBe(2)
  })

  it('preserves the order tasks were queued in', async () => {
    const queue = createTaskQueue(1)
    const order: number[] = []
    await Promise.all([0, 1, 2, 3].map(i => queue.run(async () => { order.push(i) })))
    expect(order).toEqual([0, 1, 2, 3])
  })
})
