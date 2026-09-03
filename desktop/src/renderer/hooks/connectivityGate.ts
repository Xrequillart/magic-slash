import type { ConnectivityStatus } from '../../preload'

/**
 * The gate's PURE half: its state shape, its cadences, and the fold that turns a
 * probe result into the next state. No React, and that is the whole point of the
 * file existing.
 *
 * WHY IT IS NOT IN `useConnectivity.ts`. The root Vitest suite (`vitest.config.ts`)
 * runs on the ROOT `node_modules`, and CI never installs `desktop/node_modules` or
 * `webapp/node_modules`. A test that reaches a module importing one of those
 * dependencies does not fail an assertion — it fails to RESOLVE, and the whole
 * suite errors out. `useConnectivity.test.ts` wanted only `reduceGate` and the
 * constants, but importing them from the hook's own file pulled in its line 1,
 * `import … from 'react'`, and that is exactly what happened: every one of the
 * 2434 tests passed while the run still exited non-zero on
 * `Cannot find package 'react'`.
 *
 * So the split is the repo's own `xxx.ts` / `xxxRows.ts` pattern, applied here:
 * the data and the reducer live in a module with no runtime imports at all, the
 * hook keeps the effects, and the test points at this file. `ConnectivityStatus`
 * arrives through `import type`, which is erased at compile time — it never
 * becomes a runtime `require` of `../../preload`, so it cannot drag Electron in
 * through the back door either.
 */

export type GateStatus = ConnectivityStatus | 'checking'

/** Cadence of the probe while the backend answers. */
export const POLL_INTERVAL_MS = 20_000
/** Cadence while a failure streak is running — recover fast, then slow down. */
export const RETRY_INTERVAL_MS = 5_000
/**
 * Consecutive failed probes before 'unreachable' is believed. One failed request
 * is not an outage: a token refresh, a wifi handover or a laptop waking up all
 * drop a single call, and reporting those as offline made the app flap for users
 * whose connection never actually went away.
 */
export const FAILURES_BEFORE_OFFLINE = 3

export interface GateState {
  status: GateStatus
  /**
   * Whether this session ever reached the backend. It tells a cold start with
   * nothing hydrated (hard block) from a running app that lost the connection
   * (keep rendering the caches, warn in a toast).
   */
  everOk: boolean
  /** Length of the current failure streak; 0 as soon as a probe answers. */
  failures: number
}

export const INITIAL_GATE: GateState = { status: 'checking', everOk: false, failures: 0 }

/**
 * Folds one probe result into the gate state. A failed probe only surfaces as
 * 'unreachable' once FAILURES_BEFORE_OFFLINE of them land in a row — a shorter
 * streak keeps the last known status, so a blip never reaches the interface.
 */
export function reduceGate(state: GateState, probe: ConnectivityStatus): GateState {
  if (probe === 'unreachable') {
    const failures = state.failures + 1
    return {
      ...state,
      failures,
      status: failures >= FAILURES_BEFORE_OFFLINE ? 'unreachable' : state.status,
    }
  }
  // 'unauthorized' un-hydrates: the main process resets the caches for the next
  // user, so a connection lost on the login screen must block rather than
  // re-render the signed-out app over empty caches.
  if (probe === 'unauthorized') return { status: probe, everOk: false, failures: 0 }
  return { status: probe, everOk: state.everOk || probe === 'ok', failures: 0 }
}
