'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { useSession } from '@/lib/session'
import { fetchOrgs, type Org } from '@/lib/orgs'
import { AppShell, Eyebrow } from '@/components/AppShell'

function firstName(email?: string): string {
  if (!email) return 'there'
  const first = email.split('@')[0].split(/[._+-]/)[0]
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : 'there'
}

export default function Dashboard() {
  const router = useRouter()
  const { session, loading } = useSession()
  const [orgs, setOrgs] = useState<Org[] | null>(null)

  useEffect(() => {
    if (!loading && !session) router.replace('/')
  }, [loading, session, router])

  useEffect(() => {
    if (session) fetchOrgs().then(setOrgs)
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
      <p className="mt-4 text-muted">Your organizations and account, all in one place.</p>

      <div className="mt-12 flex items-baseline justify-between">
        <h2 className="font-mono text-xs font-medium tracking-tight text-muted">/organizations</h2>
        {orgs && <span className="text-xs text-muted">{orgs.length} total</span>}
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-black/5 bg-white">
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
      </div>
    </AppShell>
  )
}
