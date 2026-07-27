'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRequireSession } from '@/lib/session'
import { fetchInstallations, type Installation } from '@/lib/installations'
import { doneCount, isOnboarded, onboardingState } from '@/lib/onboarding'
import { fetchOrgs, type Org } from '@/lib/orgs'
import { fetchProfile, type UserProfile } from '@/lib/profile'
import { fetchTeamOverview, type TeamOverview } from '@/lib/team'
import { AppShell } from '@/components/AppShell'
import { Confetti } from '@/components/Confetti'
import { GettingStarted } from '@/components/GettingStarted'
import { TeamRepos } from '@/components/TeamRepos'
import { FullPageLoader } from '@/components/ui'

/** Fallback greeting name, from the local part of the email. */
function nameFromEmail(email?: string): string {
  if (!email) return 'there'
  const first = email.split('@')[0].split(/[._+-]/)[0]
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : 'there'
}

export default function Dashboard() {
  const { session, pending } = useRequireSession()
  const [orgs, setOrgs] = useState<Org[] | null>(null)
  // undefined = not fetched yet, null = fetched and there is no profile row.
  const [profile, setProfile] = useState<UserProfile | null | undefined>(undefined)
  const [installs, setInstalls] = useState<Installation[] | null>(null)
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
    fetchTeamOverview().then(setTeam)
  }, [session, loadOrgs])

  const state = onboardingState(orgs, profile, installs)
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
  const greeting = profile?.name.trim() || nameFromEmail(session.user.email ?? undefined)

  return (
    <AppShell email={session.user.email ?? undefined}>
      {/* Outside the checklist, which unmounts the moment the last step lands. */}
      <Confetti fireKey={bursts} />

      <h1 className="font-display text-5xl font-black leading-none tracking-tight text-ink">Hey {greeting}.</h1>

      <div className="mt-10">
        {/* The team view is meaningless before the app has run, and it competes with
            the checklist for attention — so it waits until onboarding is behind you. */}
        {isOnboarded(state) ? (
          <TeamRepos overview={team} />
        ) : (
          state && (
            <GettingStarted
              state={state}
              orgs={orgs ?? []}
              profile={profile ?? null}
              installs={installs ?? []}
              onProfileSaved={setProfile}
              onOrgCreated={loadOrgs}
            />
          )
        )}
      </div>
    </AppShell>
  )
}
