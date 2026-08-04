import { ipcMain, BrowserWindow } from 'electron'
import type { McpServerId, PrerequisiteId, SetupStatus } from '../../types'
import { getSetupStatus } from '../setup/status'
import { provisionMcpServer, removeMcpServer } from '../setup/mcp'
import { installPrerequisite } from '../setup/brew'
import { updateSkills } from '../skills-updater'
import { setIntegration } from '../config/config'
import { configureClaudeHooks } from '../hooks/claude-hooks-config'

/**
 * The setup surface: read the machine's state, and repair it on request.
 *
 * Everything here is idempotent and safe to call twice — the settings panel and the
 * first-run wizard both drive it, and a user who clicks a repair button while the
 * launch-time provisioning is still running must not end up with a broken config.
 */

const MCP_IDS: McpServerId[] = ['atlassian', 'github']
const PREREQUISITE_IDS: PrerequisiteId[] = ['claude', 'node', 'git', 'jq', 'gh']

export function setupSetupHandlers(getMainWindow: () => BrowserWindow | null) {
  ipcMain.handle('setup:getStatus', async (): Promise<SetupStatus> => getSetupStatus())

  ipcMain.handle('setup:provisionMcp', async (_event, { id }: { id: McpServerId }) => {
    // Validate against the known set: the id reaches a shell command downstream.
    if (!MCP_IDS.includes(id)) return { ok: false, error: `unknown MCP server: ${id}` }
    return provisionMcpServer(id)
  })

  ipcMain.handle('setup:removeMcp', async (_event, { id }: { id: McpServerId }) => {
    if (!MCP_IDS.includes(id)) return { ok: false, error: `unknown MCP server: ${id}` }
    return removeMcpServer(id)
  })

  /**
   * Install a prerequisite with Homebrew, streaming its output to the panel.
   *
   * The renderer gets progress on a channel rather than in the return value, so a
   * five-minute install shows what it is doing instead of freezing a button.
   */
  ipcMain.handle('setup:installPrerequisite', async (_event, { id }: { id: PrerequisiteId }) => {
    if (!PREREQUISITE_IDS.includes(id)) return { ok: false, output: '', error: `unknown prerequisite: ${id}` }
    return installPrerequisite(id, (chunk) => {
      getMainWindow()?.webContents.send('setup:installProgress', { id, chunk })
    })
  })

  /** Re-download the skills. Same path as the launch-time update, on demand. */
  ipcMain.handle('setup:reinstallSkills', async () => updateSkills())

  /**
   * Record the integration choice.
   *
   * Three things follow from it, and all three have to happen here or the choice is
   * cosmetic: the config (which the skills read), the permission allowlist (which
   * must not grant Jira tools to a GitHub-only user), and the MCP registry.
   *
   * Turning Atlassian OFF removes its server. That is a real deletion, so it is only
   * ever reached from an explicit choice in the UI — never from a default.
   */
  ipcMain.handle('setup:setIntegrations', async (_event, { atlassian }: { atlassian: boolean }) => {
    // setIntegration, not a hand-rolled write: it already knows github is the literal
    // `true` in the schema, and it writes through the cloud store like every other
    // config mutation.
    setIntegration('atlassian', atlassian)

    configureClaudeHooks({ atlassian })

    if (atlassian) {
      await provisionMcpServer('atlassian')
    } else {
      await removeMcpServer('atlassian')
    }

    return getSetupStatus()
  })
}
