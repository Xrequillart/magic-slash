import * as fs from 'fs'
import * as path from 'path'
import { createHash } from 'crypto'
import type { PlanSpecInput, PlanTicket } from '../../types'
import { readAgents } from '../config/agents'
import { readConfig } from '../config/config'
import { loadSession } from '../cloud/session-store'
import { enqueue } from './outbox'
import { getStore } from './Store'

/**
 * The one uploader of `/magic:plan` spec content.
 *
 * WHY THE MAIN PROCESS OWNS THIS
 * ---------------------------------------------------------------------------
 * The skill could POST its own spec — it has the file open — and that is exactly
 * what this module exists to avoid. A skill that talks to Supabase needs a token in
 * a shell, retries a network call from inside a Claude Code turn, and sends the
 * markdown down a command line. So the skill only ever PINGS (`GET /plan/spec`), and
 * every decision about what leaves the machine is made here: whether the user allows
 * it, which row it belongs to, and what to do when the backend is unreachable.
 *
 * THE PATH IS HASHED, THE PATH IS NOT SENT
 * ---------------------------------------------------------------------------
 * A session's identity is `sha256(absolute spec path)`. The row is readable by the
 * whole organization and an absolute path carries the author's home directory — a
 * name, sometimes a client's name. The hash is stable across launches, which is all
 * the upsert needs; nothing ever reads it back into a path.
 *
 * COALESCED, NEVER PER KEYSTROKE
 * ---------------------------------------------------------------------------
 * The spec is written progressively — one edit per section, several within a few
 * seconds — and each of those edits pings. One upload per ping would mean a dozen
 * round trips carrying almost the same document, so pings inside the debounce window
 * collapse into a single upsert of the file as it stands when the timer fires. The
 * file is read at THAT moment, not at ping time: last write wins, always.
 */

/** How long a burst of pings is allowed to collapse into one upload. */
const DEBOUNCE_MS = 3000

/**
 * The largest spec this module will upload.
 *
 * A spec is "a few tens of KB of markdown" — that is the sizing the `text` column was
 * chosen on. The ceiling is not there to be reached: it is there so that whatever ends
 * up behind `specPath` cannot be streamed into an org-readable row wholesale. A spec
 * that grows past it stops syncing rather than uploading a truncated half, which would
 * read as complete to anyone opening the page.
 */
const MAX_SPEC_BYTES = 1024 * 1024

/**
 * Whether a path is shaped like a spec this app wrote.
 *
 * NOT paranoia about the skill — about everything else on the machine. `specPath`
 * arrives over `GET /metadata?specPath=`, on a loopback server whose port sits in a
 * world-readable file, and it is then read verbatim and uploaded into a table the whole
 * organization can select from. Without this check any local process could point the
 * uploader at `~/.ssh/id_rsa` or a customer export and have its contents published to
 * the user's colleagues. The skill's own naming (`references/spec-template.md`) is the
 * whitelist: an absolute path, inside a `.magic` directory, named `spec-*.md`.
 *
 * Rejecting is silent and total — no upload, no outbox entry, no row.
 */
function isSpecPath(specPath: string): boolean {
  if (!path.isAbsolute(specPath)) return false
  const normalized = path.normalize(specPath)
  if (path.basename(path.dirname(normalized)) !== '.magic') return false
  const name = path.basename(normalized)
  return name.startsWith('spec-') && name.endsWith('.md') && name.length > 'spec-.md'.length
}

/**
 * One scheduled upload. Keyed by spec path, because that is what identifies the row —
 * two agents pinging about the same spec are one session, and one agent may plan
 * twice (the spec filename carries a timestamp, so those are two).
 */
interface PendingUpload {
  agentId: string
  specPath: string
  /**
   * Whether a spec file that is not there yet cancels the upload.
   *
   * FALSE for the session-creation path: the agent announced where its spec WILL be,
   * and recording that is the whole point — a plan whose agent is closed before any
   * spec is written is still a plan that happened. TRUE for a spec ping, where a
   * missing file means there is nothing to send.
   */
  requireSpecFile: boolean
}

const timers = new Map<string, ReturnType<typeof setTimeout>>()
const pending = new Map<string, PendingUpload>()
const inFlight = new Set<string>()
const queued = new Set<string>()

/** `spec_key`: sha256 of the spec's ABSOLUTE path. See the header. */
export function specKeyFor(specPath: string): string {
  return createHash('sha256').update(specPath).digest('hex')
}

/**
 * The session's human-readable name: the spec's filename without the `spec-` prefix
 * the template mandates and without the `.md` suffix. Keeps the timestamp — planning
 * the same idea twice yields the same slug otherwise, and those are two sessions.
 */
export function slugFor(specPath: string): string {
  return path.basename(specPath).replace(/\.md$/, '').replace(/^spec-/, '')
}

/**
 * The body of the spec's `## Idea` section, or undefined when there is none.
 *
 * Cheap to extract and worth having on the row: it is the one section written BEFORE
 * any exploration (see `skills/magic-plan/references/spec-template.md`), so it is
 * present even on a spec that was abandoned three sections in — which is precisely
 * the session a list needs a summary for.
 *
 * The headings are frozen English by that same template, so matching on `## Idea` is
 * a contract rather than a guess.
 */
export function ideaFrom(markdown: string): string | undefined {
  const lines = markdown.split('\n')
  const start = lines.findIndex((line) => /^##[ \t]+Idea[ \t]*\r?$/.test(line))
  if (start === -1) return undefined
  // Stops at the next heading of ANY level: `### Non-goals` belongs to the section
  // that declares it, not to the idea.
  const rest = lines.slice(start + 1)
  const end = rest.findIndex((line) => /^#{1,6}[ \t]/.test(line))
  const body = (end === -1 ? rest : rest.slice(0, end)).join('\n').trim()
  return body === '' ? undefined : body
}

/**
 * The spec markdown, or undefined when the file is not there (yet, or any more).
 *
 * Never throws: this runs behind a hook ping, and a spec that was moved or deleted
 * mid-session is an ordinary thing that must not surface as an error anywhere.
 */
function readSpec(specPath: string): string | undefined {
  try {
    // stat before read: the point of the ceiling is to not pull the bytes in at all.
    if (fs.statSync(specPath).size > MAX_SPEC_BYTES) return undefined
    return fs.readFileSync(specPath, 'utf-8')
  } catch {
    return undefined
  }
}

/** Whether the user allows plan sessions to leave the machine (absent = yes). */
function syncEnabled(): boolean {
  return readConfig().planSyncEnabled !== false
}

/**
 * Arm (or join) the debounce for one spec.
 *
 * The FIRST ping owns the timer, like scheduleRemoteRefresh: later pings inside the
 * window update what will be sent but do not push the deadline out, so a spec being
 * written section by section is uploaded on a steady cadence instead of only once the
 * writing stops.
 */
function schedule(upload: PendingUpload): void {
  // The choke point for the three scheduling entry points (ping, session creation,
  // reconcile). Anything not shaped like a spec this app wrote never gets a timer,
  // a row, or an outbox entry.
  if (!isSpecPath(upload.specPath)) return

  const key = upload.specPath
  const previous = pending.get(key)
  pending.set(key, {
    ...upload,
    // A session-creation job that lands in the same window as a spec ping keeps its
    // right to create the row: the file may still be missing, and the row is what
    // the ping was going to hang off anyway.
    requireSpecFile: (previous?.requireSpecFile ?? true) && upload.requireSpecFile,
  })

  if (timers.has(key)) return
  const timer = setTimeout(() => {
    timers.delete(key)
    void run(key)
  }, DEBOUNCE_MS)
  // Never a reason for the process to stay alive: a pending upload is worth less
  // than a quit, and the outbox picks up whatever the quit dropped.
  timer.unref?.()
  timers.set(key, timer)
}

/** Send the pending upload for one spec, then re-arm if a ping arrived mid-flight. */
async function run(key: string): Promise<void> {
  // A second pass alongside the first would upsert the same row twice for nothing.
  // Remember that one is wanted and re-arm once this one is done.
  if (inFlight.has(key)) {
    queued.add(key)
    return
  }
  const upload = pending.get(key)
  if (!upload) return

  inFlight.add(key)
  try {
    await send(upload)
  } finally {
    inFlight.delete(key)
    // Re-arm for the ping that arrived mid-flight, or forget this spec entirely: a
    // long-lived app plans many times, and nothing here is worth keeping once it is
    // sent.
    if (queued.delete(key)) schedule(upload)
    else pending.delete(key)
  }
}

/**
 * Read the file and upsert the row. Queues the upload to the outbox when the write
 * fails, so an offline session is uploaded on the next connectivity tick.
 */
async function send(upload: PendingUpload): Promise<void> {
  if (!syncEnabled()) return

  const spec = readSpec(upload.specPath)
  if (spec === undefined && upload.requireSpecFile) return

  const input: PlanSpecInput = { agentId: upload.agentId, specPath: upload.specPath, ...(spec !== undefined ? { spec } : {}) }
  try {
    await getStore().savePlanSpec(input)
  } catch (error) {
    console.error('[plan-sync] Queued a spec upload after a failed write:', error)
    // The PATH, never the markdown: see the outbox header for what a queue full of
    // documents does to the telemetry it shares a file with. Re-reading the file at
    // replay is also the semantics this wants — the spec as it stands, not as it was.
    enqueue({
      kind: 'planSpec',
      payload: { specPath: upload.specPath, agentId: upload.agentId, uid: loadSession()?.user?.id ?? '' },
    })
  }
}

/**
 * A spec was (re)written: upload it, coalesced. Fired by `GET /plan/spec`.
 *
 * A missing file is a no-op — the skill announces its spec path before creating the
 * file, so a ping can legitimately arrive first.
 */
export function schedulePlanSpecUpload(agentId: string, specPath: string): void {
  schedule({ agentId, specPath, requireSpecFile: true })
}

/**
 * An agent announced where its spec will be: make sure the session exists.
 *
 * This is what records a plan whose agent was closed before the spec was ever
 * written — the row is created with `spec` null and filled in later, rather than
 * appearing only once there is content to put in it.
 */
export function recordPlanSession(agentId: string, specPath: string): void {
  schedule({ agentId, specPath, requireSpecFile: false })
}

/**
 * Upload this spec NOW, dropping any pending debounce for it. Fired at session end.
 *
 * Must run BEFORE archiveAgent: that releases `app_agent_id`, after which the app id
 * no longer resolves to the agent row and the session loses its author link.
 */
export function flushPlanSpec(agentId: string, specPath: string): void {
  // Checked here too: this one bypasses `schedule` to skip the debounce.
  if (!isSpecPath(specPath)) return

  const timer = timers.get(specPath)
  if (timer) {
    clearTimeout(timer)
    timers.delete(specPath)
  }
  // The pending job wins when there is one: it may be a session-creation job, which
  // must still create the row for a spec file that was never written.
  const upload = pending.get(specPath) ?? { agentId, specPath, requireSpecFile: false }
  pending.set(specPath, upload)
  void run(specPath)
}

/**
 * Record the tickets a planning session created. Fired by `GET /plan/tickets`.
 *
 * Not debounced and not spooled: this happens once, at the end of the session, and
 * the tickets exist in the tracker whether or not the row records them.
 */
export async function syncPlanTickets(agentId: string, specPath: string, tickets: PlanTicket[]): Promise<void> {
  if (!syncEnabled()) return
  // No file is read here, but the path still decides which row the tickets land on —
  // and creates it when it does not exist. Same whitelist, same reason.
  if (!isSpecPath(specPath)) return
  if (tickets.length === 0) return
  try {
    await getStore().savePlanTickets({ agentId, specPath, tickets })
  } catch (error) {
    console.error('[plan-sync] Failed to record the plan tickets:', error)
  }
}

/**
 * Upload every spec whose file is newer than the row that holds it.
 *
 * Runs once per launch, behind the connectivity gate: the ordinary way a spec write
 * goes missing is the app being offline or shut down when the ping came in, and
 * neither leaves anything behind to retry (the ping is fire-and-forget by design).
 *
 * Compared against `spec_synced_at`, NOT `updated_at`: the org-derivation trigger
 * bumps `updated_at` whenever the repository is shared or deleted, which would make
 * the row look newer than a spec that really did change.
 */
export async function reconcilePlanSpecs(): Promise<void> {
  if (!syncEnabled()) return

  const planned = readAgents().flatMap((agent) =>
    agent.metadata?.specPath ? [{ id: agent.id, specPath: agent.metadata.specPath }] : [],
  )
  if (planned.length === 0) return

  try {
    const syncedAt = new Map(
      (await getStore().loadPlanSyncState()).map((row) => [row.specKey, row.specSyncedAt]),
    )

    for (const { id, specPath } of planned) {
      let mtimeMs: number
      try {
        mtimeMs = fs.statSync(specPath).mtimeMs
      } catch {
        // The spec is gone (a cleaned worktree, a moved repository). Nothing to
        // upload, and nothing to repair — the row keeps what it last received.
        continue
      }
      const synced = syncedAt.get(specKeyFor(specPath))
      if (synced && Date.parse(synced) >= mtimeMs) continue
      schedulePlanSpecUpload(id, specPath)
    }
  } catch (error) {
    console.error('[plan-sync] Reconcile failed:', error)
  }
}

/** Test seam: forget every pending upload so one case cannot leak into the next. */
export function resetPlanSyncForTests(): void {
  for (const timer of timers.values()) clearTimeout(timer)
  timers.clear()
  pending.clear()
  inFlight.clear()
  queued.clear()
}
