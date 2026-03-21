/**
 * Overlay message system using the Claude Agent SDK.
 *
 * Replaces the raw CLI spawn approach which could not handle the
 * control_request/control_response permission protocol correctly.
 * The SDK manages the Claude process lifecycle and provides a
 * canUseTool callback for interactive permission handling.
 */
import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'
import type { Query, PermissionResult } from '@anthropic-ai/claude-agent-sdk'

// Lazy-loaded SDK (ESM module in CJS context)
let _query: typeof import('@anthropic-ai/claude-agent-sdk').query | null = null
async function getQuery() {
  if (!_query) {
    const sdk = await import('@anthropic-ai/claude-agent-sdk')
    _query = sdk.query
  }
  return _query
}

// Re-use getShellPath from terminal-manager (imported at module level)
import { getShellPathForOverlay } from './terminal-manager'

// Track active SDK Query instances per terminal
const activeQueries = new Map<string, Query>()

// Track session IDs for resume
const overlaySessionIds = new Map<string, string>()

// Pending permission requests: key = "terminalId:requestId" -> { resolve }
interface PendingPermission {
  resolve: (result: PermissionResult) => void
}
const pendingPermissions = new Map<string, PendingPermission>()

// Expand ~ to home directory
function expandPath(inputPath: string): string {
  if (!inputPath) return inputPath
  if (inputPath.startsWith('~')) {
    return path.join(os.homedir(), inputPath.slice(1))
  }
  return inputPath
}

export function getOverlaySessionId(id: string): string | undefined {
  return overlaySessionIds.get(id)
}

export function setOverlaySessionId(id: string, sessionId: string): void {
  overlaySessionIds.set(id, sessionId)
}

/**
 * Send a message via the Claude Agent SDK.
 * Uses query() with canUseTool callback for interactive permissions.
 * Each SDK message is forwarded to the renderer via onEvent().
 * Permission requests emit synthetic control_request events.
 */
export function sendOverlayMessage(
  terminalId: string,
  message: string,
  cwd: string,
  onEvent: (jsonLine: string) => void,
  onDone: (exitCode: number) => void
): void {
  const expandedCwd = expandPath(cwd)
  const defaultDir = path.join(os.homedir(), 'Documents')
  const workingDir = fs.existsSync(expandedCwd) ? expandedCwd : (fs.existsSync(defaultDir) ? defaultDir : os.homedir())

  // Kill any existing query for this terminal
  const existing = activeQueries.get(terminalId)
  if (existing) {
    existing.return().catch(() => {})
    activeQueries.delete(terminalId)
  }

  // Reject any stale pending permissions for this terminal
  for (const [key, pending] of pendingPermissions) {
    if (key.startsWith(`${terminalId}:`)) {
      pending.resolve({ behavior: 'deny', message: 'Session replaced' })
      pendingPermissions.delete(key)
    }
  }

  const sessionId = overlaySessionIds.get(terminalId)

  // Launch the query asynchronously
  ;(async () => {
    let queryFn: typeof import('@anthropic-ai/claude-agent-sdk').query
    try {
      queryFn = await getQuery()
    } catch (err) {
      console.error(`[overlay-sdk:${terminalId}] Failed to load SDK:`, err)
      onDone(1)
      return
    }

    const q = queryFn({
      prompt: message,
      options: {
        cwd: workingDir,
        resume: sessionId,
        canUseTool: async (toolName, input, options) => {
          const requestId = `perm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

          // Emit synthetic control_request event (same shape ConfirmDialog expects)
          const controlRequest = {
            type: 'control_request',
            request_id: requestId,
            request: {
              subtype: 'can_use_tool',
              tool_name: toolName,
              input,
              tool_use_id: options.toolUseID,
            },
          }
          onEvent(JSON.stringify(controlRequest))

          // Return a Promise that resolves when respondToOverlay() is called
          return new Promise<PermissionResult>((resolve) => {
            const key = `${terminalId}:${requestId}`
            pendingPermissions.set(key, { resolve })

            // Cleanup on abort
            options.signal.addEventListener('abort', () => {
              if (pendingPermissions.has(key)) {
                pendingPermissions.delete(key)
                resolve({ behavior: 'deny', message: 'Aborted' })
              }
            })
          })
        },
        env: {
          ...process.env,
          HOME: os.homedir(),
          PATH: getShellPathForOverlay(),
        },
      },
    })

    activeQueries.set(terminalId, q)

    try {
      for await (const msg of q) {
        const jsonLine = JSON.stringify(msg)

        // Capture session_id from result messages
        if (msg.type === 'result' && 'session_id' in msg && msg.session_id) {
          overlaySessionIds.set(terminalId, msg.session_id as string)
        }

        onEvent(jsonLine)
      }
      onDone(0)
    } catch (err) {
      console.error(`[overlay-sdk:${terminalId}] query error:`, err)
      onDone(1)
    } finally {
      if (activeQueries.get(terminalId) === q) {
        activeQueries.delete(terminalId)
      }
    }
  })()
}

/** Resolve a pending permission request from the renderer */
export function respondToOverlay(
  terminalId: string,
  requestId: string,
  behavior: 'allow' | 'deny',
  message?: string,
  updatedInput?: Record<string, unknown>
): void {
  const key = `${terminalId}:${requestId}`
  const pending = pendingPermissions.get(key)
  if (!pending) {
    console.error(`[overlay-sdk:${terminalId}] no pending permission for ${requestId}`)
    return
  }

  pendingPermissions.delete(key)

  if (behavior === 'allow') {
    const result: PermissionResult = { behavior: 'allow' }
    if (updatedInput) result.updatedInput = updatedInput
    pending.resolve(result)
  } else {
    pending.resolve({ behavior: 'deny', message: message || 'User denied permission' })
  }
}

/** Reset the overlay session (clears session ID so next message starts fresh) */
export function resetOverlaySession(id: string): void {
  overlaySessionIds.delete(id)
  const q = activeQueries.get(id)
  if (q) {
    q.return().catch(() => {})
    activeQueries.delete(id)
  }
  // Reject all pending permissions for this terminal
  for (const [key, pending] of pendingPermissions) {
    if (key.startsWith(`${id}:`)) {
      pending.resolve({ behavior: 'deny', message: 'Session reset' })
      pendingPermissions.delete(key)
    }
  }
}

/** Clean up overlay resources when a terminal is killed */
export function cleanupOverlay(id: string): void {
  resetOverlaySession(id)
}
