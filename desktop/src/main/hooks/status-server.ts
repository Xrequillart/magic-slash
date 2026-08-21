import * as http from 'http'
import * as fs from 'fs'
import * as path from 'path'
import { URL } from 'url'
import { CONFIG_DIR } from '../config/paths'
import type { PlanTicket, TerminalUsage } from '../../types'

/**
 * Where the running server publishes its port.
 *
 * The port is ephemeral (listen(0)), and the MAGIC_SLASH_PORT env var only
 * reaches PTYs the app spawned itself — a Claude Code started from an external
 * terminal never inherits it. Publishing the port to a well-known file lets any
 * local process find the server, so hooks keep working outside the app.
 *
 * Per-instance (CONFIG_DIR, not the stable dir): one shared file means the last app
 * started wins it, and every session's hooks then report into that one.
 */
const PORT_FILE = path.join(CONFIG_DIR, 'port')

function publishPort(port: number): void {
  try {
    fs.mkdirSync(path.dirname(PORT_FILE), { recursive: true })
    fs.writeFileSync(PORT_FILE, String(port), { encoding: 'utf-8', mode: 0o600 })
  } catch (error) {
    // Non-fatal: in-app terminals still get the port through the environment.
    console.error('[StatusServer] Failed to publish port file:', error)
  }
}

function unpublishPort(): void {
  try {
    // Remove the file only when it still names OUR port. `server` being set is not
    // enough to prove we own it: the test suite starts and stops a real server on a
    // random port, and an unconditional rmSync there deletes the port file of the
    // installed app that is actually serving — the app then looks unreachable to
    // every out-of-app skill until its next launch. Same reasoning for two app
    // instances handing over: the outgoing one must not remove the incoming one's file.
    if (fs.readFileSync(PORT_FILE, 'utf-8').trim() !== String(serverPort)) return
    fs.rmSync(PORT_FILE, { force: true })
  } catch {
    // Unreadable or already gone: nothing of ours to remove. A leftover file is
    // harmless anyway — callers just get a connection refused.
  }
}

type StateCallback = (terminalId: string, state: string) => void
type MetadataCallback = (terminalId: string, metadata: Record<string, string | string[] | Record<string, { prUrl?: string }>>) => void
type CommandStartCallback = (terminalId: string, command: string) => void
type CommandEndCallback = (terminalId: string, exitCode: number) => void
type RepositoriesCallback = (terminalId: string, repositories: string[]) => void
type UsageCallback = (terminalId: string, usage: TerminalUsage) => void
/**
 * A question hook fired: `body` is the raw hook payload from stdin, forwarded
 * unparsed so the parsing (and its failure modes) live with the question store.
 */
type QuestionCallback = (terminalId: string, body: string) => void
/** The agent is no longer blocked — see the clear hooks in claude-hooks-config. */
type ClearQuestionCallback = (terminalId: string) => void
/** terminalId is undefined for sessions started outside the app (no agent). */
type SkillCallback = (terminalId: string | undefined, skill: string) => void
// Read-back providers: unlike the callbacks above (terminal → app writes), these let a
// terminal-run skill READ from the app's in-memory caches (hydrated from the cloud store).
// Loosely typed on purpose — the values are just JSON-serialized to the response.
type ConfigProvider = () => unknown
type AgentProvider = (terminalId: string) => unknown
/**
 * `path` is the working directory the skill is in (a repo or one of its
 * worktrees) and is the reliable identifier; `repo` is the legacy name, kept for
 * skills that have not been updated.
 */
type WorktreeFilesWriter = (files: string[], path: string | null, repo: string | null) => void
/**
 * A PR URL was attached to a repository for the first time.
 *
 * `/metadata?prUrl=&prRepo=` is the ONLY place a `prUrl` is ever written, and it
 * is `/magic:pr` that calls it. Without this signal the PR review card stays
 * empty until the watcher's next scheduled tick — up to a full poll interval
 * after the PR was created, which is exactly when the user is looking at it.
 *
 * Registered by the watcher itself (`pr-review-watcher/watcher.ts`), not by
 * `main/index.ts`: this module must stay importable without Electron.
 */
type PRUrlCallback = (terminalId: string, repoPath: string, prUrl: string) => void
/**
 * An agent announced where its spec file will be, for the first time.
 *
 * Same shape and same reason as PRUrlCallback: `/metadata?specPath=` is the only
 * place a spec path is ever written, and the app has work to do the moment it
 * arrives — the plan session is recorded from here, which is what makes a plan
 * survive an agent closed before its spec was ever written.
 */
type SpecPathCallback = (terminalId: string, specPath: string) => void
/**
 * The agent wrote (or rewrote) its spec. Carries no path and no content: the app
 * already knows where the spec is, and the whole point of this design is that the
 * spec's text never travels over a command line.
 */
type PlanSpecCallback = (terminalId: string) => void
/** The planning session created its tickets. Parsed from the request's JSON array. */
type PlanTicketsCallback = (terminalId: string, tickets: PlanTicket[]) => void

let server: http.Server | null = null
let serverPort: number = 0
let stateCallback: StateCallback | null = null
let metadataCallback: MetadataCallback | null = null
let commandStartCallback: CommandStartCallback | null = null
let commandEndCallback: CommandEndCallback | null = null
let repositoriesCallback: RepositoriesCallback | null = null
let usageCallback: UsageCallback | null = null
let questionCallback: QuestionCallback | null = null
let clearQuestionCallback: ClearQuestionCallback | null = null
let skillCallback: SkillCallback | null = null
let configProvider: ConfigProvider | null = null
let agentProvider: AgentProvider | null = null
let worktreeFilesWriter: WorktreeFilesWriter | null = null
let prUrlCallback: PRUrlCallback | null = null
let specPathCallback: SpecPathCallback | null = null
let planSpecCallback: PlanSpecCallback | null = null
let planTicketsCallback: PlanTicketsCallback | null = null
/**
 * Last PR URL seen per `terminalId:repoPath`, so the callback only fires on a
 * NEW one. `/magic:pr` re-sends the same metadata on later runs, and a tick per
 * repeat would be a free GraphQL query per repeat.
 */
const lastSeenPRUrls = new Map<string, string>()
/**
 * Last spec path seen per terminal, for the same reason: `/magic:plan` re-sends its
 * title on every later metadata write, and a path it already announced is not news.
 */
const lastSeenSpecPaths = new Map<string, string>()

export function getServerPort(): number {
  return serverPort
}

export function setStateCallback(callback: StateCallback) {
  stateCallback = callback
}

export function setMetadataCallback(callback: MetadataCallback) {
  metadataCallback = callback
}

export function setPRUrlCallback(callback: PRUrlCallback) {
  prUrlCallback = callback
}

export function setSpecPathCallback(callback: SpecPathCallback) {
  specPathCallback = callback
}

export function setPlanSpecCallback(callback: PlanSpecCallback) {
  planSpecCallback = callback
}

export function setPlanTicketsCallback(callback: PlanTicketsCallback) {
  planTicketsCallback = callback
}

export function setCommandStartCallback(callback: CommandStartCallback) {
  commandStartCallback = callback
}

export function setCommandEndCallback(callback: CommandEndCallback) {
  commandEndCallback = callback
}

export function setRepositoriesCallback(callback: RepositoriesCallback) {
  repositoriesCallback = callback
}

export function setUsageCallback(callback: UsageCallback) {
  usageCallback = callback
}

export function setQuestionCallback(callback: QuestionCallback) {
  questionCallback = callback
}

export function setClearQuestionCallback(callback: ClearQuestionCallback) {
  clearQuestionCallback = callback
}

export function setSkillCallback(callback: SkillCallback) {
  skillCallback = callback
}

export function setConfigProvider(provider: ConfigProvider) {
  configProvider = provider
}

export function setAgentProvider(provider: AgentProvider) {
  agentProvider = provider
}

export function setWorktreeFilesWriter(writer: WorktreeFilesWriter) {
  worktreeFilesWriter = writer
}

// Read the full request body (used by the POST /usage and POST /question routes)
function readRequestBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    const MAX_BODY = 256 * 1024 // guard against runaway payloads
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY) {
        reject(new Error('Body too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
    req.on('error', reject)
  })
}

// Parse the Claude Code statusLine JSON payload into a TerminalUsage object.
// Field names come from the statusLine stdin schema (context_window.*, cost.*, model.*).
// Exported for unit testing.
export function parseStatusLinePayload(body: string): TerminalUsage {
  const data = JSON.parse(body)
  const ctx = data?.context_window ?? {}
  const cost = data?.cost ?? {}
  const rateLimits = data?.rate_limits ?? {}
  const fiveHour = rateLimits?.five_hour ?? {}
  const sevenDay = rateLimits?.seven_day ?? {}
  const numOrUndef = (v: unknown): number | undefined => (typeof v === 'number' ? v : undefined)

  const contextWindowSize = typeof ctx.context_window_size === 'number' ? ctx.context_window_size : undefined
  const contextPercent = typeof ctx.used_percentage === 'number' ? ctx.used_percentage : undefined
  // Prefer the exact token count from the statusline. Deriving from used_percentage loses
  // precision (a rounded percentage on a 1M-token window jumps in 10k-token steps), so we only
  // fall back to the percentage estimate when the exact count is unavailable.
  let contextTokens: number | undefined
  if (typeof ctx.total_input_tokens === 'number') {
    contextTokens = ctx.total_input_tokens
  } else if (contextPercent !== undefined && contextWindowSize !== undefined) {
    contextTokens = Math.round((contextPercent / 100) * contextWindowSize)
  }

  return {
    costUsd: typeof cost.total_cost_usd === 'number' ? cost.total_cost_usd : undefined,
    contextPercent,
    contextTokens,
    contextWindowSize,
    model: typeof data?.model?.display_name === 'string' ? data.model.display_name : undefined,
    modelId: typeof data?.model?.id === 'string' ? data.model.id : undefined,
    durationMs: typeof cost.total_duration_ms === 'number' ? cost.total_duration_ms : undefined,
    linesAdded: typeof cost.total_lines_added === 'number' ? cost.total_lines_added : undefined,
    linesRemoved: typeof cost.total_lines_removed === 'number' ? cost.total_lines_removed : undefined,
    fiveHourPercent: numOrUndef(fiveHour.used_percentage),
    fiveHourResetsAt: numOrUndef(fiveHour.resets_at),
    sevenDayPercent: numOrUndef(sevenDay.used_percentage),
    sevenDayResetsAt: numOrUndef(sevenDay.resets_at),
  }
}

/**
 * Parse the `tickets` query parameter of `GET /plan/tickets` — a JSON array, sent
 * URI-encoded exactly once by the caller.
 *
 * THE WIRE SHAPE, which `/magic:plan` builds with `jq` (see its `references/api.md`):
 *   `[{ "key": "#412", "url": "https://…", "title": "Add SSO", "kind": "epic", "parent_key": null },
 *     { "key": "#413", "url": "https://…", "title": "…", "kind": "story", "parent_key": "#412" }]`
 *
 * `parent_key` is snake_case because that is the column it lands in and what the
 * skill documents; `parentKey` is accepted too, so neither side has to be right about
 * the other's convention. `title` and the parent may be null, which reads as absent.
 *
 * Entries that are not well formed are DROPPED rather than repaired: `key`, `url` and
 * `kind` are what the row is made of, and a ticket labelled neither epic nor story
 * would land in the database as a hierarchy nobody can render. A malformed entry next
 * to good ones must not take them down with it, hence per-entry filtering rather than
 * rejecting the batch. Exported for unit testing.
 */
export function parsePlanTickets(raw: string): PlanTicket[] {
  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed)) return []

  return parsed.flatMap((entry): PlanTicket[] => {
    if (!entry || typeof entry !== 'object') return []
    const record = entry as Record<string, unknown>
    const { key, url, title, kind } = record
    const parentKey = record.parent_key ?? record.parentKey
    if (typeof key !== 'string' || key === '') return []
    if (typeof url !== 'string' || url === '') return []
    if (kind !== 'epic' && kind !== 'story') return []
    return [{
      key,
      url,
      kind,
      ...(typeof title === 'string' && title !== '' ? { title } : {}),
      ...(typeof parentKey === 'string' && parentKey !== '' ? { parentKey } : {}),
    }]
  })
}

export function startStatusServer(): Promise<number> {
  return new Promise((resolve, reject) => {
    server = http.createServer((req, res) => {
      // No CORS headers — server is called from shell hooks (curl), not browsers

      if (!req.url) {
        res.writeHead(400)
        res.end('Bad request')
        return
      }

      try {
        const url = new URL(req.url, `http://localhost:${serverPort}`)

        if (url.pathname === '/usage') {
          // Statusline usage report — carries cost/context/model as a raw JSON body (POST).
          const terminalId = url.searchParams.get('id')

          // Ignore sidebar terminals (VS Code extension)
          if (terminalId?.startsWith('sidebar-')) {
            res.writeHead(200)
            res.end('OK')
            return
          }

          readRequestBody(req)
            .then((body) => {
              if (terminalId && body && usageCallback) {
                try {
                  const usage = parseStatusLinePayload(body)
                  usage.updatedAt = Date.now()
                  usageCallback(terminalId, usage)
                } catch (e) {
                  console.error('[Usage] Failed to parse statusline payload:', e)
                }
              }
              res.writeHead(200)
              res.end('OK')
            })
            .catch(() => {
              res.writeHead(200)
              res.end('OK')
            })
          return
        } else if (url.pathname === '/question') {
          // An agent is blocked on a question — the hook POSTs its stdin payload
          // verbatim (AskUserQuestion tool input, or a Notification message).
          //
          // Never fails loudly: a hook that errors or hangs would stall the agent
          // it is reporting on, so every path here answers 200 and the parsing
          // happens behind the callback.
          const terminalId = url.searchParams.get('id')

          // Ignore sidebar terminals (VS Code extension)
          if (terminalId?.startsWith('sidebar-')) {
            res.writeHead(200)
            res.end('OK')
            return
          }

          // `.finally` rather than a 200 in each branch: "every path answers 200" is
          // the rule here, so it is written once instead of relying on three copies.
          readRequestBody(req)
            .then((body) => {
              if (terminalId && body) questionCallback?.(terminalId, body)
            })
            .catch((e) => {
              console.error('[Questions] Failed to handle question payload:', e)
            })
            .finally(() => {
              res.writeHead(200)
              res.end('OK')
            })
          return
        } else if (url.pathname === '/question/clear') {
          // The agent moved on (answered in the app, new prompt, or turn finished).
          //
          // ⚠️ This is the ONLY status-server route allowed to clear a question.
          // Doing it from /status would race the generic PreToolUse hook, which
          // reports `working` at the same instant AskUserQuestion is captured.
          const terminalId = url.searchParams.get('id')

          // Ignore sidebar terminals (VS Code extension)
          if (terminalId?.startsWith('sidebar-')) {
            res.writeHead(200)
            res.end('OK')
            return
          }

          if (terminalId && clearQuestionCallback) {
            clearQuestionCallback(terminalId)
          }

          res.writeHead(200)
          res.end('OK')
        } else if (url.pathname === '/status') {
          const terminalId = url.searchParams.get('id')
          const state = url.searchParams.get('state')

          // Ignore sidebar terminals (VS Code extension)
          if (terminalId?.startsWith('sidebar-')) {
            res.writeHead(200)
            res.end('OK')
            return
          }

          if (terminalId && state && stateCallback) {
            stateCallback(terminalId, state)
          }

          res.writeHead(200)
          res.end('OK')
        } else if (url.pathname === '/metadata') {
          const terminalId = url.searchParams.get('id')

          // Ignore sidebar terminals (VS Code extension)
          if (terminalId?.startsWith('sidebar-')) {
            res.writeHead(200)
            res.end('OK')
            return
          }

          const title = url.searchParams.get('title')
          const branchName = url.searchParams.get('branchName')
          const ticketId = url.searchParams.get('ticketId')
          const description = url.searchParams.get('description')
          const status = url.searchParams.get('status')
          const baseBranch = url.searchParams.get('baseBranch')
          const prUrl = url.searchParams.get('prUrl')
          const prRepo = url.searchParams.get('prRepo')  // Repository path for the PR
          const fullStackTaskId = url.searchParams.get('fullStackTaskId')
          const relatedWorktreesRaw = url.searchParams.get('relatedWorktrees')
          // Absolute path to the spec the planning phase writes. Taken raw, and NOT
          // checked against the filesystem: the writer announces where the spec will
          // be, so it legitimately arrives before the file exists.
          const specPath = url.searchParams.get('specPath')

          if (terminalId && metadataCallback) {
            const metadata: Record<string, string | string[] | Record<string, { prUrl?: string }>> = {}
            if (title) metadata.title = title
            if (branchName) metadata.branchName = branchName
            if (ticketId) metadata.ticketId = ticketId
            if (description) metadata.description = description
            if (status) metadata.status = status
            if (baseBranch) metadata.baseBranch = baseBranch
            if (specPath) metadata.specPath = specPath
            if (prUrl && prRepo) {
              // Store PR URL per repository
              metadata.repositoryMetadata = { [prRepo]: { prUrl } }
            }
            if (fullStackTaskId) metadata.fullStackTaskId = fullStackTaskId
            if (relatedWorktreesRaw) {
              try {
                metadata.relatedWorktrees = JSON.parse(relatedWorktreesRaw)
              } catch (e) {
                console.error('[Hook Metadata] Failed to parse relatedWorktrees:', e)
              }
            }

            metadataCallback(terminalId, metadata)
          }

          // Fired AFTER the metadata is stored, so the tick it triggers reads the
          // URL it was told about. Only on a URL that changed for this repo: the
          // same PR re-announced on a later /magic:pr run is not news.
          if (terminalId && prUrl && prRepo) {
            const seenKey = `${terminalId}:${prRepo}`
            if (lastSeenPRUrls.get(seenKey) !== prUrl) {
              lastSeenPRUrls.set(seenKey, prUrl)
              try {
                prUrlCallback?.(terminalId, prRepo, prUrl)
              } catch (e) {
                console.error('[Hook Metadata] PR URL callback failed:', e)
              }
            }
          }

          // Also AFTER the metadata is stored, and also only on a path that changed:
          // this is what records the planning session, and it reads the agent back
          // from the very metadata written just above. `/magic:plan` re-sends its
          // title (with the same specPath) at several later steps, and each of those
          // would otherwise be a fresh session write for nothing.
          if (terminalId && specPath) {
            if (lastSeenSpecPaths.get(terminalId) !== specPath) {
              lastSeenSpecPaths.set(terminalId, specPath)
              try {
                specPathCallback?.(terminalId, specPath)
              } catch (e) {
                console.error('[Hook Metadata] spec path callback failed:', e)
              }
            }
          }

          res.writeHead(200)
          res.end('OK')
        } else if (url.pathname === '/command/start') {
          const terminalId = url.searchParams.get('id')
          const command = url.searchParams.get('cmd')

          // Ignore sidebar terminals (VS Code extension)
          if (terminalId?.startsWith('sidebar-')) {
            res.writeHead(200)
            res.end('OK')
            return
          }

          const decodedCommand = command ? decodeURIComponent(command) : ''

          if (terminalId && decodedCommand && commandStartCallback) {
            commandStartCallback(terminalId, decodedCommand)
          }

          res.writeHead(200)
          res.end('OK')
        } else if (url.pathname === '/command/end') {
          const terminalId = url.searchParams.get('id')
          const exitCodeStr = url.searchParams.get('exit')

          // Ignore sidebar terminals (VS Code extension)
          if (terminalId?.startsWith('sidebar-')) {
            res.writeHead(200)
            res.end('OK')
            return
          }

          const exitCode = parseInt(exitCodeStr || '0', 10)

          if (terminalId && commandEndCallback) {
            commandEndCallback(terminalId, exitCode)
          }

          res.writeHead(200)
          res.end('OK')
        } else if (url.pathname === '/skill') {
          // A skill was invoked in a Claude Code session. Fired by the PreToolUse
          // hook (matcher: "Skill"), so it counts every invocation — slash command
          // or natural-language trigger alike.
          //
          // `id` is OPTIONAL here, unlike every other route: the hook is installed
          // user-globally and also fires in terminals the app did not spawn, where
          // no agent exists. Those runs are still worth counting, unattributed.
          const terminalId = url.searchParams.get('id')
          const skill = url.searchParams.get('name')

          // Ignore sidebar terminals (VS Code extension)
          if (terminalId?.startsWith('sidebar-')) {
            res.writeHead(200)
            res.end('OK')
            return
          }

          if (skill && skillCallback) {
            skillCallback(terminalId || undefined, skill)
          }

          res.writeHead(200)
          res.end('OK')
        } else if (url.pathname === '/repositories') {
          const terminalId = url.searchParams.get('id')

          // Ignore sidebar terminals (VS Code extension)
          if (terminalId?.startsWith('sidebar-')) {
            res.writeHead(200)
            res.end('OK')
            return
          }

          const reposRaw = url.searchParams.get('repos')

          if (terminalId && reposRaw && repositoriesCallback) {
            try {
              const repos = JSON.parse(reposRaw)
              if (Array.isArray(repos)) {
                repositoriesCallback(terminalId, repos)
              }
            } catch (e) {
              console.error('[Hook Repositories] Failed to parse repos:', e)
            }
          }

          res.writeHead(200)
          res.end('OK')
        } else if (url.pathname === '/plan/spec') {
          // The agent wrote a section of its spec. A PING, deliberately: the app knows
          // where the spec is (from `/metadata?specPath=`) and reads the file itself, so
          // no markdown is ever handed to a shell — and the upload, its debounce and the
          // user's opt-out all stay in one place (main/store/plan-sync.ts).
          //
          // GET with a query even though it writes, like /config/worktree-files: these
          // routes are called by curl from a hook, and a body would buy nothing.
          const terminalId = url.searchParams.get('id')

          // Ignore sidebar terminals (VS Code extension)
          if (terminalId?.startsWith('sidebar-')) {
            res.writeHead(200)
            res.end('OK')
            return
          }

          // An unknown agent, an agent with no spec path, a spec that is not written
          // yet: all no-ops behind this callback, none of them an error. The caller is
          // a `curl` inside a Claude Code turn, and there is nothing it could do with
          // a failure except waste the turn on it.
          if (terminalId && planSpecCallback) {
            try {
              planSpecCallback(terminalId)
            } catch (e) {
              console.error('[Plan] spec callback failed:', e)
            }
          }

          res.writeHead(200)
          res.end('OK')
        } else if (url.pathname === '/plan/tickets') {
          // The tickets the planning session created, as a URI-encoded JSON array.
          // Same parse-and-guard shape as /repositories above.
          const terminalId = url.searchParams.get('id')

          // Ignore sidebar terminals (VS Code extension)
          if (terminalId?.startsWith('sidebar-')) {
            res.writeHead(200)
            res.end('OK')
            return
          }

          const ticketsRaw = url.searchParams.get('tickets')

          if (terminalId && ticketsRaw && planTicketsCallback) {
            try {
              const tickets = parsePlanTickets(ticketsRaw)
              if (tickets.length > 0) planTicketsCallback(terminalId, tickets)
            } catch (e) {
              console.error('[Plan] Failed to parse tickets:', e)
            }
          }

          res.writeHead(200)
          res.end('OK')
        } else if (url.pathname === '/config') {
          // Read-only: the current config from the app's in-memory cache (hydrated from the
          // cloud store). Lets skills read the live config instead of a stale local config.json.
          let payload = '{}'
          try {
            if (configProvider) payload = JSON.stringify(configProvider() ?? {})
          } catch (e) {
            console.error('[StatusServer] /config provider failed:', e)
          }
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(payload)
        } else if (url.pathname === '/agent') {
          // Read-only: the agent/task metadata for a given terminal id (terminalId === agent.id).
          const terminalId = url.searchParams.get('id')
          let payload = 'null'
          try {
            if (terminalId && agentProvider) payload = JSON.stringify(agentProvider(terminalId) ?? null)
          } catch (e) {
            console.error('[StatusServer] /agent provider failed:', e)
          }
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(payload)
        } else if (url.pathname === '/config/worktree-files') {
          // Write: persist a repo's worktreeFiles to the cloud store (the one config mutation
          // skills perform). Kept as GET+query to match the other curl-friendly write routes.
          // `path` identifies the repo unambiguously; `repo` (a name) cannot,
          // since two organizations may each have one by that name — and it was
          // already unreliable, being the folder basename rather than the
          // configured key. Older skills send only `repo`.
          const path = url.searchParams.get('path')
          const repo = url.searchParams.get('repo')
          const filesRaw = url.searchParams.get('files')

          if ((path || repo) && filesRaw && worktreeFilesWriter) {
            try {
              const files = JSON.parse(filesRaw)
              if (Array.isArray(files)) {
                worktreeFilesWriter(files.filter((f): f is string => typeof f === 'string'), path, repo)
              }
            } catch (e) {
              console.error('[StatusServer] /config/worktree-files failed:', e)
            }
          }

          res.writeHead(200)
          res.end('OK')
        } else if (url.pathname === '/ping') {
          res.writeHead(200)
          res.end('pong')
        } else {
          res.writeHead(404)
          res.end('Not found')
        }
      } catch (error) {
        console.error('[StatusServer] Request error:', error)
        res.writeHead(500)
        res.end('Server error')
      }
    })

    // Listen on a random available port
    server.listen(0, '127.0.0.1', () => {
      const address = server?.address()
      if (address && typeof address === 'object') {
        serverPort = address.port
        publishPort(serverPort)
        console.log(`Magic Slash status server listening on port ${serverPort}`)
        resolve(serverPort)
      } else {
        reject(new Error('Failed to get server port'))
      }
    })

    server.on('error', (error) => {
      reject(error)
    })
  })
}

export function stopStatusServer(): Promise<void> {
  return new Promise((resolve) => {
    // Only a process that published the file may remove it. This is not
    // hypothetical: `before-quit` is registered at module scope and runs in every
    // instance, including the one that loses the single-instance lock and quits
    // without ever calling startStatusServer (see index.ts). Same build means the
    // same CONFIG_DIR, so an unconditional unpublish there would delete the port
    // file of the instance that is actually serving — and the winner only writes
    // it at startup, so nothing would restore it until the next launch.
    if (!server) {
      resolve()
      return
    }

    unpublishPort()
    server.close(() => {
      server = null
      serverPort = 0
      resolve()
    })
  })
}
