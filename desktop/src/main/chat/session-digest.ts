import type { ChatEntry } from '../../types'

/**
 * WHAT AN AGENT'S EARLIER CONVERSATIONS SAID, condensed for the one it starts next.
 *
 * Offered on a new session's empty chat ("give Claude the context?"): the agent's last few
 * transcripts, boiled down to what a reader needs to pick the work up — each prompt, the
 * text Claude answered with, and the files that were changed — and handed to the new
 * session as one file. The tool output that makes up most of a transcript (file reads,
 * command output, search results) is left out: it is how the work was done, not what was
 * decided, and it would cost the new session most of its context.
 *
 * Pure, so it is tested without a file: the caller reads the transcripts with
 * `ChatTranscript` and writes what this returns.
 */

/** One earlier conversation, as the caller read it. */
export interface DigestSession {
  title?: string
  startedAt: number
  entries: ChatEntry[]
}

/** How many earlier conversations the digest covers, newest first. */
export const DIGEST_SESSIONS = 5

/** The whole digest's ceiling, in characters: about ten thousand tokens. */
export const DIGEST_BUDGET = 40_000

/** A prompt or an answer past this is cut, with a mark saying so. */
const PROMPT_CHARS = 2_000
const ANSWER_CHARS = 1_200

/** The tools whose summary is a file the agent changed. */
const EDIT_TOOLS = new Set(['Edit', 'MultiEdit', 'Write', 'NotebookEdit'])

interface Turn {
  prompt: string
  answers: string[]
  files: string[]
}

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max)} […]` : text)

/** A conversation as its turns: each prompt, what Claude said after it, what it changed. */
function turnsOf(entries: ChatEntry[]): Turn[] {
  const turns: Turn[] = []
  for (const entry of entries) {
    if (entry.kind === 'user') {
      turns.push({ prompt: entry.text, answers: [], files: [] })
      continue
    }
    const turn = turns[turns.length - 1]
    if (!turn) continue
    if (entry.kind === 'assistant') turn.answers.push(entry.text)
    else if (entry.kind === 'tool') {
      const changed = entry.diff?.path ?? (EDIT_TOOLS.has(entry.name) ? entry.summary : undefined)
      for (const file of [changed, ...(entry.diffs ?? []).map((d) => d.path)]) {
        if (file && !turn.files.includes(file)) turn.files.push(file)
      }
    }
  }
  return turns
}

function renderTurn(turn: Turn): string {
  const lines = [`**User:** ${clip(turn.prompt, PROMPT_CHARS)}`]
  // The last answer is the one that closed the turn; earlier ones were said on the way.
  const answer = turn.answers[turn.answers.length - 1]
  if (answer) lines.push(`**Claude:** ${clip(answer, ANSWER_CHARS)}`)
  if (turn.files.length) lines.push(`*Files changed:* ${turn.files.map((f) => `\`${f}\``).join(', ')}`)
  return lines.join('\n\n')
}

/**
 * The digest, in markdown, or null when no conversation has a prompt in it. Newest
 * conversation first; when the budget runs out, a conversation keeps its LAST turns,
 * where it ended up, and the older conversations are dropped.
 */
export function digestSessions(sessions: DigestSession[]): string | null {
  const chosen = [...sessions]
    .sort((a, b) => b.startedAt - a.startedAt)
    .map((s) => ({ ...s, turns: turnsOf(s.entries) }))
    .filter((s) => s.turns.length > 0)
    .slice(0, DIGEST_SESSIONS)
  if (chosen.length === 0) return null

  const header = [
    '# Earlier conversations of this session',
    '',
    `The ${chosen.length === 1 ? 'last conversation' : `last ${chosen.length} conversations`} held in this Magic Slash session before the current one, newest first. Prompts and Claude's final answers only; tool output is left out, and long messages are cut.`,
  ].join('\n')

  let budget = DIGEST_BUDGET - header.length
  const parts: string[] = []
  chosen.forEach((session, index) => {
    if (budget <= 0) return
    const date = new Date(session.startedAt).toISOString().slice(0, 16).replace('T', ' ')
    const heading = `## ${index + 1}. ${session.title ?? 'Untitled conversation'} (started ${date} UTC)`
    const rendered = session.turns.map(renderTurn)
    // From the end: the turns a conversation finished on are the ones worth keeping.
    const kept: string[] = []
    let size = heading.length
    for (let i = rendered.length - 1; i >= 0; i--) {
      if (size + rendered[i].length > budget && kept.length > 0) break
      kept.unshift(rendered[i])
      size += rendered[i].length + 2
    }
    const skipped = rendered.length - kept.length
    parts.push([heading, ...(skipped > 0 ? [`*(${skipped} earlier turn${skipped > 1 ? 's' : ''} left out)*`] : []), ...kept].join('\n\n'))
    budget -= size
  })

  return [header, ...parts].join('\n\n---\n\n') + '\n'
}
