import { useCallback, useMemo } from 'react'
import type { SpecCardProps } from '@ds/desktop'
import { NO_COMMENTS, useStore } from '../../store'
import FileContentRenderer from '../file-preview/FileContentRenderer'
import ReviewCommentsButton from '../file-preview/ReviewCommentsButton'
import { commentFileKey, SPEC_FINGERPRINT, type CommentTarget } from '../../utils/commentAnchors'
import {
  collectDocumentComments, type ReviewComment, type ReviewCommentGroup,
} from '../../utils/reviewComments'
import { useRepoColors } from './RepoMark'
import { useStatusPicker } from './StatusPill'
import { useTicketBadge } from './TicketIdLink'
import { useAgentIdentityFields, type AgentIdentity } from './AgentIdentityFields'
import type { TaskSelection } from '../../utils/taskSelection'
import { useT } from '../../i18n'

/**
 * THE DATA PATH for the `/magic:plan` spec card. The card is `SpecCard` in the design
 * system, and the column that places it is `SidebarAgentPlannerInfo`.
 *
 * Reads the LOCAL file at the agent's `metadata.specPath` through `config:readFile` — never
 * a cloud row — so it works with sync off and with no network. The signal to re-read is the
 * `plan:specChanged` IPC ping (see `usePlanSpec`); nothing here watches the filesystem.
 *
 * It is a panel in the sidebar and NOT a modal on purpose: the terminal beside it stays
 * fully usable while the spec is being written, which a backdrop would take away. The
 * expand control hands the same file to the existing `FilePreviewPanel` drawer for the
 * moments a wider read is wanted.
 *
 * A HOOK AND NOT A COMPONENT, for the reason the ticket card and the usage card are hooks:
 * the column renders the card, so what it wants handed to it is arguments. What is left
 * here is the half the design system cannot reach — the comment store, the file reader, and
 * the four pieces of the agent's identity that each resolve through a hook of their own.
 *
 * Give the column `key={specPath}` so a new file starts fresh: at the top of the NEW spec
 * rather than wherever the previous one had been left.
 */

interface SpecCardOptions {
  /**
   * The terminal of the agent this spec belongs to — the send target for its comments.
   *
   * NOT `activeTerminalId`, and that is the one thing this option exists to say. A review
   * belongs to no agent in particular, so `ReviewCommentsButton` writes it to whichever is
   * selected; a spec belongs to exactly one — this card is open FOR a named planning agent,
   * and it is the only agent that can act on the document — so the target travels with the
   * card rather than with the selection. Handing the comments to whatever the reader
   * happened to click last is the failure this replaces.
   *
   * It travels one step further than the card: `handleExpand` puts it on `selectedFile`,
   * because the expanded preview shows the same document with the same comments and hands
   * them to the same agent. Nothing about "which agent owns this spec" is recoverable from
   * the file path, so it has to be carried rather than looked up on the other side.
   */
  agentId: string
  /**
   * The title, plus its editing state. This card is the ONLY one on screen, so it carries
   * the agent's identity that the ticket card would otherwise hold — read AND editable, so
   * replacing that card takes no capability away. The description is not rendered: the spec
   * itself is the planning agent's long-form text.
   */
  identity: AgentIdentity
  /**
   * Names of the repositories attached to the agent. They are this card's heading: the
   * repository CARDS are gone for a planning agent — it has no branch, no diff and no PR
   * for them to show — but which repository is being planned against still matters, and it
   * is the one thing those cards said that is worth keeping.
   */
  repoNames: string[]
  status: string
  /** Present once `/magic:plan` has created the ticket, i.e. at `planned`. */
  ticketId?: string
  /** Where the Tasks modal opens when the id is clicked. See `TicketIdLink`. */
  taskSelection: TaskSelection | null
  /** Directory of the spec, as `splitSpecPath` returns it. */
  repoPath: string
  /** Bare file name of the spec, as `splitSpecPath` returns it. */
  filePath: string
  /** From `usePlanSpec`; every bump re-reads the file in place. */
  refreshToken: number
  onStatusChange?: (status: string) => void
}

export function useSpecCard({
  agentId,
  identity,
  repoNames,
  status,
  ticketId,
  taskSelection,
  repoPath,
  filePath,
  refreshToken,
  onStatusChange,
}: SpecCardOptions): SpecCardProps {
  const t = useT()
  const setSelectedFile = useStore(s => s.setSelectedFile)
  const focusFileComment = useStore(s => s.focusFileComment)
  const repoColors = useRepoColors()

  /**
   * How this document's comments are named in the store — the same key the layer below
   * writes them under, built the same way.
   *
   * `SPEC_FINGERPRINT` and not a content hash, which is the whole reason a comment survives
   * the agent rewriting the spec: one name for every version of the file. `SPEC_FINGERPRINT`'s
   * own docblock carries that argument, and the proof that this key space cannot collide
   * with a review's.
   *
   * Rebuilt on a render rather than memoised: it is two string joins, and the memo cell that
   * guarded them would cost more than they do. What IS memoised is the group list below,
   * which walks the entries.
   */
  const target: CommentTarget = { repoPath, path: filePath, fingerprint: SPEC_FINGERPRINT }
  const commentKey = commentFileKey(target)
  // `NO_COMMENTS` rather than `?? []`, for the reason it exists: zustand compares a
  // selector's result by identity, and a fresh array per call re-renders this card on every
  // unrelated store mutation — with a spec being re-read every few seconds, that is not
  // theoretical.
  const comments = useStore(s => s.fileComments[commentKey] ?? NO_COMMENTS)

  /**
   * The comments as the popover's own shape, and how many that is.
   *
   * ONE computation with the count derived from its result, on `FilePreviewPanel`'s
   * precedent and for its reason: the count is what puts the control on screen and the
   * groups are what it draws, so a count from one source and a list from another is the
   * state where the header says "3" over an empty list.
   */
  const groups = useMemo(
    // A ONE-ENTRY map rather than the store's, and the key is deliberately spelled twice —
    // once for the selector above, once by the collector. The selector has to be narrow:
    // subscribing to `fileComments` itself would re-render this card whenever anyone
    // comments on any file of any review. And the collector has to take a map, because
    // reading exactly one key out of one is the property its suite asserts — a review's key
    // on this very path must not leak into a spec's list. Two string joins is what that costs.
    () => collectDocumentComments({ [commentKey]: comments }, target),
    // `target` is rebuilt on every render, so the two values it is made of stand in for it:
    // `commentKey` is a pure function of `repoPath` and `filePath`, so naming those as well
    // would be the same dependency twice.
    [commentKey, comments],
  )
  // Off the memo rather than off `comments`, so the number that puts the control on screen
  // and the list it opens cannot disagree. `groups[0]` and not a reduce: this collector
  // returns one group or none, and spelling that out is worth more here than a loop that
  // reads as if it might one day walk several.
  const commentCount = groups[0]?.comments.length ?? 0

  /**
   * Take the reader from the list to the passage.
   *
   * A call into the store and nothing else — no scrolling here. `MarkdownCommentLayer`
   * already selects `focusedComment` by this document's own key and scrolls the pill it drew
   * into view, which is the mechanism the review's list uses too. Nothing has to be unfolded
   * first either: a review's card can be collapsed, this document is the card.
   *
   * The group is ignored — this list has exactly one, for the only path this card reads —
   * but the signature is the popover's, and narrowing it here would fork the component.
   */
  const handleJumpToComment = useCallback((_group: ReviewCommentGroup, comment: ReviewComment) => {
    focusFileComment({ repoPath, path: filePath, fingerprint: comment.fingerprint }, comment.id)
  }, [focusFileComment, repoPath, filePath])

  const handleExpand = useCallback(() => {
    // Empty status on purpose: the spec is not a git change, and any of the
    // `modified`/`added`/… values would send the read down the `git diff HEAD` path in
    // config:readFile and badge the file in the drawer.
    // `spec` and not a bare marker: it opens commenting on the drawer's copy of the document
    // AND names the agent those comments are handed to. The comments themselves need
    // nothing — the key is `SPEC_FINGERPRINT` over the same two paths on both surfaces, so
    // the drawer reads back exactly what was written here.
    setSelectedFile({ repoPath, path: filePath, status: '', spec: { agentId } })
  }, [setSelectedFile, repoPath, filePath, agentId])

  const ticket = useTicketBadge({ ticketId, taskSelection, agentId })
  const statusPicker = useStatusPicker({ status, agentType: 'planner', onStatusChange })
  const { title } = useAgentIdentityFields(identity)

  return {
    repos: repoNames.map(name => ({ name, color: repoColors[name] })),
    // With no repository attached the spec's own file name stands in, so the row is never
    // left empty. The card decides WHEN to use it — it is the one that knows whether the
    // chips above drew anything.
    emptyLabel: filePath,
    // Only at `planned`: before that there is no ticket to reach.
    ticket: ticketId ? { ...ticket, className: 'gap-1' } : undefined,
    comments: commentCount > 0 ? (
      <ReviewCommentsButton
        variant="header"
        repoPath={repoPath}
        groups={groups}
        total={commentCount}
        /* The agent that OWNS this spec, whatever terminal is active. */
        targetTerminalId={agentId}
        onJump={handleJumpToComment}
        /* No `onSent`: the card sits beside the terminal the paste landed in rather than
           over it, so there is nothing to get out of the way. */
      />
    ) : undefined,
    status: statusPicker,
    expand: { title: t('agentInfo.spec.open'), onClick: handleExpand },
    title,
    scrollToTopLabel: t('agentInfo.spec.scrollToTop'),
    /* Pinned: a spec is read with `status: ''`, so it never gets diff annotation and raw
       markdown would cost the reader the formatting for nothing.

       `commentable="spec"`, and the string rather than `true` is the whole of it: the reader
       may quote a passage of the spec and leave a note on it, and those notes are keyed so
       that they survive the agent rewriting the document underneath them.
       `FileContentRenderer`'s own prop carries the argument, and `SPEC_FINGERPRINT` the key
       arithmetic behind it. Nothing else here changes — `refreshToken` already re-reads in
       place rather than remounting, which is what lets a marker settle back onto its passage
       instead of being unmounted with the subtree it was in. */
    children: (
      <FileContentRenderer
        repoPath={repoPath}
        filePath={filePath}
        status=""
        markdownMode="rendered"
        refreshToken={refreshToken}
        notFoundLabel={t('agentInfo.spec.drafting')}
        commentable="spec"
      />
    ),
  }
}
