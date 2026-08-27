import { ipcMain, type BrowserWindow } from 'electron'
import type { JiraAuthStatus, JiraConnectResult, JiraDisconnectReason } from '../../types'
import {
  beginConnect,
  cancelConnect,
  completeConnect,
  disconnect,
  getStatus,
  setStatusListener,
} from '../jira/connect'
import { setJiraCallbackHandler } from '../hooks/status-server'

/**
 * The bridge for the Atlassian account: three channels the renderer calls, and one
 * PUSH it listens to.
 *
 * Shaped like `auth-handlers.ts`, with one structural difference that drives the
 * whole design: this flow does not finish where it starts. `jira:connect` opens a
 * browser and returns immediately — the credential arrives minutes later, on the
 * loopback status server, on another stack entirely. A return value therefore
 * CANNOT keep the UI in step, which is what `jira:statusChanged` is for. It carries
 * an optional reason code so a cancelled or timed-out attempt reads as a specific
 * outcome instead of a section that never changed.
 *
 * This module also owns both registrations into the flow (the status listener and
 * the loopback callback), for the same reason `pr-review-watcher` registers its own:
 * `main/index.ts` should not have to know that `jira/connect.ts` and
 * `hooks/status-server.ts` have anything to do with each other.
 */

/**
 * The loopback callback's parameters, checked at RUNTIME.
 *
 * The annotation on `JiraCallbackHandler` is erased at runtime, and this payload
 * does not come from our own code: it is three query parameters off an HTTP server
 * any local process can reach. `code` in particular is about to be spent in a token
 * exchange, so a non-string that rode down to `JSON.stringify` would be redeemed as
 * `null` and fail three hops away. In the style of `isIssueDetailArgs` in
 * `tasks-handlers.ts`.
 *
 * The three IPC channels below take NO payload at all — there is deliberately
 * nothing for the renderer to pass, so there is nothing there to guard.
 */
interface JiraCallbackParams {
  code: string | null
  error: string | null
  state: string | null
}

const isNullableString = (value: unknown): value is string | null =>
  value === null || (typeof value === 'string' && value !== '')

function readCallbackParams(params: unknown): JiraCallbackParams | null {
  if (typeof params !== 'object' || params === null) return null
  const { code, error, state } = params as { code?: unknown; error?: unknown; state?: unknown }
  if (!isNullableString(code) || !isNullableString(error) || !isNullableString(state)) return null
  return { code, error, state }
}

export function setupJiraHandlers(getMainWindow: () => BrowserWindow | null): void {
  setStatusListener((status: JiraAuthStatus, reason?: JiraDisconnectReason) => {
    getMainWindow()?.webContents.send('jira:statusChanged', status, reason)
  })

  setJiraCallbackHandler((raw) => {
    const params = readCallbackParams(raw)
    if (!params) {
      // Nothing usable in the payload at all. Handed on anyway rather than dropped
      // here, because `cancelConnect` is the one place that decides what an
      // unattributable callback means — and its answer is "ignore it": a hit with no
      // nonce could come from any local process, and must not cancel a real attempt.
      cancelConnect({ state: null, reason: 'failed' })
      return
    }

    // `error` is Atlassian's own code (`access_denied` when the user declined). It is
    // NOT forwarded as text: it is attacker-influenceable and would end up in a log
    // line and, worse, in a toast. Only the reason code travels.
    if (params.error || !params.code) {
      cancelConnect({ state: params.state, reason: params.error ? 'cancelled' : 'failed' })
      return
    }

    // Fire-and-forget on purpose: the loopback route has already answered the
    // browser, so there is nobody left to report to. `completeConnect` never rejects
    // — it emits its own outcome, success or failure, and logs nothing that could
    // carry a credential.
    void completeConnect({ code: params.code, state: params.state ?? '' })
  })

  ipcMain.handle('jira:authStatus', async (): Promise<JiraAuthStatus> => getStatus())

  // Opens the browser. Resolves as soon as the consent screen is on its way, still
  // reporting "not connected" — see the header.
  //
  // Never REJECTS for a failure the user should hear about: a flow that could not start
  // (no client id in this build, no loopback server, a browser that would not open)
  // resolves to `{ started: false, failure }`. A rejection would arrive in the renderer
  // wrapped in Electron's own "Error invoking remote method 'jira:connect': …", and the
  // sentence inside it would be English regardless of the user's language. The code is
  // translated on the renderer side, like `JiraDisconnectReason` already is.
  ipcMain.handle('jira:connect', async (): Promise<JiraConnectResult> => beginConnect())

  ipcMain.handle('jira:disconnect', async (): Promise<JiraAuthStatus> => disconnect())
}
