import { memo, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import MarkdownView from '../file-preview/MarkdownView'
import InitialsAvatar from './InitialsAvatar'
import DiffHunkView from './DiffHunkView'
import { REVIEW_BADGE, REVIEW_STATE_BADGE, THREAD_STATE } from '../agent-info-sidebar/PRWatchCard'
import { formatTimestamp } from '../agent-info-sidebar/utils'
import type { Translate } from '../../i18n'
import type { PRComment, PRReviewThread } from '../../../types'

/**
 * One exchange, read rather than scanned.
 *
 * The counterpart of `ThreadEntry` in `PRWatchCard`, and deliberately its opposite: that
 * row answers "what is still open, and where" in a 500 px column, this answers "what was
 * actually said" in a panel 70% of the window wide. Which is why everything the row
 * leaves out is here — the bodies, as markdown; the replies, as replies; and the diff the
 * thread hangs on, above it.
 *
 * `REVIEW_BADGE`, `REVIEW_STATE_BADGE` and `THREAD_STATE` are imported from the card
 * rather than respelled: they are the mappings from GitHub's enums to a word, an icon and
 * a tint, and two copies of one is how the row and the panel would come to disagree about
 * what `DISMISSED` or `outdated` looks like. Only the icon SIZE differs between the two
 * surfaces, and that lives at the call site below, not in the map.
 */

/**
 * The rendered body, behind a memo boundary.
 *
 * Its own component for one reason: `MarkdownView` is `react-markdown`, which memoises
 * NOTHING — it builds a fresh unified processor and re-parses the document on every
 * render it is given. The panel re-renders every comment on screen every 30 s so the
 * "2 h ago" stamps stay honest, and without this boundary that tick re-parses every body
 * in the drawer — up to fifty threads of Greptile markdown — to change one word in a
 * header. `content` is a string, so the default shallow compare is exact and the tick
 * stops here.
 */
const CommentBody = memo(function CommentBody({ content }: { content: string }) {
  // `variant="document"`, matching `TaskDetailPage`: these are the bodies a markdown
  // pipeline was introduced for — Greptile and Claude Code write headings, fenced code
  // and tables — and the `panel` scale is measured for a sidebar.
  return <MarkdownView content={content} variant="document" />
})

/**
 * One comment, in the box a comment is written in everywhere else in this app.
 *
 * The SAME card as `TaskDetailPage`'s — same radius, same `bg-surface` over
 * `border-line-field`, same `bg-surface-subtle` author strip with the date pinned right,
 * same `px-5 py-4` body. A PR comment and a Jira comment are the same kind of thing, and
 * giving this one a card of its own would say they are not.
 */
function ThreadComment({ comment, now, t }: { comment: PRComment; now: number; t: Translate }) {
  const createdAt = comment.createdAt ? Date.parse(comment.createdAt) : NaN
  const badge = comment.reviewState ? REVIEW_STATE_BADGE[comment.reviewState.toUpperCase()] : undefined

  return (
    <div className="rounded-xl bg-surface border border-line-field overflow-hidden">
      <div className="flex items-center gap-1.5 px-5 py-2.5 bg-surface-subtle border-b border-line-subtle">
        <InitialsAvatar login={comment.author} />
        {/* The `@`, as everywhere the app prints a GitHub login: it is a handle in that
            product and wears one there. */}
        <span className="text-xs font-medium text-ink">@{comment.author}</span>
        {badge && (
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${REVIEW_BADGE[badge].tone}`}>
            {t(REVIEW_BADGE[badge].label)}
          </span>
        )}
        {Number.isFinite(createdAt) && (
          <span className="ml-auto text-xs text-text-secondary/50">{formatTimestamp(createdAt, now, t)}</span>
        )}
      </div>
      <div className="px-5 py-4">
        <CommentBody content={comment.body} />
      </div>
    </div>
  )
}

interface Props {
  thread: PRReviewThread
  /** Shared by the whole panel, so every stamp in it is read against one clock. */
  now: number
  t: Translate
}

export default function PRThread({ thread, now, t }: Props) {
  /**
   * A RESOLVED thread starts shut, and nothing else does.
   *
   * It is settled: somebody read it, acted on it and ticked it off, so its whole value
   * to the next reader is that it exists and is done. Leaving twenty of them expanded is
   * the panel opening on the part of the review nobody needs, with the open threads
   * pushed below the fold. Every other state opens.
   *
   * Initialised from the state and then owned by the reader — the same shape as the
   * card's checks fold, minus the tri-state, because there is no data change that should
   * ever reopen a thread somebody has just shut.
   */
  const [expanded, setExpanded] = useState(thread.state !== 'resolved')

  const state = thread.kind === 'inline' && thread.state !== 'open' ? THREAD_STATE[thread.state] : undefined
  const where = thread.path
    ? `${thread.path}${typeof thread.line === 'number' ? `:${thread.line}` : ''}`
    : undefined
  const Chevron = expanded ? ChevronDown : ChevronRight

  /**
   * Whether there is a thread ABOUT this thread to draw.
   *
   * A singleton — a PR conversation comment, a review summary — has no path, no state
   * GitHub tracks and no replies, so its heading would be a chevron and a strip of empty
   * row above a card that already names its author and its date. Omitted rather than
   * rendered blank: the fold it offers would also be a fold over exactly one comment.
   *
   * A resolved thread always has a state, so the one row that MUST be foldable can never
   * fall into this branch.
   */
  const hasHeading = Boolean(where || state || thread.replyCount > 0)

  return (
    /* `data-thread-id` is what the panel scrolls to — see `PRCommentsPanel`. On the
       article rather than on an inner row so the anchored thread lands with its own
       heading visible rather than with the heading scrolled past. */
    <article data-thread-id={thread.id} className="space-y-2">
      {/* The thread's own line: where it hangs, what state it is in, and the control
          that folds it. A button across the full width rather than a chevron alone —
          the target is the whole heading, which is what anyone aims at. */}
      {hasHeading && <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        title={t(expanded ? 'prComments.hideThread' : 'prComments.showThread')}
        className="w-full flex items-center gap-2 min-w-0 text-left rounded-md px-1 py-1 hover:bg-surface transition-colors"
      >
        <Chevron className="w-3.5 h-3.5 shrink-0 text-icon" />
        {where && (
          <span className="min-w-0 font-mono text-xs text-text-secondary truncate" title={thread.path}>
            {where}
          </span>
        )}
        {/* The outdated flag carries the line it was WRITTEN against, so the row does
            not present a stale number as a current one. Dropped when `where` is already
            showing that very number — `thread.line` falls back to `originalLine`, which
            on most outdated threads is all GitHub has left, and the heading would
            otherwise read "a.ts:117 originally line 117". What survives the test is the
            case that is worth a word: a thread whose current line and written-against
            line genuinely differ. */}
        {thread.state === 'outdated' && typeof thread.originalLine === 'number'
          && thread.originalLine !== thread.line && (
          <span className="shrink-0 text-[11px] text-text-secondary/60">
            {t('prComments.outdatedAnchor', { line: thread.originalLine })}
          </span>
        )}
        <span className="ml-auto shrink-0 flex items-center gap-2 text-[11px]">
          {thread.replyCount > 0 && (
            <span className="text-text-secondary/70 tabular-nums">
              {t(thread.replyCount === 1 ? 'agentInfo.pr.threadReply' : 'agentInfo.pr.threadReplies', { count: thread.replyCount })}
            </span>
          )}
          {state && (
            <span className="flex items-center gap-1 text-text-secondary/60">
              <state.Icon className={`w-3.5 h-3.5 ${state.tone}`} />
              {t(state.label)}
            </span>
          )}
        </span>
      </button>}

      {expanded && (
        <>
          {/* The code the argument is about, above the argument. Renders nothing at all
              when the thread has no usable hunk — every conversation comment and review
              summary, and any inline thread whose excerpt did not parse. */}
          <DiffHunkView hunk={thread.diffHunk} anchor={thread} />
          <ThreadComment comment={thread.root} now={now} t={t} />
          {thread.replies.length > 0 && (
            /* Indented under the root and hung off a rule, the way a reply is drawn
                everywhere: the nesting IS the statement that these answer the comment
                above rather than sit beside it. One level only — GitHub's review threads
                are flat under their root, so a `replyTo` chain has nothing deeper to
                express. Chronological, which is the order `groupPullRequestThreads`
                already sorted them into and the order a conversation is read in. */
            <div className="ml-6 pl-4 border-l-2 border-line-subtle space-y-2">
              {thread.replies.map(reply => (
                <ThreadComment key={reply.id} comment={reply} now={now} t={t} />
              ))}
            </div>
          )}
        </>
      )}
    </article>
  )
}
