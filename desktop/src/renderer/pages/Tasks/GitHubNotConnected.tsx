import { useCallback, useEffect, useState } from 'react'
import { Download, RefreshCw, Terminal } from '@ds/desktop/icons'
import { Button, Card, CommandChip, Text, TrackerTile } from '@ds/desktop'
import type { PrerequisiteStatus, SetupStatus } from '../../../types'
import { useT } from '../../i18n'

/**
 * The whole page when `gh` cannot answer — missing, or installed and logged out.
 *
 * Rendered only when GitHub is the ONLY tracker the reader has configured. A user
 * whose repositories are all in Jira has nothing to fix here, and a user with both
 * gets a one-line notice above their sprint instead; taking the whole page in either
 * case is what used to hide a perfectly readable backlog behind an irrelevant wall.
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
 *
 * `busy` is the page's own loading flag. The retry button reads it so a second
 * read cannot be started on top of one already in flight — `useTasks` sequences
 * its responses so an overlap is harmless either way, but a button that keeps
 * accepting clicks while nothing visibly happens reads as broken too.
 */
export function GitHubNotConnected({ onRetry, busy }: { onRetry: () => void; busy: boolean }) {
  const t = useT()
  /** Null while the check is in flight — better a spinner than a wrong verdict. */
  const [setup, setSetup] = useState<SetupStatus | null>(null)
  const [installing, setInstalling] = useState(false)
  const [installLog, setInstallLog] = useState('')

  /**
   * Only the BINARY is probed here. Whether `gh` is logged in is already settled —
   * this panel renders precisely because the snapshot came back with
   * `connected.github: false` — so a second `gh auth status` spawn could only
   * confirm what put it on screen.
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
      {/* `Card`, with the border gone like every other on this page. Its `surface` ground
          is a step up from the `surface-subtle` this used to wear, which is what the panel
          needs once it is a plate rather than an outline: at `subtle` on the modal's own
          ground there was nothing but the border saying where it began.

          `roomy` is the rung for a panel you READ rather than scan, which is what this is:
          two sentences and two steps, not a row of figures. */}
      <Card
        ground="surface"
        padding="roomy"
        className="max-w-md w-full flex flex-col items-center gap-4 text-center"
      >
        {/* `TrackerTile`, not a bare glyph. It is the same 48px square the settings pages
            draw GitHub with, so the thing that is missing is recognisable as the thing
            that is configured somewhere else — a loose mark read as a smaller, flatter
            kind of object on a page that shows both. */}
        <TrackerTile tracker="github" size="lg" title="GitHub" />

        <div className="flex flex-col gap-1">
          <Text size="sm" weight="bold">{t('tasks.github.title')}</Text>
          <Text tone="secondary" className="opacity-70">{t('tasks.github.body')}</Text>
        </div>

        {checking ? (
          <Text tone="secondary" className="opacity-60">{t('tasks.github.checking')}</Text>
        ) : (
          <div className="w-full flex flex-col gap-3">
            {/* Step 1 — the binary. Skipped entirely once it is there. */}
            {!installed && (
              <div className="flex flex-col gap-2 items-center">
                <Text tone="secondary" className="opacity-70">{t('tasks.github.notInstalled')}</Text>
                {gh?.installable ? (
                  // `Button` rather than the accent-tinted pill this spelled by hand. It
                  // is the one affirmative thing on the panel, so it takes the filled
                  // accent rung — and `busy` is what makes a Homebrew install that can be
                  // silent for a minute read as working rather than as a dead button.
                  <Button
                    size="xs"
                    tone="accent"
                    icon={Download}
                    busy={installing}
                    onClick={install}
                  >
                    {installing ? t('tasks.github.installing') : t('tasks.github.install')}
                  </Button>
                ) : (
                  // Nothing here can install it, so the command is the answer — and it
                  // carries a copy button, because a command the reader has to move to
                  // another window is exactly the case that earns one.
                  <CommandChip
                    icon={Terminal}
                    copy={{ label: t('tasks.copyLink'), copiedLabel: t('tasks.copyLinkDone') }}
                  >
                    {gh?.installCommand || 'brew install gh'}
                  </CommandChip>
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
              <Text tone="secondary" className="opacity-70">{t('tasks.github.loginStep')}</Text>
              <CommandChip
                icon={Terminal}
                copy={{ label: t('tasks.copyLink'), copiedLabel: t('tasks.copyLinkDone') }}
              >
                gh auth login
              </CommandChip>
            </div>

            {/* `busy` is the read this panel started; `disabled` is the install that is
                not this button's. The first spins the mark and keeps the control at full
                strength, the second dims it — which is the honest pair, where one flag
                for both said "unavailable" about a button that was working. */}
            <Button
              size="xs"
              tone="neutral"
              icon={RefreshCw}
              busy={busy}
              disabled={installing}
              onClick={onRetry}
              className="self-center"
            >
              {t('tasks.reload')}
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
