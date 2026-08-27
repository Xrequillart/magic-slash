import { useCallback, useEffect, useState } from 'react'
import { Wand2, ChevronRight, X, Check, AlertTriangle, Download, ExternalLink, Copy, Loader2 } from 'lucide-react'
import type { PrerequisiteId, PrerequisiteStatus, SetupStatus } from '../../types'
import { useT } from '../i18n'

/**
 * First launch: choose the integrations, then make the machine ready.
 *
 * This is what replaced `curl -fsSL magic-slash.io/install.sh | bash`. The script had
 * one advantage — it ran in a terminal, where prompting for a choice and printing an
 * error are free — and several problems this screen exists to fix: it could not be
 * re-run without re-downloading it, it asked for a GitHub token it then wrote to disk
 * in clear text, and everything it verified went stale the moment it exited.
 *
 * WHAT IT ASKS VERSUS WHAT IT JUST DOES
 * ---------------------------------------------------------------------------
 * Only the integration choice is a question, because only it has no right answer. The
 * skills, the hooks, the permissions and the MCP servers are all provisioned without
 * asking — the app already knows what they should be, and a wizard that made someone
 * click "next" four times to be told what it was going to do anyway is just a script
 * with a mouse.
 *
 * Installing software is the exception: an installer runs only when the user presses
 * the button. Nothing gets installed on someone's machine because they opened an app.
 */
export function SetupWizard({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const t = useT()
  const [step, setStep] = useState<'integrations' | 'prerequisites'>('integrations')
  const [status, setStatus] = useState<SetupStatus | null>(null)
  const [atlassian, setAtlassian] = useState(true)
  const [saving, setSaving] = useState(false)
  const [installing, setInstalling] = useState<PrerequisiteId | null>(null)
  const [installLog, setInstallLog] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const next = await window.electronAPI.setup.getStatus()
      setStatus(next)
      setAtlassian(next.integrations.atlassian)
      // Someone re-opening this with the choice already made should not be asked
      // again; they came for the prerequisites.
      if (next.integrationsChosen) setStep('prerequisites')
    } catch {
      // Leave the wizard on its loading state rather than asserting a state we
      // could not read.
    }
  }, [])

  useEffect(() => {
    if (isOpen) void refresh()
  }, [isOpen, refresh])

  useEffect(() => {
    const unsubscribe = window.electronAPI.setup.onInstallProgress(({ chunk }) => {
      setInstallLog((previous) => (previous + chunk).slice(-2000))
    })
    return () => { unsubscribe() }
  }, [])

  // Escape closes, like every other modal in the app.
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  /**
   * Record the choice and provision what follows from it.
   *
   * Awaited rather than fired off, because the next step reports the result: showing
   * "everything is ready" while the MCP registration was still running would be a
   * guess dressed as a fact.
   */
  const confirmIntegrations = async () => {
    setSaving(true)
    try {
      setStatus(await window.electronAPI.setup.setIntegrations(atlassian))
      setStep('prerequisites')
    } finally {
      setSaving(false)
    }
  }

  const install = async (id: PrerequisiteId) => {
    setInstalling(id)
    setInstallLog('')
    try {
      await window.electronAPI.setup.installPrerequisite(id)
    } finally {
      setInstalling(null)
      void refresh()
    }
  }

  const copy = (text: string) => {
    void navigator.clipboard.writeText(text)
    setCopied(text)
    setTimeout(() => setCopied(null), 1500)
  }

  if (!isOpen) return null

  const missingRequired = status?.prerequisites.filter((p) => p.required && (!p.installed || p.outdated)) ?? []
  const missingOptional = status?.prerequisites.filter((p) => !p.required && !p.installed) ?? []

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-modal-backdrop" onClick={onClose}>
      <div
        className="bg-bg-secondary border border-line rounded-xl w-full max-w-md mx-4 animate-modal-content"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-lg">
              <Wand2 className="w-4 h-4 text-accent" />
            </div>
            <h3 className="text-base font-semibold">{t('setup.wizard.title')}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-text-secondary hover:text-ink hover:bg-surface-strong rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pb-5 min-h-[220px]">
          {!status ? (
            <div className="flex items-center gap-2 text-sm text-icon py-8 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t('setup.wizard.checking')}
            </div>
          ) : step === 'integrations' ? (
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium mb-1">{t('setup.wizard.integrations.question')}</div>
                <div className="text-xs text-text-secondary/50 mb-3">{t('setup.wizard.integrations.help')}</div>
              </div>
              <div className="space-y-2">
                {/* Two options, phrased by what they DO rather than by product name:
                    "Atlassian" means nothing to someone who calls it Jira. */}
                <IntegrationOption
                  selected={atlassian}
                  onSelect={() => setAtlassian(true)}
                  label={t('setup.wizard.integrations.both')}
                  description={t('setup.wizard.integrations.bothHelp')}
                />
                <IntegrationOption
                  selected={!atlassian}
                  onSelect={() => setAtlassian(false)}
                  label={t('setup.wizard.integrations.githubOnly')}
                  description={t('setup.wizard.integrations.githubOnlyHelp')}
                />
              </div>
              <div className="text-xs text-text-secondary/40">{t('setup.wizard.integrations.changeable')}</div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* What the app did on its own. Listed because a silent setup is
                  indistinguishable from one that never happened. */}
              <div className="space-y-1.5">
                <ReadyRow done={status.missingSkills.length === 0} label={t('setup.wizard.done.skills')} />
                <ReadyRow
                  done={status.mcpServers.every(
                    (s) => s.state === 'configured' || (s.id === 'atlassian' && !status.integrations.atlassian),
                  )}
                  label={t('setup.wizard.done.mcp')}
                />
                <ReadyRow done label={t('setup.wizard.done.permissions')} />
              </div>

              {missingRequired.length === 0 && missingOptional.length === 0 ? (
                <div className="text-xs text-text-secondary/60 pt-1">{t('setup.wizard.allSet')}</div>
              ) : (
                <div className="pt-1 space-y-2">
                  <div className="text-xs font-medium text-text-secondary/70">{t('setup.wizard.prerequisites.title')}</div>
                  {[...missingRequired, ...missingOptional].map((prerequisite) => (
                    <WizardPrerequisiteRow
                      key={prerequisite.id}
                      prerequisite={prerequisite}
                      installing={installing === prerequisite.id}
                      disabled={installing !== null}
                      copied={copied}
                      onInstall={() => install(prerequisite.id)}
                      onCopy={copy}
                    />
                  ))}
                  {installing && installLog && (
                    <pre className="max-h-24 overflow-y-auto text-[10px] leading-relaxed text-text-secondary/60 bg-bg border border-line rounded-lg p-2 whitespace-pre-wrap">
                      {installLog}
                    </pre>
                  )}
                  {/* Stated, not enforced. A required tool missing means the skills
                      cannot run, but locking someone out of the app they just
                      installed helps nobody — they may well want to add their repos
                      first and install Node after lunch. The settings panel keeps
                      reporting it either way. */}
                  {missingRequired.length > 0 && (
                    <div className="text-xs text-text-secondary/50 pt-1">{t('setup.wizard.prerequisites.blocked')}</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 pb-5">
          {step === 'integrations' ? (
            <button
              onClick={confirmIntegrations}
              disabled={saving || !status}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent bg-accent/10 border border-accent/20 rounded-lg hover:bg-accent/20 transition-colors disabled:opacity-50"
            >
              {saving ? t('setup.wizard.applying') : t('common.next')}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent bg-accent/10 border border-accent/20 rounded-lg hover:bg-accent/20 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              {t('setup.wizard.finish')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function IntegrationOption({ selected, onSelect, label, description }: {
  selected: boolean
  onSelect: () => void
  label: string
  description: string
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
        selected
          ? 'bg-accent/10 border-accent/30'
          : 'bg-surface border-line-field hover:bg-surface'
      }`}
    >
      <div className={`text-sm ${selected ? 'text-accent' : 'text-text-secondary'}`}>{label}</div>
      <div className="text-xs text-text-secondary/50 mt-0.5">{description}</div>
    </button>
  )
}

function ReadyRow({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {done
        ? <Check className="w-3.5 h-3.5 text-green shrink-0" />
        : <AlertTriangle className="w-3.5 h-3.5 text-yellow shrink-0" />}
      <span className="text-text-secondary/70">{label}</span>
    </div>
  )
}

/**
 * Same three affordances as the settings card: install it for them, copy the command,
 * or follow a link. Kept as its own component here rather than shared with
 * SetupHealthCard because the two differ in layout and wording — merging them would
 * mean a props object describing which of the two it is pretending to be.
 */
function WizardPrerequisiteRow({ prerequisite, installing, disabled, copied, onInstall, onCopy }: {
  prerequisite: PrerequisiteStatus
  installing: boolean
  disabled: boolean
  copied: string | null
  onInstall: () => void
  onCopy: (text: string) => void
}) {
  const t = useT()

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="text-xs text-text-secondary/70 min-w-0 flex items-center gap-1.5">
        <span aria-hidden className={prerequisite.required ? 'text-red' : 'text-text-secondary/40'}>•</span>
        <span className="font-mono">{prerequisite.id}</span>
        <span className="truncate">
          {prerequisite.outdated
            ? t('setup.wizard.prerequisite.outdated', { version: prerequisite.version ?? '?', min: prerequisite.minVersion ?? '?' })
            : prerequisite.required
              ? t('setup.wizard.prerequisite.required')
              : t('setup.wizard.prerequisite.optional')}
        </span>
      </div>

      {prerequisite.installable ? (
        <button
          onClick={onInstall}
          disabled={disabled}
          className="shrink-0 flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-accent bg-accent/10 border border-accent/20 rounded-md hover:bg-accent/20 transition-colors disabled:opacity-50"
        >
          {installing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
          {installing ? t('settings.application.setup.installing') : t('settings.application.setup.install')}
        </button>
      ) : prerequisite.installCommand ? (
        <button
          onClick={() => onCopy(prerequisite.installCommand!)}
          className="shrink-0 flex items-center gap-1 px-2 py-1 text-[11px] font-mono text-text-secondary border border-line rounded-md hover:bg-surface hover:text-ink transition-colors"
        >
          <Copy className="w-3 h-3" />
          {copied === prerequisite.installCommand ? t('common.copied') : t('settings.application.setup.install')}
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
    </div>
  )
}
