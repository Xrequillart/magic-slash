import { useCallback, useEffect, useState } from 'react'
import { SectionHeader, SettingsCard, type SettingRowControl, type StatusTone } from '@ds/desktop'
import { Download, Hash, Plug, RefreshCw, Trash2 } from '@ds/desktop/icons'
import type { McpHealthReport, McpServerId, OptionalMcpServerState } from '../../../types'
import { useT, type MessageKey } from '../../i18n'
import { showToast } from '../../components/Toast'
import { mcpServerView, type McpServerViewState } from './mcpServerView'

/**
 * THE OPTIONAL MCP SERVERS (Slack), beside the machine setup: installed on request, and
 * checked on request.
 *
 * Not in `SetupHealthCard`, whose verdict is "can the skills run": a machine with no Slack
 * runs every skill, and painting it as something to repair would be a fault nobody has.
 * Here each server says what it is and whether it answers, and the button acts on it.
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
  'connected-claude-ai': 'settings.application.mcp.state.connectedClaudeAi',
  connected: 'settings.application.mcp.state.connected',
  'needs-auth': 'settings.application.mcp.state.needsAuth',
  failed: 'settings.application.mcp.state.failed',
  installed: 'settings.application.mcp.state.installed',
  legacy: 'settings.application.mcp.state.legacy',
  missing: 'settings.application.mcp.state.missing',
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

const NAMES: Record<McpServerId, string> = { atlassian: 'Atlassian', github: 'GitHub', slack: 'Slack' }

const HINTS: Partial<Record<McpServerId, MessageKey>> = { slack: 'settings.application.mcp.slack.hint' }

export function McpServersCard() {
  const t = useT()
  const [servers, setServers] = useState<OptionalMcpServerState[] | null>(null)
  const [report, setReport] = useState<McpHealthReport | null>(null)
  const [checking, setChecking] = useState(false)
  const [busy, setBusy] = useState<McpServerId | null>(null)

  const load = useCallback(() => {
    window.electronAPI.setup.getOptionalMcp()
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
      if (!answer.report.ok) showToast(t('settings.application.mcp.checkFailed'), 'error')
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
        showToast(result.error === 'claude-missing' ? t('settings.application.mcp.claudeMissing') : (result.error ?? t('toast.settingUpdateFailed')), 'error')
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
        title={t('settings.application.mcp.section')}
        actions={[{
          id: 'mcp-check',
          label: t('settings.application.mcp.check'),
          icon: RefreshCw,
          busy: checking,
          disabled: checking,
          onClick: () => { void check() },
        }]}
      />
      <SettingsCard
        rows={servers.map((server) => {
          const view = mcpServerView(server)
          const name = NAMES[server.id]
          const hint = HINTS[server.id]
          const controls: SettingRowControl[] = [{ kind: 'status', label: t(STATE_LABEL[view.state]), tone: STATE_TONE[view.state] }]
          if (view.action) {
            controls.push({
              kind: 'button',
              children: t(view.action === 'remove' ? 'settings.application.mcp.remove' : view.action === 'reinstall' ? 'settings.application.mcp.reinstall' : 'settings.application.setup.install'),
              icon: view.action === 'remove' ? Trash2 : Download,
              busy: busy === server.id,
              disabled: busy !== null || checking,
              onClick: () => { void act(server.id, view.action!) },
            })
          }
          const note = view.state === 'needs-auth'
            ? t(view.claudeAi ? 'settings.application.mcp.note.needsAuthClaudeAi' : 'settings.application.mcp.note.needsAuth')
            : view.state === 'failed'
              ? t('settings.application.mcp.note.failed', { detail: view.detail ?? '' })
              : view.state === 'connected-claude-ai'
                ? t('settings.application.mcp.note.claudeAi')
                : view.state === 'installed'
                  ? t('settings.application.mcp.note.unchecked')
                  : undefined
          return { id: `mcp:${server.id}`, label: name, icon: Hash, hint: hint ? t(hint) : undefined, note, control: controls }
        })}
        note={report ? t('settings.application.mcp.checkedAt', { time: new Date(report.checkedAt).toLocaleTimeString() }) : undefined}
      />
    </div>
  )
}
