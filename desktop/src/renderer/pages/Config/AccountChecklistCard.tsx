import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Circle, ListChecks } from 'lucide-react'
import type { InvalidRepo } from '../../../preload'
import type { SetupStatus } from '../../../types'
import { useAuth } from '../../hooks/useAuth'
import { useStore } from '../../store'
import { buildRepoSetup, needsRepoSetup } from '../../utils/repoSetup'
import { useT, type MessageKey } from '../../i18n'
import { SectionHeader } from './SectionHeader'

/**
 * The onboarding checklist, kept visible after onboarding.
 *
 * Every step here has its own first-run wizard (setup, profile, repositories) or
 * its own modal (sign in), and each of them disappears the moment it is done or
 * dismissed. That left no place to answer the one question a user asks after
 * clicking through four modals: "am I actually set up?". This card answers it —
 * a verdict plus the four rows it is computed from, so a "not yet" says which
 * step is missing rather than just being a red light.
 *
 * Read-only on purpose: each row's repair already lives one tab away (Application
 * for the machine setup, Repositories for the repos) or right below it in this
 * same tab. Duplicating those affordances here would mean two places to keep in
 * sync for no new capability.
 */
export function AccountChecklistCard() {
  const t = useT()
  const { status: authStatus, loading: authLoading } = useAuth()
  const config = useStore((s) => s.config)

  const [profileFilled, setProfileFilled] = useState<boolean | null>(null)
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null)
  const [setupFailed, setSetupFailed] = useState(false)
  const [invalidRepos, setInvalidRepos] = useState<InvalidRepo[]>([])

  useEffect(() => {
    window.electronAPI.profile
      .get()
      .then((profile) => setProfileFilled(profile !== null))
      .catch(() => setProfileFilled(false))
  }, [])

  useEffect(() => {
    window.electronAPI.setup
      .getStatus()
      .then(setSetupStatus)
      // Told apart from "still loading" on purpose: the card is unrendered either
      // way, but a failure that only cleared the loading flag would leave the
      // placeholder pulsing forever, like SetupHealthCard.
      .catch(() => setSetupFailed(true))
  }, [])

  // Same source as the launch modal: the main process is the only side that can
  // stat the folders, and it re-emits on a timer and on focus.
  useEffect(() => {
    window.electronAPI.config.getInvalidRepos().then(setInvalidRepos).catch(() => {})
    const unsubscribe = window.electronAPI.config.onInvalidRepos(setInvalidRepos)
    return () => { unsubscribe() }
  }, [])

  const repoReady = useMemo(
    () => (config ? !needsRepoSetup(buildRepoSetup(config.repositories, invalidRepos)) : false),
    [config, invalidRepos],
  )

  // A missing OPTIONAL prerequisite is a warning, not a blocker — same verdict as
  // the machine setup card, so the two can never disagree.
  const setupReady = useMemo(() => {
    if (!setupStatus) return false
    const missingRequired = setupStatus.prerequisites.some((p) => p.required && (!p.installed || p.outdated))
    const mcpToFix = setupStatus.mcpServers.some(
      (s) => s.state !== 'configured'
        && (s.id === 'github' ? setupStatus.integrations.github : setupStatus.integrations.atlassian),
    )
    return !missingRequired && !mcpToFix && setupStatus.missingSkills.length === 0
  }, [setupStatus])

  if (setupFailed) return null

  // A placeholder until every answer is in: a half-loaded card would show green
  // rows turning grey, which reads as something breaking rather than as loading.
  // The placeholder keeps the card's own shape, so the verdict lands in place
  // instead of pushing the sections under it down the page.
  if (authLoading || profileFilled === null || setupStatus === null || !config) {
    // Four rows is the shape of a stock install; only a build with no Supabase env
    // drops the cloud row, and by then `authLoading` is over and the count is real.
    return <ChecklistSkeleton rows={authLoading || authStatus.enabled ? 4 : 3} />
  }

  const steps: { key: MessageKey; done: boolean }[] = [
    // The cloud account is optional and hidden entirely when no Supabase env is
    // baked in — it cannot be a step the user is failing to complete.
    ...(authStatus.enabled
      ? [{ key: 'account.checklist.step.account' as MessageKey, done: authStatus.loggedIn }]
      : []),
    { key: 'account.checklist.step.profile', done: profileFilled },
    { key: 'account.checklist.step.repository', done: repoReady },
    { key: 'account.checklist.step.setup', done: setupReady },
  ]

  const done = steps.filter((step) => step.done).length
  const ready = done === steps.length

  return (
    <div>
      <SectionHeader icon={ListChecks} title={t('account.checklist.section')} />
      <div className="bg-surface border border-line-strong rounded-xl p-4">
        <div className="flex items-start gap-2.5">
          {/* Theme tokens rather than Tailwind's numbered scale — a fixed colour
              stops being readable on half the themes (see themes.test.ts). */}
          {ready
            ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-green" />
            : <Circle className="w-4 h-4 mt-0.5 shrink-0 text-yellow" />}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">
              {ready ? t('account.checklist.ready') : t('account.checklist.pending')}
            </div>
            <div className="text-xs text-text-secondary/60 mt-0.5">
              {ready
                ? t('account.checklist.readyHint')
                : t('account.checklist.pendingHint', { done, total: steps.length })}
            </div>

            <ul className="mt-3 space-y-1.5">
              {steps.map((step) => (
                <li key={step.key} className="flex items-center gap-2">
                  {step.done
                    ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-green" />
                    : <Circle className="w-3.5 h-3.5 shrink-0 text-text-secondary/30" />}
                  <span className={`text-xs ${step.done ? 'text-text-secondary/60' : 'text-ink'}`}>
                    {t(step.key)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

/** The card's own layout with every string swapped for a bar of its size. */
function ChecklistSkeleton({ rows }: { rows: number }) {
  const t = useT()

  return (
    <div>
      <SectionHeader icon={ListChecks} title={t('account.checklist.section')} />
      <div
        className="bg-surface border border-line-strong rounded-xl p-4"
        role="status"
        aria-busy="true"
        aria-label={t('common.loading')}
      >
        <div className="flex items-start gap-2.5 animate-pulse">
          <span aria-hidden className="w-4 h-4 mt-0.5 shrink-0 rounded-full bg-surface-strong" />
          <div className="min-w-0 flex-1">
            {/* Heights match the verdict and its hint so nothing moves when they land. */}
            <span aria-hidden className="block h-5 w-32 rounded bg-surface-strong" />
            <span aria-hidden className="block h-4 w-48 max-w-full rounded bg-surface-strong mt-0.5" />

            <ul className="mt-3 space-y-1.5">
              {/* Widths staggered per row: four identical bars read as a table, not a list. */}
              {Array.from({ length: rows }, (_, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span aria-hidden className="w-3.5 h-3.5 shrink-0 rounded-full bg-surface-strong" />
                  <span
                    aria-hidden
                    className={`block h-4 rounded bg-surface-strong ${['w-40', 'w-28', 'w-44', 'w-36'][i % 4]}`}
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
