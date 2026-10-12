import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Banner,
  CheckList,
  CollapsibleLine,
  PullRequestCard,
  ReviewThreadLine,
  Tally,
  type PRTone,
  type PullRequestState,
} from '@ds/desktop'
import {
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  Circle,
  EyeOff,
  Loader2,
  MessagesSquare,
  MinusCircle,
  SendHorizontal,
  Users,
  XCircle,
} from '@ds/desktop/icons'
import { formatTimestamp } from './utils'
import { useStore } from '../../store'
import { bracketedPaste, resolveAgentTarget } from '../../utils/agentTerminals'
import { formatThreadsContext, selectUnresolvedThreads } from '../../utils/prThreadContext'
import { useT, type MessageKey, type Translate } from '../../i18n'
import { showToast } from '../Toast'
import type { PRCheck, PRChecksSummary, PRReviewThread, PRState, PRWatchError, RepositoryMetadata } from '../../../types'
import { isPRStatusError } from '../../../types'

interface PRWatchCardProps {
  /**
   * The card exists as soon as this is set — never gated on `prReviews.enabled`.
   * When the watcher IS off, the card says so and offers to switch it back on
   * rather than quietly showing a snapshot nothing will ever update.
   */
  prUrl: string
  /** Terminal id the slash commands are typed into. */
  agentId: string
  /**
   * Everything below is optional and frequently absent: `repositoryMetadata` lives
   * in a jsonb copied back verbatim, so rows written before this feature carry
   * `prUrl` and little else. Every branch here has to survive that.
   */
  metadata: RepositoryMetadata | undefined
}

/**
 * One line of the card's checklist — "is this box ticked, and if not, why".
 *
 * `done` drives the styling rather than the icon: a ticked line steps back to a
 * muted grey, an open one keeps its own tone, so scanning the card means landing
 * on what still needs doing rather than on what is already fine.
 */
interface ChecklistItem {
  Icon: typeof CheckCircle2
  tone: PRTone
  label: string
  done: boolean
  /** For the one state that is genuinely in motion: checks still running. */
  spin?: boolean
}

/**
 * The review verdict as the header badge, in the slot the PR state used to hold.
 *
 * On an open PR the state is the one thing the reader already knows — the card is
 * there, so the PR is open — while "Changes requested" is what they opened the
 * sidebar to find out. Same tint scale as `STATE_BADGE`, so whichever of the two
 * ends up in the slot reads as the same badge.
 *
 * Exported for the comments panel, which draws the same verdict on a review summary.
 * Shared rather than respelled there: two copies of a mapping from an API enum to a
 * word and a tint is how the row and the panel end up disagreeing about `DISMISSED`.
 */
export const REVIEW_BADGE: Record<
  NonNullable<RepositoryMetadata['prReviewStatus']>,
  { label: MessageKey; tone: PRTone }
> = {
  approved: { label: 'prReview.approved', tone: 'green' },
  'changes-requested': { label: 'prReview.changesRequested', tone: 'red' },
  commented: { label: 'prReview.commented', tone: 'blue' },
  pending: { label: 'prReview.pending', tone: 'yellow' },
}

const STATE_LABELS: Record<PRState, MessageKey> = {
  open: 'agentInfo.pr.state.open',
  draft: 'agentInfo.pr.state.draft',
  merged: 'agentInfo.pr.state.merged',
  closed: 'agentInfo.pr.state.closed',
}

// Badge colours, not a status colour scale: merged is purple on GitHub and the
// sidebar keeps that association so the state reads at a glance. A `PRTone` rather
// than a pair of classes now — `PullRequestCard` owns what a badge is made of, and
// this only says which of the seven it wears.
const STATE_TONE: Record<PRState, PRTone> = {
  open: 'green',
  draft: 'neutral',
  merged: 'purple',
  closed: 'red',
}

// Each failure names its own fix: an error with no remedy is the same dead end as
// the empty card this replaces.
const WATCH_ERROR_LABELS: Record<PRWatchError, { label: MessageKey; fix: MessageKey }> = {
  'no-token': { label: 'agentInfo.pr.error.noToken', fix: 'agentInfo.pr.error.noTokenFix' },
  'not-found': { label: 'agentInfo.pr.error.notFound', fix: 'agentInfo.pr.error.notFoundFix' },
  forbidden: { label: 'agentInfo.pr.error.forbidden', fix: 'agentInfo.pr.error.forbiddenFix' },
  'rate-limited': { label: 'agentInfo.pr.error.rateLimited', fix: 'agentInfo.pr.error.rateLimitedFix' },
  network: { label: 'agentInfo.pr.error.network', fix: 'agentInfo.pr.error.networkFix' },
}

// What each state is CALLED, and nothing else: the glyph and the colour are
// `CHECK_STATE_MARK`'s in the design system, on `PR_STATE_MARK`'s model — a red cross
// for a failed check is not a fact about this watcher. What stays here is the half
// that needs a catalogue and a language. The app's four states and the design
// system's are the same four words, so `PRCheck['state']` is already a `CheckState`
// and the list below hands one straight over — the day they diverge, that call site
// is what stops compiling.
const CHECK_STATE_LABELS = {
  passed: 'agentInfo.pr.checkPassed',
  failed: 'agentInfo.pr.checkFailed',
  running: 'agentInfo.pr.checkRunning',
  skipped: 'agentInfo.pr.checkSkipped',
} as const satisfies Record<PRCheck['state'], MessageKey>

// `undefined` is its own entry, not a missing one: GitHub answers UNKNOWN while it
// computes mergeability, and that must never render as "conflicts" — nor as a tick,
// which is why the unknown line gets an empty box rather than a check.
const MERGEABLE_ITEMS = {
  true: { Icon: CheckCircle2, tone: 'green', label: 'agentInfo.pr.mergeable', done: true },
  false: { Icon: AlertTriangle, tone: 'red', label: 'agentInfo.pr.conflicts', done: false },
  unknown: { Icon: Circle, tone: 'muted', label: 'agentInfo.pr.mergeableUnknown', done: false },
} as const satisfies Record<string, Omit<ChecklistItem, 'label'> & { label: MessageKey }>

/**
 * The fields only the watcher ever writes.
 *
 * `/magic:pr` posts `prUrl` and nothing else (`status-server.ts`), so a single one
 * of these being present is the proof that a read actually landed. Their total
 * absence means the card has never been anything but a link — and rows that state
 * a fact ("mergeability unknown") must stay out of that state rather than
 * describe a snapshot nobody ever took.
 */
const WATCHER_WRITTEN_FIELDS = [
  'prState',
  'prMerged',
  'prClosed',
  'prChecks',
  'prCheckList',
  'prMergeable',
  'prReviewStatus',
  'prReviewCommentCount',
  'prCommentCounts',
  'prReviewers',
  'prCommentAuthors',
  'prReviewUpdatedAt',
  'prWatchError',
  'prLastCheckedAt',
] as const satisfies readonly Exclude<keyof RepositoryMetadata, 'prUrl'>[]

interface CommentRow {
  label: MessageKey
  value: number
}

async function runSlashCommand(terminalId: string, command: string, t: Translate) {
  try {
    const result = await window.electronAPI.prWatcher.sendCommand(terminalId, command)
    if (result.launched) {
      showToast(t('toast.commandSent', { command }), 'success')
    } else if (result.copied) {
      showToast(t('toast.commandCopied', { command }), 'warning')
    }
  } catch (err) {
    showToast(err instanceof Error ? err.message : t('toast.commandFailed'), 'error')
  }
}

/**
 * The four check states as arcs of one ring, in the order a reader cares about them.
 *
 * WHY A RING AND NOT A BAR. "9/12" says how far along; what it cannot say is what the
 * other three are — three failures and three skips are the same fraction and not
 * remotely the same pull request. The proportion is the whole point, and a proportion
 * of a fixed whole is the one thing a donut is actually good at. At 14px it is read as
 * a colour and a rough share, which is all that is wanted beside a count: the names and
 * the exact numbers are one click away, behind the fold this sits on.
 *
 * The palette is `CHECK_STATES`', arc for arc — the same green, red and blue the list
 * inside draws its icons in, so the ring is a legend for the thing it opens. Skipped
 * takes `icon-muted` rather than that map's `text-secondary/60`: a 3px arc at 60%
 * disappears on the light themes, where a glyph of the same colour does not.
 *
 * ORDER IS FIXED, worst last. Passed, then skipped, then running, then failed, so the
 * eye lands on red at the end of the sweep wherever it falls. Any check the summary
 * counts but does not classify — `total` is the authority, the four states are what
 * GitHub answered — stays as bare track, which is honest: something is there and we do
 * not know what.
 */
const CHECK_RING_ARCS = [
  { key: 'passed', stroke: 'stroke-green', label: 'agentInfo.pr.checkPassed' },
  { key: 'skipped', stroke: 'stroke-icon-muted', label: 'agentInfo.pr.checkSkipped' },
  { key: 'running', stroke: 'stroke-blue', label: 'agentInfo.pr.checkRunning' },
  { key: 'failed', stroke: 'stroke-red', label: 'agentInfo.pr.checkFailed' },
] as const satisfies readonly { key: keyof Omit<PRChecksSummary, 'total'>; stroke: string; label: MessageKey }[]

/** Geometry of the ring: a 16px box, a 6px radius and a 3px stroke. */
const RING_RADIUS = 6
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

function ChecksRing({ checks, t }: { checks: PRChecksSummary; t: Translate }) {
  // `total` and not the sum of the four: the summary is what the count beside the ring
  // is drawn from, and a ring that closed while the count read 9/12 would be the two
  // halves of one detail disagreeing in front of the reader.
  const total = Math.max(checks.total, 1)

  const segments: { key: string; stroke: string; length: number; offset: number }[] = []
  let consumed = 0
  for (const arc of CHECK_RING_ARCS) {
    const count = checks[arc.key]
    if (count <= 0) continue
    segments.push({
      key: arc.key,
      stroke: arc.stroke,
      length: (count / total) * RING_CIRCUMFERENCE,
      offset: -(consumed / total) * RING_CIRCUMFERENCE,
    })
    consumed += count
  }

  // Read out as "9 passed · 2 failed", from the same keys the list inside uses — the
  // ring is a picture of a sentence the card can already say.
  const label = CHECK_RING_ARCS
    .filter((arc) => checks[arc.key] > 0)
    .map((arc) => `${checks[arc.key]} ${t(arc.label).toLowerCase()}`)
    .join(' · ')

  return (
    <svg
      viewBox="0 0 16 16"
      className="w-3.5 h-3.5 flex-shrink-0 -rotate-90"
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      {/* The track, so a partly-classified ring still reads as a whole. */}
      <circle
        cx="8"
        cy="8"
        r={RING_RADIUS}
        fill="none"
        strokeWidth="3"
        className="stroke-line-subtle"
      />
      {segments.map((segment) => (
        <circle
          key={segment.key}
          cx="8"
          cy="8"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="3"
          strokeDasharray={`${segment.length} ${RING_CIRCUMFERENCE - segment.length}`}
          strokeDashoffset={segment.offset}
          className={segment.stroke}
        />
      ))}
    </svg>
  )
}

/**
 * GraphQL review verdicts, mapped onto the badge vocabulary the card already speaks.
 *
 * PENDING never reaches the list — an unsubmitted draft only its author can see. But
 * DISMISSED does: `reviews(last:30)` returns a retracted review, body and all, and
 * this map has no key for it because `REVIEW_BADGE` is typed on `prReviewStatus`,
 * which has none either. So a verdict may legitimately fail to map, and the row falls
 * back to the neutral marker below rather than rendering unlabelled — otherwise a
 * dismissed review would be indistinguishable from a PR conversation comment.
 */
export const REVIEW_STATE_BADGE: Record<string, keyof typeof REVIEW_BADGE> = {
  APPROVED: 'approved',
  CHANGES_REQUESTED: 'changes-requested',
  COMMENTED: 'commented',
}

/**
 * The three states a review thread can be in, as the row's trailing pill.
 *
 * Icon plus a word, not a tinted capsule: the review verdicts beside it already own
 * the tinted-capsule treatment on this card, and a second one in the same row would
 * read as a second verdict. The `resolved` label is the one the flat list already had
 * — same state, same word.
 *
 * Exported for the comments panel, for the same reason as `REVIEW_BADGE` above: it is a
 * mapping from a state enum to an icon, a tint and a word, and the row and the panel must
 * not be able to disagree about what `outdated` looks like. The panel draws the icon one
 * size up, but the size is at the call site rather than in here, so there is nothing in
 * this map for it to fork.
 */
export const THREAD_STATE: Record<
  PRReviewThread['state'],
  { Icon: typeof CheckCircle2; tone: PRTone; label: MessageKey; strong?: boolean }
> = {
  open: { Icon: Circle, tone: 'blue', label: 'agentInfo.pr.threadOpen' },
  // The one state drawn as a BADGE — same tint scale as `REVIEW_BADGE` — rather than as a
  // word beside an icon. Resolved is the state the reader is looking for: it is what
  // separates "still to do" from "done" in a list of twenty threads, and a grey word at
  // 60 % was the same weight as "outdated", which says nothing of the kind. The badge is
  // what lets a row be skipped at a glance.
  resolved: {
    Icon: CheckCircle2,
    tone: 'green',
    label: 'agentInfo.pr.commentResolved',
    strong: true,
  },
  // The diff moved out from under it, so the line it hangs on no longer exists —
  // quiet rather than tinted: nothing is wrong, it is just stale.
  outdated: { Icon: MinusCircle, tone: 'muted', label: 'agentInfo.pr.threadOutdated' },
}

/**
 * The `owner/repo` and the number, off a pull request URL.
 *
 * Both surfaces that name a PR — this card's header and the comments panel's — identify
 * it the same way and from the same string, so the grammar is written once. A second copy
 * is two places to fix when GitHub Enterprise or a trailing `/files` shows up.
 *
 * Deliberately loose, and not the anchored `parsePRUrl` in `main/github.ts`: that one is
 * the gate on what the app will act on, and it lives in a module that pulls in
 * `child_process`, so the renderer cannot have it. This one only decides what a header
 * prints, where refusing a URL the app is already watching would be worse than showing
 * the slug out of it.
 *
 * `undefined` on both halves rather than a null object, so a caller can fall back per
 * field — the panel prints the number without the slug when only one parses.
 */
export function prUrlParts(url: string): { repoSlug?: string; prNumber?: string } {
  const parsed = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/)
  return parsed ? { repoSlug: `${parsed[1]}/${parsed[2]}`, prNumber: parsed[3] } : {}
}

/**
 * The two hand-off controls of the comments fold, at the sidebar's own `[10px]` scale.
 *
 * Bespoke rather than a token from `theme/controls` composed with a padding, which is that
 * module's standing rule: compose, never re-declare, and if a control genuinely needs another
 * size, add a tier — because two utilities from the same Tailwind group are decided by their
 * order in the GENERATED stylesheet, not in the string, so `${BTN_ICON} p-1` keeps whichever
 * was emitted last. That module does have an icon tier — `BTN_ICON`, square and `h-7` like
 * this row — but it is a bordered `bg-surface` chip sized for a form, and these two sit
 * INSIDE an already-bordered row at the sidebar's `[10px]` scale, where a second border
 * reads as a box in a box. `ReviewCommentsButton`'s `HEADER_TRIGGER` and the `BUTTON_ACTION`
 * next door to it are bespoke for the same reason, at the same scale.
 *
 * A BASE plus a suffix, on `ChangeNavigator`'s `BUTTON_BASE` model: the base holds the
 * shape, the resting tone and the disabled chrome, and the suffix adds only layout and
 * padding, which the base deliberately does not set, so nothing here is one Tailwind
 * group overriding itself.
 *
 * There was a second suffix, for the icon-only send on every thread row. That control is
 * gone — see `ThreadEntry` — and the split is kept because the bulk one still wants its
 * padding stated where a reader can see it against the base.
 */
const SEND_BASE =
  'flex items-center rounded-lg bg-transparent border-none cursor-pointer transition-colors ' +
  'text-text-secondary/70 hover:text-ink hover:bg-surface-strong ' +
  'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-text-secondary/70'

const THREADS_SEND = `${SEND_BASE} gap-1 py-1 px-1.5 text-[10px] font-medium`

/**
 * One thread, as `ReviewThreadLine` wants it.
 *
 * WHAT IS LEFT HERE IS THE TRANSLATION, and only that: the row itself — the fill, the
 * border, the group travelling to the right edge, the resolved reading — is the design
 * system's now. This turns a `PRReviewThread` into the four or five already-worded
 * strings that row draws, which is work that needs `t`, the app's enums and the
 * catalogue's plural keys, and none of which belongs in a folder the webapp compiles.
 *
 * The row reports an ID through `onOpen` and knows nothing of the list, the PR URL or
 * the store. The card holds all three already, so passing them down would be fifty rows
 * each carrying a copy of the list they are in and each opening a store subscription, to
 * answer a click that only ever names a thread.
 */
function ThreadEntry({ thread, onOpen, now, t }: {
  thread: PRReviewThread
  /** Hand the panel this thread's id; the card knows what to open it on. */
  onOpen: (threadId: string) => void
  now: number
  t: Translate
}) {
  const { root } = thread
  // When the thread was OPENED — the same stamp the list is sorted on, so the ages read
  // down the column in order instead of jumping about. Not `updatedAt`: a row that
  // said "5 min ago" between two saying "2 d ago" would look misfiled.
  const createdAt = root.createdAt ? Date.parse(root.createdAt) : NaN
  const verdict = thread.kind === 'review' ? REVIEW_STATE_BADGE[(root.reviewState || '').toUpperCase()] : undefined

  // The basename only: a sidebar column cannot hold `desktop/src/main/…/watcher.ts`,
  // and the full path is one click away on GitHub. The title keeps it.
  const where = thread.path
    ? `${thread.path.split('/').pop()}${typeof thread.line === 'number' ? `:${thread.line}` : ''}`
    : undefined

  // Only the inline threads have one: a conversation comment and a review summary are
  // not threads GitHub tracks the state of, and pinning "open" to every one of them
  // would spend the row's width saying nothing.
  const state = thread.kind === 'inline' ? THREAD_STATE[thread.state] : undefined

  return (
    <ReviewThreadLine
      author={root.author}
      badge={
        verdict
          ? { label: t(REVIEW_BADGE[verdict].label), tone: REVIEW_BADGE[verdict].tone }
          /* A review whose verdict this card has no badge for — DISMISSED, today.
             Untinted on purpose: it is not a fourth verdict, it is the row saying which
             of the three connections it came from, which is the only thing separating it
             from a conversation comment once the badge is gone. */
          : thread.kind === 'review'
            ? { label: t('agentInfo.pr.threadReview'), tone: 'muted' }
            : undefined
      }
      location={where}
      locationTitle={thread.path}
      /* The real number of answers, which is not how many the thread carries once the
         per-thread cap has bitten. Two keys rather than one: the catalogue interpolates
         but does not pluralise. */
      replies={
        thread.replyCount > 0
          ? t(thread.replyCount === 1 ? 'agentInfo.pr.threadReply' : 'agentInfo.pr.threadReplies', { count: thread.replyCount })
          : undefined
      }
      state={state ? { icon: state.Icon, label: t(state.label), tone: state.tone, strong: state.strong } : undefined}
      age={Number.isFinite(createdAt) ? formatTimestamp(createdAt, now, t) : undefined}
      resolved={thread.state === 'resolved'}
      openLabel={t('prComments.openThread')}
      onOpen={() => onOpen(thread.id)}
    />
  )
}

export function PRWatchCard({ prUrl, agentId, metadata }: PRWatchCardProps) {
  const t = useT()
  const [refreshing, setRefreshing] = useState(false)
  const [enabling, setEnabling] = useState(false)
  // `null` means nobody has touched it: until then the checks list follows the data
  // — a run with something failing or still moving opens itself, a clean one stays
  // folded — and after a click the reader's choice wins for the life of the card.
  const [checksExpanded, setChecksExpanded] = useState<boolean | null>(null)
  // Comments start folded, always: the count is the answer most of the time, and who
  // said it is the follow-up question.
  const [commentsOpen, setCommentsOpen] = useState(false)
  // The threads themselves, which no poll carries and nothing persists — they are
  // fetched the first time the fold is opened and live exactly as long as this card.
  const [comments, setComments] = useState<PRReviewThread[] | null>(null)
  const [commentsError, setCommentsError] = useState<PRWatchError | null>(null)
  const [commentsLoading, setCommentsLoading] = useState(false)
  /**
   * What the loaded list is a picture OF. A ref rather than state: it gates the
   * fetch inside the effect that also writes it, and as state that write would
   * re-run the effect it just satisfied.
   */
  const loadedSignature = useRef<string | null>(null)

  // Absent means ON — the same reading as the watcher, the IPC handlers and the
  // Settings toggle. Anything else here would show "switched off" on a fresh
  // install that has never touched the setting.
  const watcherOff = useStore((state) => state.config?.prReviews?.enabled) === false
  const setConfig = useStore((state) => state.setConfig)

  /**
   * Hand the sliding panel this card's whole loaded list, anchored on the row clicked.
   *
   * Here rather than in `ThreadEntry` because everything it needs is already here: the
   * list, the URL, and one store subscription instead of one per row. `comments` cannot
   * be null at the call site — the rows only render inside `comments.length > 0` — but
   * the guard is cheaper than the assertion that says so.
   */
  const openPRComments = useStore((state) => state.openPRComments)
  const openComments = useCallback((threadId: string) => {
    if (comments) openPRComments({ prUrl, threads: comments }, threadId)
  }, [openPRComments, prUrl, comments])

  /**
   * Whether there is a terminal to paste into at all.
   *
   * A NAMED target — this card's own agent — never the selection, which is what makes the
   * disabled tooltip say "the agent this pull request belongs to" rather than "no agent is
   * running": with another agent selected, the second sentence would be false. The rule and
   * the reason both live in `resolveAgentTarget`, and it is read twice on purpose — here for
   * the disabled state, again in the handler for the guard — so the two cannot disagree.
   *
   * The selector narrows to the BOOLEAN rather than keeping the id: the id it would return
   * is never the one written to — the handler re-reads its own — so holding it would only
   * re-render this card when the target changed from one live agent to another.
   */
  const canSendToAgent = useStore(
    (state) => resolveAgentTarget(agentId, state.activeTerminalId, state.terminals) !== null,
  )

  /**
   * Paste a composed context into the agent's prompt — and stop there.
   *
   * A raw `terminal.write` rather than the `runSlashCommand` → `prWatcher.sendCommand` path
   * the Done button next door uses, and the difference is not plumbing: that path is a skill
   * AUTO-LAUNCH, gated on `prReviews.autoLaunchSkills`, and it submits. This does not submit.
   * The text is composed from review comments — written by anyone who can comment on the pull
   * request — so it lands in the prompt, the reader reads it, and the reader presses Enter. A
   * command assembled from third-party text that fired on its own is exactly the thing that
   * must not happen, which is why it may not borrow a mechanism that would.
   */
  const sendToAgent = useCallback(async (text: string) => {
    // Re-read from the store rather than trusted from the render, and guarded as well as
    // disabled: the agent this card belongs to can be closed between the render that enabled
    // the button and the click that fires it.
    const state = useStore.getState()
    const id = resolveAgentTarget(agentId, state.activeTerminalId, state.terminals)
    // Said out loud, not swallowed: a click that writes nothing and reports nothing reads as
    // a broken button. The disabled tooltip's own sentence is the accurate one here — the
    // target was there at render and is gone now — and it beats the generic delivery failure
    // below, which would blame a write that never happened.
    if (!id) {
      showToast(t('agentInfo.pr.prepareThreadNoAgent'), 'error')
      return
    }
    // No toast on empty text, and it is a different situation: nothing was composed, so
    // nothing was lost. Unreachable from both call sites anyway — the row passes one thread
    // and `formatThreadContext` always writes a block for it, and the bulk control only
    // renders when `unresolvedThreads` is non-empty. A toast here would be a sentence no
    // reader can provoke, phrased for a state the UI does not have.
    if (text === '') return

    // AWAITED, and the answer acted on: an exited terminal keeps its entry in the store with
    // `state` set to `completed`/`error` — the same two values an agent idle at its prompt
    // reports — so a dead pty is only knowable from the write itself.
    const delivered = await window.electronAPI.terminal.write(id, bracketedPaste(text))
    // A toast, which is this card's established failure channel: the row is 500 px wide with
    // no room for a sentence, and nothing here was consumed — the thread is still in the list
    // and the button still works.
    if (!delivered) showToast(t('agentInfo.pr.prepareThreadFailed'), 'error')
  }, [agentId, t])

  // What the fold's bulk control is about, and what it says on the tin: the inline threads
  // still open. `selectUnresolvedThreads` carries why the two halves of that filter are both
  // needed — a resolved or outdated thread is settled, and the singletons are `open` by
  // construction rather than by anything GitHub tracks.
  const unresolvedThreads = comments ? selectUnresolvedThreads(comments) : []

  // The "checked X ago" label goes stale on its own; re-render every 30s like the
  // usage card does, rather than only when a poll happens to land.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const { repoSlug, prNumber } = prUrlParts(prUrl)

  // `prState` is the field to trust, but it is absent from every row written
  // before this feature — those only ever carried the two booleans. Falling back
  // to them keeps a merged PR readable instead of unlabelled, and when nothing at
  // all is known the badge is dropped rather than guessed as "open".
  const state: PRState | undefined =
    metadata?.prState ??
    (metadata?.prMerged === true ? 'merged' : metadata?.prClosed === true ? 'closed' : undefined)

  // What goes in the header badge. `open` is the one state worth giving up the slot
  // for: the card being there already says the PR is open, whereas the review
  // verdict is what someone opens the sidebar to learn. Draft, merged and closed
  // keep the slot — those say something the verdict cannot — and the state icon on
  // the left carries the state in every case.
  const reviewStatus = metadata?.prReviewStatus
  const badge =
    state === 'open' && reviewStatus
      ? { label: t(REVIEW_BADGE[reviewStatus].label), tone: REVIEW_BADGE[reviewStatus].tone }
      : state
        ? { label: t(STATE_LABELS[state]), tone: STATE_TONE[state] }
        : reviewStatus
          ? { label: t(REVIEW_BADGE[reviewStatus].label), tone: REVIEW_BADGE[reviewStatus].tone }
          : undefined

  const checks = metadata?.prChecks
  // The named checks behind the counts. Rows written before `prCheckList` existed
  // carry the two capped name arrays instead, and only for the states that were
  // worth naming then — rebuilt into the same shape so there is one list to render
  // rather than two code paths, worst first either way.
  const checkList: PRCheck[] =
    metadata?.prCheckList ?? [
      ...(metadata?.prFailedChecks ?? []).map((name) => ({ name, state: 'failed' as const })),
      ...(metadata?.prRunningChecks ?? []).map((name) => ({ name, state: 'running' as const })),
    ]
  // Said out loud rather than silently dropped: the watcher caps the list, and a
  // card that shows 20 of 34 checks while saying "12/34" invites the wrong count.
  const hiddenChecks = Math.max(0, (checks?.total ?? 0) - checkList.length)
  const counts = metadata?.prCommentCounts
  const authors = metadata?.prCommentAuthors ?? metadata?.prReviewers ?? []
  const watchError = metadata?.prWatchError

  // Whether a read has ever landed on this PR. A card built from `prUrl` alone
  // knows nothing, and must say nothing.
  const hasSnapshot = metadata !== undefined && WATCHER_WRITTEN_FIELDS.some((field) => metadata[field] !== undefined)

  // A PR that is finished has nothing left to merge: the row would only ever say
  // "unknown" on the old rows and "no conflicts" on the new ones. Gated on
  // `hasSnapshot` too — before the first read, "mergeability unknown" is the only
  // row in the body, and it reads as a verdict about the PR when it is really a
  // statement about the watcher.
  const showMergeable = hasSnapshot && state !== 'merged' && state !== 'closed'

  // There is something to close out only once the PR is merged.
  const showDone = state === 'merged' || metadata?.prMerged === true

  // Legacy rows have no `prLastCheckedAt`; the review timestamp is the closest
  // honest answer, and "never" is better than a blank when neither exists.
  const checkedAt = metadata?.prLastCheckedAt ?? metadata?.prReviewUpdatedAt
  const checkedLabel = (() => {
    if (typeof checkedAt !== 'number') return t('agentInfo.pr.neverChecked')
    // A read that just landed is the normal outcome of pressing refresh, and
    // "checked now ago" is not a sentence — the "ago" wrapper is for ages, so it
    // is skipped inside the first minute. `now` ticks every 30 s, so a stamp
    // written this second can sit slightly ahead of it: that lands here too,
    // rather than in a negative age.
    const age = now - checkedAt
    const time = age < 60_000 ? t('relative.now') : t('relative.ago', { time: formatTimestamp(checkedAt, now, t) })
    return t('agentInfo.pr.lastChecked', { time })
  })()

  // Counters are only worth a row once one of them is non-zero. The pre-split
  // total is the fallback for rows written before the buckets existed.
  const legacyCommentCount = metadata?.prReviewCommentCount ?? 0
  const splitRows: CommentRow[] = counts
    ? [
      { label: 'agentInfo.pr.commentsInline', value: counts.inline },
      { label: 'agentInfo.pr.commentsConversation', value: counts.conversation },
      { label: 'agentInfo.pr.commentsReviews', value: counts.reviewSummaries },
    ]
    : legacyCommentCount > 0
      ? [{ label: 'agentInfo.pr.comments', value: legacyCommentCount }]
      : []
  const commentRows = splitRows.filter((row) => row.value > 0)
  // The one number the comments line leads with. Summed from the buckets rather than
  // read from `prReviewCommentCount`, which predates the split and only ever counted
  // some of them.
  const commentTotal = counts
    ? counts.inline + counts.conversation + counts.reviewSummaries
    : legacyCommentCount

  /**
   * Read the threads when the fold opens, and again when the watcher reports that
   * the comments moved.
   *
   * The signature is what the counts and the last review timestamp say together: a
   * new comment moves the first, an edited or deleted one moves the second, and
   * neither moving means the list on screen is still accurate — so re-opening the
   * fold spends nothing. A failed read clears the signature so the next open is a
   * genuine retry rather than a re-display of the error.
   */
  const commentsSignature = `${commentTotal}:${metadata?.prReviewUpdatedAt ?? 0}`
  useEffect(() => {
    if (!commentsOpen || loadedSignature.current === commentsSignature) return
    loadedSignature.current = commentsSignature
    let cancelled = false
    setCommentsLoading(true)
    window.electronAPI.prWatcher.comments(prUrl)
      .then((result) => {
        if (cancelled) return
        if (isPRStatusError(result)) {
          loadedSignature.current = null
          setCommentsError(result.error)
          setComments(null)
        } else {
          setComments(result)
          setCommentsError(null)
        }
      })
      .catch(() => {
        if (cancelled) return
        loadedSignature.current = null
        setCommentsError('network')
        setComments(null)
      })
      .finally(() => {
        setCommentsLoading(false)
        // Closed (or replaced) before the read landed: nothing was stored, so the
        // signature must not claim otherwise — it would leave the fold permanently
        // empty until the counts happened to move.
        if (cancelled) loadedSignature.current = null
      })
    return () => { cancelled = true }
  }, [commentsOpen, commentsSignature, prUrl])

  // The checks line of the checklist: ticked only once the run is over AND nothing
  // in it failed — a run that is 9/10 green is still a red PR. A repo with no CI at
  // all gets an empty box rather than a tick: there is nothing to have passed.
  const checksItem: ChecklistItem | undefined =
    checks === undefined
      ? undefined
      : checks.total === 0
        ? { Icon: MinusCircle, tone: 'muted', label: t('agentInfo.pr.noChecks'), done: false }
        : checks.failed > 0
          ? { Icon: XCircle, tone: 'red', label: t('agentInfo.pr.checksLabel'), done: false }
          : checks.running > 0
            ? { Icon: Loader2, tone: 'blue', label: t('agentInfo.pr.checksLabel'), done: false, spin: true }
            : { Icon: CheckCircle2, tone: 'green', label: t('agentInfo.pr.checksLabel'), done: true }

  const checksOpen = checksExpanded ?? (checks !== undefined && (checks.failed > 0 || checks.running > 0))

  // An empty band under a hairline reads as a rendering bug, so every line gates
  // itself on having something to say. `PullRequestCard` draws a rule over each child
  // it is given, so a line that renders `false` costs nothing — there is no wrapper
  // left that could come out empty.
  const showComments = commentRows.length > 0 || authors.length > 0

  const handleEnableWatcher = async () => {
    setEnabling(true)
    try {
      // The main process starts the watcher with an immediate tick, so there is
      // nothing to refresh on top: a `refresh()` here would only meet the shared
      // 15 s throttle and warn about a read already on its way.
      setConfig(await window.electronAPI.prWatcher.setEnabled(true))
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('agentInfo.pr.enableWatcherFailed'), 'error')
    } finally {
      setEnabling(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      // The click always reads now, and the call waits for any tick already in
      // flight, so by the time it resolves the card is showing fresh data either
      // way — `refreshed: false` no longer means "nothing happened" and has
      // nothing to say to the user. Only a real failure gets a toast.
      await window.electronAPI.prWatcher.refresh(prUrl)
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('agentInfo.pr.refreshFailed'), 'error')
    } finally {
      setRefreshing(false)
    }
  }

  return (
    /* The plate, the header, the hairline between every band and the status bar are
       `PullRequestCard`'s now. What stays here is the three things only the app knows:
       what GitHub last answered about this PR, what each of those answers is called in
       this language, and which of the bands below applies right now.

       The footer is DROPPED while the watcher is off, which is the one state where a
       refresh button would be a control that cannot do what it says: nothing above it
       will move again until the watcher is back on. */
    <PullRequestCard
      state={state as PullRequestState | undefined}
      title={prNumber ? t('agentInfo.pr.number', { number: prNumber }) : t('agentInfo.pr.title')}
      subtitle={repoSlug}
      badge={badge}
      open={{ label: t('agentInfo.viewPullRequest'), onOpen: () => window.electronAPI.shell.openExternal(prUrl) }}
      footer={
        watcherOff
          ? undefined
          : {
            label: checkedLabel,
            refresh: {
              label: t('agentInfo.pr.refresh'),
              busy: refreshing,
              onRefresh: handleRefresh,
            },
          }
      }
    >
      {/* The setting, not a failure: the watcher is off, so nothing the card could
          show below would ever move again. Everything else is therefore replaced by
          this one prompt rather than stacked above a frozen snapshot presented as
          the state of the PR — and it carries its own fix, the same way each watch
          error names one. */}
      {watcherOff ? (
        /* `accent` AND NOT A SEVERITY, which is exactly what that variant is for:
           nothing has gone wrong and nothing has succeeded — the reader switched the
           watcher off and can switch it back on, and the band is here to explain why
           the card below behaves differently until they do. Its mark is `EyeOff`
           rather than the variant's own: a mode is a specific thing, and this one is
           "not looking". */
        <Banner
          variant="accent"
          layout="inset"
          icon={EyeOff}
          /* Two different situations behind one setting: a card that has a snapshot
             hidden behind it is dated, one carrying only the link is empty. */
          hint={t(hasSnapshot ? 'agentInfo.pr.watcherOffStale' : 'agentInfo.pr.watcherOffEmpty')}
          actions={[
            {
              label: t('agentInfo.pr.enableWatcher'),
              onClick: () => void handleEnableWatcher(),
              busy: enabling,
              primary: true,
            },
          ]}
        >
          {t('agentInfo.pr.watcherOff')}
        </Banner>
      ) : (
        /* The checklist — everything that has to be true before this PR can ship, one
           line each, ticked when it is. Straight under the header because it is the band
           that answers "can this ship", and a list rather than a stack of differently
           shaped panels because the shape itself carries the meaning: same gutter, same
           box, so the open items are the ones that stand out.

           A FRAGMENT AND NOT A BAND. These were wrapped in a div that drew one rule over
           the whole group and an inset box-shadow between the rows inside it — a shadow
           spelled as an arbitrary value, which is the one thing `designTokens.test.ts`
           will not have. Unwrapped, each row is a child of the card, and the card's own
           hairline rule draws every separator there is. Nothing gates the group either:
           every line below already gates itself, and their OR is all `showChecklist`
           ever was. */
        <>
          {/* Why the watcher is blind, and how to fix it. Above the verdict on
              purpose: a stale verdict is worth less than the reason it is stale. */}
          {watchError && (
            /* No `icon`: `danger` brings its own, and a variant that names its mark is
               one this card cannot spell differently from the next surface to report
               the same failure. The FIX goes in the hint, which is the one thing an
               `inset` band lets wrap — a truncated remedy is a remedy nobody can
               follow. */
            <Banner
              variant="danger"
              layout="inset"
              hint={t(WATCH_ERROR_LABELS[watchError].fix)}
            >
              {t(WATCH_ERROR_LABELS[watchError].label)}
            </Banner>
          )}

          {/* No review line here: the verdict is the header badge now, and stating
              it twice on one card made the checklist look longer than it is. */}

          {/* Comments — the count on the line, who wrote them behind the fold. Not a
              box to tick, so no `done` styling: it reports, it does not gate. First of
              the list because it is the one line that is about people rather than
              machinery, and the reason anyone opens this card mid-review. */}
          {showComments && (
            <CollapsibleLine
              icon={MessagesSquare}
              tone="blue"
              label={t('agentInfo.pr.commentsLabel')}
              // Not a box to tick, so it wears the settled reading from the start: it
              // reports, it does not gate.
              muted
              detail={commentTotal > 0 ? (
                // The bare number needed the label beside it to be read as a count of
                // comments rather than of whatever the line happened to be about. Two
                // keys rather than one: the catalogue interpolates but does not
                // pluralise, and "1 comments" is the kind of thing nobody unsees.
                <span className="text-[10px] text-text-secondary/60 tabular-nums">
                  {t(commentTotal === 1 ? 'agentInfo.pr.commentCount' : 'agentInfo.pr.commentsCount', { count: commentTotal })}
                </span>
              ) : undefined}
              toggle={{ open: commentsOpen, onToggle: () => setCommentsOpen(!commentsOpen) }}
            >
              <div className="space-y-1">
                {/* Where they were left, then who left them. Allowed to wrap here —
                    the fold is open because somebody asked for the detail. */}
                {commentRows.length > 0 && (
                  <Tally counts={commentRows.map((row) => ({ label: t(row.label), value: row.value }))} />
                )}
                {/* Who spoke, until we know what they said. The list below names its
                    own authors line by line, so keeping both would say it twice. */}
                {authors.length > 0 && comments === null && (
                  <div className="flex items-start gap-1.5 text-[10px] text-text-secondary/70">
                    <Users className="w-3 h-3 flex-shrink-0 mt-0.5 text-icon" />
                    <span className="min-w-0">{authors.join(', ')}</span>
                  </div>
                )}
                {commentsLoading && (
                  <div className="flex items-center gap-1.5 text-[10px] text-icon">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {t('agentInfo.pr.commentsLoading')}
                  </div>
                )}
                {commentsError && !commentsLoading && (
                  <div className="text-[10px] text-red">
                    {t(WATCH_ERROR_LABELS[commentsError].label)}
                    <span className="block text-text-secondary/70">{t(WATCH_ERROR_LABELS[commentsError].fix)}</span>
                  </div>
                )}
                {comments !== null && comments.length > 0 && (
                  <ul className="space-y-1 pt-1">
                    {comments.map((thread) => (
                      <ThreadEntry
                        key={thread.id}
                        thread={thread}
                        onOpen={openComments}
                        now={now}
                        t={t}
                      />
                    ))}
                  </ul>
                )}
                {/* The same hand-off over the whole list. In CHILDREN, beside the `<ul>`, and
                    not in `detail`: this fold is a `CollapsibleLine` with a `toggle`, and
                    that component renders `detail` inside the header `<button>` — a button in
                    a button, and a click on it would also fold the list away under the paste.

                    Rendered only when there is something to send. A permanently dead bulk
                    control on a fully resolved PR teaches nothing, where its absence is
                    already the whole message — the same reading as Send in the review's
                    footer bar. Disabled, though, when the agent is gone: that state is worth
                    naming, and the tooltip is what names it. */}
                {unresolvedThreads.length > 0 && (
                  <div className="flex pt-1">
                    <button
                      type="button"
                      onClick={() => void sendToAgent(formatThreadsContext(unresolvedThreads))}
                      disabled={!canSendToAgent}
                      /* No tooltip while it works: this button carries its label in the open,
                         two lines below, and a `title` repeating it is a hover that says what
                         is already on screen. The disabled reason is not on screen anywhere,
                         which is the case a tooltip is actually for. */
                      title={canSendToAgent ? undefined : t('agentInfo.pr.prepareThreadNoAgent')}
                      className={THREADS_SEND}
                    >
                      <SendHorizontal className="w-3 h-3" />
                      {t('agentInfo.pr.prepareAllThreads')}
                    </button>
                  </div>
                )}
                {/* Counted but unreadable: every body came back empty, which on a PR
                    with a count means bare approvals and nothing written. */}
                {comments !== null && comments.length === 0 && !commentsLoading && (
                  <div className="text-[10px] text-text-secondary/50">{t('agentInfo.pr.commentsEmpty')}</div>
                )}
              </div>
            </CollapsibleLine>
          )}

          {/* Checks — the count beside the label, and the checks themselves folded
              behind it, one line each with the icon of its own state. No progress
              bar: on a checklist the box already says whether this one is settled,
              "9/12" says how far along, and the names say which. The header is only
              a button when there is a list to unfold. */}
          {checksItem && (
            <CollapsibleLine
              icon={checksItem.Icon}
              tone={checksItem.tone}
              spin={checksItem.spin}
              label={checksItem.label}
              muted={checksItem.done}
              detail={checks && checks.total > 0 ? (
                <span className="flex items-center gap-1.5">
                  <ChecksRing checks={checks} t={t} />
                  <span className="text-[10px] text-text-secondary/60 tabular-nums">
                    {t('agentInfo.pr.checksPassed', { passed: checks.passed, total: checks.total })}
                  </span>
                </span>
              ) : undefined}
              toggle={checkList.length > 0
                ? { open: checksOpen, onToggle: () => setChecksExpanded(!checksOpen) }
                : undefined}
            >
              {checkList.length > 0 && (
                /* The names as the watcher ordered them — worst first, and capped by it
                   too, which is what `more` says out loud. Every check goes over as a
                   state and a word: the glyph and the colour are the design system's. */
                <CheckList
                  checks={checkList.map((check) => ({
                    name: check.name,
                    state: check.state,
                    stateLabel: t(CHECK_STATE_LABELS[check.state]),
                  }))}
                  more={hiddenChecks > 0 ? t('agentInfo.pr.checksMore', { count: hiddenChecks }) : undefined}
                />
              )}
            </CollapsibleLine>
          )}

          {/* Conflicts — absent means unknown, never a conflict */}
          {showMergeable && (() => {
            const { Icon, tone, label, done } = MERGEABLE_ITEMS[String(metadata?.prMergeable ?? 'unknown') as keyof typeof MERGEABLE_ITEMS]
            return <CollapsibleLine icon={Icon} tone={tone} label={t(label)} muted={done} />
          })()}

          {/* The last box, and the only one with a command attached: merged, so all
              that is left is closing the ticket out. Never on the same list as the
              conflicts line — one needs an open PR, the other a merged one — and
              legacy rows carry `prMerged`, so it works without any of the new
              fields. Offered on a freshly opened PR it would be an affordance that
              lies, which is why it is gated at all. */}
          {showDone && (
            <CollapsibleLine
              // Ticked box, merge colour: the shape says the work is done, the
              // purple keeps GitHub's association the header badge already uses.
              icon={CheckCircle2}
              tone="purple"
              label={t('agentInfo.pr.state.merged')}
              muted
              detail={(
                <button
                  onClick={() => runSlashCommand(agentId, '/magic:done', t)}
                  // Fixed 20 px so this chip is exactly as tall as the ones carrying
                  // a single word — the button is what used to make it the odd one.
                  className="flex h-5 items-center gap-1.5 px-2 bg-green/10 hover:bg-green/20 rounded-lg text-green text-[11px] font-medium transition-colors"
                >
                  <CheckCircle className="w-3 h-3" />
                  {t('agentInfo.launchDone')}
                </button>
              )}
            />
          )}
        </>
      )}
    </PullRequestCard>
  )
}
