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

// Track terminals where ExitPlanMode was already approved (auto-approve on resume)
const planApprovedTerminals = new Set<string>()

/** Reject all pending permissions for a terminal */
function rejectPendingPermissions(terminalId: string, reason: string): void {
  for (const [key, pending] of pendingPermissions) {
    if (key.startsWith(`${terminalId}:`)) {
      pending.resolve({ behavior: 'deny', message: reason })
      pendingPermissions.delete(key)
    }
  }
}

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
export type ClaudeMode = 'normal' | 'auto-accept' | 'plan'

export function sendOverlayMessage(
  terminalId: string,
  message: string,
  cwd: string,
  onEvent: (jsonLine: string) => void,
  onDone: (exitCode: number) => void,
  mode: ClaudeMode = 'normal'
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

  rejectPendingPermissions(terminalId, 'Session replaced')

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

    // Track whether ExitPlanMode was approved during this query
    // (plan mode queries end after ExitPlanMode; we need to auto-resume for implementation)
    let exitPlanModeApproved = false

    const canUseToolCallback = async (toolName: string, input: Record<string, unknown>, options: { signal: AbortSignal; toolUseID?: string }) => {
      // Auto-accept mode: auto-allow tool permissions (but not AskUserQuestion)
      if (mode === 'auto-accept' && toolName !== 'AskUserQuestion') {
        return { behavior: 'allow' as const }
      }

      // Auto-approve ExitPlanMode if the plan was already approved for this terminal
      // (happens when the resumed session restores plan mode state)
      if (toolName === 'ExitPlanMode' && planApprovedTerminals.has(terminalId)) {
        return { behavior: 'allow' as const }
      }

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
        pendingPermissions.set(key, {
          resolve: (result: PermissionResult) => {
            // Track ExitPlanMode approval for auto-resume and auto-approve on resume
            if (toolName === 'ExitPlanMode' && result.behavior === 'allow') {
              exitPlanModeApproved = true
              planApprovedTerminals.add(terminalId)
            }
            resolve(result)
          },
        })

        // Cleanup on abort
        options.signal.addEventListener('abort', () => {
          if (pendingPermissions.has(key)) {
            pendingPermissions.delete(key)
            resolve({ behavior: 'deny', message: 'Aborted' })
          }
        })
      })
    }

    const q = queryFn({
      prompt: message,
      options: {
        cwd: workingDir,
        resume: sessionId,
        ...(mode === 'plan'
          ? { permissionMode: 'plan' as const }
          : mode === 'auto-accept'
            ? { permissionMode: 'acceptEdits' as const }
            : {}),
        canUseTool: canUseToolCallback,
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

      // After a plan mode query completes with ExitPlanMode approved,
      // auto-resume to start the implementation phase.
      // The CLI exits after plan approval; we resume the session in normal mode.
      if (mode === 'plan' && exitPlanModeApproved && overlaySessionIds.has(terminalId)) {
        exitPlanModeApproved = false
        // Notify renderer to switch UI mode to auto-accept
        onEvent(JSON.stringify({ type: 'mode_change', mode: 'auto-accept' }))
        // Resume in auto-accept mode so implementation tools are auto-approved
        sendOverlayMessage(
          terminalId,
          'Plan mode has been deactivated. You now have full permission to edit files, write files, and run commands. Proceed with implementing the plan.',
          cwd,
          onEvent,
          onDone,
          'auto-accept'
        )
        return
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

/** Abort an active overlay query (idempotent — safe to call multiple times) */
export function abortOverlayQuery(
  terminalId: string,
  onEvent?: (jsonLine: string) => void
): void {
  const q = activeQueries.get(terminalId)
  if (!q) return

  // Emit synthetic interrupted event so the renderer knows it was user-initiated
  if (onEvent) {
    onEvent(JSON.stringify({ type: 'interrupted' }))
  }

  rejectPendingPermissions(terminalId, 'Interrupted by user')

  q.interrupt().catch(() => {})
  activeQueries.delete(terminalId)
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
  planApprovedTerminals.delete(id)
  const q = activeQueries.get(id)
  if (q) {
    q.return().catch(() => {})
    activeQueries.delete(id)
  }
  rejectPendingPermissions(id, 'Session reset')
}

/** Clean up overlay resources when a terminal is killed */
export function cleanupOverlay(id: string): void {
  resetOverlaySession(id)
}
