import { useCallback, useMemo, useRef, useState } from 'react'
import { Maximize2 } from 'lucide-react'
import { NO_COMMENTS, useStore } from '../../store'
import FileContentRenderer from '../file-preview/FileContentRenderer'
import ReviewCommentsButton from '../file-preview/ReviewCommentsButton'
import { commentFileKey, SPEC_FINGERPRINT, type CommentTarget } from '../../utils/commentAnchors'
import {
  collectDocumentComments, type ReviewComment, type ReviewCommentGroup,
} from '../../utils/reviewComments'
import { StatusPill } from './StatusPill'
import { TicketMark } from './TicketMark'
import { AgentTitleField, type AgentIdentity } from './AgentIdentityFields'
import { hasScrolledFromTop } from './utils'
import { useT } from '../../i18n'

interface SpecPanelProps {
  /**
   * The terminal of the agent this spec belongs to — the send target for its comments.
   *
   * NOT `activeTerminalId`, and that is the one thing this prop exists to say. A review belongs
   * to no agent in particular, so `ReviewCommentsButton` writes it to whichever is selected; a
   * spec belongs to exactly one — this panel is open FOR a named planning agent, and it is the
   * only agent that can act on the document — so the target travels with the panel rather than
   * with the selection. Handing the comments to whatever the reader happened to click last is
   * the failure this replaces.
   *
   * It travels one step further than the panel now: `handleExpand` puts it on `selectedFile`,
   * because the expanded preview shows the same document with the same comments and hands them
   * to the same agent. Nothing about "which agent owns this spec" is recoverable from the file
   * path, so it has to be carried rather than looked up on the other side.
   */
  agentId: string
  /**
   * The title, plus its editing state. In `replace` mode this panel is the ONLY card
   * on screen, so it carries the agent's identity that TicketHeader would otherwise
   * hold — read AND editable, so replacing the ticket card takes no capability away.
   * The description is not rendered here: the spec itself is the planning agent's
   * long-form text.
   */
  identity: AgentIdentity
  /**
   * Names of the repositories attached to the agent. They are this card's heading:
   * the repository CARDS are gone for a planning agent — it has no branch, no diff
   * and no PR for them to show — but which repository is being planned against still
   * matters, and it is the one thing those cards said that is worth keeping.
   */
  repoNames: string[]
  status: string
  /** Present once `/magic:plan` has created the ticket, i.e. at `planned`. */
  ticketId?: string
  ticketLink: string | null
  ticketProvider: 'github' | 'jira' | null
  /** Directory of the spec, as `splitSpecPath` returns it. */
  repoPath: string
  /** Bare file name of the spec, as `splitSpecPath` returns it. */
  filePath: string
  /** From `usePlanSpec`; every bump re-reads the file in place. */
  refreshToken: number
  onStatusChange?: (status: string) => void
}

/**
 * The `/magic:plan` spec, live, in the info sidebar.
 *
 * Reads the LOCAL file at the agent's `metadata.specPath` through `config:readFile`
 * — never a cloud row — so it works with sync off and with no network. The signal
 * to re-read is the `plan:specChanged` IPC ping (see `usePlanSpec`); nothing here
 * watches the filesystem.
 *
 * It is a panel in the sidebar and NOT a modal on purpose: the terminal beside it
 * stays fully usable while the spec is being written, which a backdrop would take
 * away. The expand control hands the same file to the existing FilePreviewPanel
 * drawer for the moments a wider read is wanted.
 *
 * Give it `key={specPath}` so a new file starts fresh: expanded, and at the top of
 * the NEW spec rather than wherever the previous one had been left.
 */
export function SpecPanel({
  agentId,
  identity,
  repoNames,
  status,
  ticketId,
  ticketLink,
  ticketProvider,
  repoPath,
  filePath,
  refreshToken,
  onStatusChange,
}: SpecPanelProps) {
  const t = useT()
  const setSelectedFile = useStore(s => s.setSelectedFile)
  const focusFileComment = useStore(s => s.focusFileComment)

  /**
   * How this document's comments are named in the store — the same key the layer below writes
   * them under, built the same way.
   *
   * `SPEC_FINGERPRINT` and not a content hash, which is the whole reason a comment survives the
   * agent rewriting the spec: one name for every version of the file. `SPEC_FINGERPRINT`'s own
   * docblock carries that argument, and the proof that this key space cannot collide with a
   * review's.
   *
   * Rebuilt on a render rather than memoised: it is two string joins, and the memo cell that
   * guarded them would cost more than they do. What IS memoised is the group list below, which
   * walks the entries.
   */
  const target: CommentTarget = { repoPath, path: filePath, fingerprint: SPEC_FINGERPRINT }
  const commentKey = commentFileKey(target)
  // `NO_COMMENTS` rather than `?? []`, for the reason it exists: zustand compares a selector's
  // result by identity, and a fresh array per call re-renders this panel on every unrelated
  // store mutation — with a spec being re-read every few seconds, that is not theoretical.
  const comments = useStore(s => s.fileComments[commentKey] ?? NO_COMMENTS)

  /**
   * The comments as the popover's own shape, and how many that is.
   *
   * ONE computation with the count derived from its result, on `FilePreviewPanel`'s precedent
   * and for its reason: the count is what puts the control on screen and the groups are what it
   * draws, so a count from one source and a list from another is the state where the header says
   * "3" over an empty list.
   */
  const groups = useMemo(
    // A ONE-ENTRY map rather than the store's, and the key is deliberately spelled twice — once
    // for the selector above, once by the collector. The selector has to be narrow: subscribing
    // to `fileComments` itself would re-render this panel whenever anyone comments on any file
    // of any review. And the collector has to take a map, because reading exactly one key out of
    // one is the property its suite asserts — a review's key on this very path must not leak
    // into a spec's list. Two string joins is what that costs.
    () => collectDocumentComments({ [commentKey]: comments }, target),
    // `target` is rebuilt on every render, so the two values it is made of stand in for it:
    // `commentKey` is a pure function of `repoPath` and `filePath`, so naming those as well
    // would be the same dependency twice.
    [commentKey, comments],
  )
  // Off the memo rather than off `comments`, so the number that puts the control on screen and
  // the list it opens cannot disagree. `groups[0]` and not a reduce: this collector returns one
  // group or none, and spelling that out is worth more here than a loop that reads as if it
  // might one day walk several.
  const commentCount = groups[0]?.comments.length ?? 0

  /**
   * Take the reader from the list to the passage.
   *
   * A call into the store and nothing else — no scrolling here. `MarkdownCommentLayer` already
   * selects `focusedComment` by this document's own key and scrolls the pill it drew into view,
   * which is the mechanism the review's list uses too. Nothing has to be unfolded first either:
   * a review's card can be collapsed, this document is the panel.
   *
   * The group is ignored — this list has exactly one, for the only path this panel reads — but
   * the signature is the popover's, and narrowing it here would fork the component.
   */
  const handleJumpToComment = useCallback((_group: ReviewCommentGroup, comment: ReviewComment) => {
    focusFileComment({ repoPath, path: filePath, fingerprint: comment.fingerprint }, comment.id)
  }, [focusFileComment, repoPath, filePath])

  const bodyRef = useRef<HTMLDivElement>(null)
  // The panel does not collapse. It is the only card a planning agent has, and the
  // spec being on screen without a click is the whole point — a fold would put the
  // one thing worth reading one interaction away.
  //
  // It opens at the TOP and stays where the reader puts it: a spec is a document to
  // be read from its first line, not a log to be tailed, so nothing here chases the
  // end of the file. A scroll container starts at 0 and keeps its offset as content
  // is appended below, which is exactly the wanted behaviour — hence no effect.
  const [showScrollToTop, setShowScrollToTop] = useState(false)

  const scrollToTop = useCallback(() => {
    const body = bodyRef.current
    if (!body) return
    body.scrollTop = 0
  }, [])

  // The control only earns its place once the top is actually off screen.
  const handleScroll = useCallback(() => {
    const body = bodyRef.current
    if (!body) return
    setShowScrollToTop(hasScrolledFromTop({ scrollTop: body.scrollTop }))
  }, [])

  // The card's heading. With no repository attached the spec's own file name stands
  // in, so the row is never left empty.
  const heading = repoNames.length > 0 ? repoNames.join(', ') : filePath

  const handleExpand = useCallback(() => {
    // Empty status on purpose: the spec is not a git change, and any of the
    // `modified`/`added`/… values would send the read down the `git diff HEAD`
    // path in config:readFile and badge the file in the drawer.
    // `spec` and not a bare marker: it opens commenting on the drawer's copy of the document
    // AND names the agent those comments are handed to. The comments themselves need nothing —
    // the key is `SPEC_FINGERPRINT` over the same two paths on both surfaces, so the drawer
    // reads back exactly what was written here.
    setSelectedFile({ repoPath, path: filePath, status: '', spec: { agentId } })
  }, [setSelectedFile, repoPath, filePath, agentId])

  return (
    // No `overflow-hidden` on the card: StatusPill's picker is an absolutely
    // positioned dropdown and would be clipped by it. The body rounds its own
    // bottom corners instead.
    <div className="bg-surface rounded-xl flex flex-col flex-1 min-h-0">
      {/* Same padding and rhythm as TicketHeader — p-4, mb-3 under the top row, mt-3
          between the fields — so the spec card and the ticket card read as one family
          rather than two. */}
      <div className="p-4 flex-shrink-0">
        <div className="flex items-center justify-between gap-2 mb-3">
          {/* The repository, at the weight RepositoryCard gives it. The repository
              cards are gone for a planning agent, so the spec card takes over their
              header: what is being planned against, said once and said plainly. It
              replaces a label that only ever named the card the panel already is. */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="text-ink/90 font-medium text-sm truncate" title={heading}>
              {heading}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* The ticket appears here at `planned`. TicketHeader never comes back for
                a planning agent, so without this the ticket `/magic:plan` just created
                would be unreachable from the sidebar. */}
            {ticketId && (
              ticketLink ? (
                <button
                  onClick={() => window.electronAPI.shell.openExternal(ticketLink)}
                  className="group flex items-center gap-1 text-ink text-xs font-semibold cursor-pointer bg-transparent border-none p-0"
                >
                  <TicketMark provider={ticketProvider} />
                  <span className="group-hover:underline">{ticketId}</span>
                </button>
              ) : (
                <span className="flex items-center gap-1 text-ink text-xs font-semibold">
                  <TicketMark provider={ticketProvider} />
                  {ticketId}
                </span>
              )
            )}
            {/* The comments on the spec, from the first one — and only from the first one. A
                header row has no other job that would keep it there at zero, unlike the review's
                footer bar which stays for the changes; an empty control in a title row is a
                permanently dead affordance.

                Before the status and the expand control rather than after: it belongs to the
                document, and those two describe the agent and the frame around it. `gap-1.5` on
                the row is what spaces it, so it needs no margin of its own. */}
            {commentCount > 0 && (
              <ReviewCommentsButton
                variant="header"
                repoPath={repoPath}
                groups={groups}
                total={commentCount}
                /* The agent that OWNS this spec, whatever terminal is active. */
                targetTerminalId={agentId}
                onJump={handleJumpToComment}
                /* No `onSent`: the panel sits beside the terminal the paste landed in rather
                   than over it, so there is nothing to get out of the way. */
              />
            )}
            {/* TicketHeader is not on screen for a planning agent, and it is the only
                other place that renders the status — without this the panel would
                REMOVE the marker that tells a planning agent from an implementation
                one. */}
            <StatusPill status={status} agentType="planner" onStatusChange={onStatusChange} />
            <button
              onClick={handleExpand}
              title={t('agentInfo.spec.open')}
              aria-label={t('agentInfo.spec.open')}
              className="-mr-1.5 p-1.5 rounded-md text-text-secondary hover:text-ink hover:bg-surface-strong transition-colors border-none cursor-pointer bg-transparent"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* The agent's title, carried here because the spec card replaces the
            ticket card that normally holds it. The description is deliberately
            absent: `/magic:plan` never fills it, and the spec below says everything
            it would have said. */}
        <AgentTitleField identity={identity} />
      </div>

      <div className="relative flex flex-col flex-1 min-h-0">
          <div
            ref={bodyRef}
            onScroll={handleScroll}
            className="overflow-y-auto rounded-b-xl border-t border-line flex-1 min-h-0"
          >
            {/* Pinned: a spec is read with `status: ''`, so it never gets diff
                annotation and raw markdown would cost the reader the formatting for
                nothing.

                `commentable="spec"`, and the string rather than `true` is the whole of it:
                the reader may quote a passage of the spec and leave a note on it, and those
                notes are keyed so that they survive the agent rewriting the document
                underneath them. `FileContentRenderer`'s own prop carries the argument, and
                `SPEC_FINGERPRINT` the key arithmetic behind it. Nothing else here changes —
                `refreshToken` already re-reads in place rather than remounting, which is what
                lets a marker settle back onto its passage instead of being unmounted with the
                subtree it was in. */}
            <FileContentRenderer
              repoPath={repoPath}
              filePath={filePath}
              status=""
              markdownMode="rendered"
              refreshToken={refreshToken}
              notFoundLabel={t('agentInfo.spec.drafting')}
              commentable="spec"
            />
          </div>
          {showScrollToTop && (
            <button
              onClick={scrollToTop}
              className="absolute bottom-3 right-3 z-10 bg-ink/15 hover:bg-ink/25 text-ink/70 px-3 py-1 rounded-full text-[10px] transition-all duration-200 border-none cursor-pointer"
            >
              {t('agentInfo.spec.scrollToTop')}
            </button>
        )}
      </div>
    </div>
  )
}
