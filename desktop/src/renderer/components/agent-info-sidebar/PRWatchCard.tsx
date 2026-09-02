import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  Circle,
  EyeOff,
  GitMerge,
  GitPullRequest,
  GitPullRequestClosed,
  GitPullRequestDraft,
  Loader2,
  MessagesSquare,
  MinusCircle,
  RefreshCw,
  SendHorizontal,
  Users,
  XCircle,
} from 'lucide-react'
import { formatTimestamp } from './utils'
import { useStore } from '../../store'
import { bracketedPaste, resolveAgentTarget } from '../../utils/agentTerminals'
import {
  formatThreadContext, formatThreadsContext, selectUnresolvedThreads,
} from '../../utils/prThreadContext'
import { useT, type MessageKey, type Translate } from '../../i18n'
import { showToast } from '../Toast'
import type { PRCheck, PRReviewThread, PRState, PRWatchError, RepositoryMetadata } from '../../../types'
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
  tone: string
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
  { label: MessageKey; tone: string }
> = {
  approved: { label: 'prReview.approved', tone: 'bg-green/10 text-green' },
  'changes-requested': { label: 'prReview.changesRequested', tone: 'bg-red/10 text-red' },
  commented: { label: 'prReview.commented', tone: 'bg-blue/10 text-blue' },
  pending: { label: 'prReview.pending', tone: 'bg-yellow/10 text-yellow' },
}

const STATE_LABELS: Record<PRState, MessageKey> = {
  open: 'agentInfo.pr.state.open',
  draft: 'agentInfo.pr.state.draft',
  merged: 'agentInfo.pr.state.merged',
  closed: 'agentInfo.pr.state.closed',
}

// Badge colours, not a status colour scale: merged is purple on GitHub and the
// sidebar keeps that association so the state reads at a glance.
const STATE_BADGE: Record<PRState, string> = {
  open: 'bg-green/10 text-green',
  draft: 'bg-surface-strong text-text-secondary',
  merged: 'bg-purple/10 text-purple',
  closed: 'bg-red/10 text-red',
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

// One entry per state a single check can be in — the icons of the list inside the
// checks card, and the same vocabulary the card's own checks line is built from.
const CHECK_STATES = {
  passed: { Icon: CheckCircle2, tone: 'text-green', label: 'agentInfo.pr.checkPassed', spin: false },
  failed: { Icon: XCircle, tone: 'text-red', label: 'agentInfo.pr.checkFailed', spin: false },
  running: { Icon: Loader2, tone: 'text-blue', label: 'agentInfo.pr.checkRunning', spin: true },
  skipped: { Icon: MinusCircle, tone: 'text-text-secondary/60', label: 'agentInfo.pr.checkSkipped', spin: false },
} as const satisfies Record<
  PRCheck['state'],
  { Icon: typeof CheckCircle2; tone: string; label: MessageKey; spin: boolean }
>

// `undefined` is its own entry, not a missing one: GitHub answers UNKNOWN while it
// computes mergeability, and that must never render as "conflicts" — nor as a tick,
// which is why the unknown line gets an empty box rather than a check.
const MERGEABLE_ITEMS = {
  true: { Icon: CheckCircle2, tone: 'text-green', label: 'agentInfo.pr.mergeable', done: true },
  false: { Icon: AlertTriangle, tone: 'text-red', label: 'agentInfo.pr.conflicts', done: false },
  unknown: { Icon: Circle, tone: 'text-text-secondary/60', label: 'agentInfo.pr.mergeableUnknown', done: false },
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

function StateIcon({ state, className = 'w-4 h-4' }: { state: PRState; className?: string }) {
  switch (state) {
    case 'merged':
      return <GitMerge className={`${className} text-purple`} />
    case 'closed':
      return <GitPullRequestClosed className={`${className} text-red`} />
    case 'draft':
      return <GitPullRequestDraft className={`${className} text-text-secondary`} />
    case 'open':
      return <GitPullRequest className={`${className} text-green`} />
  }
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
 * The band every item on this card is drawn in — a checklist line, the comments —
 * so the rows read as one list rather than as separate treatments. Edge to edge,
 * with no chrome of its own: the rows sit flush in the card, separated by the
 * container's dividers. The surface only comes up while the row is unfolded — the
 * commit-hash button's, one shade up from the card — so the open item is the one
 * that stands out and the closed ones stay part of the card.
 */
function Chip({ open = false, children }: { open?: boolean; children: ReactNode }) {
  return <div className={`w-full px-3 transition-colors ${open ? 'bg-surface' : ''}`}>{children}</div>
}

/**
 * A chip holding one item: an icon gutter, what the item is about, and an optional
 * detail pinned right.
 *
 * A fixed `h-9`, not a `min-h`: every header line lands on exactly the same 36 px — a
 * line carrying a button is no taller than one carrying a word, and a checklist of
 * ragged boxes stops reading as a list. Safe because every header truncates rather
 * than wraps; only `children`, below the line, are allowed to grow.
 *
 * The icon is a flex item OF the header line, not centred in its own box beside it:
 * that box only lines up while the line happens to be exactly as tall as it is.
 *
 * `toggle` turns the header into a button and gates `children` behind it; `children`
 * is indented by hand to the same gutter, 16 px of icon plus the 8 px gap.
 */
function ItemCard({
  icon,
  header,
  detail,
  toggle,
  children,
}: {
  icon: ReactNode
  header: ReactNode
  /** Pinned right of the header line: a count, or a command. */
  detail?: ReactNode
  toggle?: { open: boolean; onToggle: () => void }
  children?: ReactNode
}) {
  const line = (
    <>
      <span className="w-4 flex-shrink-0 flex items-center justify-center">{icon}</span>
      <div className="min-w-0 flex-1">{header}</div>
      {detail !== undefined && <span className="flex-shrink-0">{detail}</span>}
      {toggle && (
        <ChevronDown
          className={`w-3 h-3 flex-shrink-0 text-icon group-hover:text-ink transition-all ${toggle.open ? '' : '-rotate-90'}`}
        />
      )}
    </>
  )

  return (
    <Chip open={Boolean(toggle?.open)}>
      {toggle ? (
        <button onClick={toggle.onToggle} className="group w-full h-9 flex items-center gap-2 text-left">
          {line}
        </button>
      ) : (
        <div className="h-9 flex items-center gap-2">{line}</div>
      )}
      {children && (!toggle || toggle.open) && <div className="pb-2.5 pl-6">{children}</div>}
    </Chip>
  )
}

/**
 * One item of the checklist: the box, what it is about, and an optional detail.
 *
 * A card per item rather than one panel of rows, because each line here is a
 * separate question — green? mergeable? merged? — and giving each its own edge stops
 * them reading as one paragraph of status.
 */
function ChecklistRow({
  item,
  detail,
  toggle,
  children,
}: {
  item: ChecklistItem
  detail?: ReactNode
  toggle?: { open: boolean; onToggle: () => void }
  children?: ReactNode
}) {
  return (
    <ItemCard
      icon={<item.Icon className={`w-3.5 h-3.5 ${item.tone} ${item.spin ? 'animate-spin' : ''}`} />}
      header={(
        <span className={`block text-xs truncate ${item.done ? 'text-text-secondary/70' : `font-medium ${item.tone}`}`}>
          {item.label}
        </span>
      )}
      detail={detail}
      toggle={toggle}
    >
      {children}
    </ItemCard>
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
  { Icon: typeof CheckCircle2; tone: string; label: MessageKey; pill: string }
> = {
  open: { Icon: Circle, tone: 'text-blue', label: 'agentInfo.pr.threadOpen', pill: 'text-text-secondary/60' },
  // The one state drawn as a BADGE — same tint scale as `REVIEW_BADGE` — rather than as a
  // word beside an icon. Resolved is the state the reader is looking for: it is what
  // separates "still to do" from "done" in a list of twenty threads, and a grey word at
  // 60 % was the same weight as "outdated", which says nothing of the kind. The badge is
  // what lets a row be skipped at a glance.
  resolved: {
    Icon: CheckCircle2,
    tone: 'text-green',
    label: 'agentInfo.pr.commentResolved',
    pill: 'bg-green/10 text-green font-semibold px-1.5 py-0.5 rounded',
  },
  // The diff moved out from under it, so the line it hangs on no longer exists —
  // quiet rather than tinted: nothing is wrong, it is just stale.
  outdated: { Icon: MinusCircle, tone: 'text-text-secondary/60', label: 'agentInfo.pr.threadOutdated', pill: 'text-text-secondary/60' },
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
 * A BASE plus two suffixes, on `ChangeNavigator`'s `BUTTON_BASE` model: the base holds
 * everything the two share — the shape, the resting tone, the disabled chrome — and each
 * suffix adds only layout and padding, which the base deliberately does not set, so nothing
 * here is one Tailwind group overriding itself. The row's is an icon in a square; the fold's
 * carries a word beside it.
 */
const SEND_BASE =
  'flex items-center rounded-md bg-transparent border-none cursor-pointer transition-colors ' +
  'text-text-secondary/70 hover:text-ink hover:bg-surface-strong ' +
  'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-text-secondary/70'

const THREAD_SEND = `${SEND_BASE} flex-shrink-0 justify-center p-1`

const THREADS_SEND = `${SEND_BASE} gap-1 py-1 px-1.5 text-[10px] font-medium`

/**
 * One thread, on one line: who opened it, where, how many answers, and whether it is
 * settled.
 *
 * A row to SCAN, not to read. The sidebar is 500 px wide and does not resize, so the
 * bodies are deliberately absent here — a card per comment turned a bot-reviewed PR
 * into a page of prose in a column too narrow for it, and the question this fold
 * answers is "what is still open, and where", not "what exactly was said". Reading the
 * conversation is a panel of its own.
 *
 * `bg-surface` — the same token the PR card itself is painted with, so the rows belong
 * to the card rather than to a palette of their own. It still reads a shade lighter
 * than that card: these are TRANSLUCENT overlays, and a row sits on three of them
 * (card, chip, row), not one. The separation comes from the border, and the fill only
 * has to stop the rows running together — which is also why this is not a call to
 * `Chip`, whose padding is sized for the checklist.
 *
 * A BUTTON across the full width, opening the comments panel on this thread. The row
 * used to be inert and said so, on the grounds that lighting it up would promise an
 * action that did not exist; the panel is that action, so the affordance is now the
 * truth rather than the promise. Full-width because the target is the row — every part
 * of it names the same thread, and a chevron at one end would be a smaller target
 * saying the same thing.
 *
 * The panel it opens is given the WHOLE thread list, not just this one thread: it is a
 * conversation, and dropping the reader into it with a single exchange and no way to
 * reach the others would be a worse surface than the fold they came from. Its own thread
 * is the anchor, which is where the panel scrolls to — see `PRCommentsView`.
 *
 * The row does not assemble that itself, though: it reports an ID through `onOpen` and
 * knows nothing of the list, the PR URL or the store. The card holds all three already,
 * so passing them down would be fifty rows each carrying a copy of the list they are in
 * and each opening a store subscription, to answer a click that only ever names a thread.
 */
function ThreadEntry({ thread, onOpen, onSend, canSend, now, t }: {
  thread: PRReviewThread
  /** Hand the panel this thread's id; the card knows what to open it on. */
  onOpen: (threadId: string) => void
  /**
   * Hand the agent this thread — the whole object, not an id, because what is composed
   * from it is text and the card would otherwise look the thread back up in a list it
   * already gave this row.
   */
  onSend: (thread: PRReviewThread) => void
  /**
   * Whether there is an agent terminal to paste into. Resolved ONCE by the card and passed
   * down, for the reason `onOpen` is: fifty rows each opening a store subscription to answer
   * a question with one answer for the whole list.
   */
  canSend: boolean
  now: number
  t: Translate
}) {
  const { root } = thread
  // When the thread was OPENED — the same stamp the list is sorted on, so the ages read
  // down the column in order instead of jumping about. Not `updatedAt`: a row that
  // said "5 min ago" between two saying "2 d ago" would look misfiled.
  const createdAt = root.createdAt ? Date.parse(root.createdAt) : NaN
  const badge = thread.kind === 'review' ? REVIEW_STATE_BADGE[(root.reviewState || '').toUpperCase()] : undefined

  // The basename only: a sidebar column cannot hold `desktop/src/main/…/watcher.ts`,
  // and the full path is one click away on GitHub. The title attribute keeps it.
  const where = thread.path
    ? `${thread.path.split('/').pop()}${typeof thread.line === 'number' ? `:${thread.line}` : ''}`
    : undefined

  // Only the inline threads have one: a conversation comment and a review summary are
  // not threads GitHub tracks the state of, and pinning "open" to every one of them
  // would spend the row's width saying nothing.
  const state = thread.kind === 'inline' ? THREAD_STATE[thread.state] : undefined

  // One string for both the accessible name and the tooltip: an icon-only control needs
  // both, and they must not be able to drift into saying two different things.
  const prepareLabel = canSend
    ? t('agentInfo.pr.prepareThread')
    : t('agentInfo.pr.prepareThreadNoAgent')

  return (
    /* The row is a BUTTON and stays one — the send is a sibling after it rather than a child,
       because a `<button>` cannot nest a `<button>`. Turning the row into a `div onClick` to
       make room would have been the smaller diff and the wrong one: it would silently drop
       the keyboard access and the focus ring the row has today. The `ml-auto` metadata group
       still travels to the right edge INSIDE the row button, so the columns stay aligned. */
    <li className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onOpen(thread.id)}
        title={t('prComments.openThread')}
        /* A resolved row steps back — border tinted green, text dimmed — the same reading
           as the card's checklist, where a ticked line goes quiet so the eye lands on what
           is still open. The badge inside it stays at full strength: it is the one thing
           on the row that has to be readable without stopping. */
        className={`flex-1 flex items-center gap-1.5 min-w-0 rounded-md border bg-surface hover:bg-surface-strong px-2 py-1.5 text-xs text-left transition-colors ${
          thread.state === 'resolved' ? 'border-green/30' : 'border-border/30'
        }`}
      >
        {/* The author can give way to the location: on an inline thread "which file"
            is the part that places the row, and a truncated login is still readable. */}
        <span className={`font-medium truncate ${thread.state === 'resolved' ? 'text-ink/50' : 'text-ink/80'}`}>{root.author}</span>
        {badge && (
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold flex-shrink-0 ${REVIEW_BADGE[badge].tone}`}>
            {t(REVIEW_BADGE[badge].label)}
          </span>
        )}
        {/* A review whose verdict this card has no badge for — DISMISSED, today. Untinted
            on purpose: it is not a fourth verdict, it is the row saying which of the three
            connections it came from, which is the only thing separating it from a
            conversation comment once the badge is gone. */}
        {thread.kind === 'review' && !badge && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold flex-shrink-0 bg-surface-strong text-text-secondary/70">
            {t('agentInfo.pr.threadReview')}
          </span>
        )}
        {where && (
          <span className="text-text-secondary/60 font-mono truncate" title={thread.path}>{where}</span>
        )}
        {/* One group travelling to the right edge, so the counts and states line up
            column-wise down the list rather than trailing each row's own text. */}
        <span className="ml-auto flex items-center gap-1.5 flex-shrink-0 text-[10px]">
          {/* The real number of answers, which is not how many the thread carries once
              the per-thread cap has bitten. Two keys rather than one: the catalogue
              interpolates but does not pluralise. */}
          {thread.replyCount > 0 && (
            <span className="text-text-secondary/70 tabular-nums">
              {t(thread.replyCount === 1 ? 'agentInfo.pr.threadReply' : 'agentInfo.pr.threadReplies', { count: thread.replyCount })}
            </span>
          )}
          {state && (
            <span className={`flex items-center gap-1 ${state.pill}`}>
              <state.Icon className={`w-3 h-3 ${state.tone}`} />
              {t(state.label)}
            </span>
          )}
          {Number.isFinite(createdAt) && (
            <span className="text-text-secondary/40">{formatTimestamp(createdAt, now, t)}</span>
          )}
        </span>
      </button>
      {/* DISABLED rather than hidden when there is no agent to paste into, and the tooltip is
          what makes that state worth having: a control that vanished would leave the reader
          looking for it, where this one names the reason. There is nothing to fall back on
          here — unlike the review's popover, a thread row carries no Copy. */}
      <button
        type="button"
        onClick={() => onSend(thread)}
        disabled={!canSend}
        aria-label={prepareLabel}
        title={prepareLabel}
        className={THREAD_SEND}
      >
        <SendHorizontal className="w-3 h-3" />
      </button>
    </li>
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

  const sendThread = useCallback((thread: PRReviewThread) => {
    void sendToAgent(formatThreadContext(thread))
  }, [sendToAgent])

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
        ? { label: t(STATE_LABELS[state]), tone: STATE_BADGE[state] }
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
        ? { Icon: MinusCircle, tone: 'text-text-secondary/60', label: t('agentInfo.pr.noChecks'), done: false }
        : checks.failed > 0
          ? { Icon: XCircle, tone: 'text-red', label: t('agentInfo.pr.checksLabel'), done: false }
          : checks.running > 0
            ? { Icon: Loader2, tone: 'text-blue', label: t('agentInfo.pr.checksLabel'), done: false, spin: true }
            : { Icon: CheckCircle2, tone: 'text-green', label: t('agentInfo.pr.checksLabel'), done: true }

  const checksOpen = checksExpanded ?? (checks !== undefined && (checks.failed > 0 || checks.running > 0))

  // An empty `border-t` band reads as a rendering bug, so both middle bands are
  // gated on having a line to draw. Only the status bar is unconditional — the
  // freshness stamp and its button are meaningful even on a card that knows
  // nothing else yet.
  const showComments = commentRows.length > 0 || authors.length > 0
  const showChecklist =
    watchError !== undefined ||
    showComments ||
    checksItem !== undefined ||
    showMergeable ||
    showDone

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
    <div className="mt-2 bg-surface rounded-lg border border-line-subtle overflow-hidden">
      {/* Header — the card's identity IS the link to GitHub, which is why the
          separate "View pull request" button below the card could go away. The
          badge sits inside that target: it labels the PR, so clicking it should open
          the PR rather than land on dead space. The whole row is one
          generous hit area — the negative margin lets its hover surface reach past
          the container's padding to 4px from the card edge, while its own padding
          keeps the text off that edge. No external-link glyph: the title, the
          repo slug and the tooltip already say where this goes. */}
      <div className="flex items-center p-2">
        <button
          onClick={() => window.electronAPI.shell.openExternal(prUrl)}
          title={t('agentInfo.viewPullRequest')}
          className="group flex items-center gap-2 min-w-0 flex-1 text-left rounded-md -m-1 p-2 hover:bg-surface-strong transition-colors"
        >
          <span className="w-4 flex-shrink-0 flex items-center justify-center">
            {state ? <StateIcon state={state} /> : <GitPullRequest className="w-4 h-4 text-text-secondary" />}
          </span>
          <span className="min-w-0 flex-1">
            {/* Hover brightens the title to full white rather than tinting it: the
                surface lighting up is already the affordance, and the accent read as
                a state change on the PR itself. */}
            <span className="block text-xs font-medium text-ink/90 truncate group-hover:text-ink transition-colors">
              {prNumber ? t('agentInfo.pr.number', { number: prNumber }) : t('agentInfo.pr.title')}
            </span>
            {repoSlug && (
              <span className="block text-[10px] text-text-secondary/50 truncate" title={repoSlug}>
                {repoSlug}
              </span>
            )}
          </span>
          {badge && (
            // Not upper-cased any more: "CHANGES REQUESTED" is twice the width of
            // "Open" and would eat the title it sits next to.
            <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold ${badge.tone}`}>
              {badge.label}
            </span>
          )}
        </button>
      </div>

      {/* The setting, not a failure: the watcher is off, so nothing the card could
          show below would ever move again. Everything else is therefore replaced by
          this one prompt rather than stacked above a frozen snapshot presented as
          the state of the PR — and it carries its own fix, the same way each watch
          error names one. */}
      {watcherOff ? (
        <div className="border-t border-line-subtle p-2">
          <div className="flex items-start gap-2 rounded-md bg-surface-sunken px-2 py-1.5">
            <EyeOff className="w-3.5 h-3.5 text-icon flex-shrink-0 mt-px" />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] text-ink/80 font-medium">{t('agentInfo.pr.watcherOff')}</div>
              <div className="text-[10px] text-text-secondary/70">
                {/* Two different situations behind one setting: a card that has a
                    snapshot hidden behind it is dated, one carrying only the link
                    is empty. */}
                {t(hasSnapshot ? 'agentInfo.pr.watcherOffStale' : 'agentInfo.pr.watcherOffEmpty')}
              </div>
            </div>
            <button
              onClick={handleEnableWatcher}
              disabled={enabling}
              className="flex-shrink-0 px-2 py-1 rounded-md bg-accent/10 hover:bg-accent/20 text-accent text-[11px] font-medium transition-colors disabled:opacity-50"
            >
              {t('agentInfo.pr.enableWatcher')}
            </button>
          </div>
        </div>
      ) : (
        <>
        {/* The checklist — everything that has to be true before this PR can ship,
            one line each, ticked when it is. Straight under the header because it is
            the band that answers "can this ship", and a list rather than a stack of
            differently-shaped panels because the shape itself carries the meaning:
            same gutter, same box, so the open items are the ones that stand out.
            Rendered whenever any line has something to say. */}
        {showChecklist && <div className="border-t border-line-subtle [&>*+*]:shadow-[inset_0_1px_0_0_var(--c-line-subtle)]">
          {/* Why the watcher is blind, and how to fix it. Above the verdict on
              purpose: a stale verdict is worth less than the reason it is stale. */}
          {watchError && (
            <div className="flex items-start gap-2 bg-red/10 px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 text-red flex-shrink-0 mt-px" />
              <div className="min-w-0">
                <div className="text-[11px] text-red font-medium">{t(WATCH_ERROR_LABELS[watchError].label)}</div>
                <div className="text-[10px] text-text-secondary/70">{t(WATCH_ERROR_LABELS[watchError].fix)}</div>
              </div>
            </div>
          )}

          {/* No review line here: the verdict is the header badge now, and stating
              it twice on one card made the checklist look longer than it is. */}

          {/* Comments — the count on the line, who wrote them behind the fold. Not a
              box to tick, so no `done` styling: it reports, it does not gate. First of
              the list because it is the one line that is about people rather than
              machinery, and the reason anyone opens this card mid-review. */}
          {showComments && (
            <ItemCard
              icon={<MessagesSquare className="w-3.5 h-3.5 text-blue" />}
              header={<span className="block text-xs truncate text-text-secondary/70">{t('agentInfo.pr.commentsLabel')}</span>}
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
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-text-secondary/70">
                    {commentRows.map((row) => (
                      <span key={row.label} className="flex items-center gap-1">
                        <span className="text-ink/80 font-medium tabular-nums">{row.value}</span>
                        {t(row.label)}
                      </span>
                    ))}
                  </div>
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
                        onSend={sendThread}
                        canSend={canSendToAgent}
                        now={now}
                        t={t}
                      />
                    ))}
                  </ul>
                )}
                {/* The same hand-off over the whole list. In CHILDREN, beside the `<ul>`, and
                    not in `detail`: this fold is an `ItemCard` with a `toggle`, and `ItemCard`
                    renders `detail` inside that header `<button>` — a button in a button, and
                    a click on it would also fold the list away under the paste.

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
            </ItemCard>
          )}

          {/* Checks — the count beside the label, and the checks themselves folded
              behind it, one line each with the icon of its own state. No progress
              bar: on a checklist the box already says whether this one is settled,
              "9/12" says how far along, and the names say which. The header is only
              a button when there is a list to unfold. */}
          {checksItem && (
            <ChecklistRow
              item={checksItem}
              detail={checks && checks.total > 0 ? (
                <span className="text-[10px] text-text-secondary/60 tabular-nums">
                  {t('agentInfo.pr.checksPassed', { passed: checks.passed, total: checks.total })}
                </span>
              ) : undefined}
              toggle={checkList.length > 0
                ? { open: checksOpen, onToggle: () => setChecksExpanded(!checksOpen) }
                : undefined}
            >
              {checkList.length > 0 && (
                <ul className="space-y-1">
                  {checkList.map((check) => {
                    const { Icon, tone, label, spin } = CHECK_STATES[check.state]
                    return (
                      <li key={`${check.state}:${check.name}`} className="flex items-center gap-1.5">
                        <span className="flex-shrink-0 flex" title={t(label)}>
                          <Icon className={`w-3 h-3 ${tone} ${spin ? 'animate-spin' : ''}`} />
                        </span>
                        {/* Sans, like every other label on this card: a check name is
                            read as a name, not as code, and the mono face it used to
                            carry was the one thing here in a different typeface. */}
                        <span className="min-w-0 text-[10px] text-text-secondary/70 truncate" title={check.name}>
                          {check.name}
                        </span>
                      </li>
                    )
                  })}
                  {hiddenChecks > 0 && (
                    <li className="pl-[18px] text-[10px] text-text-secondary/50">
                      {t('agentInfo.pr.checksMore', { count: hiddenChecks })}
                    </li>
                  )}
                </ul>
              )}
            </ChecklistRow>
          )}

          {/* Conflicts — absent means unknown, never a conflict */}
          {showMergeable && (() => {
            const { label, ...rest } = MERGEABLE_ITEMS[String(metadata?.prMergeable ?? 'unknown') as keyof typeof MERGEABLE_ITEMS]
            return <ChecklistRow item={{ ...rest, label: t(label) }} />
          })()}

          {/* The last box, and the only one with a command attached: merged, so all
              that is left is closing the ticket out. Never on the same list as the
              conflicts line — one needs an open PR, the other a merged one — and
              legacy rows carry `prMerged`, so it works without any of the new
              fields. Offered on a freshly opened PR it would be an affordance that
              lies, which is why it is gated at all. */}
          {showDone && (
            <ChecklistRow
              // Ticked box, merge colour: the shape says the work is done, the
              // purple keeps GitHub's association the header badge already uses.
              item={{ Icon: CheckCircle2, tone: 'text-purple', label: t('agentInfo.pr.state.merged'), done: true }}
              detail={(
                <button
                  onClick={() => runSlashCommand(agentId, '/magic:done', t)}
                  // Fixed 20 px so this chip is exactly as tall as the ones carrying
                  // a single word — the button is what used to make it the odd one.
                  className="flex h-5 items-center gap-1.5 px-2 bg-green/10 hover:bg-green/20 rounded-md text-green text-[11px] font-medium transition-colors"
                >
                  <CheckCircle className="w-3 h-3" />
                  {t('agentInfo.launchDone')}
                </button>
              )}
            />
          )}
        </div>}

        {/* Status bar — the card's footer, and the one band that is always there:
            how old everything above it is, and the button that makes it newer.
            Reading on the left, action on the right, so the button is where the eye
            already is when the stamp turns out to be stale. */}
        <div className="border-t border-line-subtle px-2 py-1.5 flex items-center gap-2">
          <span className="min-w-0 text-[10px] text-text-secondary/50 truncate">{checkedLabel}</span>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            title={t('agentInfo.pr.refresh')}
            className="ml-auto flex-shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-md border border-line-subtle text-[11px] font-medium text-text-secondary hover:text-ink hover:bg-surface-strong hover:border-border transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
            {t('agentInfo.pr.refreshAction')}
          </button>
        </div>
        </>
      )}
    </div>
  )
}
