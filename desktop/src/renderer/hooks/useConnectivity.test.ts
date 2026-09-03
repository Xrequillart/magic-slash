import { describe, it, expect } from 'vitest'
import {
  reduceGate,
  INITIAL_GATE,
  FAILURES_BEFORE_OFFLINE,
  type GateState,
} from './connectivityGate'

const online: GateState = { status: 'ok', everOk: true, failures: 0 }

/** Folds a run of probes onto a starting state, as the hook does over time. */
const run = (from: GateState, ...probes: Parameters<typeof reduceGate>[1][]) =>
  probes.reduce(reduceGate, from)

describe('reduceGate', () => {
  it('keeps the app online through a single failed probe', () => {
    expect(run(online, 'unreachable')).toMatchObject({ status: 'ok', failures: 1 })
  })

  it('keeps the app online through a streak shorter than the threshold', () => {
    const probes = Array<'unreachable'>(FAILURES_BEFORE_OFFLINE - 1).fill('unreachable')
    expect(run(online, ...probes).status).toBe('ok')
  })

  it('goes offline once the streak reaches the threshold', () => {
    const probes = Array<'unreachable'>(FAILURES_BEFORE_OFFLINE).fill('unreachable')
    expect(run(online, ...probes).status).toBe('unreachable')
  })

  it('forgets the streak as soon as one probe answers', () => {
    const recovered = run(online, 'unreachable', 'unreachable', 'ok')
    expect(recovered).toMatchObject({ status: 'ok', failures: 0 })
    // The next blip therefore starts from scratch rather than tipping over.
    expect(run(recovered, 'unreachable').status).toBe('ok')
  })

  it('comes back online after a confirmed outage', () => {
    const offline = run(online, ...Array<'unreachable'>(FAILURES_BEFORE_OFFLINE).fill('unreachable'))
    expect(reduceGate(offline, 'ok')).toMatchObject({ status: 'ok', failures: 0 })
  })

  it('holds the initial "checking" state during a streak on a cold start', () => {
    const cold = run(INITIAL_GATE, 'unreachable')
    expect(cold).toMatchObject({ status: 'checking', everOk: false })
    // A cold start that never reaches the backend still ends up blocked.
    expect(run(cold, ...Array<'unreachable'>(FAILURES_BEFORE_OFFLINE).fill('unreachable')))
      .toMatchObject({ status: 'unreachable', everOk: false })
  })

  it('remembers that the backend was reached once, across later losses', () => {
    const offline = run(INITIAL_GATE, 'ok', ...Array<'unreachable'>(FAILURES_BEFORE_OFFLINE).fill('unreachable'))
    expect(offline).toMatchObject({ status: 'unreachable', everOk: true })
    // Signing out un-hydrates: the caches belong to the account that left, so a
    // loss on the login screen must block instead of re-rendering an empty app.
    expect(reduceGate(offline, 'unauthorized')).toMatchObject({ status: 'unauthorized', everOk: false })
  })

  it('applies the other statuses immediately, with no grace', () => {
    expect(reduceGate(online, 'unauthorized').status).toBe('unauthorized')
    expect(reduceGate(online, 'disabled').status).toBe('disabled')
  })
})
