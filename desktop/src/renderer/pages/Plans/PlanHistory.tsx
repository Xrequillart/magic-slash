import { memo, useMemo, useState } from 'react'
import { Banner, Button, DiffStat, EmptyState, Text, TimelineLine, type TimelineLineProps } from '@ds/desktop'
import { History, RotateCcw } from '@ds/desktop/icons'
import { useT } from '../../i18n'
import { usePlanHistory, usePlanRevisionDiff } from '../../hooks/usePlanHistory'
import { useCodeAppearance } from '../../hooks/useCodeAppearance'
import CodeView from '../../components/file-preview/CodeView'
import { formatTimestamp } from '../../components/agent-info-sidebar/utils'
import { LINK_KIND_NAMES, linkDisplayName, toLinkKind } from '../../utils/externalLinks'
import { planAuthor } from '../../utils/planRows'
import { buildPlanTimeline, revisionPair, toggleRevision, type PlanTimelineEntry } from '../../utils/planHistory'
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
 * SELECTING. A click on a revision shows what it changed (against the one before it); a
 * second click on another compares the two. Link events are not selectable — there is no
 * text to diff.
 */
export const PlanHistory = memo(function PlanHistory({
  sessionId,
  version,
  now,
  heading,
}: {
  sessionId: string
  /**
   * Bumped by the page when something this history records has changed — a spec save, a
   * link added or removed — so it reads itself again. See `usePlanHistory`.
   */
  version: string | number
  /** The list's instant, as everywhere on this page. */
  now: number
  /** The section heading, drawn by the page so every section shares one. */
  heading: (title: string, hint?: string) => JSX.Element
}) {
  const t = useT()
  const history = usePlanHistory(sessionId, version)
  const [selected, setSelected] = useState<string[]>([])
  const [wholeSpec, setWholeSpec] = useState(false)

  const read = history.read
  const timeline = useMemo(() => (read ? buildPlanTimeline(read) : []), [read])
  const pair = read ? revisionPair(read.revisions, selected, read.olderRevisions) : null
  const stampOf = (id: string | null | undefined) => read?.revisions.find((revision) => revision.id === id)?.updatedAt ?? ''
  const diff = usePlanRevisionDiff(pair?.from, pair?.olderHidden ? undefined : pair?.to, `${stampOf(pair?.from)}|${stampOf(pair?.to)}`)
  const { appearance, blend } = useCodeAppearance()

  const person = (id: string | undefined): Pick<TimelineLineProps, 'actor' | 'avatar'> => ({
    actor: id ? planAuthor(id, read?.emailByAuthor ?? {}) : t('plans.history.formerMember'),
    avatar: { src: (id && read?.avatarByAuthor[id]) || null, alt: '' },
  })

  const rowOf = (entry: PlanTimelineEntry): Omit<TimelineLineProps, 'first' | 'last'> => {
    const date = t('relative.ago', { time: formatTimestamp(entry.at, now, t) })
    const dateTitle = new Date(entry.at).toLocaleString()
    if (entry.kind === 'revision') {
      const { revision } = entry
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
        selected: selected.includes(revision.id),
        onSelect: () => {
          setSelected((picked) => toggleRevision(picked, revision.id))
          setWholeSpec(false)
        },
        selectLabel: t('plans.history.select'),
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

  const diffTitle = selected.length >= 2
    ? t('plans.history.diffBetween')
    : pair?.olderHidden
      ? t('plans.history.diffOldestShown')
      : pair?.from
        ? t('plans.history.diffPrevious')
        : t('plans.history.diffFirst')

  const diffMessage = pair?.olderHidden
    ? t('plans.history.olderHidden')
    : diff === null
      ? t('common.loading')
      : diff.failed
        ? t('plans.history.diffFailed')
        : diff.additions === 0 && diff.deletions === 0
          ? t('plans.history.noChange')
          : null

  return (
    <>
      {heading(t('plans.history.title'), t('plans.history.hint'))}
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

          {!pair ? (
            <Text size="xs" tone="secondary" className="opacity-70">{t('plans.history.pickHint')}</Text>
          ) : (
            <div className="rounded-xl bg-surface overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-4 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Text size="sm" weight="medium" className="truncate">{diffTitle}</Text>
                  {diff && !diff.failed && <DiffStat additions={diff.additions} deletions={diff.deletions} />}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {diff && !diff.failed && diff.changesOnlyHtml && (
                    <Button size="sm" tone="ghost" onClick={() => setWholeSpec((whole) => !whole)}>
                      {wholeSpec ? t('plans.history.changesOnly') : t('plans.history.wholeSpec')}
                    </Button>
                  )}
                  <Button size="sm" tone="ghost" onClick={() => setSelected([])}>{t('plans.history.clear')}</Button>
                </div>
              </div>
              {diff === null || diff.failed || diffMessage ? (
                <p className="px-4 py-6 text-center text-sm text-text-secondary">{diffMessage}</p>
              ) : (
                /* Its own scroll, capped: a spec is long, and the diff must not push the rest
                   of the page a megabyte down. */
                <div className="max-h-[32rem] overflow-auto">
                  <CodeView
                    content={diff.content}
                    highlightedHtml={wholeSpec ? diff.highlightedHtml : (diff.changesOnlyHtml ?? diff.highlightedHtml)}
                    appearance={appearance}
                    blend={blend}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  )
})
