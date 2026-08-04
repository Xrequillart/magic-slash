import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import type { McpServerId, McpServerStatus } from '../../types'
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
 */

/** Claude Code's user-scope MCP registry — the file `claude mcp add --scope user` writes. */
const CLAUDE_JSON = path.join(os.homedir(), '.claude.json')

interface McpDefinition {
  id: McpServerId
  url: string
  /** Which integration toggle governs this server. */
  integration: 'atlassian' | 'github'
}

export const MCP_DEFINITIONS: McpDefinition[] = [
  { id: 'atlassian', url: 'https://mcp.atlassian.com/v1/mcp', integration: 'atlassian' },
  // GitHub's hosted MCP server. The api.githubcopilot.com host is where GitHub serves
  // it; using it does not require a Copilot subscription, only a GitHub account.
  { id: 'github', url: 'https://api.githubcopilot.com/mcp/', integration: 'github' },
]

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
  const definition = MCP_DEFINITIONS.find((d) => d.id === id)!
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
  const definition = MCP_DEFINITIONS.find((d) => d.id === id)
  if (!definition) return { ok: false, error: `unknown MCP server: ${id}` }

  if (!(await which('claude'))) {
    return { ok: false, error: 'claude-missing' }
  }

  // `mcp add` refuses a name that already exists, so a re-provision (or a migration
  // away from the stdio server) has to remove first. Failure is ignored: the usual
  // reason is that there was nothing to remove.
  await runInLoginShell(`claude mcp remove ${id} --scope user`)

  const { ok, stdout, stderr } = await runInLoginShell(
    `claude mcp add ${id} --scope user --transport http ${definition.url}`,
    30_000,
  )
  if (!ok) return { ok: false, error: stderr || stdout || 'claude mcp add failed' }
  return { ok: true }
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
