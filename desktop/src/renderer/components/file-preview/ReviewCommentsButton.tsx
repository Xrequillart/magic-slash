import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Copy, MessageSquare, SendHorizontal, Trash2 } from 'lucide-react'
import { useAnchoredPanel } from '../useAnchoredPanel'
import { BUTTON_ACTION, BUTTON_COMMENTS } from './ChangeNavigator'
import { isAgentTerminal } from '../../utils/agentTerminals'
import { commentLabel } from '../../utils/commentAnchors'
import {
  formatReviewComments, type ReviewComment, type ReviewCommentGroup,
} from '../../utils/reviewComments'
import { BTN_GHOST } from '../../theme/controls'
import { useStore } from '../../store'
import { useT } from '../../i18n'

/**
 * Wide enough for a path and a sentence about it, and no wider.
 *
 * A number rather than a Tailwind width, because `useAnchoredPanel` needs it: the panel is
 * `fixed` and clamped inside the window by hand, so a width only CSS knew about could not
 * be subtracted from `window.innerWidth`.
 */
const PANEL_WIDTH = 380

/**
 * How long the copied state shows before it goes back to "Copy".
 *
 * The same two seconds as the Skills document's copy button, which is the pattern this
 * follows — one confirmation, in the control that was pressed, where the reader is already
 * looking.
 */
const COPIED_MS = 2000

/**
 * A paste, as a terminal reads one.
 *
 * The markers are what tell the program on the other end that what arrives between them was
 * PASTED rather than typed, which is how it knows not to interpret a newline in the middle
 * of it as a submission. The text is written straight to the pty, so this only means "paste"
 * to a program that has turned bracketed paste on (mode 2004) — every TUI that takes
 * multi-line input does, including the agent this app drives.
 *
 * There is deliberately no `\r` and no trailing newline anywhere near this: the text lands
 * in the prompt and the reader presses Enter themselves, having seen what they are about to
 * send. `pages/Skills` writes a trailing `\r` on purpose for a one-line command; a review's
 * worth of comments is not that.
 */
const PASTE_START = '\x1b[200~'
const PASTE_END = '\x1b[201~'

/**
 * The review's comments, all of them, from the bar.
 *
 * The one place they can be read together — a comment is otherwise reachable only through
 * the pill on the line it was left on, which means scrolling forty files to find out what
 * you have written. And the one place they can be handed over: copied, or pasted into the
 * terminal the agent is running in.
 *
 * Renders TWO controls into the bar, not one: the trigger that opens the list, and — only
 * with something to send — the button that hands the review to the agent. Both are the bar's
 * own bespoke constants from next door (`BUTTON_COMMENTS`, `BUTTON_ACTION`), so they read as
 * siblings of the two arrows rather than as form buttons that wandered in. The caller drops
 * them into one flex cell, which is why this returns a fragment.
 *
 * The PANEL is a popover and is styled as the app's other popovers are (`LanguageSelect`,
 * `CommentCard`), because that is what it is; Copy inside it is a shared control token for
 * the same reason. Copy stayed there and Send did not: one puts text on the clipboard for
 * the reader, the other writes into a running agent, and only the second is worth reaching
 * without opening a list first.
 *
 * MEMOISED at the bottom of the file, which is what makes the identities the caller is
 * careful about worth being careful about — see `memo(ReviewCommentsButton)`.
 */
function ReviewCommentsButton({
  repoPath, groups, total, onJump, onSent,
}: {
  repoPath: string
  /** The review's comments grouped by file, in the order the cards are stacked in. */
  groups: ReviewCommentGroup[]
  /** How many comments that is. Passed in rather than reduced here: the caller's guard reads it too. */
  total: number
  /** Take the reader to this comment in the review behind the panel. */
  onJump: (group: ReviewCommentGroup, comment: ReviewComment) => void
  /**
   * The text has gone to the agent.
   *
   * The drawer closes on it, and that is not a courtesy: the paste is sitting in a prompt
   * waiting for Enter, and the prompt is behind this drawer.
   */
  onSent: () => void
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const { triggerRef, panelRef, style } = useAnchoredPanel(open, close, PANEL_WIDTH)

  const removeFileComment = useStore(s => s.removeFileComment)
  // The terminal the paste would go to — and the subscription is narrowed to the ONE
  // question this component asks of it, so selecting a script terminal does not re-render
  // the bar for a value that was already `false`.
  //
  // A truthy id is not enough: the store's terminal list also holds the sidebar's own
  // terminal and the script runner's, and `activeTerminalId` names either of them whenever
  // the user has one selected. Writing a review into a script terminal does not land in a
  // prompt that ignores it — a plain shell reads every line of a multi-line paste as a
  // command. `isAgentTerminal` is where the two reserved prefixes live.
  const canSendToAgent = useStore(s => isAgentTerminal(s.activeTerminalId))

  // Deleting the last comment empties this list under the reader. The trigger disables itself
  // at zero, but the panel is PORTALLED — it is not the trigger's child, so nothing about a
  // disabled button takes it off the screen. Left open it is not merely empty: Copy would
  // confirm having put an empty string on the clipboard, and Send would paste an empty
  // bracketed paste into the agent's prompt. This is the only place that can see it, because
  // the bar itself legitimately survives at zero comments — it stays for the changes.
  useEffect(() => {
    if (total === 0) setOpen(false)
  }, [total])

  // The copy confirmation's own timer, held so it can be cancelled.
  //
  // Not a formality here: this component unmounts on its own within those two seconds in the
  // ordinary course of using it — the effect above closes the panel at zero comments, Send
  // closes the drawer, and deleting the last comment unmounts the bar entirely. Without the
  // cleanup that leaves a `setCopied` scheduled against a component that is gone.
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (copiedTimer.current) clearTimeout(copiedTimer.current)
  }, [])

  const handleCopy = () => {
    // Confirmed only once the write has resolved. The swap to `Check` asserts the text IS on
    // the clipboard; a rejected write — no document focus, permission refused — must not make
    // that claim. Failure leaves the button reading "Copy", which is the truth.
    navigator.clipboard.writeText(formatReviewComments(groups)).then(() => {
      setCopied(true)
      // Restarted, not stacked: a second press inside the window would otherwise let the
      // first timer clear the confirmation early while the second one was still pending.
      if (copiedTimer.current) clearTimeout(copiedTimer.current)
      copiedTimer.current = setTimeout(() => setCopied(false), COPIED_MS)
    }, () => {})
  }

  const handleSend = () => {
    // Re-read from the store rather than trusted from the render, and guarded as well as
    // disabled: the button can only be pressed while an agent is selected, but the selection
    // can change between the render that enabled it and the click that fires it, and the
    // wrong target here is a shell executing a review.
    const id = useStore.getState().activeTerminalId
    if (!isAgentTerminal(id) || !id) return
    window.electronAPI.terminal.write(
      id,
      `${PASTE_START}${formatReviewComments(groups)}${PASTE_END}`,
    )
    setOpen(false)
    onSent()
  }

  const handleJump = (group: ReviewCommentGroup, comment: ReviewComment) => {
    setOpen(false)
    onJump(group, comment)
  }

  const label = t('filePreview.reviewComments')

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        /* Stamped on the TRIGGER as well as on the panel, and the panel alone would not do:
           the focus stays on this button while the list is open — nothing in the panel takes
           it — so the drawer's own document listeners see this element as the target of every
           Escape and every ⟨/⟩. `closest('[data-comment-list]')` on the panel would never
           match, and Escape would close the whole review instead of the list. */
        data-comment-list={open ? '' : undefined}
        onClick={() => setOpen(o => !o)}
        /* Nothing to open at zero. The bar itself can still be here — it stays for the
           folded cards or for the blocks to walk — so the control is disabled rather than
           hidden, which is the rule the two arrows already follow at the ends of the list. */
        disabled={total === 0}
        aria-expanded={open}
        aria-label={label}
        title={label}
        className={BUTTON_COMMENTS}
      >
        <MessageSquare size={18} />
        {/* The word rides next to the icon, the same rule the two arrows follow: a bare
            digit beside a speech bubble leaves what is being counted to the reader's guess.

            `tabular-nums` like the counter in the walk group, so the bar does not twitch
            as the count passes 9 → 10 — it still matters with the number inside the label,
            since the digits are what change width. */}
        <span className="tabular-nums">
          {total === 0
            ? t('filePreview.commentCount.none')
            : total === 1
              ? t('filePreview.commentCount.one')
              : t('filePreview.commentCount.other', { count: total })}
        </span>
      </button>

      {/* SEND, beside the trigger rather than inside the list it used to sit in. Two reasons
          it moved: handing a review over is the point of the feature and was a click and a
          scroll deep, and the list is where a reader EDITS comments — a terminal write does
          not belong at the bottom of it.

          Rendered only with something to send. It is not disabled-at-zero like the trigger
          beside it, because the trigger has a job at zero — it says "No comments" — and this
          has none: a permanently dead accent button teaches nothing, where its absence is
          already the whole message. Copy stays in the list, which is why the two are no
          longer side by side.

          Still DISABLED rather than hidden when no agent is running, which is the other
          half: that state is worth naming, and the tooltip is what names it. */}
      {total > 0 && (
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSendToAgent}
          aria-label={t(canSendToAgent ? 'filePreview.sendToAgent' : 'filePreview.sendNoAgent')}
          title={t(canSendToAgent ? 'filePreview.sendToAgent' : 'filePreview.sendNoAgent')}
          className={BUTTON_ACTION}
        >
          <SendHorizontal size={18} />
          {t('filePreview.sendToAgent')}
        </button>
      )}

      {open && createPortal(
        <div
          ref={panelRef}
          style={style()}
          data-comment-list
          /* `z-[70]`: above the drawer (`z-[60]`) and its backdrop (`z-[59]`), which is the
             same layer `CommentCard` floats on — this is portalled to `<body>` and is a
             descendant of neither. */
          className="z-[70] bg-bg-secondary border border-line rounded-xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* The list scrolls, which is why `useAnchoredPanel` had to learn to ignore a
              scroll of its own panel: its close-on-scroll listener is capture-phase, so
              before that fix the first wheel event in here dismissed the list.

              `overscroll-contain` is the other half of that, and the hook cannot supply it:
              a wheel at either end of this list would otherwise CHAIN into the drawer
              behind it, which is a scroll the hook rightly sees as outside the panel — so
              reaching the bottom of the list would dismiss it. Same pairing, and same
              comment, as the webapp twin this hook is kept in step with. */}
          <div className="max-h-[min(60vh,26rem)] overflow-y-auto overscroll-contain p-1">
            {groups.map(group => (
              <div key={group.path}>
                {/* The whole path, not the file name: two files called `index.ts` in one
                    review is the ordinary case. Sticky, so the heading of the file being
                    read stays visible while its comments scroll under it. */}
                <div
                  className="sticky top-0 z-10 px-2 py-1.5 bg-bg-secondary text-[11px] font-medium text-text-secondary truncate"
                  title={group.path}
                >
                  {group.path}
                </div>
                {group.comments.map(comment => {
                  // The same call `CommentCard` makes, so the list and the card name an
                  // anchor the same way — a range by its lines (a singular and a plural KEY
                  // rather than a plural rule), a quoted passage as a quotation, and a
                  // comment on neither as the whole file. This is why the discriminant is
                  // one function: line-anchored and quote-anchored comments sit side by side
                  // in this list, and only `commentAnchorKind` decides which a row is.
                  const label = commentLabel(comment)
                  return (
                    <div key={comment.id} className="flex items-start rounded-lg hover:bg-surface">
                      <button
                        type="button"
                        onClick={() => handleJump(group, comment)}
                        className="flex-1 min-w-0 flex flex-col gap-0.5 px-2 py-1.5 text-left cursor-pointer bg-transparent border-none"
                      >
                        <span className="text-[11px] font-mono text-text-secondary">
                          {t(label.key, label.vars)}
                        </span>
                        {/* The quote, on one line. It is context for the reader scanning
                            the list; the card they land on shows the whole of it. Absent
                            for a comment made by picking line numbers, which selected no
                            text at all — and, on a quote-anchored row, it is not context at
                            all but the anchor itself, which is why the label above says
                            "Quoted passage" rather than naming a position. */}
                        {comment.quote.trim() !== '' && (
                          <span className="text-[11px] font-mono text-text-secondary/70 truncate w-full border-l-2 border-line pl-1.5">
                            {comment.quote}
                          </span>
                        )}
                        <span className="text-xs text-ink line-clamp-3 break-words">{comment.body}</span>
                      </button>
                      {/* Deleting the LAST comment of a review with nothing to walk and no
                          card folded takes the bar away with it, this panel included. That
                          is correct — the bar is present when there are changes or comments
                          and absent when there is neither — and needs no handling here: the
                          panel is portalled from a component that has unmounted. */}
                      <button
                        type="button"
                        onClick={() => removeFileComment(
                          { repoPath, path: group.path, fingerprint: comment.fingerprint },
                          comment.id,
                        )}
                        aria-label={t('filePreview.commentDelete')}
                        title={t('filePreview.commentDelete')}
                        className="shrink-0 p-1.5 m-0.5 rounded-lg text-text-secondary hover:text-red hover:bg-red/10 transition-colors cursor-pointer bg-transparent border-none"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-1.5 p-1.5 border-t border-line">
            {/* ONE confirmation, and it is this icon swapping for two seconds — the pattern
                the Skills document's copy button established, and the reader is looking at
                this button because they just pressed it. A toast on top of it would be the
                same fact said twice, from the other side of the window. */}
            <button type="button" onClick={handleCopy} className={`${BTN_GHOST} flex-1 justify-center`}>
              {copied ? <Check className="w-3.5 h-3.5 text-green" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? t('common.copied') : t('common.copy')}
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}

/**
 * The same `memo` the review's cards are wrapped in, for the same reason and against the
 * same parent: `FilePreviewPanel` re-renders on every scroll frame, and without this the
 * trigger, its icon and the two zustand subscriptions behind it are re-rendered sixty
 * times a second — and while the list is OPEN, so is the whole portalled panel, every
 * heading and every row of it, on any unrelated render of the panel behind it.
 *
 * Every prop is already stable by construction, which is what makes the compare a real
 * bail-out rather than a tax: `groups` is memoised and falls back to a shared empty array,
 * `total` is derived from it, `repoPath` is a string, and both callbacks are `useCallback`
 * with no per-frame dependency.
 */
export default memo(ReviewCommentsButton)
