import { execFile } from 'child_process'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { promisify } from 'util'
import type { ChatDiff } from '../../types'
import { toChatDiff } from './transcript'
import { attachCommandDiffs } from './transcript-watcher'

/**
 * WHAT A SHELL COMMAND CHANGED ON DISK, for the chat: Claude edits files with Python
 * scripts, `sed -i` and heredocs as often as with its Edit tool, and those leave nothing
 * in the transcript but the script itself. The Edit tool's diff card is built from the
 * patch Claude Code records; a command has none, so the change is measured instead.
 *
 * HOW: the agent's Bash hooks (see claude-hooks-config.ts) call the app before and after
 * the command. Before, the working tree is written as a git tree; after, again; the diff
 * between the two trees is exactly what the command did, whatever tool did it. The tree
 * is written through a THROWAWAY INDEX seeded from the real one, so `git add -A` hashes
 * only what changed since, the user's index and staging are never touched, and ignored
 * files stay out. The objects it writes are unreachable and go with the next `git gc`.
 *
 * The before-hook is synchronous on purpose: Claude Code waits for it, so the first
 * snapshot is taken before the command runs. Only a command that can write files is
 * measured (see `mayWriteFiles`), so `ls` or `git status` cost a curl and nothing more.
 *
 * Kept in memory, like the rest of the chat: a session read back after a restart shows
 * the commands without what they changed.
 */

const run = promisify(execFile)

/** A command that runs a script interpreter or an in-place editor, or redirects into a file. */
const WRITERS = /(?:^|[\s;&|(`$])(?:python[\d.]*|perl|ruby|node|deno|bun|sed|awk|gawk|patch|tee|truncate)\b/
const REDIRECT = /(?:^|[^<>&\d])>{1,2}\s*(?!&|\/dev\/null)\S/

export function mayWriteFiles(command: string): boolean {
  return WRITERS.test(command) || REDIRECT.test(command)
}

interface Snapshot {
  root: string
  tree: string
}

/** Before-snapshots by tool use, until their command ends. Bounded: a command that fails fires no after-hook. */
const pending = new Map<string, Snapshot>()
const MAX_PENDING = 32

let indexCounter = 0

async function git(cwd: string, args: string[], env?: Record<string, string>): Promise<string> {
  const { stdout } = await run('git', ['-c', 'core.quotePath=false', ...args], {
    cwd,
    env: env ? { ...process.env, ...env } : process.env,
    maxBuffer: 32 * 1024 * 1024,
    timeout: 10_000,
  })
  return stdout
}

/** The working tree under `cwd`, as a git tree, or null outside a repository. */
async function snapshot(cwd: string): Promise<Snapshot | null> {
  let tmp: string | null = null
  try {
    const [root, indexPath] = (await git(cwd, ['rev-parse', '--show-toplevel', '--git-path', 'index'])).trim().split('\n')
    if (!root || !indexPath) return null
    tmp = path.join(os.tmpdir(), `magic-slash-snapshot-${process.pid}-${indexCounter++}.idx`)
    // Seeded from the real index, so only what changed since is hashed. A repository
    // with no index yet starts from nothing, which is right.
    try {
      fs.copyFileSync(path.resolve(cwd, indexPath), tmp)
    } catch {
      // No index yet.
    }
    const env = { GIT_INDEX_FILE: tmp }
    await git(root, ['add', '-A'], env)
    const tree = (await git(root, ['write-tree'], env)).trim()
    return tree ? { root, tree } : null
  } catch {
    return null
  } finally {
    if (tmp) fs.rmSync(tmp, { force: true })
  }
}

type HookPayload = { tool_use_id?: unknown; cwd?: unknown; tool_input?: { command?: unknown } }

function parse(body: string): { id: string; cwd: string; command: string } | null {
  let payload: HookPayload
  try {
    payload = JSON.parse(body)
  } catch {
    return null
  }
  const id = payload?.tool_use_id
  const cwd = payload?.cwd
  const command = payload?.tool_input?.command
  if (typeof id !== 'string' || typeof cwd !== 'string' || typeof command !== 'string') return null
  return { id, cwd, command }
}

/** The Bash PreToolUse hook. Resolves once the tree is written: the command waits on it. */
export async function commandStarting(body: string): Promise<void> {
  const call = parse(body)
  if (!call || !mayWriteFiles(call.command)) return
  const before = await snapshot(call.cwd)
  if (!before) return
  pending.set(call.id, before)
  while (pending.size > MAX_PENDING) pending.delete(pending.keys().next().value!)
}

/** The Bash PostToolUse hook: what changed since `commandStarting`, onto the chat's entry. */
export async function commandEnded(terminalId: string, body: string): Promise<void> {
  const call = parse(body)
  if (!call) return
  const before = pending.get(call.id)
  if (!before) return
  pending.delete(call.id)
  const after = await snapshot(before.root)
  if (!after || after.tree === before.tree) return
  try {
    const out = await git(before.root, ['diff', '--no-color', '--no-ext-diff', '--no-renames', '-U3', before.tree, after.tree])
    const diffs = parseUnifiedDiff(out, before.root)
    if (diffs.length) attachCommandDiffs(terminalId, call.id, diffs)
  } catch {
    // A diff that cannot be read is a command shown without one, as before.
  }
}

/**
 * `git diff` output as one `ChatDiff` per file, paths made absolute under `root` like
 * the Edit tool's. Binary files have no hunks and are left out.
 */
export function parseUnifiedDiff(text: string, root: string): ChatDiff[] {
  const files: { path: string; hunks: ChatDiff['hunks'] }[] = []
  let file: (typeof files)[number] | null = null
  let hunk: ChatDiff['hunks'][number] | null = null
  let oldPath: string | null = null

  for (const line of text.split('\n')) {
    if (line.startsWith('diff --git ')) {
      file = null
      hunk = null
      oldPath = null
    } else if (hunk && (line.startsWith(' ') || line.startsWith('+') || line.startsWith('-'))) {
      // Before the headers: a removed line reading `-- x` is `--- x` here, and is content.
      hunk.lines.push(line)
    } else if (line.startsWith('--- ')) {
      oldPath = stripPrefix(line.slice(4))
    } else if (line.startsWith('+++ ')) {
      const newPath = stripPrefix(line.slice(4))
      const rel = newPath ?? oldPath
      if (rel) {
        file = { path: path.join(root, rel), hunks: [] }
        files.push(file)
      }
    } else if (line.startsWith('@@') && file) {
      const m = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line)
      if (!m) continue
      hunk = { oldStart: Number(m[1]), newStart: Number(m[2]), lines: [] }
      file.hunks.push(hunk)
    }
  }
  return files
    .map((f) => toChatDiff(f.path, f.hunks))
    .filter((d): d is ChatDiff => d !== null)
}

/** `a/src/x.ts` → `src/x.ts`; `/dev/null` → null. Quoted paths lose their quotes. */
function stripPrefix(raw: string): string | null {
  const p = raw.trim().replace(/^"(.*)"$/, '$1')
  if (p === '/dev/null') return null
  return p.replace(/^[ab]\//, '')
}
