'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { FileText, FolderGit2, Ticket, User } from 'lucide-react'
import { useRequireSession } from '@/lib/session'
import { fetchPlanOverview, type PlanOverview } from '@/lib/planSessions'
import {
  buildPlanCards,
  filterPlanCards,
  planLabel,
  planRepoOptions,
  type PlanCard,
} from '@/lib/planSessionRows'
import { formatRelative } from '@/lib/installations'
import { useT } from '@/lib/i18n/useLanguage'
import { AppShell } from '@/components/AppShell'
import { Dropdown } from '@/components/Dropdown'
import { Badge, Card, Eyebrow, FullPageLoader } from '@/components/ui'

/**
 * Every `/magic:plan` session you can see: your own, plus your teammates' on the
 * repositories your organizations share.
 *
 * One list rather than a personal tab and a team tab. A plan is read for what it
 * says, not for who wrote it, and the two halves of a shared repository's history
 * belong in the same chronology — the author is a column here, not a tab.
 *
 * Nothing on this page writes. The sessions are uploaded by the desktop app as the
 * skill runs (see the `/plan/spec` and `/plan/tickets` pings in
 * `skills/magic-plan/SKILL.md`); the webapp is the reader.
 */

const ALL_REPOS = '__all__'

function TicketCount({ count }: { count: number }) {
  const { t } = useT()
  if (count === 0) return <>{t('plans.tickets.none')}</>
  return <>{t(count === 1 ? 'plans.tickets.one' : 'plans.tickets.many', { count })}</>
}

function PlanRow({ card }: { card: PlanCard }) {
  const { t, lang } = useT()
  const when = card.updatedAt ?? card.createdAt

  return (
    <Link href={`/plans/${card.id}`} className="block">
      <Card className="p-5 transition-colors hover:border-black/10 hover:bg-canvas">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <p className="min-w-0 break-words font-display text-base font-bold text-ink">
            {planLabel(card)}
          </p>
          <Badge tone={card.status === 'planned' ? 'green' : 'yellow'}>
            {t(card.status === 'planned' ? 'plans.status.planned' : 'plans.status.planning')}
          </Badge>
        </div>

        {card.idea && <p className="mt-1.5 line-clamp-2 text-sm text-muted">{card.idea}</p>}

        {/* Repository, author, tickets, date — the four things that tell you
            whether this is the plan you were looking for. */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <FolderGit2 className="h-3.5 w-3.5 shrink-0" />
            {card.repoName ?? t('plans.noRepo')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 shrink-0" />
            {card.own ? t('plans.you') : card.author}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Ticket className="h-3.5 w-3.5 shrink-0" />
            <TicketCount count={card.ticketCount} />
          </span>
          {when && <span>{formatRelative(when, lang)}</span>}
        </div>
      </Card>
    </Link>
  )
}

/**
 * What the page holds, said before it holds anything — and where to go to make it
 * hold something. A bare "no results" would leave a reader who has never run the
 * skill with no idea what this page is for.
 */
function EmptyState({ filtered }: { filtered: boolean }) {
  const { t } = useT()
  return (
    <Card className="p-10 text-center">
      <FileText className="mx-auto mb-4 h-8 w-8 text-black/15" />
      <p className="font-display text-base font-bold text-ink">
        {t(filtered ? 'plans.empty.filteredTitle' : 'plans.empty.title')}
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">
        {t(filtered ? 'plans.empty.filteredBody' : 'plans.empty.body')}
      </p>
      {!filtered && <Eyebrow spacing="mt-4">/magic:plan &lt;your idea&gt;</Eyebrow>}
    </Card>
  )
}

export default function PlansPage() {
  const { session, pending } = useRequireSession()
  const { t } = useT()
  const [overview, setOverview] = useState<PlanOverview | null>(null)
  const [repoId, setRepoId] = useState<string>(ALL_REPOS)

  useEffect(() => {
    if (!session) return
    fetchPlanOverview().then(setOverview)
  }, [session])

  const viewerId = session?.user.id ?? null
  const cards = useMemo(
    () =>
      overview
        ? buildPlanCards(
            overview.sessions,
            overview.tickets,
            overview.repos,
            overview.emailByOwner,
            viewerId,
          )
        : [],
    [overview, viewerId],
  )

  const repoOptions = useMemo(
    () => (overview ? planRepoOptions(cards, overview.repos) : []),
    [cards, overview],
  )
  const visible = filterPlanCards(cards, repoId === ALL_REPOS ? null : repoId)

  if (pending || !session) return <FullPageLoader />

  return (
    <AppShell email={session.user.email ?? undefined}>
      <Eyebrow>/magic:plan</Eyebrow>
      <h1 className="font-display text-5xl font-black leading-none tracking-tight text-ink">
        {t('plans.title')}
      </h1>
      <p className="mt-3 max-w-2xl text-sm text-muted">{t('plans.subtitle')}</p>

      {/* Offered only when there is a choice to make: one repository means the
          filter can only ever narrow the list to itself. */}
      {repoOptions.length > 1 && (
        <div className="mt-8 flex items-center gap-3">
          <span className="text-xs font-medium text-muted">{t('plans.filter.label')}</span>
          <Dropdown
            value={repoId}
            options={[
              { value: ALL_REPOS, label: t('plans.filter.all') },
              ...repoOptions.map((repo) => ({ value: repo.id, label: repo.name })),
            ]}
            onChange={setRepoId}
            className="w-64"
          />
        </div>
      )}

      <div className="mt-8 space-y-3">
        {overview === null ? (
          <Card className="p-8 text-center text-sm text-muted">{t('common.loading')}</Card>
        ) : visible.length === 0 ? (
          <EmptyState filtered={cards.length > 0} />
        ) : (
          visible.map((card) => <PlanRow key={card.id} card={card} />)
        )}
      </div>
    </AppShell>
  )
}
