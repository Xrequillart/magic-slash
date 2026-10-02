import type { OptionalMcpServerState } from '../../../types'

/**
 * What the Application tab says about an optional MCP server (Slack), and what it offers
 * to do about it: the reading half of `McpServersCard`, pure so the root suite can hold it.
 *
 * Two sources, and the health check wins when it has spoken: the registry (~/.claude.json)
 * only says a server is DECLARED, while `claude mcp list` says whether it answers, and it
 * is the only one to know about a connector of the user's claude.ai account.
 *
 *  - `connected-claude-ai`: a claude.ai connector to the service answers. Claude Code hands
 *    it to every session, so nothing is offered: a second server would be the same Slack twice.
 *  - `connected`:  the server the app added answers.
 *  - `needs-auth`: declared, never signed in. Sign-in happens in Claude Code (`/mcp`).
 *  - `failed`:     declared, unreachable; `detail` says why.
 *  - `installed`:  declared, not checked yet.
 *  - `legacy`:     declared under its name at another URL: the user's own, reinstalled only on request.
 *  - `missing`:    nowhere: Install.
 */
export type McpServerViewState =
  | 'connected-claude-ai' | 'connected' | 'needs-auth' | 'failed' | 'installed' | 'legacy' | 'missing'

export interface McpServerView {
  state: McpServerViewState
  /** What the button does: add it, add it again over a different entry, take it off, or nothing. */
  action: 'install' | 'reinstall' | 'remove' | null
  /** The check's own words, for `failed` and `needs-auth`. */
  detail?: string
  /** The state is a claude.ai connector's, not a server of this machine's: sign-in happens on claude.ai. */
  claudeAi?: boolean
}

export function mcpServerView({ status, health }: OptionalMcpServerState): McpServerView {
  const ours = status.state !== 'missing'
  const removable = ours ? 'remove' : null
  if (health?.state === 'connected') {
    return health.source === 'claude-ai' && !ours
      ? { state: 'connected-claude-ai', action: null }
      : { state: 'connected', action: removable }
  }
  if (status.state === 'legacy') return { state: 'legacy', action: 'reinstall' }
  if (health?.state === 'needs-auth' || health?.state === 'failed') {
    const view: McpServerView = { state: health.state, action: ours ? 'remove' : 'install' }
    if (health.detail) view.detail = health.detail
    if (health.source === 'claude-ai' && !ours) view.claudeAi = true
    return view
  }
  return ours ? { state: 'installed', action: 'remove' } : { state: 'missing', action: 'install' }
}
