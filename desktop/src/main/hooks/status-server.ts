import * as http from 'http'
import { URL } from 'url'
import type { TerminalUsage } from '../../types'

type StateCallback = (terminalId: string, state: string) => void
type MetadataCallback = (terminalId: string, metadata: Record<string, string | string[] | Record<string, { prUrl?: string }>>) => void
type CommandStartCallback = (terminalId: string, command: string) => void
type CommandEndCallback = (terminalId: string, exitCode: number) => void
type RepositoriesCallback = (terminalId: string, repositories: string[]) => void
type UsageCallback = (terminalId: string, usage: TerminalUsage) => void
// Read-back providers: unlike the callbacks above (terminal → app writes), these let a
// terminal-run skill READ from the app's in-memory caches (hydrated from the cloud store).
// Loosely typed on purpose — the values are just JSON-serialized to the response.
type ConfigProvider = () => unknown
type AgentProvider = (terminalId: string) => unknown
type WorktreeFilesWriter = (repo: string, files: string[]) => void

let server: http.Server | null = null
let serverPort: number = 0
let stateCallback: StateCallback | null = null
let metadataCallback: MetadataCallback | null = null
let commandStartCallback: CommandStartCallback | null = null
let commandEndCallback: CommandEndCallback | null = null
let repositoriesCallback: RepositoriesCallback | null = null
let usageCallback: UsageCallback | null = null
let configProvider: ConfigProvider | null = null
let agentProvider: AgentProvider | null = null
let worktreeFilesWriter: WorktreeFilesWriter | null = null

export function getServerPort(): number {
  return serverPort
}

export function setStateCallback(callback: StateCallback) {
  stateCallback = callback
}

export function setMetadataCallback(callback: MetadataCallback) {
  metadataCallback = callback
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

export function setConfigProvider(provider: ConfigProvider) {
  configProvider = provider
}

export function setAgentProvider(provider: AgentProvider) {
  agentProvider = provider
}

export function setWorktreeFilesWriter(writer: WorktreeFilesWriter) {
  worktreeFilesWriter = writer
}

// Read the full request body (used by the POST /usage route)
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
    durationMs: typeof cost.total_duration_ms === 'number' ? cost.total_duration_ms : undefined,
    linesAdded: typeof cost.total_lines_added === 'number' ? cost.total_lines_added : undefined,
    linesRemoved: typeof cost.total_lines_removed === 'number' ? cost.total_lines_removed : undefined,
    fiveHourPercent: numOrUndef(fiveHour.used_percentage),
    fiveHourResetsAt: numOrUndef(fiveHour.resets_at),
    sevenDayPercent: numOrUndef(sevenDay.used_percentage),
    sevenDayResetsAt: numOrUndef(sevenDay.resets_at),
  }
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

          if (terminalId && metadataCallback) {
            const metadata: Record<string, string | string[] | Record<string, { prUrl?: string }>> = {}
            if (title) metadata.title = title
            if (branchName) metadata.branchName = branchName
            if (ticketId) metadata.ticketId = ticketId
            if (description) metadata.description = description
            if (status) metadata.status = status
            if (baseBranch) metadata.baseBranch = baseBranch
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
          const repo = url.searchParams.get('repo')
          const filesRaw = url.searchParams.get('files')

          if (repo && filesRaw && worktreeFilesWriter) {
            try {
              const files = JSON.parse(filesRaw)
              if (Array.isArray(files)) {
                worktreeFilesWriter(repo, files.filter((f): f is string => typeof f === 'string'))
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
    if (server) {
      server.close(() => {
        server = null
        serverPort = 0
        resolve()
      })
    } else {
      resolve()
    }
  })
}
