import * as fs from 'fs'
import * as path from 'path'
import type { ClaudeSessionRef } from '../../types'

/**
 * Claude Code sessions, as the app keeps track of them: the file each one writes, which
 * `claude --resume` can pick up again.
 *
 * Claude Code files a session under `~/.claude/projects/<cwd with every non-alphanumeric
 * turned into ->/<session id>.jsonl`, and `--resume` only looks in the folder of the
 * directory it runs in. So resuming a session takes its id AND the directory it was
 * started in — which the file's folder names, in a form that cannot be decoded (`/` and
 * `.` both became `-`), only matched.
 */

/** How many sessions an agent remembers. The oldest goes first. */
export const MAX_AGENT_SESSIONS = 50

const SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * The session id a transcript's file name carries, or null when it is not one. The path
 * came through the cloud and its name ends up on a command line: quoted there too, but
 * refused here first.
 */
export function sessionIdOf(transcriptPath: string): string | null {
  const id = path.basename(transcriptPath, '.jsonl')
  return SESSION_ID.test(id) ? id : null
}

/** The first of `candidates` whose sessions are filed in the transcript's folder. */
export function cwdForTranscript(transcriptPath: string, candidates: string[]): string | null {
  const folder = path.basename(path.dirname(transcriptPath))
  return candidates.find((cwd) => cwd.replace(/[^a-zA-Z0-9]/g, '-') === folder) ?? null
}

/**
 * The Claude Code session an agent restored at launch can pick up again, or null when it
 * must start fresh. Three reasons to say no, all of them ordinary:
 *
 *   - THE FILE IS NOT HERE. Agents live in Supabase, transcripts on the machine that
 *     wrote them: an agent opened on a second Mac has nothing to resume there. A
 *     session nobody has spoken to yet has no file either, and nothing to lose.
 *   - IT BELONGS TO ANOTHER DIRECTORY. Resuming from elsewhere fails, Claude Code exits,
 *     and the crash restart lands on a fresh one anyway, by way of an error screen.
 *   - THE NAME IS NOT A SESSION ID. See `sessionIdOf`.
 */
export function resumableSessionId(transcriptPath: string | undefined, cwd: string): string | null {
  if (!transcriptPath) return null
  const id = sessionIdOf(transcriptPath)
  if (!id || !cwdForTranscript(transcriptPath, [cwd])) return null
  return fs.existsSync(transcriptPath) ? id : null
}

/**
 * The agent's session list with `transcriptPath` added, or null when it is already there
 * — so a caller persists only what changed.
 */
export function withSession(
  sessions: ClaudeSessionRef[] | undefined,
  transcriptPath: string,
  now: number,
): ClaudeSessionRef[] | null {
  const list = sessions ?? []
  if (list.some((s) => s.transcriptPath === transcriptPath)) return null
  return [...list, { transcriptPath, startedAt: now }].slice(-MAX_AGENT_SESSIONS)
}

/**
 * What to call a session in a list: the title the user gave it (`/rename`), else the one
 * Claude Code generated, else the last prompt typed into it. The LAST of each kind wins,
 * since both titles are rewritten as the conversation goes. Undefined when the file holds
 * none of them, or cannot be read.
 */
export async function readSessionTitle(transcriptPath: string): Promise<string | undefined> {
  let content: string
  try {
    content = await fs.promises.readFile(transcriptPath, 'utf8')
  } catch {
    return undefined
  }
  let custom: string | undefined
  let ai: string | undefined
  let prompt: string | undefined
  for (const line of content.split('\n')) {
    // Cheap filter first: these files run to megabytes of assistant turns.
    if (!line.includes('-title"') && !line.includes('"last-prompt"')) continue
    try {
      const entry = JSON.parse(line) as { type?: string; customTitle?: unknown; aiTitle?: unknown; lastPrompt?: unknown }
      if (entry.type === 'custom-title' && typeof entry.customTitle === 'string') custom = entry.customTitle
      else if (entry.type === 'ai-title' && typeof entry.aiTitle === 'string') ai = entry.aiTitle
      else if (entry.type === 'last-prompt' && typeof entry.lastPrompt === 'string') prompt = entry.lastPrompt
    } catch {
      // A line cut short by a write in progress.
    }
  }
  return (custom || ai || prompt)?.trim() || undefined
}
