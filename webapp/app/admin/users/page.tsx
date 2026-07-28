'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users } from 'lucide-react'
import { listInstallations, listUsers, type AdminUser } from '@/lib/admin'
import { formatRelative, highestVersion } from '@/lib/installations'
import { Badge, Card, SectionHeader } from '@/components/ui'

/**
 * Every account, including the ones that never got started.
 *
 * The fleet is fetched alongside the users for ONE reason: the version badge needs
 * something to be "up to date" relative to, and `highestVersion` over every device
 * is the only answer available here — nothing in this app knows which release is
 * the latest. Its rollups belong to the Stats tab, not to this list.
 *
 * No guard and no AppShell: `app/admin/layout.tsx` owns both, and does not mount
 * this page until the visitor is a confirmed platform admin. Hence the fetch on
 * mount with no session in the dependencies.
 */
export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [newest, setNewest] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listUsers().then((rows) => {
      if (!cancelled) setUsers(rows)
    })
    listInstallations().then((fleet) => {
      if (!cancelled) setNewest(highestVersion(fleet))
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <h1 className="font-display text-5xl font-black leading-none tracking-tight text-ink">Users</h1>
      <p className="mt-3 text-sm text-muted">
        Every account, what it runs and what it owns. Read-only — nothing on these pages writes.
      </p>

      <section className="mt-10">
        <SectionHeader
          icon={Users}
          title="Accounts"
          action={users ? <span className="text-xs text-muted">{users.length}</span> : null}
        />
        <Card className="p-5">
          {users === null ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted">No account yet.</p>
          ) : (
            <ul className="divide-y divide-black/5">
              {users.map((u) => (
                <li key={u.userId}>
                  <Link
                    href={`/admin/users/${u.userId}`}
                    className="-mx-2 flex items-center gap-4 rounded-xl px-2 py-3 transition-colors hover:bg-canvas"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{u.email ?? u.userId}</p>
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {[
                          u.name ?? 'No profile',
                          `${u.deviceCount} device${u.deviceCount === 1 ? '' : 's'}`,
                          `${u.orgCount} org${u.orgCount === 1 ? '' : 's'}`,
                          `${u.activeAgentCount}/${u.agentCount} agent${u.agentCount === 1 ? '' : 's'}`,
                          u.latestLastSeenAt
                            ? `seen ${formatRelative(u.latestLastSeenAt)}`
                            : 'never seen',
                        ].join(' · ')}
                      </p>
                    </div>
                    {u.latestAppVersion ? (
                      // Neutral rather than green until the fleet has been read:
                      // "up to date" is a claim this page cannot make yet.
                      <Badge
                        tone={
                          newest === null ? 'neutral' : u.latestAppVersion === newest ? 'accent' : 'yellow'
                        }
                      >
                        v{u.latestAppVersion}
                      </Badge>
                    ) : (
                      <Badge tone="neutral">never launched</Badge>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </>
  )
}
