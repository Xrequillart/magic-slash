import { useCallback, useEffect, useState } from 'react'
import { SectionHeader, SettingsCard, type SettingRowControl, type StatusTone } from '@ds/desktop'
import { Download, Github, Jira, Plug, RefreshCw, Slack, Trash2 } from '@ds/desktop/icons'
import type { IconComponent } from '@ds/desktop/types'
import type { McpHealthReport, McpServerId, McpServerState } from '../../../types'
import { useT, type MessageKey } from '../../i18n'
import { showToast } from '../../components/Toast'
import { mcpServerView, type McpServerViewState } from './mcpServerView'

/**
 * THE MCP SERVERS, on the Connections tab: the ones the skills need (Atlassian when its
 * integration is on, GitHub) and the optional ones (Slack), each saying what it is and
 * whether it answers, with a button that acts on it.
 *
 * The required ones are added at launch and also repaired from `SetupHealthCard`, whose
 * verdict is "can the skills run"; here they can be installed or migrated, never removed.
 * Slack is not there: a machine with no Slack runs every skill, and painting it as
 * something to repair would be a fault nobody has.
 *
 * CHECKING IS A BUTTON, never the opening of the tab: `claude mcp list` asks every server
 * the user has, connectors of their claude.ai account included, and takes seconds. Until it
 * runs, a server reads as installed or not, which is all the registry knows.
 *
 * SIGNING IN IS CLAUDE CODE'S. The app adds the server; the browser sign-in opens from
 * `/mcp` in a session. The hint says so rather than pretending the app can drive it.
 */

/** Keys rather than labels: module scope is evaluated once at import, so a `t()` here would pin the boot language. */
const STATE_LABEL: Record<McpServerViewState, MessageKey> = {
  'connected-claude-ai': 'settings.connections.mcp.state.connectedClaudeAi',
  connected: 'settings.connections.mcp.state.connected',
  'needs-auth': 'settings.connections.mcp.state.needsAuth',
  failed: 'settings.connections.mcp.state.failed',
  installed: 'settings.connections.mcp.state.installed',
  legacy: 'settings.connections.mcp.state.legacy',
  missing: 'settings.connections.mcp.state.missing',
}

const STATE_TONE: Record<McpServerViewState, StatusTone> = {
  'connected-claude-ai': 'green',
  connected: 'green',
  'needs-auth': 'orange',
  failed: 'red',
  installed: 'neutral',
  legacy: 'yellow',
  missing: 'neutral',
}

/** Exported for the settings search, which lists one row per server from it. */
export const MCP_SERVER_NAMES: Record<McpServerId, string> = { atlassian: 'Atlassian', github: 'GitHub', slack: 'Slack' }

/** The service's own logo at the head of the row: the row IS that service. */
const MARKS: Record<McpServerId, IconComponent> = { atlassian: Jira, github: Github, slack: Slack }

export const MCP_SERVER_HINTS: Record<McpServerId, MessageKey> = {
  atlassian: 'settings.connections.mcp.atlassian.hint',
  github: 'settings.connections.mcp.github.hint',
  slack: 'settings.connections.mcp.slack.hint',
}

export function McpServersCard() {
  const t = useT()
  const [servers, setServers] = useState<McpServerState[] | null>(null)
  const [report, setReport] = useState<McpHealthReport | null>(null)
  const [checking, setChecking] = useState(false)
  const [busy, setBusy] = useState<McpServerId | null>(null)

  const load = useCallback(() => {
    window.electronAPI.setup.getMcpServers()
      .then((answer) => {
        setServers(answer.servers)
        setReport(answer.report)
      })
      .catch(() => setServers([]))
  }, [])

  useEffect(load, [load])

  const check = async () => {
    setChecking(true)
    try {
      const answer = await window.electronAPI.setup.checkMcpHealth()
      setServers(answer.servers)
      setReport(answer.report)
      if (!answer.report.ok) showToast(t('settings.connections.mcp.checkFailed'), 'error')
    } finally {
      setChecking(false)
    }
  }

  const act = async (id: McpServerId, action: 'install' | 'reinstall' | 'remove') => {
    setBusy(id)
    try {
      const result = action === 'remove'
        ? await window.electronAPI.setup.removeMcp(id)
        : await window.electronAPI.setup.provisionMcp(id)
      if (!result.ok) {
        showToast(result.error === 'claude-missing' ? t('settings.connections.mcp.claudeMissing') : (result.error ?? t('toast.settingUpdateFailed')), 'error')
      }
    } finally {
      setBusy(null)
    }
    // The registry changed; what the server answers is only known after a check.
    if (report) await check()
    else load()
  }

  if (!servers || servers.length === 0) return null

  return (
    <div>
      <SectionHeader
        icon={Plug}
        title={t('settings.connections.mcp.section')}
        actions={[{
          id: 'mcp-check',
          label: t('settings.connections.mcp.check'),
          icon: RefreshCw,
          busy: checking,
          disabled: checking,
          onClick: () => { void check() },
        }]}
      />
      <SettingsCard
        rows={servers.map((server) => {
          const view = mcpServerView(server)
          const name = MCP_SERVER_NAMES[server.id]
          const hint = MCP_SERVER_HINTS[server.id]
          const controls: SettingRowControl[] = [{ kind: 'status', label: t(STATE_LABEL[view.state]), tone: STATE_TONE[view.state] }]
          if (view.action) {
            controls.push({
              kind: 'button',
              children: t(view.action === 'remove' ? 'settings.connections.mcp.remove' : view.action === 'reinstall' ? 'settings.connections.mcp.reinstall' : 'settings.application.setup.install'),
              icon: view.action === 'remove' ? Trash2 : Download,
              busy: busy === server.id,
              disabled: busy !== null || checking,
              onClick: () => { void act(server.id, view.action!) },
            })
          }
          const note = view.state === 'needs-auth'
            ? t(view.claudeAi ? 'settings.connections.mcp.note.needsAuthClaudeAi' : 'settings.connections.mcp.note.needsAuth')
            : view.state === 'failed'
              ? t('settings.connections.mcp.note.failed', { detail: view.detail ?? '' })
              : view.state === 'connected-claude-ai'
                ? t('settings.connections.mcp.note.claudeAi')
                : view.state === 'installed'
                  ? t('settings.connections.mcp.note.unchecked')
                  : undefined
          return { id: `mcp:${server.id}`, label: name, mark: { glyph: MARKS[server.id], title: name }, hint: t(hint), note, control: controls }
        })}
        note={report ? t('settings.connections.mcp.checkedAt', { time: new Date(report.checkedAt).toLocaleTimeString() }) : undefined}
      />
    </div>
  )
}
