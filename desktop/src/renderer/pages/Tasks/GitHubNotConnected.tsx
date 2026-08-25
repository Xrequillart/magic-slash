import { useCallback, useEffect, useState } from 'react'
import { Download, Github, RefreshCw, Terminal } from 'lucide-react'
import type { PrerequisiteStatus, SetupStatus } from '../../../types'
import { useT } from '../../i18n'

/**
 * The whole page when `gh` cannot answer — missing, or installed and logged out.
 *
 * Two distinct situations behind one snapshot flag, and the panel separates them
 * because the fixes do not overlap: a missing binary is a one-click install, a
 * logged-out one is a command the user has to run themselves (`gh auth login` is
 * interactive and browser-bound — nothing here can run it for them).
 *
 * The install path is the one `pages/Config/SetupHealthCard.tsx` already owns:
 * `setup.installPrerequisite('gh')`, with `onInstallProgress` tailing Homebrew's
 * output, because an install can be silent for a minute and a dead button is how
 * people conclude it is broken.
 */
export function GitHubNotConnected({ onRetry }: { onRetry: () => void }) {
  const t = useT()
  /** Null while the check is in flight — better a spinner than a wrong verdict. */
  const [setup, setSetup] = useState<SetupStatus | null>(null)
  const [installing, setInstalling] = useState(false)
  const [installLog, setInstallLog] = useState('')

  /**
   * Only the BINARY is probed here. Whether `gh` is logged in is already settled —
   * this panel renders precisely because the snapshot came back `githubConnected:
   * false` — so a second `gh auth status` spawn could only confirm what put it on
   * screen.
   */
  const refresh = useCallback(() => {
    setSetup(null)
    window.electronAPI.setup.getStatus().then(setSetup).catch(() => setSetup(null))
  }, [])

  useEffect(refresh, [refresh])

  useEffect(() => {
    const unsubscribe = window.electronAPI.setup.onInstallProgress(({ id, chunk }) => {
      if (id !== 'gh') return
      // Tail only: this is progress, not a build log.
      setInstallLog((previous) => (previous + chunk).slice(-800))
    })
    return () => { unsubscribe() }
  }, [])

  const install = async () => {
    setInstalling(true)
    setInstallLog('')
    try {
      await window.electronAPI.setup.installPrerequisite('gh')
    } finally {
      setInstalling(false)
      refresh()
      onRetry()
    }
  }

  const gh: PrerequisiteStatus | undefined = setup?.prerequisites.find((p) => p.id === 'gh')
  // Absent status is read as "not installed" only once the check has answered;
  // until then the panel says it is checking rather than accusing the machine.
  const checking = setup === null
  const installed = !!gh?.installed && !gh.outdated

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-md w-full flex flex-col items-center gap-4 py-10 px-6 bg-surface-subtle border border-line-subtle rounded-xl text-center">
        <Github className="w-8 h-8 text-text-secondary opacity-40" />

        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-ink">{t('tasks.github.title')}</p>
          <p className="text-xs text-text-secondary/70">{t('tasks.github.body')}</p>
        </div>

        {checking ? (
          <p className="text-xs text-text-secondary/60">{t('tasks.github.checking')}</p>
        ) : (
          <div className="w-full flex flex-col gap-3">
            {/* Step 1 — the binary. Skipped entirely once it is there. */}
            {!installed && (
              <div className="flex flex-col gap-2 items-center">
                <p className="text-xs text-text-secondary/70">{t('tasks.github.notInstalled')}</p>
                {gh?.installable ? (
                  <button
                    onClick={install}
                    disabled={installing}
                    className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-accent bg-accent/10 border border-accent/20 rounded-md hover:bg-accent/20 transition-colors disabled:opacity-50"
                  >
                    <Download className="w-3 h-3" />
                    {installing ? t('tasks.github.installing') : t('tasks.github.install')}
                  </button>
                ) : (
                  <code className="px-2 py-1 text-[11px] font-mono text-text-secondary border border-line rounded-md">
                    {gh?.installCommand || 'brew install gh'}
                  </code>
                )}
                {installing && installLog && (
                  <pre className="w-full max-h-24 overflow-auto text-left text-[10px] font-mono text-text-secondary/60 whitespace-pre-wrap">
                    {installLog}
                  </pre>
                )}
              </div>
            )}

            {/* Step 2 — the login, which is interactive and cannot be run from here. */}
            <div className="flex flex-col gap-2 items-center">
              <p className="text-xs text-text-secondary/70">{t('tasks.github.loginStep')}</p>
              <code className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-mono text-text-secondary border border-line rounded-md">
                <Terminal className="w-3 h-3" />
                gh auth login
              </code>
            </div>

            <button
              onClick={onRetry}
              className="self-center flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-text-secondary border border-line rounded-md hover:bg-surface hover:text-ink transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              {t('tasks.reload')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
