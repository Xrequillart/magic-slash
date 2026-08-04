import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, Download, RefreshCw, ExternalLink, Copy } from 'lucide-react'
import type { McpServerStatus, PrerequisiteId, PrerequisiteStatus, SetupStatus } from '../../../types'
import { useT } from '../../i18n'

/**
 * The machine's setup, stated and repairable — the panel that replaced the install
 * script's console output.
 *
 * WHY IT IS PERMANENT AND NOT JUST A FIRST-RUN SCREEN
 * ---------------------------------------------------------------------------
 * A `curl | bash` install reported the state of the machine for the thirty seconds it
 * was running and then had no further opinion. But setups rot: someone uninstalls jq,
 * a dotfiles sync overwrites ~/.claude.json, an OS upgrade moves Node. The symptom is
 * always the same and always mystifying — a skill that stops early, or telemetry that
 * silently records nothing. This card exists so that state is legible at any time,
 * from inside the app, with the repair one click away.
 */
export function SetupHealthCard() {
  const t = useT()
  const [status, setStatus] = useState<SetupStatus | null>(null)
  /** Which prerequisite is currently being installed, if any. */
  const [installing, setInstalling] = useState<PrerequisiteId | null>(null)
  /** Live Homebrew output — a brew install can be silent for a minute. */
  const [installLog, setInstallLog] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  /** Second click needed to turn Atlassian off — see setIntegrations below. */
  const [confirmingOff, setConfirmingOff] = useState(false)

  const refresh = useCallback(() => {
    window.electronAPI.setup
      .getStatus()
      .then(setStatus)
      .catch(() => { /* the panel simply does not render */ })
  }, [])

  useEffect(refresh, [refresh])

  useEffect(() => {
    const unsubscribe = window.electronAPI.setup.onInstallProgress(({ chunk }) => {
      // Tail only: the panel shows progress, not a full build log.
      setInstallLog((previous) => (previous + chunk).slice(-2000))
    })
    return () => { unsubscribe() }
  }, [])

  const install = async (id: PrerequisiteId) => {
    setInstalling(id)
    setInstallLog('')
    try {
      await window.electronAPI.setup.installPrerequisite(id)
    } finally {
      setInstalling(null)
      refresh()
    }
  }

  const provisionMcp = async (id: McpServerStatus['id']) => {
    setBusy(`mcp:${id}`)
    try {
      await window.electronAPI.setup.provisionMcp(id)
    } finally {
      setBusy(null)
      refresh()
    }
  }

  /**
   * Switch the integrations.
   *
   * Turning Atlassian OFF unregisters its MCP server and withdraws the Jira
   * permissions, which is why it asks first: everything else in this card ADDS
   * something, and one mis-click here would revoke someone's Jira access in the
   * middle of a ticket. Turning it back on needs no confirmation — nothing is lost.
   */
  const setIntegrations = async (atlassian: boolean) => {
    if (!atlassian && confirmingOff === false) {
      setConfirmingOff(true)
      return
    }
    setConfirmingOff(false)
    setBusy('integrations')
    try {
      setStatus(await window.electronAPI.setup.setIntegrations(atlassian))
    } finally {
      setBusy(null)
    }
  }

  const reinstallSkills = async () => {
    setBusy('skills')
    try {
      await window.electronAPI.setup.reinstallSkills()
    } finally {
      setBusy(null)
      refresh()
    }
  }

  const copy = (text: string) => {
    void navigator.clipboard.writeText(text)
    setCopied(text)
    setTimeout(() => setCopied(null), 1500)
  }

  if (!status) return null

  // A missing OPTIONAL tool is a warning, never a fault: `gh` absent only costs
  // /magic:resolve its threaded replies, and there is a documented fallback.
  const missingRequired = status.prerequisites.filter((p) => p.required && (!p.installed || p.outdated))
  const missingOptional = status.prerequisites.filter((p) => !p.required && !p.installed)
  const mcpToFix = status.mcpServers.filter(
    (s) => s.state !== 'configured' && (s.id === 'github' ? status.integrations.github : status.integrations.atlassian),
  )
  const healthy = missingRequired.length === 0 && mcpToFix.length === 0 && status.missingSkills.length === 0

  const Icon = missingRequired.length > 0 ? XCircle : healthy ? CheckCircle2 : AlertTriangle
  // Theme tokens rather than Tailwind's numbered scale — a fixed colour stops being
  // readable on half the themes (see themes.test.ts).
  const tone = missingRequired.length > 0 ? 'text-red' : healthy ? 'text-green' : 'text-yellow'

  return (
    <div className="bg-surface border border-line-strong rounded-xl p-4 mt-3">
      <div className="flex items-start gap-2.5">
        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${tone}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="font-medium text-sm">{t('settings.about.setup.title')}</div>
            <button
              onClick={refresh}
              className="text-xs text-text-secondary/60 hover:text-ink transition-colors flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              {t('settings.about.setup.recheck')}
            </button>
          </div>
          <div className="text-xs text-text-secondary/70 mt-1">
            {healthy ? t('settings.about.setup.healthy') : t('settings.about.setup.degraded')}
          </div>

          {/* Required tools that are missing or too old: nothing runs until these are fixed. */}
          {missingRequired.length > 0 && (
            <ul className="mt-2.5 space-y-2">
              {missingRequired.map((prerequisite) => (
                <PrerequisiteRow
                  key={prerequisite.id}
                  prerequisite={prerequisite}
                  installing={installing === prerequisite.id}
                  disabled={installing !== null}
                  onInstall={() => install(prerequisite.id)}
                  onCopy={copy}
                  copied={copied}
                />
              ))}
            </ul>
          )}

          {missingOptional.length > 0 && (
            <ul className="mt-2 space-y-2">
              {missingOptional.map((prerequisite) => (
                <PrerequisiteRow
                  key={prerequisite.id}
                  prerequisite={prerequisite}
                  installing={installing === prerequisite.id}
                  disabled={installing !== null}
                  onInstall={() => install(prerequisite.id)}
                  onCopy={copy}
                  copied={copied}
                  optional
                />
              ))}
            </ul>
          )}

          {/* Homebrew's own output while it works. Hidden when idle. */}
          {installing && installLog && (
            <pre className="mt-2 max-h-24 overflow-y-auto text-[10px] leading-relaxed text-text-secondary/60 bg-bg border border-line rounded-lg p-2 whitespace-pre-wrap">
              {installLog}
            </pre>
          )}

          {mcpToFix.map((server) => (
            <div key={server.id} className="mt-2 flex items-start justify-between gap-2">
              <div className="text-xs text-text-secondary/70">
                {/* `legacy` and `missing` are genuinely different situations: one is an
                    absence to fill, the other a working config we refuse to overwrite
                    without asking (see main/setup/mcp.ts). */}
                {server.state === 'legacy'
                  ? t('settings.about.setup.mcp.legacy', { name: server.id })
                  : t('settings.about.setup.mcp.missing', { name: server.id })}
              </div>
              <button
                onClick={() => provisionMcp(server.id)}
                disabled={busy === `mcp:${server.id}`}
                className="shrink-0 px-2 py-1 text-[11px] font-medium text-accent bg-accent/10 border border-accent/20 rounded-md hover:bg-accent/20 transition-colors disabled:opacity-50"
              >
                {server.state === 'legacy'
                  ? t('settings.about.setup.mcp.migrate')
                  : t('settings.about.setup.mcp.configure')}
              </button>
            </div>
          ))}

          {status.missingSkills.length > 0 && (
            <div className="mt-2 flex items-start justify-between gap-2">
              <div className="text-xs text-text-secondary/70">
                {t('settings.about.setup.skills.missing', { names: status.missingSkills.join(', ') })}
              </div>
              <button
                onClick={reinstallSkills}
                disabled={busy === 'skills'}
                className="shrink-0 px-2 py-1 text-[11px] font-medium text-accent bg-accent/10 border border-accent/20 rounded-md hover:bg-accent/20 transition-colors disabled:opacity-50"
              >
                {busy === 'skills' ? t('common.loading') : t('settings.about.setup.skills.reinstall')}
              </button>
            </div>
          )}

          {/* Integrations. Lives here rather than in its own section because it is the
              same decision the first-run wizard makes, reading the same status — and
              because the wizard promises it can be changed later, which has to be
              true somewhere. */}
          <div className="mt-3 pt-3 border-t border-line">
            <div className="text-xs font-medium text-text-secondary/70">
              {t('settings.about.setup.integrations.title')}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <button
                onClick={() => setIntegrations(true)}
                disabled={busy === 'integrations'}
                className={`px-2.5 py-1 text-[11px] rounded-md border transition-colors disabled:opacity-50 ${
                  status.integrations.atlassian
                    ? 'bg-accent/10 border-accent/30 text-accent'
                    : 'bg-surface border-line text-text-secondary hover:text-ink'
                }`}
              >
                {t('setup.wizard.integrations.both')}
              </button>
              <button
                onClick={() => setIntegrations(false)}
                disabled={busy === 'integrations'}
                className={`px-2.5 py-1 text-[11px] rounded-md border transition-colors disabled:opacity-50 ${
                  !status.integrations.atlassian
                    ? 'bg-accent/10 border-accent/30 text-accent'
                    : confirmingOff
                      ? 'bg-red/10 border-red/30 text-red'
                      : 'bg-surface border-line text-text-secondary hover:text-ink'
                }`}
              >
                {confirmingOff && status.integrations.atlassian
                  ? t('settings.about.setup.integrations.confirmOff')
                  : t('setup.wizard.integrations.githubOnly')}
              </button>
            </div>
            {confirmingOff && status.integrations.atlassian && (
              <div className="text-[11px] text-text-secondary/50 mt-1.5">
                {t('settings.about.setup.integrations.offWarning')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface PrerequisiteRowProps {
  prerequisite: PrerequisiteStatus
  installing: boolean
  disabled: boolean
  optional?: boolean
  copied: string | null
  onInstall: () => void
  onCopy: (text: string) => void
}

/**
 * One tool, and the shortest path to having it.
 *
 * Three different affordances, because there are three genuinely different cases and
 * collapsing them would strand someone: brew can install it (button), we know the
 * command but cannot run it (copy), or only its own installer can (link). Claude Code
 * is the third — it ships an installer and is a global npm package on many machines,
 * so naming one command would be wrong as often as right.
 */
function PrerequisiteRow({ prerequisite, installing, disabled, optional, copied, onInstall, onCopy }: PrerequisiteRowProps) {
  const t = useT()

  return (
    <li className="flex items-start justify-between gap-2">
      <div className="text-xs text-text-secondary/70 flex gap-1.5 min-w-0">
        <span aria-hidden className={optional ? 'text-text-secondary/40' : 'text-red'}>•</span>
        <span>
          {prerequisite.outdated
            ? t('settings.about.setup.prerequisite.outdated', {
                name: prerequisite.id,
                version: prerequisite.version ?? '?',
                min: prerequisite.minVersion ?? '?',
              })
            : optional
              ? t('settings.about.setup.prerequisite.optional', { name: prerequisite.id })
              : t('settings.about.setup.prerequisite.missing', { name: prerequisite.id })}
        </span>
      </div>

      {prerequisite.installable ? (
        <button
          onClick={onInstall}
          disabled={disabled}
          className="shrink-0 flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-accent bg-accent/10 border border-accent/20 rounded-md hover:bg-accent/20 transition-colors disabled:opacity-50"
        >
          <Download className="w-3 h-3" />
          {installing ? t('settings.about.setup.installing') : t('settings.about.setup.install')}
        </button>
      ) : prerequisite.installCommand ? (
        <button
          onClick={() => onCopy(prerequisite.installCommand!)}
          className="shrink-0 flex items-center gap-1 px-2 py-1 text-[11px] font-mono text-text-secondary border border-line rounded-md hover:bg-surface hover:text-ink transition-colors"
        >
          <Copy className="w-3 h-3" />
          {copied === prerequisite.installCommand ? t('common.copied') : prerequisite.installCommand}
        </button>
      ) : prerequisite.docsUrl ? (
        <a
          href={prerequisite.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-text-secondary border border-line rounded-md hover:bg-surface hover:text-ink transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          {t('settings.about.setup.getIt')}
        </a>
      ) : null}
    </li>
  )
}
