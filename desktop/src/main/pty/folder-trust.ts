import { promises as fs } from 'fs'
import * as os from 'os'
import * as path from 'path'

/**
 * Whether Claude Code trusts a folder: the dialog it opens on its first run in an untrusted
 * one ("Do you trust the files in this folder?") is drawn by the TUI alone. No hook runs
 * before it is answered, so the chat view hears nothing and would sit empty in front of it.
 *
 * Claude Code records the answer in ~/.claude.json, as `projects[<dir>].hasTrustDialogAccepted`,
 * and a folder is trusted when it or any folder above it is. Read here, never written: the
 * answer stays the person's, given through the TUI (see `terminal:acceptTrust`).
 *
 * Null when the file cannot be read or parsed: unknown, and the chat then offers nothing.
 */
const CLAUDE_JSON = path.join(os.homedir(), '.claude.json')

export async function isFolderTrusted(dir: string): Promise<boolean | null> {
  let projects: Record<string, { hasTrustDialogAccepted?: unknown } | undefined>
  try {
    const parsed = JSON.parse(await fs.readFile(CLAUDE_JSON, 'utf-8')) as { projects?: unknown }
    projects = parsed.projects && typeof parsed.projects === 'object' ? (parsed.projects as typeof projects) : {}
  } catch {
    return null
  }
  let current = path.resolve(dir)
  for (;;) {
    if (projects[current]?.hasTrustDialogAccepted === true) return true
    const parent = path.dirname(current)
    if (parent === current) return false
    current = parent
  }
}
