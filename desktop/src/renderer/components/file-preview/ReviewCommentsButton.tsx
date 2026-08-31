import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Check, Copy, MessageSquare, SendHorizontal, Trash2 } from 'lucide-react'
import { useAnchoredPanel } from '../useAnchoredPanel'
import { BUTTON_ACTION, BUTTON_COMMENTS } from './ChangeNavigator'
import { bracketedPaste, resolveAgentTarget } from '../../utils/agentTerminals'
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
 * How long the failed-send notice stays before the button goes back to "Send".
 *
 * Longer than `COPIED_MS`, and not for symmetry: a confirmation is a courtesy the reader can
 * miss without cost, while this one carries the fact that their comments were NOT handed over
 * and are still in the list. Two seconds is enough to acknowledge a success and too short to
 * read a failure.
 */
const SEND_FAILED_MS = 6000

/**
 * The trigger in a card HEADER, at the scale the row it joins is set to.
 *
 * Not `BUTTON_COMMENTS` from next door and not a token from `theme/controls`: it stands beside
 * `StatusPill` and the expand control in the spec card's header, and those are `p-1.5` icon
 * buttons with a `w-3.5` glyph. The bar's pill is a footer control twice this size and would
 * read as a form button dropped into a title row.
 *
 * Spelled out here rather than appended to a token, which is this codebase's standing rule
 * about Tailwind: two utilities from the same group are decided by their order in the GENERATED
 * stylesheet, not in the string, so `${BTN_GHOST} p-1.5` would keep whichever was emitted last.
 * `BUTTON_ACTION`'s docblock in `ChangeNavigator` carries the argument in full.
 *
 * The COUNT is spelled out here as it is in the bar — "3 comments", not a bare "3". A digit beside
 * a speech bubble leaves what is being counted to the reader's guess, and that is no more true in
 * a header than in a footer; the tooltip cannot carry it either, since a tooltip is only read by
 * someone who already stopped to hover. What the header does change is the SCALE, which is what
 * the smaller type and the tighter padding below are for.
 *
 * The padding is therefore not uniform: `pl-1.5` sits under the glyph, `pr-2` gives the word its
 * own room on the text side. Spelled as two utilities rather than `p-1.5` plus an override, for
 * the Tailwind reason above.
 */
const HEADER_TRIGGER =
  'inline-flex items-center gap-1 py-1.5 pl-1.5 pr-2 rounded-md text-text-secondary ' +
  'hover:text-ink hover:bg-surface-strong transition-colors border-none cursor-pointer bg-transparent ' +
  'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-text-secondary'

/**
 * Send, from inside the popover's footer, beside Copy.
 *
 * A bespoke constant for the reason `BUTTON_ACTION` is one: this has to be accent-coloured, and
 * `BTN_GHOST` already sets `text-text-secondary` and a `hover:text-ink` — appending `text-accent`
 * to it would leave two utilities from the same Tailwind group deciding by stylesheet order. The
 * gabarit is deliberately `BTN_GHOST`'s, respelled, so the two footer buttons are the same
 * height and the pair reads as one row.
 */
const PANEL_SEND =
  'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ' +
  'text-accent hover:bg-surface-strong hover:text-accent-hover ' +
  'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-accent'

/**
 * A document's comments, all of them, from the control that counts them.
 *
 * The one place they can be read together — a comment is otherwise reachable only through
 * the pill on the line it was left on, which means scrolling forty files to find out what
 * you have written. And the one place they can be handed over: copied, or pasted into the
 * terminal the agent is running in.
 *
 * TWO PLACEMENTS, and the difference between them is not decoration. In the review it is the
 * footer BAR: two controls, the trigger that opens the list and — only with something to send
 * — the button that hands the review over, both in the bar's own bespoke constants from next
 * door (`BUTTON_COMMENTS`, `BUTTON_ACTION`) so they read as siblings of the two arrows rather
 * than as form buttons that wandered in. Otherwise it is a card HEADER — the agent sidebar's
 * spec card, and the preview drawer's title bar showing that same spec expanded — where
 * `StatusPill` and the expand control set the scale: there is room for one small control, so
 * Send goes back into the popover's footer beside Copy. `variant` is that choice, and it is
 * the only thing it decides; the two header call sites read the same document under the same
 * key, so they are one placement mounted twice rather than two.
 *
 * Either way the caller drops the result into one flex cell, which is why this returns a
 * fragment.
 *
 * The PANEL is a popover and is styled as the app's other popovers are (`LanguageSelect`,
 * `CommentCard`), because that is what it is; Copy inside it is a shared control token for
 * the same reason. In the bar, Copy stayed there and Send did not: one puts text on the
 * clipboard for the reader, the other writes into a running agent, and only the second is
 * worth reaching without opening a list first. In the header there is no second slot to reach
 * it from, so the pair is whole again.
 *
 * MEMOISED at the bottom of the file, which is what makes the identities the caller is
 * careful about worth being careful about — see `memo(ReviewCommentsButton)`.
 */
function ReviewCommentsButton({
  repoPath, groups, total, onJump, onSent, variant = 'bar', targetTerminalId,
}: {
  repoPath: string
  /**
   * The comments grouped by file, in the order the cards are stacked in — or the single group
   * of a live document, which is the same shape and is why this prop did not have to change.
   */
  groups: ReviewCommentGroup[]
  /** How many comments that is. Passed in rather than reduced here: the caller's guard reads it too. */
  total: number
  /** Take the reader to this comment in the document behind the panel. */
  onJump: (group: ReviewCommentGroup, comment: ReviewComment) => void
  /**
   * The text has gone to the agent.
   *
   * The drawer closes on it, and that is not a courtesy: the paste is sitting in a prompt
   * waiting for Enter, and the prompt is behind this drawer.
   *
   * OPTIONAL, because the sidebar has nothing to get out of the way: its panel sits beside the
   * terminal rather than over it, so the prompt the paste landed in is already on screen. A
   * required handler would have made every such caller pass a no-op and invite the next reader
   * to wonder what it was suppressing.
   */
  onSent?: () => void
  /**
   * Which of the two placements above this is. `'bar'` is the review's footer and the default,
   * so the caller that has always mounted this says nothing new.
   */
  variant?: 'bar' | 'header'
  /**
   * The terminal the paste goes to — named by the caller instead of taken from the selection.
   *
   * `undefined` means "whichever agent is selected", which is right for a REVIEW: it belongs to
   * no agent in particular, and the reader picks the one that should act on it. A SPEC does
   * belong to one — the panel is open for a named planning agent, and it is the only agent that
   * can act on the document — so that caller passes the id, and the send stops caring which
   * terminal happens to be active.
   *
   * A string rather than an object, so the memo below still bails out.
   */
  targetTerminalId?: string | null
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  /**
   * The last send did not reach a pty, and the comments were kept.
   *
   * A state rather than a silent retry, because the reader has to know two things: that the
   * hand-off failed, and — more importantly — that their notes are still here. The button is
   * the place they are looking, exactly as with `copied` next door.
   */
  const [sendFailed, setSendFailed] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const { triggerRef, panelRef, style } = useAnchoredPanel(open, close, PANEL_WIDTH)

  const removeFileComment = useStore(s => s.removeFileComment)
  const clearFileComments = useStore(s => s.clearFileComments)
  /**
   * The terminal the paste would go to, `null` when there is none — and the subscription is
   * narrowed to that ONE id, so selecting a script terminal does not re-render the control for
   * an answer that was already `null`.
   *
   * `resolveAgentTarget` is the whole rule and carries its own reasoning: which of the two
   * sources is consulted, why a named target is also checked against the list, and why a truthy
   * id is not enough. It is read here for the disabled state and again in `handleSend` for the
   * guard, which is the point of it being one function.
   *
   * A STRING or null, so the selector's result has a stable identity — returning the terminal
   * object would re-render this on every unrelated store write.
   */
  const sendTarget = useStore(s => resolveAgentTarget(targetTerminalId, s.activeTerminalId, s.terminals))
  const canSendToAgent = sendTarget !== null

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
  const failedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (copiedTimer.current) clearTimeout(copiedTimer.current)
    if (failedTimer.current) clearTimeout(failedTimer.current)
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

  const handleSend = async () => {
    // Re-read from the store rather than trusted from the render, and guarded as well as
    // disabled: the button can only be pressed while an agent is selected, but the selection —
    // or the agent this document belongs to — can change between the render that enabled it and
    // the click that fires it, and the wrong target here is a shell executing a review.
    //
    // The SAME call as the one behind the disabled state, deliberately: the state and its guard
    // must not be able to disagree about what "sendable" means.
    const state = useStore.getState()
    const id = resolveAgentTarget(targetTerminalId, state.activeTerminalId, state.terminals)
    if (!id) return

    // AWAITED, and the answer is acted on. `terminal:write` reports whether the bytes reached
    // a pty, and that is the only thing here that can tell a live session from a dead one: an
    // exited terminal is not removed from the store, it has its `state` set to
    // `completed`/`error` — the same two values Claude Code's hooks use for an agent that
    // finished its turn and is sitting at a prompt. So `resolveAgentTarget` cannot rule it out,
    // and clearing on an unverified write is how the reader's notes disappear into a process
    // that is no longer running.
    const delivered = await window.electronAPI.terminal.write(
      id,
      bracketedPaste(formatReviewComments(groups)),
    )

    if (!delivered) {
      // NOTHING is cleared and the list stays open, which is the whole point: Copy is right
      // there in the footer, and the comments are still in it. The notice is on the control
      // that was pressed, on `copied`'s model.
      setSendFailed(true)
      if (failedTimer.current) clearTimeout(failedTimer.current)
      failedTimer.current = setTimeout(() => setSendFailed(false), SEND_FAILED_MS)
      return
    }

    // The review has been handed over, so it stops being a draft here. Only what was
    // actually written out is cleared — the targets are read off `groups`, the same list
    // that produced the text — so comments on another review are untouched.
    //
    // After the write, never before: `formatReviewComments` reads `groups`, and clearing
    // first would hand the agent an empty review. Nothing is recoverable once this runs,
    // which is why Copy exists beside it and does not clear.
    clearFileComments(groups.flatMap(group => group.comments.map(comment => ({
      repoPath,
      path: group.path,
      fingerprint: comment.fingerprint,
    }))))
    setOpen(false)
    onSent?.()
  }

  const handleJump = (group: ReviewCommentGroup, comment: ReviewComment) => {
    setOpen(false)
    onJump(group, comment)
  }

  const header = variant === 'header'
  /* What the list is OF, and it is not the same sentence in the two placements: the bar's list
     is a review's, the header's is one document's. Naming the review would be wrong at either
     header call site — a spec is not a review, in the sidebar or expanded in the drawer — and
     naming neither would leave a speech bubble with a number beside it. */
  const label = t(header ? 'filePreview.documentComments' : 'filePreview.reviewComments')
  /* Two ways to be unable to send, and they are not the same sentence: the bar's target is the
     selection, so "no agent is running" is the truth there; the header's target is one named
     agent, so the reason is that THAT agent is gone — with another one selected the bar's
     wording would be a plain falsehood. */
  const sendLabel = t(
    sendFailed
      ? 'filePreview.sendFailedHint'
      : canSendToAgent
        ? 'filePreview.sendToAgent'
        : header ? 'filePreview.sendAgentGone' : 'filePreview.sendNoAgent',
  )
  /* The button's own text, which is not its tooltip: a control has room for two words and the
     tooltip has room for the sentence that matters — that the comments were kept. Same split
     as the disabled states above. */
  const sendText = t(sendFailed ? 'filePreview.sendFailed' : 'filePreview.sendToAgent')

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
           hidden, which is the rule the two arrows already follow at the ends of the list.

           The header placement never reaches this state: its caller mounts the control from the
           first comment, because a header row has no other job to keep it there. The guard
           stays regardless — it is what the effect above pairs with. */
        disabled={total === 0}
        aria-expanded={open}
        aria-label={label}
        title={label}
        className={header ? HEADER_TRIGGER : BUTTON_COMMENTS}
      >
        {/* 14 is `w-3.5`, the glyph size of the controls this joins in a header row; 18 is the
            footer bar's. Through `size` in both, which is this file's own idiom. */}
        <MessageSquare size={header ? 14 : 18} />
        {/* The word rides next to the icon in BOTH placements, the same rule the two arrows
            follow: a bare digit beside a speech bubble leaves what is being counted to the
            reader's guess. Only the type scale differs — a header row is set smaller than a
            footer bar — and the sentence is the same one either way.

            `tabular-nums` in both, like the counter in the walk group, so neither row twitches
            as the count passes 9 → 10 — it still matters with the number inside a label, since
            the digits are what change width. */}
        <span className={header ? 'text-[11px] font-medium tabular-nums' : 'tabular-nums'}>
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
          half: that state is worth naming, and the tooltip is what names it.

          THE BAR ONLY. A header row has no second slot to put this in, so there Send is back in
          the popover's footer beside Copy — see the footer below. */}
      {!header && total > 0 && (
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSendToAgent}
          aria-label={sendLabel}
          title={sendLabel}
          className={BUTTON_ACTION}
        >
          {sendFailed ? <AlertTriangle size={18} /> : <SendHorizontal size={18} />}
          {sendText}
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
            {/* SEND, back in the footer — but only where the bar's second slot does not exist.
                A header row holds one control, so this is the only place it can be reached from,
                and it sits beside Copy the way it originally did.

                DISABLED rather than hidden when the target is not reachable, which is the half
                that matters here: the agent that owns this document can be closed while the list
                is open, and the reader needs to be told that the send is gone rather than left
                looking for a button that quietly vanished. Copy beside it is then the way out,
                and the tooltip says so. */}
            {header && (
              <button
                type="button"
                onClick={handleSend}
                disabled={!canSendToAgent}
                aria-label={sendLabel}
                title={sendLabel}
                className={`${PANEL_SEND} flex-1 justify-center`}
              >
                {sendFailed
                  ? <AlertTriangle className="w-3.5 h-3.5" />
                  : <SendHorizontal className="w-3.5 h-3.5" />}
                {sendText}
              </button>
            )}
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
 * `total` is derived from it, `repoPath` is a string, both callbacks are `useCallback` with no
 * per-frame dependency, and the two props added for the header placement are a string literal
 * and a terminal id. That is the constraint on anything added here — a scalar, or a stable
 * callback — and it is why the send target is an ID rather than the terminal it names.
 */
export default memo(ReviewCommentsButton)
