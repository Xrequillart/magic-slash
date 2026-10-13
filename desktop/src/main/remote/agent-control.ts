import type { TerminalState } from '../../types'
import { promptBytes, remotePromptRefusal } from '../../prompt-submit'
import type { CommandOutcome } from './commands'

/**
 * A paired iPhone's `prompt` and `stop` (PROTOCOL.md §10), once the gate and relay.ts's step 9
 * let them through: what each does to the agent, given its state. Pure decisions over injected
 * edges, like answer-question.ts, so the rules are tested without a pty; main/index.ts supplies
 * the terminal manager, the question store and the two shared sequences (`submitToTerminal`,
 * `interruptTerminal`).
 *
 * The state is read, then the terminal written: an agent that moves in between (a turn that
 * ends, a question that arrives) gets the bytes all the same. §10 accepts that race; the
 * desktop chat has the same one.
 */

export interface PromptEdges {
  /** The agent's state, or undefined when its terminal is gone. */
  state: (id: string) => TerminalState | undefined
  /** Whether a question or a permission is waiting on an answer. */
  hasQuestion: (id: string) => boolean
  /** The chat's own sequence: the bytes, then the Return. False when no pty took them. */
  submit: (id: string, bytes: string) => Promise<boolean>
}

/**
 * Types the prompt as the desktop chat would. Refused `unsupported` for what the phone may not
 * send (a `!` line, a command that opens a TUI dialog), `busy` while the agent waits on an
 * answer (the bytes would land in the dialog), and `stale` for an agent that is gone. Sent
 * while the agent works, it is queued by Claude Code, and the phone is told so.
 */
export async function runRemotePrompt(id: string, text: string, edges: PromptEdges): Promise<CommandOutcome> {
  if (remotePromptRefusal(text)) return { ok: false, reason: 'unsupported' }
  const state = edges.state(id)
  if (state === undefined) return { ok: false, reason: 'stale' }
  if (state === 'waiting' || edges.hasQuestion(id)) return { ok: false, reason: 'busy' }
  if (!(await edges.submit(id, promptBytes(text)))) return { ok: false, reason: 'write-failed' }
  return state === 'working' ? { ok: true, queued: true } : { ok: true }
}

export interface StopEdges {
  state: (id: string) => TerminalState | undefined
  /** The chat's Stop: null when no pty took the Escape, else the prompt Claude Code took back. */
  interrupt: (id: string) => Promise<{ draft: string | null } | null>
  /** Forget the agent's pending question, which Escape dismissed. */
  clearQuestion: (id: string) => void
  /** Hand a prompt the interrupt took back to the desktop chat's composer. */
  restoreDraft: (id: string, text: string) => void
}

/**
 * Interrupts the turn of an agent that is working or waiting, as the chat's Stop does. On an
 * idle agent there is nothing to stop, and Escape there is not harmless (twice opens Claude
 * Code's rewind menu): `stale`.
 */
export async function runRemoteStop(id: string, edges: StopEdges): Promise<CommandOutcome> {
  const state = edges.state(id)
  if (state !== 'working' && state !== 'waiting') return { ok: false, reason: 'stale' }
  const interrupted = await edges.interrupt(id)
  // Escape never reached the terminal: nothing stopped, and the question still stands.
  if (!interrupted) return { ok: false, reason: 'write-failed' }
  // Escape answered the question by dismissing it: the panel and the phones must not offer it.
  if (state === 'waiting') edges.clearQuestion(id)
  if (interrupted.draft) edges.restoreDraft(id, interrupted.draft)
  return { ok: true }
}
