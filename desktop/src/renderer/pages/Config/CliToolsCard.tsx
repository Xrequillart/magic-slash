import { useState } from 'react'
import { SectionHeader, SettingsCard, type SettingRowControl, type StatusTone } from '@ds/desktop'
import { Github, RefreshCw, SquareTerminal } from '@ds/desktop/icons'
import type { GhCliStatus } from '../../../types'
import { useT, type MessageKey } from '../../i18n'

/**
 * THE CLIs, on the Connections tab: one row today, GitHub's `gh`.
 *
 * It sits among the connections and not only among the prerequisites because it IS one:
 * the GitHub MCP server signs in with the token `gh auth token` prints, so a `gh` logged
 * out is a GitHub the skills cannot reach. The row says whether it is installed and
 * logged in, and as whom.
 *
 * CHECKING IS A BUTTON, like the MCP servers' below it: until it is pressed the row says
 * nothing it does not know.
 */

type GhState = 'unchecked' | 'connected' | 'logged-out' | 'missing'

const STATE_LABEL: Record<GhState, MessageKey> = {
  unchecked: 'settings.connections.cli.state.unchecked',
  connected: 'settings.connections.cli.state.connected',
  'logged-out': 'settings.connections.cli.state.loggedOut',
  missing: 'settings.connections.cli.state.missing',
}

const STATE_TONE: Record<GhState, StatusTone> = {
  unchecked: 'neutral',
  connected: 'green',
  'logged-out': 'orange',
  missing: 'red',
}

function ghState(status: GhCliStatus | null): GhState {
  if (!status) return 'unchecked'
  if (!status.installed) return 'missing'
  return status.loggedIn ? 'connected' : 'logged-out'
}

export function CliToolsCard() {
  const t = useT()
  const [gh, setGh] = useState<GhCliStatus | null>(null)
  const [checking, setChecking] = useState(false)

  const check = async () => {
    setChecking(true)
    try {
      setGh(await window.electronAPI.setup.checkGhCli())
    } finally {
      setChecking(false)
    }
  }

  const state = ghState(gh)
  const controls: SettingRowControl[] = [
    { kind: 'status', label: t(STATE_LABEL[state]), tone: STATE_TONE[state] },
    {
      kind: 'button',
      children: t('settings.connections.cli.check'),
      icon: RefreshCw,
      busy: checking,
      disabled: checking,
      onClick: () => { void check() },
    },
  ]
  const note = state === 'connected'
    ? t(gh?.account ? 'settings.connections.cli.gh.note.connectedAs' : 'settings.connections.cli.gh.note.connected', { account: gh?.account ?? '', version: gh?.version ?? '?' })
    : state === 'logged-out'
      ? t('settings.connections.cli.gh.note.loggedOut')
      : state === 'missing'
        ? t('settings.connections.cli.gh.note.missing')
        : undefined

  return (
    <div>
      <SectionHeader icon={SquareTerminal} title={t('settings.connections.cli.section')} />
      <SettingsCard
        rows={[{
          id: 'cli:gh',
          label: 'GitHub CLI',
          mark: { glyph: Github, title: 'GitHub' },
          hint: t('settings.connections.cli.gh.hint'),
          note,
          control: controls,
        }]}
      />
    </div>
  )
}
