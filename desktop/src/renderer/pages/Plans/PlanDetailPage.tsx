import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { AlertTriangle, ArrowLeft, CloudOff, FileWarning, Pencil, RotateCcw, Save, X } from '@ds/desktop/icons'
import type { PlanComment, PlanDetail, PlanSpecUpdateResult, PlanTicketRead, PlanTicketStates } from '../../../types'
import { useT } from '../../i18n'
import { BTN_PRIMARY } from '../../theme/controls'
import MarkdownView from '../../components/file-preview/MarkdownView'
import MarkdownCommentLayer, { type CommentSource } from '../../components/file-preview/MarkdownCommentLayer'
import {
  CommentBody, Quote,
  type CommentThread, type CommentTurn,
} from '../../components/file-preview/CommentCard'
import { RepoColorChip } from '../../components/agent-info-sidebar/RepoMark'
import { formatTimestamp } from '../../components/agent-info-sidebar/utils'
import { useStore, type FileComment } from '../../store'
import { useAuth } from '../../hooks/useAuth'
import { usePlanComments } from '../../hooks/usePlanComments'
import { configKeyForRepoId } from '../../utils/projectColors'
import type { PlanCard, PlanTicketGroup } from '../../utils/planRows'
import { groupPlanTickets, planAuthor, planLabel } from '../../utils/planRows'
import type { PlanCommentThread } from '../../utils/planComments'
import {
  buildPlanCommentThreads, canEditPlanComment, isOrphanedPlanCommentThread,
} from '../../utils/planComments'
import { taskSelectionFor } from '../../utils/taskSelection'
import { detectTicketProvider } from '../../components/agent-info-sidebar/utils'
import { Banner, Button, CommentCard as TurnCard, FormField, Label, Status, StickyBar, Text, TrackerBadge } from '@ds/desktop'
import { JiraStatusPill, StateChip } from '../Tasks/parts'
import { STATUS_LOOK } from './PlanRow'
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
 * TWO THINGS HERE WRITE: comments on the spec, and the spec itself. Any member of the
 * plan's organization may edit it (issue #302), the author's own plan and a colleague's
 * alike; the database decides, and this page only offers. See `draft` below.
 * Status changes are still the webapp's.
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
/**
 * Everything the spec needs in order to be COMMENTABLE, as one object.
 *
 * Bundled rather than passed as four props for the memo boundary's sake: `SpecBody` is
 * memoised precisely because this page re-renders while the reader scrolls, and a prop
 * rebuilt every render would defeat that as thoroughly as not memoising at all. One object,
 * built in one `useMemo`, is one identity to keep stable.
 *
 * `null` while the comments have not come back, when the read failed, and when there is no
 * session to write against: the spec then renders exactly as it did before this story, with
 * no selection affordance. That is deliberate — offering to comment before the existing
 * comments have arrived invites writing a second note about a passage somebody has already
 * covered.
 */
interface SpecComments {
  source: CommentSource
  renderOrphans: (lost: readonly FileComment[]) => ReactNode
  /**
   * The threads that have no passage to look for at all — the layer cannot tell, so the
   * page names them. See `isOrphanedPlanCommentThread`.
   */
  anchorless: readonly FileComment[]
}

const SpecBody = memo(function SpecBody({
  content,
  comments,
}: {
  content: string
  comments: SpecComments | null
}) {
  /**
   * The spec as it was before this story: rendered, and not selectable for comment.
   *
   * Drawn for the three cases `specComments` answers `null` for — the read still in flight,
   * the read failed, no session to write against. WHO is reading is not one of them:
   * `specComments` never consults the viewer's id, so a reader with no account lands here
   * only by way of a read that could not be made, and never by a test on them.
   *
   * It is `MarkdownView` rather than the layer with an inert source, which would be the same
   * pixels and a different promise: selecting a passage would open a composer whose Save
   * went nowhere. Offering an affordance that cannot work is worse than not offering it.
   */
  if (!comments) return <MarkdownView content={content} variant="document" />
  return (
    <MarkdownCommentLayer
      content={content}
      /**
       * A plan's spec has NO LOCAL FILE, which is what these three empty strings are
       * saying. They key the renderer's zustand comment map, and this layer does not use
       * it — `source` overrides the reads and the writes both — so what they key is an
       * entry nothing ever writes to. Empty rather than an invented `plan:<uuid>` path,
       * which would look like a location and be none.
       */
      repoPath=""
      filePath=""
      fingerprint=""
      /* Prose on a page of its own, not in a 70%-wide drawer: the same scale the spec was
         rendered at before it gained a comment layer. */
      variant="document"
      /* Prose, so the card gets its radius back and drops the echoed quote — the passage is
         highlighted a few lines above it. See `CommentCard`'s own `spec`. */
      spec
      source={comments.source}
      renderOrphans={comments.renderOrphans}
      anchorless={comments.anchorless}
    />
  )
})

/**
 * One comment whose passage the spec no longer contains, drawn OUTSIDE the document.
 *
 * THE ONLY PLACE IT CAN BE. A comment on prose is drawn by portalling its card into a node
 * spliced in after the block its passage ends in; a comment whose passage has gone gets no
 * range, therefore no host, therefore nowhere in the flow to exist. So the orphans are
 * listed under the notice at the top, which is what `CommentAnchorNotice`'s disclosure is
 * for — and they are listed WHOLE, with their author, the passage they were left on and
 * what was said, because a comment reduced to a number in a sentence is a comment deleted
 * with extra steps.
 *
 * The passage is missing on one kind of orphan, and `Quote` already draws nothing for an
 * empty one: a reply promoted by its head being deleted never had a quote of its own — it
 * inherited the head's. What is left is still the author, the date and the words, which is
 * the whole of what there is to keep. See `isOrphanedPlanCommentThread`.
 *
 * Read-only, and that is not a shortcut. The actions a card offers are about a passage —
 * reply to this, rewrite what I said about this — and there is no this. What the reader
 * needs here is to be able to READ what was written and go and find where it went; editing
 * it in place would be the surest way to lose the context that makes it meaningful.
 */
function OrphanedThread({
  thread,
  turnOf,
}: {
  thread: PlanCommentThread
  turnOf: (comment: PlanComment) => CommentTurn
}) {
  return (
    <div className="rounded-lg bg-surface-subtle p-3 flex flex-col gap-2">
      {/* The passage it WAS left on, drawn by the same `Quote` the inline card uses. Printed
          here where that card deliberately does not print it (`spec` hides the echo, because
          the highlight is right there) — the whole point of an orphan is that there is no
          highlight to look at. */}
      <Quote quote={thread.head.quote} />
      {[thread.head, ...thread.replies].map(turnOf).map((turn) => (
        <TurnCard
          key={turn.id}
          ground="bare"
          avatar={{ src: turn.author.avatarUrl ?? null, alt: '', size: 'sm' }}
          author={turn.author.name}
          date={turn.date}
        >
          <CommentBody body={turn.body} />
        </TurnCard>
      ))}
    </div>
  )
}

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
   * THE SPEC EDITOR, when it is open. `null` is reading.
   *
   * `updatedAt` is the session's `updatedAt` as the detail read returned it, captured the
   * moment the editor opens and sent back UNCHANGED on save: it is the conflict guard, and
   * the raw string is the only form of it that can match. Never through a `Date` — the row
   * keeps microseconds, a `Date` keeps milliseconds, and a truncated value would report a
   * conflict on every save.
   *
   * `base` is the spec the editor opened on, so a Save that changed nothing can close the
   * editor without a write — a no-op save would still bump `updated_at` and hand every
   * colleague with the editor open a conflict for nothing.
   *
   * LOCAL STATE AND NOTHING ELSE. Leaving — Cancel, Back, Escape, closing the modal — drops
   * it, and no call is made: an edit exists only once Save has answered `saved`.
   */
  const [draft, setDraft] = useState<{ base: string; updatedAt: string; text: string } | null>(null)
  const editing = draft !== null
  const [saving, setSaving] = useState(false)
  /** Why the last Save did not land. The draft is kept under every one of them. */
  const [editError, setEditError] = useState<'conflict' | 'denied' | 'failed' | null>(null)
  /**
   * A save that reached the cloud and NOT this machine's spec file, for the two reasons
   * worth telling the reader. `not_owner` and `no_file` are the ordinary case for most
   * plans and say nothing the reader needs to act on.
   */
  const [fileNotice, setFileNotice] = useState<'diverged' | 'error' | null>(null)

  /**
   * The card this page is on NOW, for a save answering after the reader moved on: its
   * result belongs to the plan it was made on, and must not land on the next one.
   */
  const cardIdRef = useRef(card.id)
  cardIdRef.current = card.id

  const closeEditor = useCallback(() => {
    setDraft(null)
    setEditError(null)
  }, [])

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

  // Another plan is another editor: a draft never follows the reader to the next page.
  useEffect(() => {
    setDraft(null)
    setSaving(false)
    setEditError(null)
    setFileNotice(null)
  }, [card.id])

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

  /**
   * THE COMMENTS ON THIS PLAN, and everything the spec needs to draw them.
   *
   * Keyed on the SESSION the read came back with, not on `card.id`: a plan that turned out
   * not to be visible has no session, and asking for its comments would be one more query
   * answering nothing. The hook treats `undefined` as "no plan", which is an answer rather
   * than a pending read.
   */
  const comments = usePlanComments(detail?.session?.id)
  const { status } = useAuth()
  const viewerId = status.user?.id

  /**
   * The threads, built once per read — MEMOISED BECAUSE THE LAYER DEPENDS ON THE IDENTITY.
   *
   * The relocation pass keys on the comments array it was handed: a fresh array per render
   * would re-walk the whole rendered document and re-search every quotation on every
   * render, including the ones this page does while the reader merely scrolls.
   */
  const threads = useMemo(
    () => buildPlanCommentThreads(comments.read?.comments ?? []),
    [comments.read],
  )

  /**
   * One turn, decorated: who, when, and whether this reader may touch it.
   *
   * THE ONE PLACE A COMMENT BECOMES SOMETHING DRAWABLE, which is why the orphan list takes
   * turns rather than comments: a second spelling of "whose photo, and how the timestamp
   * reads" would be two answers to keep in step for the same person on the same page.
   *
   * The author is resolved the way the plans list resolves the author of a plan, so a
   * colleague is one person across the two surfaces. `canEditPlanComment` is the
   * interface's half of AC4 and is deliberately the weaker half — `plan_comments`' policies
   * are what actually refuse a write on somebody else's comment. What this buys is that the
   * ordinary case looks ordinary.
   */
  const turnOf = useCallback((comment: PlanComment): CommentTurn => {
    const at = comment.createdAt ? new Date(comment.createdAt).getTime() : NaN
    return {
      id: comment.id,
      author: {
        name: planAuthor(comment.authorId, comments.read?.emailByAuthor ?? {}),
        avatarUrl: comments.read?.avatarByAuthor[comment.authorId],
      },
      date: Number.isFinite(at) ? formatTimestamp(at, now, t) : undefined,
      body: comment.body,
      canEdit: canEditPlanComment(comment, viewerId),
    }
  }, [comments.read, now, t, viewerId])

  /**
   * Everything the spec's comment layer runs on, or `null` for "not yet, or nowhere to
   * write".
   *
   * `null` COVERS THREE CASES AND THEY ARE ONE ANSWER: the read has not come back, the read
   * failed, or there is no session. In all three the page has no comments it can trust and
   * no id to write against, so it renders the spec as plain prose — see `SpecBody`.
   */
  const specComments: SpecComments | null = useMemo(() => {
    const sessionId = detail?.session?.id
    const read = comments.read
    if (!sessionId || !read || read.failed) return null

    const byId = new Map<string, PlanCommentThread>(threads.map((thread) => [thread.head.id, thread]))

    /**
     * The thread heads, in the shape the layer speaks — `FileComment`, which is the store's
     * type and the one the four other callers pass.
     *
     * ONLY THE HEADS are anchored. A reply carries no passage of its own: it belongs to the
     * conversation, and the conversation is anchored where its first comment was left. The
     * replies travel to the card through `thread` below.
     */
    const asFileComment = (thread: PlanCommentThread): FileComment => ({
      id: thread.head.id,
      anchor: null,
      quote: thread.head.quote,
      body: thread.head.body,
      createdAt: thread.head.createdAt ? new Date(thread.head.createdAt).getTime() : 0,
    })

    const heads: FileComment[] = threads.map(asFileComment)

    /**
     * The threads with no passage at all, named for the layer — which cannot work it out,
     * since an empty quote means a note on the whole file everywhere else in the app.
     *
     * A head gets here by being a reply whose own head was deleted: `on delete set null`
     * promotes it rather than taking it down with its parent, and a reply carries no quote
     * of its own. Left unsaid, it would be a comment in the database and on no screen —
     * see `isOrphanedPlanCommentThread`. It stays in `heads` above as well, where it is
     * inert: the layer marks only what carries a quote.
     */
    const anchorless: FileComment[] = threads.filter(isOrphanedPlanCommentThread).map(asFileComment)

    const thread = (id: string): CommentThread | undefined => {
      const found = byId.get(id)
      if (!found) return undefined
      const head = turnOf(found.head)
      return {
        author: head.author,
        date: head.date,
        canEdit: head.canEdit,
        replies: found.replies.map(turnOf),
        // A reply carries no quote: its anchor is the head's, and storing a second copy of
        // the passage would give the layer two comments to relocate onto one place.
        onReply: (body) => comments.create({ sessionId, parentId: id, anchor: null, quote: '', body }),
        onSaveReply: (replyId, body) => comments.update(replyId, body),
        onDeleteReply: (replyId) => comments.remove(replyId),
      }
    }

    /**
     * EVERY WRITE'S ANSWER IS HANDED ON, where each of these used to `void` it.
     *
     * The hook has always resolved to whether the row was written — it is the only thing
     * that knows, since the refusals happen in Postgres — and six `void`s threw that away
     * on the way to the card. What the reader saw was the card closing on a comment RLS
     * had refused, or a Delete quietly restoring its comment on the next refetch. The card
     * is what draws the failure; this only has to stop swallowing it.
     */
    const source: CommentSource = {
      comments: heads,
      add: (comment) => comments.create({
        sessionId, anchor: null, quote: comment.quote, body: comment.body,
      }),
      update: (id, body) => comments.update(id, body),
      remove: (id) => comments.remove(id),
      thread,
    }

    /**
     * The threads the layer could not place — AC5.
     *
     * Asked for by the layer, in its own render, with the heads it could not find: only it
     * knows which passages are still in the document, and only this page knows how to draw
     * a comment. The heads come back in the shape they were handed over in, so `byId` is
     * what turns each one back into its conversation.
     *
     * Both kinds arrive here — the quotations the rewritten spec no longer contains, and
     * the `anchorless` ones above, which never had a passage to look for. They are the same
     * thing to a reader, and `OrphanedThread` draws either: `Quote` renders nothing for an
     * empty passage, so a promoted reply comes out as its author, its date and its words.
     */
    const renderOrphans = (lost: readonly FileComment[]): ReactNode => lost.map((head) => {
      const found = byId.get(head.id)
      return found && <OrphanedThread key={head.id} thread={found} turnOf={turnOf} />
    })

    return { source, renderOrphans, anchorless }
  }, [detail?.session?.id, comments, threads, turnOf])

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
   *
   * WHILE EDITING, Escape closes the editor rather than the page — one level at a time,
   * the way it already goes from the page to the list and not out of the modal. The draft
   * is dropped either way; this just leaves the reader on the plan they were editing.
   */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      e.stopImmediatePropagation()
      if (editing) closeEditor()
      else onBack()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [onBack, editing, closeEditor])

  const { tone, labelKey } = STATUS_LOOK[card.status]
  /**
   * The status, drawn ONCE and rendered in two places — the pinned bar while the reader
   * has scrolled past the heading, the heading itself before that. One expression rather
   * than two copies, because the two are the same fact and a pill that changed shape on
   * scroll would read as a second, different status.
   */
  const statusChip = <Status label={t(labelKey)} tone={tone} />
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

  /**
   * Whether this spec can be opened in the editor at all.
   *
   * A SPEC TO EDIT: there is markdown on the row. A spec not written yet is the agent's
   * to write, and it will be uploading over the top of anything typed here in a moment.
   *
   * NOT OVERSIZE: the row's copy is then stale by definition — the real document grew past
   * the ceiling on its author's disk — and an edit of a stale copy is an edit of the wrong
   * document.
   *
   * AN `updatedAt` TO GUARD WITH: without one there is no way to know whether the save
   * would overwrite somebody, so the page does not offer it.
   *
   * WHO is reading is deliberately not a test: the author and any member of the plan's
   * organization may edit, and the database is the one that knows who that is. A reader it
   * refuses sees `denied`, with their draft intact.
   */
  const canEdit = !!session && !!spec && !session.specOversize && !!session.updatedAt

  const openEditor = useCallback(() => {
    if (!session?.updatedAt) return
    const base = session.spec ?? ''
    setDraft({ base, updatedAt: session.updatedAt, text: base })
    setEditError(null)
    setFileNotice(null)
  }, [session])

  const saveDraft = useCallback(async () => {
    if (!draft || saving || draft.text.trim() === '') return
    // Nothing changed: close without writing. See `draft`.
    if (draft.text === draft.base) {
      closeEditor()
      return
    }
    const id = card.id
    setSaving(true)
    setEditError(null)
    let result: PlanSpecUpdateResult
    try {
      result = await window.electronAPI.plans.updateSpec({
        id, spec: draft.text, expectedUpdatedAt: draft.updatedAt,
      })
    } catch {
      // The BRIDGE failed: nothing is known to have been written, and the draft stays.
      result = { status: 'failed' }
    }
    if (cardIdRef.current !== id) return
    setSaving(false)

    if (result.status !== 'saved') {
      setEditError(result.status)
      return
    }

    // The row now holds the draft, under a new `updated_at`. Drawn straight away, so the
    // page shows what was saved without a loading pass, and then read again quietly —
    // `idea` may have changed with the spec, and the read is the only source of truth
    // about what the row holds.
    const text = draft.text
    const updatedAt = result.updatedAt
    setDetail((prev) => prev?.session
      ? { ...prev, session: { ...prev.session, spec: text, updatedAt } }
      : prev)
    setDraft(null)
    setFileNotice(
      result.fileSkipReason === 'diverged' || result.fileSkipReason === 'error' ? result.fileSkipReason : null,
    )
    window.electronAPI.plans.detail(id)
      .then((next) => {
        // A failed quiet read keeps what is on screen, which is what was just saved.
        if (cardIdRef.current === id && !next.failed) setDetail(next)
      })
      .catch(() => {})
  }, [draft, saving, card.id, closeEditor])

  /**
   * The conflict's way out: drop the draft and read the plan as it now is. The ONLY path
   * that discards a draft the reader did not choose to cancel — and it is still their
   * click, after a sentence telling them to copy what they want to keep.
   */
  const reloadAfterConflict = useCallback(() => {
    closeEditor()
    retry()
  }, [closeEditor, retry])

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
      <StickyBar height={TOP_BAR_H} stuck={condensed} className="-mx-6 px-6">
        {/* `Button tone="ghost"` — no plate at rest, which is what a trail out of a page
            should be: it is not an action the reader came here for. `-ml-2` pulls the
            label's optical left edge back onto the page's own inset, which the button's
            own horizontal padding would otherwise push in by twelve pixels. The ticket
            page's bar is drawn the same way, and they are the same object. */}
        <Button
          tone="ghost"
          icon={ArrowLeft}
          onClick={onBack}
          title={t('plans.detail.back')}
          className="-ml-2"
        >
          {t('plans.detail.back')}
        </Button>
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
            <Text className="min-w-0 flex-1 truncate" title={planLabel(card)}>
              {planLabel(card)}
            </Text>
            {/* Pinned to the right edge, where the heading's own pill sits: the bar is
                the heading, so the two must not swap sides as one replaces the other. */}
            {statusChip}
          </>
        ) : (
          <Text tone="secondary" className="min-w-0 flex-1 truncate opacity-50">
            {card.repoName ?? t('plans.noRepo')}
          </Text>
        )}
      </StickyBar>

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
          <PlanIdBadge number={card.number} size="lg" />
          <h1 className="min-w-0 text-xl font-semibold text-ink break-words">{planLabel(card)}</h1>
        </div>
        {statusChip}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-secondary">
        <RepoColorChip colorKey={repoConfigKey} label={card.repoName ?? t('plans.noRepo')} />
        {/* The author as the LIST'S OWN LABEL, not as a phrase. The plans list settled
            on chips — "three chips, not three phrases separated by spaces" — and this
            page was still drawing the same person as loose text beside a bare avatar,
            so the one thing a reader moves between showed up in two shapes.

            `alt=""` because the author is named in the very next breath; an alt
            repeating the adjacent label makes a screen reader say the same person
            twice. `truncate` because an address has no maximum length. */}
        <Label avatar={{ src: card.avatarUrl ?? null, alt: '' }} truncate>
          {card.author}
        </Label>
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

          {/* The heading, with the way into the editor on its right: the action is about this
              section and nothing else on the page. Hidden while editing — the editor has its
              own Save and Cancel, and a second way in would open nothing. */}
          <div className="flex items-end justify-between gap-3">
            <SectionHeading>{t('plans.detail.spec')}</SectionHeading>
            {canEdit && !editing && (
              <div className="mb-2">
                <Button size="sm" tone="ghost" icon={Pencil} onClick={openEditor} title={t('plans.edit.start')}>
                  {t('common.edit')}
                </Button>
              </div>
            )}
          </div>
          {fileNotice && !editing && (
            <Banner variant="warning" bordered className="mb-3">
              {t(fileNotice === 'diverged' ? 'plans.edit.fileDiverged' : 'plans.edit.fileError')}
            </Banner>
          )}
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
            {draft ? (
              <div className="flex flex-col gap-4">
                {/* Above the box, where the eye is when Save comes back: each is a fact
                    about the save just attempted, and the draft is still below it. */}
                {editError === 'conflict' && (
                  <Banner
                    variant="danger"
                    bordered
                    hint={t('plans.edit.conflictHint')}
                    actions={[{ label: t('plans.edit.reload'), icon: RotateCcw, onClick: reloadAfterConflict, primary: true }]}
                  >
                    {t('plans.edit.conflict')}
                  </Banner>
                )}
                {(editError === 'denied' || editError === 'failed') && (
                  <Banner variant="danger" bordered>
                    {t(editError === 'denied' ? 'plans.edit.denied' : 'plans.edit.failed')}
                  </Banner>
                )}
                <FormField
                  label={t('plans.edit.label')}
                  hint={t('plans.edit.hint')}
                  input={{
                    multiline: true,
                    value: draft.text,
                    onChange: (text) => setDraft((prev) => (prev ? { ...prev, text } : prev)),
                    rows: 20,
                    mono: true,
                    resize: 'vertical',
                    autoFocus: true,
                    disabled: saving,
                  }}
                />
                <div className="flex items-center gap-3">
                  <Button size="sm" tone="accent" icon={Save} busy={saving} disabled={draft.text.trim() === ''} onClick={() => { void saveDraft() }}>
                    {saving ? t('common.saving') : t('common.save')}
                  </Button>
                  <Button size="sm" tone="ghost" icon={X} onClick={closeEditor} disabled={saving}>
                    {t('common.cancel')}
                  </Button>
                </div>
              </div>
            ) : spec ? (
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
                <SpecBody content={spec} comments={specComments} />
                {/* The comments did not load. Said out loud rather than swallowed: the spec
                    is readable either way, but a page that silently drew no comments over a
                    failed read would be telling the reader their colleagues said nothing. */}
                {comments.read?.failed && (
                  <p className="mt-4 flex items-start gap-2 text-sm text-text-secondary">
                    <CloudOff className="w-4 h-4 shrink-0 mt-0.5" />
                    {t('plans.comments.failed')}
                  </p>
                )}
                {/* The read succeeded and is INCOMPLETE, which is a different sentence and
                    therefore a different line: the comments above are all real, there are
                    simply more of them than the cap brings back. Said for the reason the
                    failure above is said — a reader who has just written a comment on a
                    very long thread would otherwise watch it not appear, and conclude the
                    write was lost rather than that the list is capped. */}
                {comments.read?.truncated && (
                  <p className="mt-4 flex items-start gap-2 text-sm text-text-secondary">
                    <FileWarning className="w-4 h-4 shrink-0 mt-0.5" />
                    {t('plans.comments.truncated')}
                  </p>
                )}
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
