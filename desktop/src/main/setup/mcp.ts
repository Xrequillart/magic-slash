import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import type { McpHealthReport, McpServerHealth, McpServerId, McpServerState, McpServerStatus } from '../../types'
import { OPTIONAL_MCP_SERVER_IDS } from '../../types'
import { runInLoginShell, which } from './shell-exec'

/**
 * Configures the MCP servers the skills talk to — the job `install/install.sh`
 * sections 2 and 3 used to do.
 *
 * WHY BOTH SERVERS ARE REMOTE + OAUTH
 * ---------------------------------------------------------------------------
 * Atlassian always was. GitHub was not: the script ran the npm package
 * `@modelcontextprotocol/server-github` over stdio and, to do that, had to prompt for
 * a Personal Access Token and write it in clear text into ~/.claude.json. That package
 * is deprecated, the token never expired on its own, and a secret typed into a shell
 * prompt is a secret nobody can rotate later because nobody remembers it exists.
 *
 * GitHub's remote server needs no token: Claude Code opens a browser on first use, the
 * grant is revocable from GitHub's settings, and there is no npx process to spawn.
 *
 * WHAT THIS DOES NOT DO
 * ---------------------------------------------------------------------------
 * It never replaces an existing GitHub MCP behind the user's back. A machine that
 * already has the stdio server has a WORKING setup with a token in it; swapping it
 * would revoke nothing, break the session until the user notices the OAuth prompt, and
 * throw away a credential we did not create. That case is reported as `legacy` and the
 * migration is offered in the UI, where a human can say yes.
 *
 * OPTIONAL SERVERS (Slack)
 * ---------------------------------------------------------------------------
 * No integration needs Slack: only a repository's workflow actions do, and only for the
 * members who turned them on. So it is never provisioned at launch, only from the
 * Install button, and the setup card does not count it as something to repair. Slack's
 * OAuth server has no dynamic client registration (its metadata names no
 * `registration_endpoint`), so a bare `claude mcp add` would fail at sign-in the way the
 * GitHub server does; it is added with the client id and callback port of Slack's own
 * Claude Code plugin, which is what `claude plugin install slack` writes.
 */

/** Claude Code's user-scope MCP registry — the file `claude mcp add --scope user` writes. */
const CLAUDE_JSON = path.join(os.homedir(), '.claude.json')

interface McpDefinition {
  id: McpServerId
  url: string
  /** Which integration toggle governs this server. */
  integration: 'atlassian' | 'github'
}

interface OptionalMcpDefinition {
  id: McpServerId
  url: string
  /** For a server without dynamic client registration: the client to sign in as. */
  oauth?: { clientId: string; callbackPort: number }
}

export const MCP_DEFINITIONS: McpDefinition[] = [
  { id: 'atlassian', url: 'https://mcp.atlassian.com/v1/mcp', integration: 'atlassian' },
  // GitHub's hosted MCP server. The api.githubcopilot.com host is where GitHub serves
  // it; using it does not require a Copilot subscription, only a GitHub account.
  { id: 'github', url: 'https://api.githubcopilot.com/mcp/', integration: 'github' },
]

/** Added on request only: see OPTIONAL SERVERS above. */
export const OPTIONAL_MCP_DEFINITIONS: OptionalMcpDefinition[] = [
  { id: 'slack', url: 'https://mcp.slack.com/mcp', oauth: { clientId: '1601185624273.8899143856786', callbackPort: 3118 } },
]

function definitionOf(id: McpServerId): { id: McpServerId; url: string; oauth?: OptionalMcpDefinition['oauth'] } | undefined {
  return MCP_DEFINITIONS.find((d) => d.id === id) ?? OPTIONAL_MCP_DEFINITIONS.find((d) => d.id === id)
}

interface ClaudeJson {
  mcpServers?: Record<string, { type?: string; url?: string; command?: string; args?: string[] }>
}

function readClaudeJson(): ClaudeJson {
  try {
    if (!fs.existsSync(CLAUDE_JSON)) return {}
    return JSON.parse(fs.readFileSync(CLAUDE_JSON, 'utf-8')) as ClaudeJson
  } catch {
    // A malformed ~/.claude.json is Claude Code's problem to report, not ours to
    // repair. Treating it as "nothing configured" would be worse than useless: the
    // app would then try to add servers into a file it cannot parse.
    return {}
  }
}

/**
 * State of one MCP server, read from disk rather than from `claude mcp list`.
 *
 * Reading the file is instant and cannot fail on a slow profile; `claude mcp list`
 * pays for a login shell and, on some versions, reaches out to each server to report
 * its health — far too slow for something the launch path awaits.
 */
export function mcpServerStatus(id: McpServerId): McpServerStatus {
  const definition = definitionOf(id)!
  const entry = readClaudeJson().mcpServers?.[id]

  if (!entry) return { id, state: 'missing', url: null }

  // Configured over HTTP at the URL we expect: nothing to do.
  if (entry.url === definition.url) return { id, state: 'configured', url: entry.url }

  // Configured, but not the way this version provisions it — either the deprecated
  // stdio package, or a URL the user chose themselves. Both are reported rather than
  // corrected, and both are named `legacy` because the only safe action is to ask.
  return {
    id,
    state: 'legacy',
    url: entry.url ?? null,
    command: entry.command ?? null,
  }
}

/** The servers an integration needs. The optional ones are `optionalMcpServerStates`'. */
export function allMcpServerStatuses(): McpServerStatus[] {
  return MCP_DEFINITIONS.map((d) => mcpServerStatus(d.id))
}

/**
 * Register a server with Claude Code, replacing any existing entry of the same name.
 *
 * Goes through the CLI rather than editing ~/.claude.json directly: that file is
 * Claude Code's, its schema has changed before, and a hand-written entry that its
 * current version does not understand fails at the only moment that matters — inside
 * a skill run, with no clue as to why.
 */
export async function provisionMcpServer(id: McpServerId): Promise<{ ok: boolean; error?: string }> {
  const definition = definitionOf(id)
  if (!definition) return { ok: false, error: `unknown MCP server: ${id}` }

  if (!(await which('claude'))) {
    return { ok: false, error: 'claude-missing' }
  }

  // `mcp add` refuses a name that already exists, so a re-provision (or a migration
  // away from the stdio server) has to remove first. Failure is ignored: the usual
  // reason is that there was nothing to remove.
  await runInLoginShell(`claude mcp remove ${id} --scope user`)

  const { ok, stdout, stderr } = await runInLoginShell(
    `claude mcp add ${id} --scope user --transport http${oauthFlags(definition.oauth)} ${definition.url}`,
    30_000,
  )
  if (!ok) return { ok: false, error: stderr || stdout || 'claude mcp add failed' }
  return { ok: true }
}

function oauthFlags(oauth: OptionalMcpDefinition['oauth']): string {
  return oauth ? ` --client-id ${oauth.clientId} --callback-port ${oauth.callbackPort}` : ''
}

export async function removeMcpServer(id: McpServerId): Promise<{ ok: boolean; error?: string }> {
  if (!(await which('claude'))) return { ok: false, error: 'claude-missing' }
  const { ok, stdout, stderr } = await runInLoginShell(`claude mcp remove ${id} --scope user`)
  if (!ok) return { ok: false, error: stderr || stdout || 'claude mcp remove failed' }
  return { ok: true }
}

/**
 * Add whatever is missing for the enabled integrations. Runs at every launch.
 *
 * Only touches servers in state `missing` — `configured` needs nothing, and `legacy`
 * is the user's to decide on (see the note at the top of this file). So the common
 * path on an already-set-up machine performs no writes at all, and a fresh install
 * ends up configured without anyone running a script.
 */
export async function ensureMcpServers(
  integrations: { github?: boolean; atlassian?: boolean } | undefined,
): Promise<{ provisioned: McpServerId[]; errors: string[] }> {
  const provisioned: McpServerId[] = []
  const errors: string[] = []

  for (const definition of MCP_DEFINITIONS) {
    // GitHub is not optional for the skills that open PRs; Atlassian is, and defaults
    // to on to match the config normalizer (config/config.ts).
    const enabled = definition.integration === 'github' ? integrations?.github !== false : integrations?.atlassian !== false
    if (!enabled) continue
    if (mcpServerStatus(definition.id).state !== 'missing') continue

    const result = await provisionMcpServer(definition.id)
    if (result.ok) {
      provisioned.push(definition.id)
      console.log(`[setup] MCP ${definition.id} configured`)
    } else if (result.error === 'claude-missing') {
      // Nothing to report per server: the prerequisites check already surfaces this,
      // and a machine without the CLI would otherwise log one error per server.
      return { provisioned, errors }
    } else {
      errors.push(`${definition.id}: ${result.error}`)
      console.error(`[setup] failed to configure MCP ${definition.id}:`, result.error)
    }
  }

  return { provisioned, errors }
}

// ---------------------------------------------------------------------------
// Health: what `claude mcp list` says, on demand.
// ---------------------------------------------------------------------------

/**
 * WHY A SEPARATE, SLOW CHECK
 * ---------------------------------------------------------------------------
 * The file says whether a server is REGISTERED, not whether it works: a Slack server
 * the user never signed in to is in ~/.claude.json all the same. Only `claude mcp list`
 * knows, because it asks every server in turn, and that takes seconds (several dozen
 * servers on a machine with claude.ai connectors). So it runs when the user presses
 * Check, never on the launch path, and its last answer is kept for the next render.
 *
 * It is also the only place a claude.ai CONNECTOR shows up: those live in the user's
 * account, not in any file here, and Claude Code exposes them in every session. A Slack
 * connected on claude.ai is a Slack the agent can use, so the app must not offer to
 * install a second one.
 */

/** The prefix Claude Code prints before a connector of the user's claude.ai account. */
const CLAUDE_AI_PREFIX = 'claude.ai '

/**
 * `name: target - ✔ Connected`, as Claude Code 2.x prints each line. The target may hold
 * ` - ` itself (a stdio command's arguments), so the status is the LAST ` - ` before a mark.
 */
const LINE = /^(.+?): (.*) - (✔|✘|!|⚠)\s*(.*)$/

/** Every server line of `claude mcp list`'s output; the header and anything unreadable are left out. */
export function parseMcpList(stdout: string): McpServerHealth[] {
  const servers: McpServerHealth[] = []
  for (const raw of stdout.split(/\r?\n/)) {
    const match = LINE.exec(raw.trim())
    if (!match) continue
    const [, name, target, mark, text] = match
    const state: McpServerHealth['state'] = mark === '✔' ? 'connected'
      : mark === '✘' ? 'failed'
        : /auth/i.test(text) ? 'needs-auth' : 'unknown'
    const health: McpServerHealth = {
      name,
      source: name.startsWith(CLAUDE_AI_PREFIX) ? 'claude-ai' : 'claude-code',
      // `(HTTP)`, `(SSE)` after a URL is the transport, not part of it.
      target: target.replace(/\s+\((?:HTTP|SSE|stdio)\)$/i, ''),
      state,
    }
    const detail = text.replace(/^(Connected|Needs authentication|Failed to connect)\s*(—|-)?\s*/i, '').trim()
    if (state !== 'connected' && detail) health.detail = detail
    servers.push(health)
  }
  return servers
}

let lastReport: McpHealthReport | null = null

/** The last check's answer, or null before the first one. */
export function lastMcpHealth(): McpHealthReport | null {
  return lastReport
}

/** Run `claude mcp list` and keep its answer. A minute at most: it waits on every server. */
export async function checkMcpHealth(): Promise<McpHealthReport> {
  if (!(await which('claude'))) {
    lastReport = { checkedAt: Date.now(), ok: false, servers: [] }
    return lastReport
  }
  const { ok, stdout } = await runInLoginShell('claude mcp list', 60_000)
  const servers = parseMcpList(stdout)
  // A failing server makes no difference to the exit code; an empty answer from a failed run does.
  lastReport = { checkedAt: Date.now(), ok: ok || servers.length > 0, servers }
  return lastReport
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).host
  } catch {
    return null
  }
}

/**
 * The health of the server Claude Code uses for `id`: the one registered under that name
 * when there is one, else a claude.ai connector to the same service (same host), else any
 * other server at it. Null when the report has none of them.
 */
export function healthFor(id: McpServerId, report: McpHealthReport | null): McpServerHealth | null {
  if (!report) return null
  const definition = definitionOf(id)
  const host = definition ? hostOf(definition.url) : null
  const sameHost = (server: McpServerHealth) => !!host && hostOf(server.target) === host
  return report.servers.find((server) => server.name === id)
    ?? report.servers.find((server) => server.source === 'claude-ai' && sameHost(server))
    ?? report.servers.find(sameHost)
    ?? null
}

/**
 * Every server the Connections tab lists, each with its registry state and its last known
 * health: the ones an ENABLED integration needs first, then the optional ones. A server
 * whose integration is off (Atlassian) is left out, since nothing on this machine uses it.
 */
export function mcpServerStates(
  integrations: { github?: boolean; atlassian?: boolean } | undefined,
  report: McpHealthReport | null = lastReport,
): McpServerState[] {
  const required = MCP_DEFINITIONS
    .filter((d) => (d.integration === 'github' ? integrations?.github !== false : integrations?.atlassian !== false))
    .map((d) => ({ id: d.id, required: true }))
  const optional = OPTIONAL_MCP_SERVER_IDS.map((id) => ({ id, required: false }))
  return [...required, ...optional].map(({ id, required }) => ({ id, required, status: mcpServerStatus(id), health: healthFor(id, report) }))
}
