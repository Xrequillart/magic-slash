import { useCallback, useEffect, useState } from 'react'
import { HealthCard, SectionHeader, type RepairRow } from '@ds/desktop'
import { Download, RefreshCw, Wrench } from '@ds/desktop/icons'
import type { McpServerStatus, PrerequisiteId, SetupStatus } from '../../../types'
import { useT } from '../../i18n'
import { SELECT_WIDTH } from '../../theme/controls'
import { getSetupStatus, SETUP_SIMULATION_EVENT } from '../../dev/simulatedSetup'

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
 *
 * WHAT DRAWS IT
 * ---------------------------------------------------------------------------
 * `HealthCard`, the design system's, in all three states — checking, failed, and the
 * verdict with its repairs — so the mark, the tone and the arrangement are the same
 * ones the telemetry card downstairs wears. The faults are `RepairList`: they were
 * three lists in three shapes here, with the repair button spelled out four times in
 * raw classes and one of them an `<a target="_blank">`, which in Electron is a
 * renderer that can be navigated away from the app.
 *
 * WHAT IS LEFT IN THIS FILE is the whole of the reading and none of the drawing: which
 * tools count as missing, which MCP servers are worth fixing given the integrations in
 * force, what each repair does, and the one confirmation that stands between a picker
 * and somebody losing their Jira access mid-ticket.
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
    // Through `dev/simulatedSetup`, which the quick-settings verdict also reads: with
    // only one of the two in on the simulation, pressing a verdict that says "3 to fix"
    // would open this card saying the machine is fine.
    getSetupStatus()
      .then(setStatus)
      .catch(() => setCheckFailed(true))
  }, [])

  useEffect(refresh, [refresh])

  // The debug switch, flipped while this card is on screen.
  useEffect(() => {
    window.addEventListener(SETUP_SIMULATION_EVENT, refresh)
    return () => window.removeEventListener(SETUP_SIMULATION_EVENT, refresh)
  }, [refresh])

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
      // Data rather than a hand-built button: `SectionHeader` draws every control
      // beside a heading at one rung now, which is what stops this one and the two on
      // the Organization tab being three spellings of the same thing.
      actions={[{
        id: 'recheck',
        label: t('settings.application.setup.recheck'),
        icon: RefreshCw,
        disabled: status === null && !checkFailed,
        onClick: refresh,
      }]}
    />
  )

  // Checking, or the check never came back. `HealthCard` is the same shape as the
  // resolved card below — a mark and a sentence — so nothing shifts when the answer
  // lands, and the two states it is drawn in are its own: `checking` is the spinner,
  // `failed` is the check not coming back, which is not the same as something being
  // broken. No `title`: the section heading above already says what this is about.
  if (!status) {
    return (
      <div>
        {header}
        <HealthCard
          state={checkFailed ? 'failed' : 'checking'}
          message={
            checkFailed
              ? t('settings.application.setup.checkFailed')
              : t('settings.application.setup.checking')
          }
        />
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

  // THE FAULTS, IN ONE LIST — see `RepairList`. They were three lists in three shapes:
  // bulleted tools with a button, unbulleted MCP servers with another, and a skills line
  // with a third. They are the same kind of thing (something this machine needs and has
  // not got) and they are counted together in the verdict above, so they are one list.
  const fixes: RepairRow[] = [
    ...missingRequired.map((prerequisite) => ({
      id: `tool:${prerequisite.id}`,
      message: prerequisite.outdated
        ? t('settings.application.setup.prerequisite.outdated', {
            name: prerequisite.id,
            version: prerequisite.version ?? '?',
            min: prerequisite.minVersion ?? '?',
          })
        : t('settings.application.setup.prerequisite.missing', { name: prerequisite.id }),
      // Three affordances for three genuinely different cases, and collapsing them would
      // strand someone: we can install it ourselves, we know the command but cannot run
      // it, or we can only point at a page. Claude Code takes the first branch like
      // everything else — it has no brew formula, but it ships an official installer we
      // run for the user, and being the one REQUIRED tool the app could not repair made
      // it the worst possible thing to leave as a link.
      action: prerequisite.installable
        ? {
            kind: 'fix' as const,
            label: installing === prerequisite.id
              ? t('settings.application.setup.installing')
              : t('settings.application.setup.install'),
            icon: Download,
            busy: installing === prerequisite.id,
            disabled: installing !== null,
            onClick: () => install(prerequisite.id),
          }
        : prerequisite.installCommand
          ? {
              kind: 'copy' as const,
              command: prerequisite.installCommand,
              copiedLabel: t('common.copied'),
              copied: copied === prerequisite.installCommand,
              onCopy: copy,
            }
          : prerequisite.docsUrl
            ? {
                kind: 'open' as const,
                label: t('settings.application.setup.getIt'),
                // The app's own way out to the browser. This was an `<a target="_blank">`,
                // the only one in the app: in Electron that is a renderer that can be
                // navigated away from itself.
                onOpen: () => window.electronAPI.shell.openExternal(prerequisite.docsUrl!),
              }
            : undefined,
    })),
    ...mcpToFix.map((server) => ({
      id: `mcp:${server.id}`,
      // `legacy` and `missing` are genuinely different situations: one is an absence to
      // fill, the other a working config we refuse to overwrite without asking (see
      // main/setup/mcp.ts).
      message: server.state === 'legacy'
        ? t('settings.application.setup.mcp.legacy', { name: server.id })
        : t('settings.application.setup.mcp.missing', { name: server.id }),
      action: {
        kind: 'fix' as const,
        label: server.state === 'legacy'
          ? t('settings.application.setup.mcp.migrate')
          : t('settings.application.setup.mcp.configure'),
        busy: busy === `mcp:${server.id}`,
        onClick: () => provisionMcp(server.id),
      },
    })),
    ...(status.missingSkills.length > 0
      ? [{
          id: 'skills',
          message: t('settings.application.setup.skills.missing', { names: status.missingSkills.join(', ') }),
          action: {
            kind: 'fix' as const,
            label: t('settings.application.setup.skills.reinstall'),
            busy: busy === 'skills',
            onClick: reinstallSkills,
          },
        }]
      : []),
  ]

  return (
    <div>
      {/* Titled like every other section of the Application tab, rather than from
          inside the card: it sits among the feature toggles now, and a bold title
          in the box would make it read as a different kind of thing. The status
          icon stays inside — it belongs to the verdict, not to the heading. */}
      {header}
      <HealthCard
        state={healthy ? 'healthy' : 'degraded'}
        message={healthy
          ? t('settings.application.setup.healthy')
          : t('settings.application.setup.degraded')}
        fixes={fixes}
        // The installer's own output while it works. Cleared when idle, so the pane
        // cannot outlive the install it belonged to.
        log={installing ? installLog : undefined}
        // Integrations. In this card rather than in a section of its own because it is
        // the same decision the first-run wizard makes, reading the same status — and
        // because the wizard promises it can be changed later, which has to be true
        // somewhere. A select rather than a pair of buttons: it is one choice between two
        // mutually exclusive values, and it says which one is in effect without the
        // reader having to compare two highlight states.
        setting={{
          label: t('settings.application.setup.integrations.title'),
          control: {
            kind: 'select',
            value: atlassianSelected ? 'both' : 'github',
            options: [
              { value: 'both', label: t('setup.wizard.integrations.both') },
              { value: 'github', label: t('setup.wizard.integrations.githubOnly') },
            ],
            onChange: (next) => pickIntegrations(next === 'both', status.integrations.atlassian),
            disabled: busy === 'integrations',
            ariaLabel: t('settings.application.setup.integrations.title'),
            width: SELECT_WIDTH,
          },
        }}
        // The one choice on this card that is not applied on the spot — see
        // `applyIntegrations`. It is an alert and not a row because it has no value of
        // its own: it is the reason the picker above is showing something that is not in
        // effect yet.
        alert={confirmingOff
          ? {
              message: t('settings.application.setup.integrations.offWarning'),
              actions: [{
                label: t('settings.application.setup.integrations.confirmOff'),
                onClick: () => applyIntegrations(false),
              }],
            }
          : undefined}
      />
    </div>
  )
}
