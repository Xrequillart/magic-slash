import type { TerminalState } from '../../types'

/**
 * WHEN AN AGENT'S CLAUDE CODE IS PUT TO SLEEP, to give its memory back.
 *
 * Each agent runs its own `claude`, 100 to 350 MB apiece, and most of them sit at an
 * input box for hours. One left alone long enough is stopped, and started again with
 * `--resume` on the same conversation the moment it is opened or written to (see
 * `sleep`/`wake` in terminal-manager.ts). The chat never notices: it reads the
 * transcript, which outlives the process.
 *
 * Its own module, importing nothing that runs, so it has a sibling test: the rest lives
 * in terminal-manager, which pulls node-pty.
 */

/**
 * How long an agent must be left alone, and out of sight, before it sleeps: the setting
 * (Settings → Sessions), in minutes. 0 never puts one to sleep.
 */
export function sleepAfterMs(minutes: number | undefined, fallback: number): number | null {
  const chosen = minutes ?? fallback
  return chosen > 0 ? chosen * 60_000 : null
}

/** How often the agents are looked over. */
export const SLEEP_SWEEP_MS = 60_000

export interface SleepCandidate {
  state: TerminalState
  /** The last input, state change, wake, or moment it was left. */
  lastActiveAt: number
  /** Shown in a pane right now. */
  visible: boolean
  /** Background agents still running: they live in the process. */
  background: number
  asleep: boolean
  restarting: boolean
}

/**
 * Only an agent at rest: not mid-turn, not on a question (`waiting`, which the process
 * holds and a restart would lose), not in error (what the terminal shows is the
 * explanation), and with no background agent of its own still at work.
 */
export function shouldSleep(c: SleepCandidate, now: number, afterMs: number): boolean {
  if (c.asleep || c.restarting || c.visible || c.background > 0) return false
  if (c.state !== 'idle' && c.state !== 'completed') return false
  return now - c.lastActiveAt >= afterMs
}

/**
 * Input that reached an agent while it slept or woke, replayed once its input box is up.
 *
 * WITH THE GAPS IT WAS WRITTEN WITH. A prompt is its text, then a Return a beat later
 * (see `submitToTerminal`): written back to back, the TUI reads the Return as part of
 * the paste and the prompt is never sent.
 */
export function replayHeld(held: Array<{ data: string; at: number }>, write: (data: string) => void): void {
  const first = held[0]?.at ?? 0
  for (const { data, at } of held) {
    const delay = Math.max(0, at - first)
    if (delay === 0) write(data)
    else setTimeout(() => write(data), delay)
  }
}
