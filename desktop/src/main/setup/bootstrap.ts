import { ensureMcpServers } from './mcp'
import { configureClaudeHooks } from '../hooks/claude-hooks-config'

/**
 * The part of the old install script that needs no human: run once per launch.
 *
 * WHY IT RUNS EVERY LAUNCH RATHER THAN ONCE
 * ---------------------------------------------------------------------------
 * Because a setup is not a one-time event that succeeded in the past — it is a
 * property of the machine right now, and machines drift. Someone runs
 * `claude mcp remove github` while debugging something else, a colleague's dotfiles
 * repo overwrites ~/.claude.json, an OS migration restores a partial home directory.
 * The install script could not notice any of that; it had already exited months ago.
 *
 * Every step is idempotent and, on a machine that is already correct, writes nothing:
 * ensureMcpServers only touches servers in state `missing`, and configureClaudeHooks
 * rewrites the same content it would have found.
 *
 * WHY IT IS ALWAYS FIRE-AND-FORGET
 * ---------------------------------------------------------------------------
 * Nothing here may delay a launch or block the connectivity gate. A machine with a
 * slow shell profile, no network, or no `claude` on PATH must still get a working app
 * window — the setup panel is where those problems get reported, not a stalled splash
 * screen. So failures are logged and swallowed, and the UI reads the resulting state
 * through `getSetupStatus()` rather than being told about it here.
 */
export async function completeMachineSetup(
  integrations: { github?: boolean; atlassian?: boolean } | undefined,
): Promise<void> {
  try {
    // Now that the real integration choice is known, re-assert the permission
    // allowlist with it — the launch-path call ran before hydration and deliberately
    // left the Atlassian grant untouched (see claude-hooks-config.ts).
    configureClaudeHooks({ atlassian: integrations?.atlassian !== false })
  } catch (error) {
    console.error('[setup] failed to re-apply permissions:', error)
  }

  try {
    const { provisioned, errors } = await ensureMcpServers(integrations)
    if (provisioned.length > 0) {
      console.log(`[setup] provisioned MCP server(s): ${provisioned.join(', ')}`)
    }
    if (errors.length > 0) {
      console.warn(`[setup] MCP provisioning issues: ${errors.join('; ')}`)
    }
  } catch (error) {
    console.error('[setup] MCP provisioning failed:', error)
  }
}
