'use client'

import { useEffect, useState } from 'react'
import { Building2 } from 'lucide-react'
import { listOrgs, type AdminOrgSummary } from '@/lib/admin'
import { formatAbsoluteDate } from '@/lib/installations'
import { Badge, Card, SectionHeader } from '@/components/ui'

/**
 * Every tenant, with what is attached to it.
 *
 * Driven off `organizations`, so an org with nothing attached still appears — a
 * tenant created moments ago, or one whose last member left. That is the shape a
 * list built from memberships silently drops, and an operator looking for the org
 * they just created is exactly the person who would hit it.
 *
 * No guard and no AppShell — `app/admin/layout.tsx` owns both.
 */

/** One count in the detail line. Singular/plural written once rather than five times. */
function count(n: number, singular: string): string {
  return `${n} ${singular}${n === 1 ? '' : 's'}`
}

export default function AdminOrganizations() {
  const [orgs, setOrgs] = useState<AdminOrgSummary[] | null>(null)

  useEffect(() => {
    let cancelled = false
    listOrgs().then((rows) => {
      if (!cancelled) setOrgs(rows)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const active = orgs?.filter((o) => !o.archivedAt).length ?? 0

  return (
    <>
      <h1 className="font-display text-5xl font-black leading-none tracking-tight text-ink">
        Organizations
      </h1>
      <p className="mt-3 text-sm text-muted">
        Every tenant, its members and what belongs to it. Read-only — nothing on these pages writes.
      </p>

      <section className="mt-10">
        <SectionHeader
          icon={Building2}
          title="Tenants"
          action={
            orgs ? (
              <span className="text-xs text-muted">
                {/* Both numbers, because "12" alone hides that 4 are archived. */}
                {active} active{orgs.length !== active && ` · ${orgs.length - active} archived`}
              </span>
            ) : null
          }
        />
        <Card className="p-5">
          {orgs === null ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : orgs.length === 0 ? (
            <p className="text-sm text-muted">No organization yet.</p>
          ) : (
            <ul className="divide-y divide-black/5">
              {orgs.map((o) => (
                <li key={o.orgId} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{o.name}</p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {[
                        count(o.memberCount, 'member'),
                        count(o.repoCount, 'repo'),
                        count(o.agentCount, 'agent'),
                        // Only when there are any: "0 pending" is noise on the
                        // overwhelming majority of rows.
                        o.pendingInvitationCount > 0
                          ? `${o.pendingInvitationCount} pending invite${
                              o.pendingInvitationCount === 1 ? '' : 's'
                            }`
                          : null,
                        // An org outlives the account that created it, and the
                        // orphans are the ones worth spotting.
                        o.createdByEmail ? `by ${o.createdByEmail}` : 'creator deleted',
                        `created ${formatAbsoluteDate(o.createdAt)}`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  {o.pendingInvitationCount > 0 && (
                    <Badge tone="yellow">{o.pendingInvitationCount} pending</Badge>
                  )}
                  {o.archivedAt && <Badge tone="red">archived</Badge>}
                  <Badge tone={o.adminCount === 0 ? 'red' : 'neutral'}>
                    {/* No admin means nobody can administer the tenant — the
                        last-admin trigger makes it rare, but not impossible
                        (a deleted account leaves an owner-less membership). */}
                    {o.adminCount === 0 ? 'no admin' : count(o.adminCount, 'admin')}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </>
  )
}
