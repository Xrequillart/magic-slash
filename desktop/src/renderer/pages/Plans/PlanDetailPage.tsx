import { memo, useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { AlertTriangle, ArrowLeft, CloudOff, FileWarning, RotateCcw } from 'lucide-react'
import type { PlanDetail, PlanTicketRead, PlanTicketStates } from '../../../types'
import { useT } from '../../i18n'
import { BTN_PRIMARY } from '../../theme/controls'
import MarkdownView from '../../components/file-preview/MarkdownView'
import { AccountAvatar } from '../../components/AccountAvatar'
import { RepoColorChip } from '../../components/agent-info-sidebar/RepoMark'
import { formatTimestamp } from '../../components/agent-info-sidebar/utils'
import { useStore } from '../../store'
import { configKeyForRepoId } from '../../utils/projectColors'
import type { PlanCard, PlanTicketGroup } from '../../utils/planRows'
import { groupPlanTickets, planLabel } from '../../utils/planRows'
import { taskSelectionFor } from '../../utils/taskSelection'
import { detectTicketProvider } from '../../components/agent-info-sidebar/utils'
import { TrackerBadge } from '../../components/icons/TrackerIcons'
import { JiraStatusPill, StateChip } from '../Tasks/parts'
import { STATUS_LOOK, STATUS_PILL } from './PlanRow'
import { PlanIdBadge } from './PlanIdBadge'

/**
 * One plan, given the whole page — the Plans page's second view, not a panel beside its
 * first. Structurally `Tasks/TaskDetailPage`: the same pinned bar taking over from the
 * list, the same sweep it arrives on, the same Escape that goes back.
 *
 * THE SPEC COMES OUT OF THE CLOUD ROW, NEVER OFF THIS MACHINE. `plan_sessions.spec` is
 * the copy every reader shares; the `.magic/spec-*.md` it was uploaded from exists only
 * on the author's disk, and most of the plans in this list were written by somebody
 * else. Reading the file would make a colleague's plan open on an empty page — which is
 * precisely what this view exists to stop.
 *
 * THE HEADER COMES FROM THE CARD, NOT FROM THE READ. The repository name, the author and
 * their photo are already resolved on the `PlanCard` of the row that was clicked, so
 * `plans:detail` fetches neither: doing so would cost an org roster and an avatar
 * download per open, to produce a header that at best agrees with the row underneath it
 * and at worst contradicts it. What the read brings is what the list deliberately does
 * not carry — the markdown, and the tickets rather than a count of them.
 *
 * TICKETS BEFORE THE SPEC, the order the webapp's `/plans/[id]` settled on: the spec is
 * the longer document, but the question that brings someone here is almost always "what
 * got filed?" — they arrive from a ticket, or they are about to pick one up. The spec
 * answers the second question, "why was it cut this way", and reads better once you know
 * what the tickets are.
 *
 * NOTHING HERE WRITES. Status changes, comments and editing are the webapp's, or a later
 * story's; this is a reader.
 *
 * No scroll container of its own: the Plans page's pane is the one scrolling element,
 * which is what lets the sweep animate a page taller than the frame.
 */

/**
 * The height of the bar pinned at the top of the page, in pixels.
 *
 * A height and no vertical padding, so the row inside is centred by `items-center` and
 * the space above and below it is equal by construction. The bar IS the page's top inset
 * rather than something sitting on one, which is why the Plans pane carries its padding
 * on the sweep layers and not on itself: an opaque band stopping short of the pane's edge
 * would leave a strip of the spec sliding past above it.
 */
/**
 * The pinned bar's height, and therefore the page's top inset. Kept at the number
 * `TaskDetailPage` settled on: the two pages are the same shape opened from two lists,
 * and a reader moving between them would see the heading start at a different place.
 *
 * 48 rather than 56 for that page's reason — the bar holds one 30px control, so eight of
 * those pixels were slack sitting directly between the back link and the title.
 */
const TOP_BAR_H = 48

/** One heading over one block, in the type the webapp's detail page uses for the same. */
function SectionHeading({ children }: { children: string }) {
  return <h2 className="text-sm font-semibold text-ink mt-8 mb-3">{children}</h2>
}

/**
 * The spec itself, behind a memo boundary — the same one `pr-comments/PRThread` puts
 * around a comment body, and for the same reason: `MarkdownView` is `react-markdown`,
 * which memoises NOTHING. It builds a fresh unified processor and re-parses the whole
 * document on every render it is handed.
 *
 * It matters more here than anywhere else in the app. This page re-renders while the
 * reader SCROLLS — `condensed` flips as the title passes behind the pinned bar — and the
 * document being re-parsed is a spec, which the uploader admits up to `MAX_SPEC_BYTES`,
 * synchronously on the renderer's thread, at the one moment a frame budget exists.
 * `content` is a string, so the default shallow compare is exact and the scroll stops
 * here.
 */
const SpecBody = memo(function SpecBody({ content }: { content: string }) {
  return <MarkdownView content={content} variant="document" />
})

/**
 * One ticket, as a row of the tree, and as ONE click target.
 *
 * THE ROW OPENS TASKS, AND NOTHING HERE OPENS THE TRACKER. It used to be a single button
 * onto `shell.openExternal`; when it learned to open the ticket in the app, the browser
 * kept a glyph at the end of the row for a while, and that glyph is now gone too. It was
 * paying for itself in the wrong currency: an outbound arrow on every row of every plan,
 * to reach a page this app already renders in full — body, labels, state, and the one
 * action that matters here, starting an agent on it. The tracker is still one click
 * further on, from the ticket's own page, where a reader who wants github.com is
 * actually asking for it.
 *
 * With the glyph went the second button, and with that the wrapper the two needed: a
 * button inside a button is invalid HTML, so they had to be siblings under a div that
 * carried the hover. One button carries its own hover again.
 *
 * `taskSelectionFor` CAN RETURN NULL, and that is not a dead click: a plan belonging to
 * a repository this machine has never configured — the ordinary case for a teammate's
 * plan — has no config key to open a board on, and a key of neither tracker's shape has
 * no tracker. Tasks then opens on the list narrowed to this ticket, which says "no open
 * ticket matches" on its own rather than dropping the reader on a generic backlog. The
 * query is `ticket.key` RAW, because that is already the form the list matches on:
 * `taskRows`' own `issueId` spells a GitHub issue `#194` and a Jira one `PROJ-12`,
 * exactly as this column does.
 *
 * The badge is drawn from the ticket's OWN `kind`, narrowed once in `main/cloud/plans.ts`,
 * and never from where the tree happens to place it: a row that knows what it is must not
 * have to be told by its caller, or the next surface to render one labels every ticket an
 * epic.
 */
function TicketRow({
  ticket,
  configKey,
  state,
}: {
  ticket: PlanTicketRead
  configKey?: string
  /** Off the tracker, live. Absent means "no answer" — see `PlanTicketStates`. */
  state?: PlanTicketStates[string]
}) {
  const t = useT()
  const openTasksModal = useStore((s) => s.openTasksModal)
  const label = ticket.title?.trim() || ticket.key
  /**
   * Which tracker filed this, off the KEY and off nothing else — `#412` is GitHub,
   * `PROJ-1234` is Jira. Not off the plan's repository, which can be tracked in both and
   * whose one `plan.tracker` setting would mislabel every ticket of a mixed plan; and
   * not off the url's host, which is absent on a ticket the tracker gave no browse link
   * for. `null` for a key of neither shape, which falls back to the plain mono id: a row
   * written by a future version must still be readable, just unlabelled.
   */
  const tracker = detectTicketProvider(ticket.key)

  return (
    <button
      type="button"
      onClick={() => openTasksModal({
        selection: taskSelectionFor(ticket.key, configKey),
        query: ticket.key,
      })}
      title={t('plans.detail.openInTasks')}
      className="w-full text-left flex items-center gap-2.5 px-3 py-1.5 rounded-lg min-w-0 transition-colors
        hover:bg-surface-strong focus:outline-none focus-visible:bg-surface-strong"
    >
      {/* The id and its tracker as ONE label, which is what `TrackerBadge` exists to
          say: Atlassian's blue behind a Jira key, our own grey behind a GitHub number.
          The board's cards and the ticket page's bar wear the same label for the same
          ticket, so a plan's tree is now recognisably a list of the same objects. */}
      {tracker
        ? <TrackerBadge tracker={tracker} ticketId={ticket.key} />
        : <span className="shrink-0 font-mono text-xs text-text-secondary">{ticket.key}</span>}
      <span className="min-w-0 text-sm text-ink truncate">{label}</span>
      {ticket.kind === 'epic' && (
        <span className="shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-accent/10 text-accent">
          {t('plans.kind.epic')}
        </span>
      )}
      {/* PINNED RIGHT and CENTRED ON THE ROW, drawn by the same two components the Tasks
          page draws it with: GitHub's open/closed chip, Jira's site-named pill coloured
          by category.

          The wrapper is a flex box of its own rather than a bare span, and that is what
          does the centring. `items-center` on the row aligns the wrapper, but a span with
          an inline-flex child inherits the row's `text-sm` line box and sits the pill a
          pixel or two proud of the middle; making the wrapper a flex container puts the
          pill on its own cross axis instead of on a line of text. `ml-auto` on the
          wrapper rather than a spacer, so a row still waiting on its answer has nothing
          there instead of a gap holding a place. */}
      {state && (
        <span className="ml-auto pl-2 flex items-center flex-shrink-0">
          {state.tracker === 'github'
            ? <StateChip state={state.state} t={t} />
            : <JiraStatusPill name={state.name} category={state.category} />}
        </span>
      )}
    </button>
  )
}

/**
 * The epic → story tree, in the order the tracker created it.
 *
 * The hierarchy is RENDERED, not flattened: an epic with five stories under it and five
 * loose issues are different plans, and a flat list says the same thing about both. The
 * trailing group with no epic is kept and labelled rather than silently promoted to top
 * level, because "the epic is missing" is exactly what a partial creation looks like —
 * see `groupPlanTickets`.
 */
function TicketTree({
  groups,
  configKey,
  states,
}: {
  groups: PlanTicketGroup[]
  configKey?: string
  states: PlanTicketStates
}) {
  const t = useT()
  return (
    <div className="rounded-xl bg-surface-subtle p-2 divide-y divide-line-subtle">
      {groups.map((group, index) => (
        <div key={group.epic?.key ?? `orphans-${index}`} className="py-1.5">
          {group.epic ? (
            <TicketRow ticket={group.epic} configKey={configKey} state={states[group.epic.key]} />
          ) : (
            <p className="px-3 py-2 text-[11px] uppercase tracking-wider text-text-secondary/60">
              {t('plans.detail.noEpic')}
            </p>
          )}
          <div className="ml-4 border-l border-line-subtle pl-2">
            {group.stories.map((story) => (
              <TicketRow
                key={story.key}
                ticket={story}
                configKey={configKey}
                state={states[story.key]}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/** The block both of this page's two nothings are drawn in: a failed read, and no plan. */
function Notice({
  Icon,
  title,
  body,
  children,
}: {
  Icon: typeof AlertTriangle
  title: string
  body: string
  children?: ReactNode
}) {
  return (
    <div className="py-10 flex flex-col items-center justify-center text-text-secondary text-sm gap-2 bg-surface-subtle rounded-xl">
      <Icon className="w-8 h-8 text-icon-muted" />
      <p>{title}</p>
      <p className="text-xs text-text-secondary/60 max-w-sm text-center">{body}</p>
      {children}
    </div>
  )
}

export function PlanDetailPage({
  card,
  now,
  paneRef,
  onBack,
}: {
  card: PlanCard
  /** The list's instant, not one of this page's own: see `Plans/index.tsx`. */
  now: number
  paneRef: RefObject<HTMLElement>
  onBack: () => void
}) {
  const t = useT()
  const repositories = useStore((s) => s.config?.repositories)

  // `null` = the read has not come back yet, which is a third state from a read that
  // came back with no session: the first is a line of text, the second an explanation.
  const [detail, setDetail] = useState<PlanDetail | null>(null)
  /** Bumped by Retry, for the reason `Plans/index.tsx` gives: one effect owns `detail`. */
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  /**
   * Whether the title has gone up behind the pinned bar, which is the one thing the bar
   * needs to know to draw its own bottom edge: a hairline under a band with the page
   * flush beneath it would be a rule across the page for no reason, and no hairline once
   * the spec slides underneath would leave the markdown dissolving into it.
   *
   * A sentinel and an observer rather than a scroll handler, the idiom `TaskDetailPage`
   * and the Tasks filter bar both use: this is one boolean that flips twice per visit,
   * where a `scroll` listener would remeasure a rectangle on every frame to answer it.
   * A plain ref, down to the effect body, because the heading it watches is OUTSIDE the
   * read's three branches — it is drawn from the card, before anything comes back — so
   * the node is there from the first commit and stays for the life of the page.
   *
   * `rootMargin` is the bar's own height: without it the title counts as visible while
   * it sits UNDER the band, which is the moment the rule is most needed.
   */
  const titleRef = useRef<HTMLDivElement>(null)
  const [condensed, setCondensed] = useState(false)

  useEffect(() => {
    const titleEl = titleRef.current
    const pane = paneRef.current
    if (!titleEl || !pane) return
    const observer = new IntersectionObserver(
      ([entry]) => setCondensed(!entry.isIntersecting),
      { root: pane, rootMargin: `-${TOP_BAR_H}px 0px 0px 0px` },
    )
    observer.observe(titleEl)
    return () => observer.disconnect()
  }, [paneRef])

  useEffect(() => {
    let cancelled = false
    setDetail(null)
    window.electronAPI.plans.detail(card.id)
      .then((next) => {
        if (!cancelled) setDetail(next)
      })
      .catch(() => {
        // The BRIDGE failed, not the query: `listPlanDetail` answers whatever the
        // database does. Either way nothing was read, so it is reported as a failed
        // read rather than as a plan that does not exist.
        if (!cancelled) setDetail({ session: null, tickets: [], failed: true })
      })
    return () => { cancelled = true }
  }, [card.id, attempt])

  /**
   * This repository's key IN THE LOCAL CONFIG, resolved the way `PlanRow` resolves it:
   * from the cloud `repoId`, never from the name. Names are unique only within one
   * organization, and both things keyed by this are keyed by the LOCAL config's keys —
   * the colour map the `RepoMark` below draws from, and the board `TicketTree`'s rows
   * open on. Undefined for a repository this machine has never cloned, which is the
   * ordinary case for a teammate's plan: the mark falls back to the generic folder icon,
   * and a ticket click falls back to the list narrowed to its id.
   */
  const repoConfigKey = configKeyForRepoId(card.repoId, repositories)

  /**
   * Every ticket's state as its tracker reports it NOW — the pills on the right of the
   * tree. Empty until the read lands, and empty for good whenever there is no answer.
   *
   * A SECOND READ, deliberately after the first rather than beside it. `plans:detail` is
   * a cloud read that cannot fail slowly and is what the page is made of; this one goes
   * to github.com and to an Atlassian site, and is decoration. Sequenced on `detail`
   * because the keys come out of it, and that ordering is also what makes the tree
   * render at cloud speed and gain its pills a moment later rather than waiting on a
   * tracker to draw a list the cloud already answered.
   *
   * SKIPPED ENTIRELY for a plan on a repository this machine has not configured — the
   * ordinary case for a teammate's — because `tasks:ticketStatuses` would have nothing
   * to resolve the tracker coordinates against and could only answer `{}`. Asking is
   * then two IPC hops and a promise for a known answer.
   *
   * Never throws into the page: a rejected bridge call leaves the map empty, which is
   * the same thing an unreadable tracker leaves, and the same thing the rows already
   * draw. There is no error state here because there is nothing a reader would do with
   * one — see `PlanTicketStates`.
   */
  const [ticketStates, setTicketStates] = useState<PlanTicketStates>({})

  useEffect(() => {
    setTicketStates({})
    const keys = detail?.tickets.map((ticket) => ticket.key) ?? []
    if (!repoConfigKey || keys.length === 0) return

    let cancelled = false
    window.electronAPI.tasks.ticketStatuses(repoConfigKey, keys)
      .then((next) => {
        if (!cancelled) setTicketStates(next)
      })
      .catch(() => {
        // Left empty rather than reported: see above.
      })
    return () => { cancelled = true }
  }, [detail, repoConfigKey])

  /**
   * Escape goes back to the LIST, not out of the whole page.
   *
   * PageModal listens for Escape on `window` too and closes the modal, so this has to
   * run first AND stop the other listener — which is what the capture phase plus
   * `stopImmediatePropagation` does. Plain `stopPropagation` would not help: both
   * listeners are on the same target, and only the "immediate" form stops the others
   * there. Mounted with this page, so Escape goes on closing the modal from the list.
   */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      e.stopImmediatePropagation()
      onBack()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [onBack])

  const { pill, labelKey } = STATUS_LOOK[card.status]
  /**
   * The status, drawn ONCE and rendered in two places — the pinned bar while the reader
   * has scrolled past the heading, the heading itself before that. One expression rather
   * than two copies, because the two are the same fact and a pill that changed shape on
   * scroll would read as a second, different status.
   */
  const statusChip = (
    <span className={`${STATUS_PILL} ${pill}`}>
      {t(labelKey)}
    </span>
  )
  const session = detail?.session
  // Zero for "no such timestamp", the sentinel `planRecency` and `PlanRow` already use
  // for one — an unparseable stamp lands there too, since `NaN > 0` is false.
  const syncedAt = session?.specSyncedAt ? new Date(session.specSyncedAt).getTime() || 0 : 0
  /**
   * The markdown this row actually holds, or `undefined` for "none to render".
   *
   * A whitespace-only spec is no spec: it is what a file created and not yet written to
   * uploads as, and rendering it would draw an empty panel where a sentence belongs. Held
   * here rather than re-tested in each branch below, because the oversize flag and the
   * presence of markdown are read TOGETHER and a second spelling of "has a spec" is how
   * the two fall out of step.
   */
  const spec = session?.spec?.trim() ? session.spec : undefined

  return (
    <div className="flex flex-col">
      {/* The trail out, and the band the page scrolls under. Full-bleed via the negative
          margins so nothing slides past an inset edge, and `bg-bg-secondary` because that
          is PageModal's own panel colour: anything else would read as a floating
          toolbar.

          WHAT IT CARRIES DEPENDS ON `condensed`, the arrangement `Tasks/TaskDetailPage`
          settled on for the same bar: the title and the status STAND IN for the heading
          once it has gone behind the band, and are absent while the heading itself is on
          screen — two copies of a title six pixels apart is not a reminder, it is a
          duplicate. What fills the bar before that is the repository name, in grey: the
          one piece of the header worth keeping at a glance and the only thing here that
          does not repeat something visible. */}
      <div
        className={`sticky top-0 z-20 -mx-6 px-6 flex items-center gap-3 min-w-0 bg-bg-secondary transition-colors ${
          condensed ? 'border-b border-line' : 'border-b border-transparent'
        }`}
        style={{ height: TOP_BAR_H }}
      >
        <button
          onClick={onBack}
          title={t('plans.detail.back')}
          className="flex items-center gap-1.5 p-1.5 -ml-1.5 text-text-secondary hover:text-ink hover:bg-surface-strong rounded-lg transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs font-medium">{t('plans.detail.back')}</span>
        </button>
        {condensed ? (
          <>
            {/* THE BADGE COMES WITH THE TITLE, the way a task's key does in its own
                pinned bar: the bar stands in for the heading it replaced, and the heading
                is `#7` and a name. Without it the reader who has scrolled has nothing on
                screen naming which plan this is other than a truncated title.

                The row's own type size, not the heading's: this is the title standing in
                for itself in a 56px band, not a second `h1`. `title` on the element so
                a name the bar has to truncate is still readable on hover. */}
            <PlanIdBadge number={card.number} />
            <span className="min-w-0 flex-1 text-xs text-ink truncate" title={planLabel(card)}>
              {planLabel(card)}
            </span>
            {/* Pinned to the right edge, where the heading's own pill sits: the bar is
                the heading, so the two must not swap sides as one replaces the other. */}
            {statusChip}
          </>
        ) : (
          <span className="min-w-0 flex-1 text-xs text-text-secondary/50 truncate">
            {card.repoName ?? t('plans.noRepo')}
          </span>
        )}
      </div>

      {/* The heading is the CARD's, drawn before the read comes back and unchanged by it:
          the reader clicked this row and must see its title straight away, not a spinner
          where the name of the thing they opened should be. */}
      <div ref={titleRef} className="flex items-start justify-between gap-4 min-w-0">
        {/* Badge, then name — the row's order, so the list and the page it opens read the
            same way down the left edge. At `md`, the size a ticket's key wears on ITS
            page: this is a heading, and the list's 24px badge beside a `text-xl` title
            read as a caption that had come adrift from it.

            `items-center` centres the two on their HEIGHTS, which is what `TaskDetailPage`
            settled on for the same pair: hung from the first line's cap height the badge
            sits visibly high on the one-line titles that are most of them. */}
        <div className="flex items-center gap-3 min-w-0">
          <PlanIdBadge number={card.number} size="md" />
          <h1 className="min-w-0 text-xl font-semibold text-ink break-words">{planLabel(card)}</h1>
        </div>
        {statusChip}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-secondary">
        <RepoColorChip colorKey={repoConfigKey} label={card.repoName ?? t('plans.noRepo')} />
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <span className="flex shrink-0 text-icon-muted">
            <AccountAvatar dataUrl={card.avatarUrl ?? null} variant="sidebar" alt="" />
          </span>
          <span className="truncate">{card.author}</span>
        </span>
        {/* Only once the read is in: `specSyncedAt` is on the session, not on the card,
            and it is the one line here that says something about the SPEC rather than
            about the plan. Guarded against a timestamp no Date can parse. */}
        {syncedAt > 0 && (
          <span>{t('plans.detail.syncedAt', {
            when: t('relative.ago', { time: formatTimestamp(syncedAt, now, t) }),
          })}</span>
        )}
      </div>

      {detail === null ? (
        <p className="py-10 text-center text-sm text-text-secondary">{t('common.loading')}</p>
      ) : detail.failed ? (
        /* BEFORE the not-found branch, exactly as on the list: a read that errored has no
           session either, and "this plan is not available" over a dropped connection is a
           claim about the reader's access that nothing here has evidence for. */
        <Notice Icon={CloudOff} title={t('plans.error.title')} body={t('plans.error.body')}>
          <button type="button" onClick={retry} className={`${BTN_PRIMARY} mt-1`}>
            <RotateCcw className="w-3.5 h-3.5" />
            {t('common.retry')}
          </button>
        </Notice>
      ) : !session ? (
        /* RLS answers "no such plan" and "not yours" identically — an empty result — so
           this says exactly that much and no more. Reachable from a list that is a few
           minutes old: the session may have been deleted, or the repository unshared,
           since the row was drawn. */
        <Notice
          Icon={AlertTriangle}
          title={t('plans.detail.notFound')}
          body={t('plans.detail.notFoundHint')}
        />
      ) : (
        <>
          {session.idea && (
            <div className="mt-6 p-4 rounded-xl bg-surface-subtle">
              <p className="mb-1.5 text-[10px] uppercase tracking-wider text-text-secondary/60">
                {t('plans.detail.idea')}
              </p>
              <p className="text-sm text-ink/80 whitespace-pre-line">{session.idea}</p>
            </div>
          )}

          <SectionHeading>{t('plans.detail.tickets')}</SectionHeading>
          {detail.tickets.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-secondary bg-surface-subtle rounded-xl">
              {t('plans.detail.noTickets')}
            </p>
          ) : (
            <TicketTree
              groups={groupPlanTickets(detail.tickets)}
              configKey={repoConfigKey}
              states={ticketStates}
            />
          )}

          <SectionHeading>{t('plans.detail.spec')}</SectionHeading>
          {/* FOUR STATES, each said out loud, because a blank panel is what this page
              was built to stop being:
                · the markdown, rendered;
                · the markdown AND the oversize flag, which is a spec that synced while
                  it was small enough and has since grown past the ceiling;
                · too large to sync and nothing stored, a finished document on somebody
                  else's disk that will never arrive on its own;
                · not written yet, which is the ordinary first minutes of a session and
                  really will fill in.
              THE FLAG ALONE DOES NOT DECIDE, and that is the whole of this branching.
              `specFields` sends `specOversize: true` and NOTHING ELSE for an oversize
              read, and `CloudStore.planSessionRow` omits rather than nulls, so the last
              good markdown and the `spec_synced_at` beside it both survive in the row. A
              flag-first test would therefore hide a document the page is holding and call
              it "never uploaded", directly under a header still reading "Spec updated
              <date>". So the markdown wins when there is any, and the flag downgrades it
              to a stale copy instead of suppressing it; only a row with no markdown at all
              gets the "never uploaded" wording, which is the one place it is true. */}
          <div className="px-6 py-5 rounded-xl bg-surface">
            {spec ? (
              <>
                {session.specOversize && (
                  /* ABOVE the markdown, not below it: a caveat placed after a long
                     document is read once the stale content it warns about already has
                     been. */
                  <p className="mb-4 flex items-start gap-2 text-sm text-text-secondary">
                    <FileWarning className="w-4 h-4 shrink-0 mt-0.5 text-yellow" />
                    {t('plans.detail.specOversizeStale')}
                  </p>
                )}
                <SpecBody content={spec} />
              </>
            ) : session.specOversize ? (
              <p className="flex items-start gap-2 text-sm text-text-secondary">
                <FileWarning className="w-4 h-4 shrink-0 mt-0.5 text-yellow" />
                {t('plans.detail.specOversize')}
              </p>
            ) : (
              <p className="text-sm text-text-secondary">{t('plans.detail.specPending')}</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
