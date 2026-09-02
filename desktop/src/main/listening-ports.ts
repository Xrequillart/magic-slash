import { execFile } from 'child_process'
import { promisify } from 'util'

const run = promisify(execFile)

/**
 * Which local ports are being listened on, and by whom.
 *
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------------
 * Reading URLs off a script's output (`src/server-url.ts`) finds every server it
 * starts — and every address it merely MENTIONS: the API it proxies to, an origin
 * it allows, a health check it waits on. Asking whether something answers on the
 * port was the obvious next filter, and it is not enough on its own: a stale
 * process from this morning's run, or another project's server, answers just as
 * readily as the one that was meant. That is how a card ended up offering :3002
 * while the API the script actually started, on :3000, was still booting and had
 * been written off three seconds in.
 *
 * So a port earns a card when it is listening AND at least one of:
 *
 *   • it is held by a process descended from the script's own shell — proof, not
 *     inference; or
 *   • nothing was listening on it when the script launched — which is what covers
 *     the servers a script starts at arm's length, in a container or a daemon it
 *     does not own.
 *
 * `lsof` rather than a TCP connect: it answers both questions at once, and the app
 * already shells out to it for a terminal's cwd (`pty/terminal-manager.ts`).
 */

/** Long enough for `lsof` on a busy machine, short enough not to pile up. */
const COMMAND_TIMEOUT_MS = 5000

/**
 * The ports in one `lsof -F pn` dump, optionally restricted to a set of pids.
 *
 * The format is one field per line, tagged by its first character: `p1234` opens a
 * process block, `n*:3000` names an address inside it. Anything else — the `f` file
 * descriptors, above all — is skipped rather than parsed, because that list grows a
 * new tag whenever lsof feels like it.
 *
 * Addresses come as `*:3000`, `127.0.0.1:3000` or `[::1]:3000`, so the port is what
 * follows the LAST colon. A `->` in the line means an established connection rather
 * than a listening socket; those are filtered out by the caller's `-sTCP:LISTEN`, and
 * ignored here too so a mistaken call cannot report someone else's outbound port.
 */
export function parseListeningPorts(output: string, pids?: ReadonlySet<number>): Set<number> {
  const ports = new Set<number>()
  let pid: number | null = null

  for (const line of output.split('\n')) {
    if (line.startsWith('p')) {
      pid = Number(line.slice(1))
      continue
    }
    if (!line.startsWith('n') || line.includes('->')) continue
    if (pids && (pid === null || !pids.has(pid))) continue

    const port = Number(line.slice(1).split(':').pop())
    if (Number.isInteger(port) && port > 0) ports.add(port)
  }

  return ports
}

/**
 * Every pid descended from `rootPid`, itself included.
 *
 * From `ps -Ao pid=,ppid=`, walked breadth-first. A script's server is never the
 * shell the PTY spawned: it is `pnpm` under that shell, `node` under that, and
 * whatever `concurrently` started under that — so nothing shallower than the whole
 * subtree answers the question "did THIS script open that port".
 */
export function parseProcessTree(output: string, rootPid: number): Set<number> {
  const children = new Map<number, number[]>()

  for (const line of output.split('\n')) {
    const [pid, ppid] = line.trim().split(/\s+/).map(Number)
    if (!Number.isInteger(pid) || !Number.isInteger(ppid)) continue
    children.set(ppid, [...(children.get(ppid) ?? []), pid])
  }

  const tree = new Set<number>([rootPid])
  const queue = [rootPid]

  while (queue.length > 0) {
    for (const child of children.get(queue.shift()!) ?? []) {
      if (tree.has(child)) continue // A cycle cannot happen, but a parse of one must not hang.
      tree.add(child)
      queue.push(child)
    }
  }

  return tree
}

async function lsof(): Promise<string> {
  const { stdout } = await run('lsof', ['-nP', '-iTCP', '-sTCP:LISTEN', '-F', 'pn'], {
    timeout: COMMAND_TIMEOUT_MS,
  })
  return stdout
}

/**
 * Every port currently being listened on, whoever owns it.
 *
 * An empty set when `lsof` is missing or fails — the callers treat "we could not
 * tell" as "no evidence", which costs a card rather than inventing one. Note that
 * lsof exits non-zero when it matches nothing, which is a legitimate answer and
 * lands here as the same empty set.
 */
export async function listeningPorts(): Promise<Set<number>> {
  try {
    return parseListeningPorts(await lsof())
  } catch {
    return new Set()
  }
}

/** Every port listened on by `rootPid` or one of its descendants. */
export async function listeningPortsOwnedBy(rootPid: number): Promise<Set<number>> {
  if (!Number.isInteger(rootPid) || rootPid <= 0) return new Set()

  try {
    const [tree, sockets] = await Promise.all([
      run('ps', ['-Ao', 'pid=,ppid='], { timeout: COMMAND_TIMEOUT_MS }),
      lsof(),
    ])
    return parseListeningPorts(sockets, parseProcessTree(tree.stdout, rootPid))
  } catch {
    return new Set()
  }
}
