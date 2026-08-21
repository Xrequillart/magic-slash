'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, ExternalLink, FolderGit2, User } from 'lucide-react'
import { useRequireSession } from '@/lib/session'
import { fetchPlanSession, setPlanSessionStatus, type PlanDetail } from '@/lib/planSessions'
import {
  groupPlanTickets,
  planLabel,
  type PlanStatus,
  type PlanTicket,
} from '@/lib/planSessionRows'
import { formatRelative } from '@/lib/installations'
import { useT } from '@/lib/i18n/useLanguage'
import { AppShell } from '@/components/AppShell'
import { Markdown } from '@/components/Markdown'
import { Badge, Card, Eyebrow, FullPageLoader } from '@/components/ui'

/**
 * One plan: the tickets it created, then the spec it was approved from.
 *
 * TICKETS FIRST, and not as a footnote. The spec is the long document, but the
 * question that brings someone to this page is almost always "what got filed?" —
 * they arrive from a ticket, or they are about to pick one up. The spec is the
 * answer to the second question, "why was it cut this way", and it reads better
 * once you know what the tickets are.
 *
 * The hierarchy is rendered, not flattened: an epic with five stories under it and
 * five loose issues are different plans, and a flat list says the same thing about
 * both.
 */

function TicketLink({ ticket, nested }: { ticket: PlanTicket; nested?: boolean }) {
  const { t } = useT()
  const label = ticket.title?.trim() || ticket.key

  const content = (
    <>
      <span className="shrink-0 font-mono text-xs text-muted">{ticket.key}</span>
      <span className="min-w-0 break-words text-sm text-ink">{label}</span>
      {!nested && <Badge tone="accent">{t('plans.kind.epic')}</Badge>}
      {ticket.url && <ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0 text-muted" />}
    </>
  )

  const classes = `flex items-center gap-2.5 rounded-xl px-3 py-2 transition-colors ${
    ticket.url ? 'hover:bg-canvas' : ''
  }`

  // No url is a real state — a Jira creation that returned a key but no browse
  // link. The row still renders; it just is not a link.
  return ticket.url ? (
    <a href={ticket.url} target="_blank" rel="noreferrer" className={classes}>
      {content}
    </a>
  ) : (
    <div className={classes}>{content}</div>
  )
}

function Tickets({ tickets }: { tickets: PlanTicket[] }) {
  const { t } = useT()
  const groups = groupPlanTickets(tickets)

  if (groups.length === 0) {
    return (
      <Card className="p-6 text-center text-sm text-muted">{t('plans.detail.noTickets')}</Card>
    )
  }

  return (
    <Card className="divide-y divide-black/5 p-2">
      {groups.map((group, index) => (
        <div key={group.epic?.key ?? `orphans-${index}`} className="py-1.5">
          {group.epic ? (
            <TicketLink ticket={group.epic} />
          ) : (
            // The stories whose epic is not among these tickets. Labelled rather
            // than silently promoted to top level, because "the epic is missing"
            // is exactly what a partial creation looks like.
            <p className="px-3 py-2 text-[11px] uppercase tracking-wider text-muted">
              {t('plans.detail.noEpic')}
            </p>
          )}
          <div className="ml-4 border-l border-black/5 pl-2">
            {group.stories.map((story) => (
              <TicketLink key={story.key} ticket={story} nested />
            ))}
          </div>
        </div>
      ))}
    </Card>
  )
}

/**
 * Where the plan stands, and — for its author — the switch that says so.
 *
 * The badge is unchanged and is what everyone sees. The button next to it exists
 * because `status` is the one field of a session a person knows better than the
 * machine does: the desktop mirrors the agent's status onto the row as the skill
 * runs, so a session whose spec ping never landed, or whose planning was abandoned,
 * sits at `planning` forever with nobody able to say otherwise.
 *
 * BOTH DIRECTIONS, deliberately. A live agent's next spec upload re-sends its own
 * status and can undo this (see setPlanSessionStatus), so the way back has to be as
 * cheap as the way forward — otherwise the only repair is SQL.
 *
 * Owner only. RLS refuses everyone else's write anyway, and a button whose single
 * outcome is an error message is worse than no button at all.
 */
function StatusControl({
  status,
  own,
  onChange,
}: {
  status: PlanStatus
  own: boolean
  onChange: (next: PlanStatus) => Promise<void>
}) {
  const { t } = useT()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const next: PlanStatus = status === 'planned' ? 'planning' : 'planned'

  const flip = async () => {
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      await onChange(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <Badge tone={status === 'planned' ? 'green' : 'yellow'}>
          {t(status === 'planned' ? 'plans.status.planned' : 'plans.status.planning')}
        </Badge>
        {own && (
          <button
            type="button"
            onClick={flip}
            disabled={saving}
            className="flex shrink-0 items-center gap-1 rounded-lg border border-black/10 px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-black/[0.03] hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t(next === 'planned' ? 'plans.detail.markPlanned' : 'plans.detail.markPlanning')}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red">{error}</p>}
    </div>
  )
}

export default function PlanDetailPage() {
  const params = useParams<{ id: string }>()
  const { session, pending } = useRequireSession()
  const { t, lang } = useT()

  // undefined = still loading, null = nothing to show (see fetchPlanSession).
  const [detail, setDetail] = useState<PlanDetail | null | undefined>(undefined)

  useEffect(() => {
    if (!session || !params.id) return
    fetchPlanSession(params.id).then(setDetail)
  }, [session, params.id])

  /**
   * Patch the status in place, with the value the row came BACK with rather than the
   * one that was asked for — a successful write is self-correcting that way. No
   * re-read: nothing else about the session changed, and re-fetching would pull the
   * whole spec markdown down again to update one word.
   */
  const changeStatus = useCallback(
    async (next: PlanStatus) => {
      if (!params.id) return
      const stored = await setPlanSessionStatus(params.id, next, lang)
      setDetail((current) =>
        current ? { ...current, session: { ...current.session, status: stored } } : current,
      )
    },
    [params.id, lang],
  )

  if (pending || !session) return <FullPageLoader />

  // `detail.author` is already resolved by fetchPlanSession, through the same
  // planAuthor the list uses — so "you" is the only substitution left to make.
  const own = detail ? detail.session.ownerId === session.user.id : false
  const author = own ? t('plans.you') : detail?.author ?? ''

  return (
    <AppShell email={session.user.email ?? undefined}>
      <Link
        href="/plans"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('plans.detail.back')}
      </Link>

      {detail === undefined ? (
        <Card className="p-8 text-center text-sm text-muted">{t('common.loading')}</Card>
      ) : detail === null ? (
        /* RLS answers "no such plan" and "not yours" identically — an empty
           result — so this page says exactly that much and no more. */
        <Card className="p-8 text-center">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-black/15" />
          <p className="text-sm text-muted">{t('plans.detail.notFound')}</p>
          <p className="mt-1 text-xs text-muted">{t('plans.detail.notFoundHint')}</p>
        </Card>
      ) : (
        <>
          <Eyebrow>/magic:plan</Eyebrow>
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
            <h1 className="min-w-0 break-words font-display text-4xl font-black leading-tight tracking-tight text-ink">
              {planLabel(detail.session)}
            </h1>
            <StatusControl status={detail.session.status} own={own} onChange={changeStatus} />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <FolderGit2 className="h-3.5 w-3.5 shrink-0" />
              {detail.repo?.name ?? t('plans.noRepo')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 shrink-0" />
              {author}
            </span>
            {detail.session.specSyncedAt && (
              <span>
                {t('plans.detail.syncedAt', {
                  when: formatRelative(detail.session.specSyncedAt, lang),
                })}
              </span>
            )}
          </div>

          {detail.session.idea && (
            <Card className="mt-8 p-5">
              <p className="mb-2 text-[10px] uppercase tracking-wider text-muted">
                {t('plans.detail.idea')}
              </p>
              <p className="text-sm text-ink/80">{detail.session.idea}</p>
            </Card>
          )}

          <h2 className="mb-3 mt-10 font-display text-sm font-bold text-ink">
            {t('plans.detail.tickets')}
          </h2>
          <Tickets tickets={detail.tickets} />

          <h2 className="mb-3 mt-10 font-display text-sm font-bold text-ink">
            {t('plans.detail.spec')}
          </h2>
          <Card className="p-7">
            {detail.session.spec ? (
              <Markdown content={detail.session.spec} variant="document" />
            ) : (
              /* The row is created at the skill's first metadata write, before any
                 spec has been uploaded — so an empty spec is a normal early state,
                 not a failure. */
              <p className="text-sm text-muted">{t('plans.detail.specPending')}</p>
            )}
          </Card>
        </>
      )}
    </AppShell>
  )
}
