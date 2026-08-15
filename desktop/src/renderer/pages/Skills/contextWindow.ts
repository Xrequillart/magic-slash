import type { TerminalInfo, TerminalState } from '../../../types'

/**
 * The window to size the skills budget against when nothing else is known: no
 * agent has ever reported one, and the user has not forced a preset. 200K is the
 * smaller of the two presets on purpose — under-promising a budget shows a red
 * gauge on a description that would have fit, which is the recoverable mistake.
 */
export const DEFAULT_CONTEXT_WINDOW = 200_000

/**
 * The states in which an agent is still running, and its reported usage still
 * describes the model in front of you.
 *
 * `completed` and `error` are deliberately out: usage is never cleared when an
 * agent finishes (see the comment above `updateTerminalUsageFromHook` in
 * `main/pty/terminal-manager.ts`), so a finished terminal keeps carrying the
 * window of a session that is over. Reading it back would let yesterday's Opus
 * run size today's gauges.
 */
const LIVE_TERMINAL_STATES: readonly TerminalState[] = ['idle', 'working', 'waiting']

function isLive(terminal: TerminalInfo): boolean {
  return LIVE_TERMINAL_STATES.includes(terminal.state)
}

/** The window this agent reported, if it reported a usable one at all. */
function reportedWindow(terminal: TerminalInfo): number | undefined {
  const size = terminal.metadata?.usage?.contextWindowSize
  return typeof size === 'number' && Number.isFinite(size) && size > 0 ? size : undefined
}

/**
 * The context window the running agents say they have.
 *
 * The agent you are looking at wins — that is the one whose skills listing you
 * are about to reason about. Failing that (no agent focused, the focused one has
 * finished, or it has not reported usage yet) the largest window across the live
 * agents wins: a listing that fits the biggest model running is the optimistic
 * reading, and the switch is there to check the pessimistic one.
 *
 * Returns `undefined` when nothing is running, which is the caller's cue to fall
 * back to DEFAULT_CONTEXT_WINDOW rather than to invent a number.
 */
export function detectContextWindow(
  terminals: TerminalInfo[],
  inspectedTerminalId: string | null | undefined,
): number | undefined {
  const inspected = inspectedTerminalId
    ? terminals.find((terminal) => terminal.id === inspectedTerminalId)
    : undefined

  if (inspected && isLive(inspected)) {
    const size = reportedWindow(inspected)
    if (size !== undefined) return size
  }

  let largest: number | undefined
  for (const terminal of terminals) {
    if (!isLive(terminal)) continue
    const size = reportedWindow(terminal)
    if (size !== undefined && (largest === undefined || size > largest)) largest = size
  }
  return largest
}

/**
 * Bring a persisted context-window preference forward to the 'auto' era.
 *
 * Before this, the preference was a plain 200K / 1M choice defaulting to 200K —
 * so every user who never touched the switch has a stored `200_000` that would
 * otherwise keep overriding the window their agents actually report. Only an
 * explicit 1M override survives; a legacy 200K, a missing field and corrupted
 * data all become 'auto'.
 *
 * Lives here rather than in the store so it can be tested without zustand.
 */
export function migrateSkillsContextWindow(persisted: unknown): 'auto' | 1_000_000 {
  return persisted === 1_000_000 ? 1_000_000 : 'auto'
}

/**
 * What the gauges are actually scaled to, once the setting and the detected
 * window are both known: the setting wins when it forces a preset, otherwise
 * the detected window, otherwise DEFAULT_CONTEXT_WINDOW.
 *
 * Kept beside detectContextWindow rather than inline in the component, so this
 * resolution rule is exercised by contextWindow.test.ts like the rest of the
 * module's policy.
 */
export function resolveContextWindow(
  setting: 'auto' | 200_000 | 1_000_000,
  detected: number | undefined,
): number {
  return setting === 'auto' ? detected ?? DEFAULT_CONTEXT_WINDOW : setting
}

/**
 * A context window as a human reads it: `200K`, `1M`, `350K`.
 *
 * The detected value is whatever the model reports, not one of two buckets, so
 * this has to stay sane on 350 000 or 1 048 576. Rounded to the nearest thousand,
 * and to at most one decimal past a million — `1.5M`, never `1.0M`.
 */
export function formatWindow(n: number): string {
  const thousands = Math.round(n / 1_000)
  if (thousands < 1_000) return `${thousands}K`
  const millions = Math.round(thousands / 100) / 10
  return `${millions}M`
}
