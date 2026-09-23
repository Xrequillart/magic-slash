import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Banner, Button, DiffStat, EmptyState, Text, TimelineLine, type TimelineLineProps } from '@ds/desktop'
import { ChevronDown, ChevronUp, History, RotateCcw } from '@ds/desktop/icons'
import { useT } from '../../i18n'
import { usePlanHistory, usePlanRevisionDiff } from '../../hooks/usePlanHistory'
import { useCodeAppearance } from '../../hooks/useCodeAppearance'
import CodeView from '../../components/file-preview/CodeView'
import { formatTimestamp } from '../../components/agent-info-sidebar/utils'
import { LINK_KIND_NAMES, linkDisplayName, toLinkKind } from '../../utils/externalLinks'
import { planAuthor, toStatus } from '../../utils/planRows'
import { STATUS_LOOK } from './PlanRow'
import { buildPlanTimeline, revisionPair, type PlanTimelineEntry } from '../../utils/planHistory'
import { LINK_ICONS } from './linkIcons'

/**
 * THE PLAN'S HISTORY — every revision of its spec and every link pinned or removed, on one
 * rail, newest first — and the diff between two revisions.
 *
 * TWO TABLES, ONE TIMELINE. Revisions (`plan_revisions`) and link events
 * (`plan_link_events`) are read together and interleaved by date: a reader asking "what
 * happened to this plan" does not care which table it was written to.
 *
 * HOW A CHANGE WAS MADE IS THE POINT, and it is said on every revision: by hand in the app,
 * or with Claude, naming the agent when the author's app could. The database records that
 * and not this page — see 20260923120000 — so the badge is a reading, never a guess.
 *
 * READ-ONLY. There is no restore: a revision can be looked at and compared, and putting an
 * old text back is an edit like any other, made in the spec above.
 *
 * EVERY REVISION CARRIES ITS DIFF, under its own row on the rail: what it changed against
 * the one before it, there where it happened, without a click to ask for it. A diff longer
 * than `FOLDED_ROWS` lines is folded to its first ones, with a button to see the rest.
 * Link and status events carry nothing — there is no text to diff.
 *
 * NO HEADING OF ITS OWN: the page draws it under a "History" tab beside the spec, and the
 * tab is its title.
 */
/**
 * How many lines of a diff are shown before it is folded. Past it, the diff opens on these
 * and a button offers the rest: a history is scanned revision by revision, and one rewrite
 * of the whole spec must not push every other entry a screen down.
 */
const FOLDED_ROWS = 30

/**
 * Whether the node has come near the viewport yet. Once true it stays true: it decides when
 * a revision's diff is first fetched, and a plan can hold dozens of revisions, most of them
 * below the fold, each a highlighting pass in the main process.
 */
function useSeen<T extends Element>(): [RefObject<T>, boolean] {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const node = ref.current
    if (seen || !node) return
    if (typeof IntersectionObserver === 'undefined') {
      setSeen(true)
      return
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) setSeen(true)
    }, { rootMargin: '400px 0px' })
    observer.observe(node)
    return () => observer.disconnect()
  }, [seen])
  return [ref, seen]
}

/**
 * What one revision changed, drawn under its row: the changed regions with their context,
 * folded to `FOLDED_ROWS` lines when there are more.
 *
 * THE FOLD IS MEASURED, NOT CUT. The diff is highlighted HTML from the main process, and
 * slicing it would mean parsing it; instead every row is rendered, counted, and the box is
 * cut at the top of the first row past the fold. Opening it is the same rows, uncut.
 */
function RevisionDiff({ from, to, olderHidden, stamp }: {
  from: string | null
  to: string
  olderHidden?: boolean
  stamp: string
}) {
  const t = useT()
  const [ref, seen] = useSeen<HTMLDivElement>()
  const diff = usePlanRevisionDiff(seen ? from : undefined, seen && !olderHidden ? to : undefined, stamp)
  const { appearance, blend } = useCodeAppearance()
  const [wholeSpec, setWholeSpec] = useState(false)
  const [open, setOpen] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)
  const [fold, setFold] = useState<{ rows: number; cut: number } | null>(null)

  const html = diff && !diff.failed ? (wholeSpec ? diff.highlightedHtml : (diff.changesOnlyHtml ?? diff.highlightedHtml)) : null
  useLayoutEffect(() => {
    const body = bodyRef.current
    if (!body || html === null) return setFold(null)
    const rows = body.querySelectorAll<HTMLElement>('.shiki code .line')
    if (rows.length <= FOLDED_ROWS) return setFold(null)
    const top = body.getBoundingClientRect().top
    setFold({ rows: rows.length, cut: rows[FOLDED_ROWS].getBoundingClientRect().top - top })
  }, [html, appearance])

  const message = olderHidden
    ? t('plans.history.olderHidden')
    : diff === null
      ? t('common.loading')
      : diff.failed
        ? t('plans.history.diffFailed')
        : diff.additions === 0 && diff.deletions === 0
          ? t('plans.history.noChange')
          : null

  return (
    <div ref={ref} className="mt-1 rounded-xl bg-surface overflow-hidden">
      {message !== null || diff === null || diff.failed ? (
        <p className="px-4 py-3 text-xs text-text-secondary">{message}</p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 px-4 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <Text size="xs" tone="secondary" className="truncate">
                {from ? t('plans.history.diffPrevious') : t('plans.history.diffFirst')}
              </Text>
              <DiffStat additions={diff.additions} deletions={diff.deletions} />
            </div>
            {diff.changesOnlyHtml && (
              <Button size="sm" tone="ghost" onClick={() => setWholeSpec((whole) => !whole)}>
                {wholeSpec ? t('plans.history.changesOnly') : t('plans.history.wholeSpec')}
              </Button>
            )}
          </div>
          <div
            ref={bodyRef}
            className="relative overflow-hidden"
            style={fold && !open ? { maxHeight: fold.cut } : undefined}
          >
            <CodeView content={diff.content} highlightedHtml={html} appearance={appearance} blend={blend} />
            {/* The fold says it is one: the last lines fade out rather than stop mid-diff. */}
            {fold && !open && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-surface to-transparent" />
            )}
          </div>
          {fold && (
            <div className="flex justify-center border-t border-line-subtle px-4 py-1.5">
              <Button
                size="sm"
                tone="ghost"
                icon={open ? ChevronUp : ChevronDown}
                onClick={() => setOpen((was) => !was)}
              >
                {open ? t('plans.history.foldDiff') : t('plans.history.unfoldDiff', { count: fold.rows })}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export const PlanHistory = memo(function PlanHistory({
  sessionId,
  version,
  now,
}: {
  sessionId: string
  version: string | number
  now: number
}) {
  const t = useT()
  const history = usePlanHistory(sessionId, version)

  const read = history.read
  const timeline = useMemo(() => (read ? buildPlanTimeline(read) : []), [read])
  const stampOf = (id: string | null | undefined) => read?.revisions.find((revision) => revision.id === id)?.updatedAt ?? ''

  const person = (id: string | undefined): Pick<TimelineLineProps, 'actor' | 'avatar'> => ({
    actor: id ? planAuthor(id, read?.emailByAuthor ?? {}) : t('plans.history.formerMember'),
    avatar: { src: (id && read?.avatarByAuthor[id]) || null, alt: '' },
  })

  const rowOf = (entry: PlanTimelineEntry): Omit<TimelineLineProps, 'first' | 'last'> => {
    const date = t('relative.ago', { time: formatTimestamp(entry.at, now, t) })
    const dateTitle = new Date(entry.at).toLocaleString()
    if (entry.kind === 'revision') {
      const { revision } = entry
      const pair = read ? revisionPair(read.revisions, revision.id, read.olderRevisions) : null
      return {
        ...person(revision.authorId),
        action: t('plans.history.edited'),
        badge: revision.source === 'agent'
          ? {
              label: revision.agentName
                ? t('plans.history.withClaudeAgent', { agent: revision.agentName })
                : t('plans.history.withClaude'),
              tone: 'claude-code',
            }
          : { label: t('plans.history.byHand') },
        date,
        dateTitle,
        children: pair && (
          <RevisionDiff
            from={pair.from}
            to={pair.to}
            olderHidden={pair.olderHidden}
            stamp={`${stampOf(pair.from)}|${stampOf(pair.to)}`}
          />
        ),
      }
    }
    if (entry.kind === 'status') {
      const { event } = entry
      // A word this build does not know reads as the default, as on the list; the raw
      // values stay in the tooltip, so nothing is hidden.
      const plate = (value: string) => {
        const look = STATUS_LOOK[toStatus(value)]
        return { label: t(look.labelKey), tone: look.tone }
      }
      return {
        ...person(event.actorId),
        action: t('plans.history.statusChanged'),
        statusChange: {
          from: event.from ? plate(event.from) : undefined,
          to: plate(event.to),
          title: event.from ? `${event.from} → ${event.to}` : event.to,
        },
        badge: event.source === 'agent'
          ? { label: t('plans.history.withClaude'), tone: 'claude-code' }
          : { label: t('plans.history.byHand') },
        date,
        dateTitle,
      }
    }
    const { event } = entry
    const kind = toLinkKind(event.kind)
    return {
      ...person(event.actorId),
      action: t(event.action === 'added' ? 'plans.history.pinned' : 'plans.history.removed'),
      // A removed link has no row left: its title and address are the event's own copy, and
      // both are shown, since the address is what says which link it was.
      detail: event.title ?? linkDisplayName(event.url),
      detailNote: event.title ? linkDisplayName(event.url) : undefined,
      detailTitle: event.url,
      icon: LINK_ICONS[kind],
      badge: { label: kind === 'other' ? t('plans.links.other') : LINK_KIND_NAMES[kind] },
      date,
      dateTitle,
    }
  }

  return (
    <>
      {read === null ? (
        <p className="py-6 text-center text-sm text-text-secondary bg-surface-subtle rounded-xl">{t('common.loading')}</p>
      ) : read.failed ? (
        <Banner
          variant="danger"
          bordered
          actions={[{ label: t('common.retry'), icon: RotateCcw, onClick: history.retry, primary: true }]}
        >
          {t('plans.history.failed')}
        </Banner>
      ) : timeline.length === 0 ? (
        <EmptyState icon={History}>{t('plans.history.empty')}</EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="px-2 py-2 rounded-xl bg-surface-subtle">
            {timeline.map((entry, i) => (
              <TimelineLine key={`${entry.kind}:${entry.id}`} {...rowOf(entry)} first={i === 0} last={i === timeline.length - 1} />
            ))}
          </div>
          {read.truncated && <Text size="xs" tone="secondary">{t('plans.history.truncated')}</Text>}
        </div>
      )}
    </>
  )
})
