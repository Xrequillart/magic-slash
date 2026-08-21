import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Download, RefreshCw, ExternalLink, Copy, Wrench, Loader2, ChevronDown } from 'lucide-react'
import type { McpServerStatus, PrerequisiteId, PrerequisiteStatus, SetupStatus } from '../../../types'
import { useT } from '../../i18n'
import { SectionHeader } from './SectionHeader'

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
 *
 * WHAT IT ANSWERS
 * ---------------------------------------------------------------------------
 * One question, three checks: are the required tools there, are the MCP servers
 * registered, are the skills installed. The verdict is binary on purpose — a green
 * check or a red cross with the reason spelled out. A middle "warning" state only
 * ever raised the question of whether it mattered, and the answer was always the
 * same: fix it or ignore it forever. Optional tools are checked by the first-run
 * wizard, which is where a nice-to-have belongs.
 */
export function SetupHealthCard() {
  const t = useT()
  /** Null while the check is in flight — the card shows a spinner rather than nothing. */
  const [status, setStatus] = useState<SetupStatus | null>(null)
  /** The check itself failed (no IPC answer). Distinct from "answered: something is missing". */
  const [checkFailed, setCheckFailed] = useState(false)
  /** Which prerequisite is currently being installed, if any. */
  const [installing, setInstalling] = useState<PrerequisiteId | null>(null)
  /** Live installer output — an install can be silent for a minute. */
  const [installLog, setInstallLog] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  /** Confirmation pending before Jira is switched off — see applyIntegrations below. */
  const [confirmingOff, setConfirmingOff] = useState(false)

  const refresh = useCallback(() => {
    // Back to the spinner: re-checking is the one moment where the numbers on
    // screen are known to be stale, and showing the old verdict during it is how
    // you end up trusting a green check that was computed two installs ago.
    setStatus(null)
    setCheckFailed(false)
    window.electronAPI.setup
      .getStatus()
      .then(setStatus)
      .catch(() => setCheckFailed(true))
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
   * permissions, which is why the select does not apply that choice on its own:
   * everything else in this card ADDS something, and one mis-pick here would
   * revoke someone's Jira access in the middle of a ticket. Turning it back on
   * applies immediately — nothing is lost.
   */
  const applyIntegrations = async (atlassian: boolean) => {
    setConfirmingOff(false)
    setBusy('integrations')
    try {
      setStatus(await window.electronAPI.setup.setIntegrations(atlassian))
    } finally {
      setBusy(null)
    }
  }

  const pickIntegrations = (atlassian: boolean, current: boolean) => {
    if (atlassian) {
      // Also the way out of a pending turn-off: picking "Jira and GitHub" again
      // cancels it, so the select never sits on a value that is not in effect.
      if (confirmingOff) setConfirmingOff(false)
      if (!current) void applyIntegrations(true)
      return
    }
    if (current) setConfirmingOff(true)
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

  // Shared between the three states so the heading and its "Check again" never
  // move or disappear as the card resolves.
  const header = (
    <SectionHeader
      icon={Wrench}
      title={t('settings.application.setup.title')}
      action={
        <button
          onClick={refresh}
          disabled={status === null && !checkFailed}
          className="text-xs text-text-secondary/60 hover:text-ink transition-colors flex items-center gap-1 disabled:opacity-50"
        >
          <RefreshCw className="w-3 h-3" />
          {t('settings.application.setup.recheck')}
        </button>
      }
    />
  )

  // Checking, or the check never came back. Same shape as the resolved card — an
  // icon and a sentence — so nothing shifts when the answer lands.
  if (!status) {
    return (
      <div>
        {header}
        <div className="bg-surface border border-line-strong rounded-xl p-4">
          <div className="flex items-start gap-2.5">
            {checkFailed
              ? <XCircle className="w-4 h-4 mt-0.5 shrink-0 text-red" />
              : <Loader2 className="w-4 h-4 mt-0.5 shrink-0 text-text-secondary/60 animate-spin" />}
            <div className="text-xs text-text-secondary/70">
              {checkFailed
                ? t('settings.application.setup.checkFailed')
                : t('settings.application.setup.checking')}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Only the required tools: an absent `gh` costs /magic:resolve its threaded
  // replies and has a documented fallback, which is not something to paint red
  // on a card whose whole job is to say whether the skills can run.
  const missingRequired = status.prerequisites.filter((p) => p.required && (!p.installed || p.outdated))
  const mcpToFix = status.mcpServers.filter(
    (s) => s.state !== 'configured' && (s.id === 'github' ? status.integrations.github : status.integrations.atlassian),
  )
  const healthy = missingRequired.length === 0 && mcpToFix.length === 0 && status.missingSkills.length === 0

  // The select shows the pending choice while a turn-off waits for confirmation,
  // so the sentence under it reads as being about what you just picked.
  const atlassianSelected = confirmingOff ? false : status.integrations.atlassian

  return (
    <div>
      {/* Titled like every other section of the Application tab, rather than from
          inside the card: it sits among the feature toggles now, and a bold title
          in the box would make it read as a different kind of thing. The status
          icon stays inside — it belongs to the verdict, not to the heading. */}
      {header}
      <div className="bg-surface border border-line-strong rounded-xl p-4">
        <div className="flex items-start gap-2.5">
          {/* Theme tokens rather than Tailwind's numbered scale — a fixed colour
              stops being readable on half the themes (see themes.test.ts). */}
          {healthy
            ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-green" />
            : <XCircle className="w-4 h-4 mt-0.5 shrink-0 text-red" />}
          <div className="min-w-0 flex-1">
            <div className="text-xs text-text-secondary/70">
              {healthy ? t('settings.application.setup.healthy') : t('settings.application.setup.degraded')}
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

            {/* The installer's own output while it works. Hidden when idle. */}
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
                    ? t('settings.application.setup.mcp.legacy', { name: server.id })
                    : t('settings.application.setup.mcp.missing', { name: server.id })}
                </div>
                <button
                  onClick={() => provisionMcp(server.id)}
                  disabled={busy === `mcp:${server.id}`}
                  className="shrink-0 px-2 py-1 text-[11px] font-medium text-accent bg-accent/10 border border-accent/20 rounded-md hover:bg-accent/20 transition-colors disabled:opacity-50"
                >
                  {server.state === 'legacy'
                    ? t('settings.application.setup.mcp.migrate')
                    : t('settings.application.setup.mcp.configure')}
                </button>
              </div>
            ))}

            {status.missingSkills.length > 0 && (
              <div className="mt-2 flex items-start justify-between gap-2">
                <div className="text-xs text-text-secondary/70">
                  {t('settings.application.setup.skills.missing', { names: status.missingSkills.join(', ') })}
                </div>
                <button
                  onClick={reinstallSkills}
                  disabled={busy === 'skills'}
                  className="shrink-0 px-2 py-1 text-[11px] font-medium text-accent bg-accent/10 border border-accent/20 rounded-md hover:bg-accent/20 transition-colors disabled:opacity-50"
                >
                  {busy === 'skills' ? t('common.loading') : t('settings.application.setup.skills.reinstall')}
                </button>
              </div>
            )}

            {/* Integrations. Lives here rather than in its own section because it is the
                same decision the first-run wizard makes, reading the same status — and
                because the wizard promises it can be changed later, which has to be
                true somewhere. A select rather than a pair of buttons: it is one choice
                between two mutually exclusive values, and it says which one is in
                effect without the reader having to compare two highlight states. */}
            <div className="mt-3 pt-3 border-t border-line">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-medium text-text-secondary/70">
                  {t('settings.application.setup.integrations.title')}
                </div>
                <div className="relative shrink-0">
                  <select
                    value={atlassianSelected ? 'both' : 'github'}
                    onChange={(e) => pickIntegrations(e.target.value === 'both', status.integrations.atlassian)}
                    disabled={busy === 'integrations'}
                    aria-label={t('settings.application.setup.integrations.title')}
                    className="pl-3 pr-7 py-1.5 bg-surface border border-line-field rounded-lg text-xs focus:outline-none focus:border-accent transition-colors appearance-none cursor-pointer disabled:opacity-50"
                  >
                    <option value="both">{t('setup.wizard.integrations.both')}</option>
                    <option value="github">{t('setup.wizard.integrations.githubOnly')}</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary/50 pointer-events-none" />
                </div>
              </div>
              {confirmingOff && (
                <div className="mt-2 flex items-start justify-between gap-2">
                  <div className="text-[11px] text-text-secondary/50">
                    {t('settings.application.setup.integrations.offWarning')}
                  </div>
                  <button
                    onClick={() => applyIntegrations(false)}
                    disabled={busy === 'integrations'}
                    className="shrink-0 px-2 py-1 text-[11px] font-medium text-red bg-red/10 border border-red/20 rounded-md hover:bg-red/20 transition-colors disabled:opacity-50"
                  >
                    {t('settings.application.setup.integrations.confirmOff')}
                  </button>
                </div>
              )}
            </div>
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
  copied: string | null
  onInstall: () => void
  onCopy: (text: string) => void
}

/**
 * One tool, and the shortest path to having it.
 *
 * Three different affordances, because there are three genuinely different cases and
 * collapsing them would strand someone: we can install it ourselves (button), we know
 * the command but cannot run it (copy), or we can only point at a page (link).
 *
 * Claude Code takes the first branch like everything else. It has no brew formula, but
 * it ships an official installer we run for the user — being the one REQUIRED tool the
 * app could not repair made it the worst possible thing to leave as a link.
 */
function PrerequisiteRow({ prerequisite, installing, disabled, copied, onInstall, onCopy }: PrerequisiteRowProps) {
  const t = useT()

  return (
    <li className="flex items-start justify-between gap-2">
      <div className="text-xs text-text-secondary/70 flex gap-1.5 min-w-0">
        <span aria-hidden className="text-red">•</span>
        <span>
          {prerequisite.outdated
            ? t('settings.application.setup.prerequisite.outdated', {
                name: prerequisite.id,
                version: prerequisite.version ?? '?',
                min: prerequisite.minVersion ?? '?',
              })
            : t('settings.application.setup.prerequisite.missing', { name: prerequisite.id })}
        </span>
      </div>

      {prerequisite.installable ? (
        <button
          onClick={onInstall}
          disabled={disabled}
          className="shrink-0 flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-accent bg-accent/10 border border-accent/20 rounded-md hover:bg-accent/20 transition-colors disabled:opacity-50"
        >
          <Download className="w-3 h-3" />
          {installing ? t('settings.application.setup.installing') : t('settings.application.setup.install')}
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
          {t('settings.application.setup.getIt')}
        </a>
      ) : null}
    </li>
  )
}
