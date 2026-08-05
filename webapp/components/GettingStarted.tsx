'use client'

import { useState } from 'react'
import {
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  Download,
  FolderGit2,
  UserRound,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ProfileWizard } from '@/components/ProfileWizard'
import { Button, ButtonLink, Input } from '@/components/ui'
import { type Installation } from '@/lib/installations'
import { DESKTOP_DOWNLOAD_URL } from '@/lib/desktopRelease'
import { doneCount, isOnboarded, TOTAL_STEPS, type OnboardingState } from '@/lib/onboarding'
import { createOrg, type Org } from '@/lib/orgs'
import { type UserProfile } from '@/lib/profile'
import { useT } from '@/lib/i18n/useLanguage'

/**
 * Onboarding checklist: join an organization, fill in your profile, install the
 * app, point a repository at its folder. Checked state comes from real data — a
 * membership, a saved profile row, an `app_installations` row the desktop app writes
 * on first launch, a `repository_paths` binding — so there is nothing to tick off by
 * hand.
 *
 * A completed row is inert: it is tinted green and stops responding to clicks,
 * because there is nothing left to do from it. Renders nothing at all once every
 * row is done.
 */

const ROW = 'flex w-full items-center gap-4 px-5 py-4'
/** Done rows are tinted and non-interactive — no hover, no cursor, no handler. */
const ROW_DONE = `${ROW} bg-green/[0.12]`
const ROW_PENDING = `group ${ROW} text-left transition-colors hover:bg-canvas`
/** Aligns expanded content with the label column: px-5 (20) + marker (24) + gap-4 (16). */
const EXPANSION = 'pb-5 pl-[60px] pr-5'

/**
 * Numbered instructions for a step the webapp can only DESCRIBE — where it cannot put a
 * form or a button, what is left is telling someone what to do, and an ordered list says
 * "four things, in this order" at a glance where a paragraph of the same words hides both
 * the count and the order.
 *
 * A real `<ol>`: the numbers are the content here, not decoration, so they belong to the
 * markup that a screen reader announces rather than to a `::before`.
 */
function Steps({ items }: { items: string[] }) {
  return (
    <ol className="flex flex-col gap-2">
      {items.map((item, i) => (
        <li key={item} className="flex items-start gap-2.5">
          <span className="mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-brand/[0.08] font-display text-[10px] font-bold text-brand">
            {i + 1}
          </span>
          <span className="text-xs leading-snug text-muted">{item}</span>
        </li>
      ))}
    </ol>
  )
}

/**
 * Left-hand marker: a tinted green disc once done, an empty ring while pending.
 * The tint stays light — a solid green disc shouted — but the glyph keeps its
 * heavy stroke so the check still reads at a glance.
 */
function Marker({ done }: { done: boolean }) {
  return done ? (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green/20">
      <Check className="h-4 w-4 text-green" strokeWidth={3} />
    </span>
  ) : (
    <Circle className="h-6 w-6 shrink-0 text-black/15" strokeWidth={1.5} />
  )
}

/** The row's fixed parts: marker, label, hint, subject icon. */
function ItemBody({
  done,
  title,
  hint,
  icon: Icon,
}: {
  done: boolean
  title: string
  hint: string
  icon: LucideIcon
}) {
  return (
    <>
      <Marker done={done} />
      <span className="min-w-0 flex-1">
        <span className="block font-display text-sm font-bold text-ink">{title}</span>
        <span className="mt-0.5 block truncate text-xs text-muted">{hint}</span>
      </span>
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${done ? 'bg-green/20 text-green' : 'bg-brand/[0.06] text-brand'}`}
      >
        <Icon className="h-4 w-4" />
      </span>
    </>
  )
}

export function GettingStarted({
  state,
  orgs,
  profile,
  installs,
  boundRepos,
  onProfileSaved,
  onOrgCreated,
}: {
  state: OnboardingState
  orgs: Org[]
  profile: UserProfile | null
  installs: Installation[]
  /** Repositories the user has bound to a folder — only ever shown once at least one is. */
  boundRepos: number
  onProfileSaved: (profile: UserProfile) => void
  onOrgCreated: () => void
}) {
  const { t, lang } = useT()
  const [wizardOpen, setWizardOpen] = useState(false)
  const [showOrgForm, setShowOrgForm] = useState(false)
  const [orgName, setOrgName] = useState('')
  const [creating, setCreating] = useState(false)
  const [orgError, setOrgError] = useState<string | null>(null)
  const [showDownload, setShowDownload] = useState(false)
  const [showRepoPath, setShowRepoPath] = useState(false)

  const submitOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    if (creating || !orgName.trim()) return
    setCreating(true)
    setOrgError(null)
    try {
      await createOrg(orgName, lang)
      setOrgName('')
      setShowOrgForm(false)
      onOrgCreated()
    } catch (err) {
      setOrgError(err instanceof Error ? err.message : t('onboarding.org.failed'))
    } finally {
      setCreating(false)
    }
  }

  if (isOnboarded(state)) return null

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-black/5 bg-white">
        <div className="flex items-center justify-between px-5 pb-3 pt-4">
          <h2 className="font-display text-sm font-bold text-ink">{t('onboarding.title')}</h2>
          <span className="text-xs text-muted">
            {doneCount(state)}/{TOTAL_STEPS}
          </span>
        </div>

        <ul className="divide-y divide-black/5 border-t border-black/5">
          <li>
            {state.org ? (
              <div className={ROW_DONE}>
                <ItemBody
                  done
                  icon={Building2}
                  title={t('onboarding.org.title')}
                  hint={
                    orgs.length === 1
                      ? orgs[0].name
                      : t('onboarding.org.hintCount', { count: orgs.length })
                  }
                />
              </div>
            ) : (
              <>
                <button
                  onClick={() => setShowOrgForm((v) => !v)}
                  aria-expanded={showOrgForm}
                  className={ROW_PENDING}
                >
                  <ItemBody
                    done={false}
                    icon={Building2}
                    title={t('onboarding.org.title')}
                    hint={t('onboarding.org.hintPending')}
                  />
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-black/20 transition-all group-hover:text-brand ${showOrgForm ? 'rotate-180' : ''}`}
                  />
                </button>

                {showOrgForm && (
                  <div className={EXPANSION}>
                    <p className="mb-2 text-xs text-muted">{t('onboarding.org.expand')}</p>
                    <form onSubmit={submitOrg} className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        type="text"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder={t('onboarding.org.namePlaceholder')}
                        autoFocus
                      />
                      <Button type="submit" disabled={creating || !orgName.trim()} className="shrink-0">
                        {creating ? t('common.creating') : t('common.create')}
                      </Button>
                    </form>
                    {orgError && <p className="mt-2 text-xs text-red">{orgError}</p>}
                  </div>
                )}
              </>
            )}
          </li>

          <li>
            {state.profile ? (
              <div className={ROW_DONE}>
                <ItemBody
                  done
                  icon={UserRound}
                  title={t('onboarding.profile.title')}
                  hint={t('onboarding.profile.hintDone')}
                />
              </div>
            ) : (
              <button onClick={() => setWizardOpen(true)} className={ROW_PENDING}>
                <ItemBody
                  done={false}
                  icon={UserRound}
                  title={t('onboarding.profile.title')}
                  hint={t('onboarding.profile.hintPending')}
                />
                <ChevronRight className="h-5 w-5 shrink-0 text-black/20 transition-all group-hover:translate-x-0.5 group-hover:text-brand" />
              </button>
            )}
          </li>

          <li>
            {state.install ? (
              <div className={ROW_DONE}>
                <ItemBody
                  done
                  icon={Download}
                  title={t('onboarding.install.title')}
                  hint={t('onboarding.install.hintDone', {
                    devices:
                      installs.length === 1
                        ? t('onboarding.install.device.one')
                        : t('onboarding.install.device.many', { count: installs.length }),
                  })}
                />
              </div>
            ) : (
              <>
                <button
                  onClick={() => setShowDownload((v) => !v)}
                  aria-expanded={showDownload}
                  className={ROW_PENDING}
                >
                  <ItemBody
                    done={false}
                    icon={Download}
                    title={t('onboarding.install.title')}
                    hint={t('onboarding.install.hintPending')}
                  />
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-black/20 transition-all group-hover:text-brand ${showDownload ? 'rotate-180' : ''}`}
                  />
                </button>

                {showDownload && (
                  <div className={EXPANSION}>
                    <p className="mb-3 text-xs text-muted">{t('onboarding.install.downloadHint')}</p>
                    <ButtonLink href={DESKTOP_DOWNLOAD_URL}>
                      {t('common.download')}
                    </ButtonLink>
                  </div>
                )}
              </>
            )}
          </li>

          {/* Last, because binding a path needs the app that browses for it — and for
              the same reason this row has no form: the webapp has no filesystem to
              offer. It explains where to go and counts what came back. */}
          <li>
            {state.repoPath ? (
              <div className={ROW_DONE}>
                <ItemBody
                  done
                  icon={FolderGit2}
                  title={t('onboarding.repoPath.title')}
                  hint={
                    boundRepos === 1
                      ? t('onboarding.repoPath.hintDone.one')
                      : t('onboarding.repoPath.hintDone.many', { count: boundRepos })
                  }
                />
              </div>
            ) : (
              <>
                <button
                  onClick={() => setShowRepoPath((v) => !v)}
                  aria-expanded={showRepoPath}
                  className={ROW_PENDING}
                >
                  <ItemBody
                    done={false}
                    icon={FolderGit2}
                    title={t('onboarding.repoPath.title')}
                    hint={t('onboarding.repoPath.hintPending')}
                  />
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-black/20 transition-all group-hover:text-brand ${showRepoPath ? 'rotate-180' : ''}`}
                  />
                </button>

                {showRepoPath && (
                  <div className={EXPANSION}>
                    <Steps
                      items={[
                        t('onboarding.repoPath.step.1'),
                        t('onboarding.repoPath.step.2'),
                        t('onboarding.repoPath.step.3'),
                        t('onboarding.repoPath.step.4'),
                      ]}
                    />
                    {/* Under the list, not inside it: it explains why the step exists at
                        all for a repo someone else added, and is not a fifth thing to do. */}
                    <p className="mt-3 text-xs leading-snug text-muted">
                      {t('onboarding.repoPath.note')}
                    </p>
                  </div>
                )}
              </>
            )}
          </li>
        </ul>
      </div>

      {/* Pre-filled even from a partial row, so half-answered fields survive. */}
      <ProfileWizard
        open={wizardOpen}
        initial={profile}
        onClose={() => setWizardOpen(false)}
        onSaved={onProfileSaved}
      />
    </>
  )
}
