'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRequireSession } from '@/lib/session'
import { fetchInstallations, type Installation } from '@/lib/installations'
import { doneCount, isOnboarded, onboardingState } from '@/lib/onboarding'
import { fetchOrgs, type Org } from '@/lib/orgs'
import { fetchProfile, type UserProfile } from '@/lib/profile'
import { countBoundRepositories } from '@/lib/repositories'
import { fetchTeamOverview, type TeamOverview } from '@/lib/team'
import { useT } from '@/lib/i18n/useLanguage'
import { AppShell } from '@/components/AppShell'
import { Confetti } from '@/components/Confetti'
import { GettingStarted } from '@/components/GettingStarted'
import { SkillHoursBanner } from '@/components/SkillHoursBanner'
import { TeamRepos } from '@/components/TeamRepos'
import { FullPageLoader } from '@/components/ui'

/**
 * Fallback greeting name, from the local part of the email. `fallback` is the
 * translated stand-in for an address this cannot make a name out of — "Hey there."
 * and "Salut à vous." need different words in that slot.
 */
function nameFromEmail(email: string | undefined, fallback: string): string {
  if (!email) return fallback
  const first = email.split('@')[0].split(/[._+-]/)[0]
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : fallback
}

export default function Dashboard() {
  const { session, pending } = useRequireSession()
  const { t } = useT()
  const [orgs, setOrgs] = useState<Org[] | null>(null)
  // undefined = not fetched yet, null = fetched and there is no profile row.
  const [profile, setProfile] = useState<UserProfile | null | undefined>(undefined)
  const [installs, setInstalls] = useState<Installation[] | null>(null)
  const [boundRepos, setBoundRepos] = useState<number | null>(null)
  const [team, setTeam] = useState<TeamOverview | null>(null)

  const [bursts, setBursts] = useState(0)
  const lastDone = useRef<number | null>(null)

  const loadOrgs = useCallback(() => {
    fetchOrgs().then(setOrgs)
  }, [])

  useEffect(() => {
    if (!session) return
    loadOrgs()
    fetchProfile().then(setProfile)
    fetchInstallations().then(setInstalls)
    // Its own tiny count rather than a read off the team overview below: that one also
    // pulls every agent and every org's roster, and the checklist would then wait on all
    // of it before it could render a single row.
    countBoundRepositories().then(setBoundRepos)
    fetchTeamOverview().then(setTeam)
  }, [session, loadOrgs])

  const state = onboardingState(orgs, profile, installs, boundRepos)
  const done = state ? doneCount(state) : null

  // Confetti on every step completed during this visit. The first resolved count
  // is only a baseline — someone who onboarded last week gets no burst on load.
  useEffect(() => {
    if (done === null) return
    if (lastDone.current !== null && done > lastDone.current) setBursts((n) => n + 1)
    lastDone.current = done
  }, [done])

  if (pending || !session) return <FullPageLoader />

  // The profile name is what the user asked to be called; the email is a guess.
  const greeting =
    profile?.name.trim() ||
    nameFromEmail(session.user.email ?? undefined, t('dashboard.greetingFallback'))

  return (
    <AppShell email={session.user.email ?? undefined}>
      {/* Outside the checklist, which unmounts the moment the last step lands. */}
      <Confetti fireKey={bursts} />

      <h1 className="font-display text-5xl font-black leading-none tracking-tight text-ink">
        {t('dashboard.greeting', { name: greeting })}
      </h1>

      <div className="mt-10">
        {/* The team view is meaningless before the app has run, and it competes with
            the checklist for attention — so it waits until onboarding is behind you. */}
        {isOnboarded(state) ? (
          <>
            {/* Above the tabs inside TeamRepos, and outside it: these hours are the
                viewer's own across every scope, so they must not appear to belong to
                whichever organization tab happens to be open. Outside it also means
                the banner does not wait on the team overview to render. Not shown
                during onboarding — nobody has hours before their first run. */}
            <SkillHoursBanner />
            <TeamRepos overview={team} />
          </>
        ) : (
          state && (
            <GettingStarted
              state={state}
              orgs={orgs ?? []}
              profile={profile ?? null}
              installs={installs ?? []}
              boundRepos={boundRepos ?? 0}
              onProfileSaved={setProfile}
              onOrgCreated={loadOrgs}
            />
          )
        )}
      </div>
    </AppShell>
  )
}
