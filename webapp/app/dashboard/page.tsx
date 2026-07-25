'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Bot, GitPullRequest, Coins } from 'lucide-react'
import { useSession } from '@/lib/session'
import { fetchOrgs, type Org } from '@/lib/orgs'
import { fetchInstallations, type Installation } from '@/lib/installations'
import { fetchUserStats, formatUsd, type UserStats } from '@/lib/stats'
import { AppShell } from '@/components/AppShell'
import { InstallBanner } from '@/components/InstallBanner'
import { Card, Eyebrow, SectionLabel, StatTile } from '@/components/ui'

function firstName(email?: string): string {
  if (!email) return 'there'
  const first = email.split('@')[0].split(/[._+-]/)[0]
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : 'there'
}

export default function Dashboard() {
  const router = useRouter()
  const { session, loading } = useSession()
  const [orgs, setOrgs] = useState<Org[] | null>(null)
  const [installs, setInstalls] = useState<Installation[] | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)

  useEffect(() => {
    if (!loading && !session) router.replace('/')
  }, [loading, session, router])

  useEffect(() => {
    if (!session) return
    fetchOrgs().then(setOrgs)
    fetchInstallations().then(setInstalls)
    fetchUserStats().then(setStats)
  }, [session])

  if (loading || !session) {
    return <div className="flex min-h-screen items-center justify-center bg-canvas text-muted">Loading…</div>
  }

  return (
    <AppShell email={session.user.email ?? undefined}>
      <Eyebrow>/dashboard</Eyebrow>
      <h1 className="font-display text-5xl font-black leading-none tracking-tight text-ink">
        Hey {firstName(session.user.email ?? undefined)}.
      </h1>
      <p className="mt-4 text-muted">Your agents, organizations and account, all in one place.</p>

      <div className="mt-10">
        <InstallBanner installs={installs} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile icon={Bot} label="Agents" value={stats ? String(stats.agents) : '—'} />
        <StatTile icon={GitPullRequest} label="In review" value={stats ? String(stats.inReview) : '—'} />
        <StatTile icon={Coins} label="This month" value={stats ? formatUsd(stats.monthCostUsd) : '—'} />
      </div>

      <div className="mt-12 flex items-baseline justify-between">
        <SectionLabel>/organizations</SectionLabel>
        {orgs && <span className="text-xs text-muted">{orgs.length} total</span>}
      </div>

      <Card className="mt-4 overflow-hidden">
        {orgs === null ? (
          <p className="p-6 text-sm text-muted">Loading…</p>
        ) : orgs.length === 0 ? (
          <p className="p-6 text-sm text-muted">You&apos;re not part of any organization yet.</p>
        ) : (
          <ul className="divide-y divide-black/5">
            {orgs.map((org) => (
              <li key={org.id}>
                <Link
                  href={`/organization?org=${encodeURIComponent(org.id)}`}
                  className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-canvas"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand font-display text-lg font-black text-white">
                    {org.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-lg font-bold text-ink">{org.name}</span>
                    <span className="text-xs text-muted">{org.role === 'admin' ? 'Admin' : 'Member'}</span>
                  </span>
                  <ChevronRight className="h-5 w-5 text-black/20 transition-all group-hover:translate-x-0.5 group-hover:text-brand" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </AppShell>
  )
}
