import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useT } from '../../i18n'

interface Props {
  /** 1-indexed, because this number is read by a human, not used as an index. */
  current: number
  total: number
  /**
   * How many of the review's cards are folded shut over changed lines.
   *
   * `total` counts the blocks currently MOUNTED, so folding a card takes its changes out of
   * that number — and a reader who has folded every card away, standing back to look at the
   * whole review, is the one who most wants this bar. This is what tells that state from the
   * other way `total` reaches zero: a repository that genuinely has nothing to walk.
   *
   * Read as a flag, not as a quantity: any card folded keeps the bar, and how many blocks it
   * hides is neither known nor needed — nothing can know that until its rows are mounted. It
   * stays a count rather than a boolean only because the caller has the number anyway and a
   * count says what it measured; the guard below tests it against zero.
   *
   * No longer the bar's only reason to stay on screen with nothing to walk: `commentCount`
   * below is a second one. The two are independent — a review can be folded shut with no
   * comments on it, or scrolled open with comments and a single change — so the guard tests
   * both rather than one standing in for the other.
   *
   * Zero for a single-file preview, which has no cards to fold, so that caller keeps exactly
   * the behaviour it has always had.
   */
  foldedFiles: number
  /**
   * How many comments the review holds, across every file of it.
   *
   * Here for THE GUARD, and for nothing else: comments are a reason for the bar to exist
   * even over a review with nothing to navigate, since they are the only way back into them.
   * What the right-hand group actually DRAWS arrives as `trailing` — this bar stays
   * presentational and reads no store of its own.
   *
   * Two props rather than two things to keep in step, because both are derived from one
   * computation at the single call site. See the `commentGroups` memo there.
   */
  commentCount: number
  /**
   * Whatever fills the right-hand end — today the review's comments button.
   *
   * A slot rather than the button itself, so this file keeps knowing only about layout: the
   * button reads the store, holds a portalled panel and writes to a terminal, none of which
   * belongs in a bar whose whole job is to hold two groups apart. Absent in the single-file
   * preview, whose caller has no review and therefore no comments.
   */
  trailing?: ReactNode
  onPrevious: () => void
  onNext: () => void
}

/**
 * Disabled at the ends, never hidden: a button that disappears at the first block
 * resizes the card under the cursor and moves the other one out from under it.
 *
 * The word rides next to the chevron rather than only in the tooltip. A bare chevron
 * says "there is more this way" and leaves which way to the reader's guess; these two
 * walk the CHANGES, not the file, and that is what the label states. It costs nothing
 * in a bar that is 80% wide.
 *
 * `rounded-full`, echoing the card that holds them: every control of this bar is a pill,
 * so a hover fill lands as a lozenge inside a lozenge rather than as a soft-cornered
 * rectangle floating in one. It is the base that carries it, which is what keeps the
 * three buttons from drifting apart — there is one shape here, not three declarations
 * of it.
 */
const BUTTON_BASE =
  'inline-flex items-center gap-1.5 py-1.5 rounded-full text-sm font-medium ' +
  'text-text-secondary hover:bg-surface-strong hover:text-ink transition-colors ' +
  'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-text-secondary'

/**
 * The horizontal padding, mirrored: the chevron sits on the OUTSIDE of each button and
 * takes the tighter side, so the two read as one control pointing both ways.
 *
 * Two whole constants rather than a base plus an appended override, because appending
 * one is not reliable — two utilities from the same group win by their order in the
 * generated stylesheet, never by their order in the string (the rule spelled out in
 * renderer/theme/controls.ts).
 */
// Exported for `ThreadNavigator`, which walks the code comments of a PR conversation with
// the same two buttons: a reader who has learnt this bar in a file should find the same
// one in the drawer next door.
export const BUTTON_PREVIOUS = `${BUTTON_BASE} pl-2 pr-3`
export const BUTTON_NEXT = `${BUTTON_BASE} pl-3 pr-2`

/**
 * The right-hand group's button, exported so whatever fills that end is the same control as
 * the two that walk the changes — the bespoke ones of this bar, never the shared tokens in
 * `renderer/theme/controls.ts`, which are sized for forms and dialogs.
 *
 * A whole constant rather than an appended override, for the reason spelled out on
 * `BUTTON_PREVIOUS` above, and the same mirror rule: this button's icon is on the left, so
 * the left is the tighter side.
 *
 * Half a step wider than the two arrows, not equal to them. It sits at the END of the bar,
 * where its right padding is the last thing before the pill's edge, while the arrows have
 * the counter and each other to breathe against. Matching them exactly left it reading
 * tighter than them at the one place there is nothing beyond.
 */
export const BUTTON_COMMENTS = `${BUTTON_BASE} pl-2.5 pr-3.5`

/**
 * An ACTION at the same end of the bar — today "send this review to the agent".
 *
 * A whole constant again, and here it is not a style preference but the only thing that
 * works: this control has to be accent-coloured, and `BUTTON_BASE` already sets
 * `text-text-secondary`. Appending `text-accent` to it would leave two utilities from the
 * same group deciding by their order in the GENERATED STYLESHEET rather than in the string —
 * the rule spelled out on `BUTTON_PREVIOUS`, and the one case in this file where getting it
 * wrong would silently paint the wrong colour instead of the wrong padding.
 *
 * Bespoke rather than `theme/controls.ts`'s `BTN_PRIMARY`, which is where this button used to
 * live when it sat in the comment list's footer: a filled accent block is sized for a dialog
 * and would read as a foreign object wedged into a pill. It keeps the accent as its TEXT
 * colour, which is enough to tell an action from the two buttons that only navigate.
 */
export const BUTTON_ACTION =
  'inline-flex items-center gap-1.5 py-1.5 pl-2.5 pr-3.5 rounded-full text-sm font-medium ' +
  'text-accent hover:bg-surface-strong hover:text-accent-hover transition-colors ' +
  'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-accent'

/**
 * The preview's footer bar: the walk through this file's changes at the left end, the
 * review's comments at the right, and nothing between them. The `+N −M` summary sits in the
 * header, beside the file it describes, and does not come back here.
 *
 * TWO GROUPS PUSHED APART (`flex justify-between`), which replaced a three-track
 * `grid-cols-3` when the walk moved out of the centre. The grid existed for one reason —
 * holding the middle group on the bar's TRUE centre, so that a word added on either side
 * could not shift the arrows out from under the reader's cursor. With nothing in the centre
 * that reason is gone, and the guarantee it bought now comes free: `justify-between` pins
 * each group to its own end, so the comments button can grow from one comment to ninety-nine
 * without moving the arrows a pixel.
 *
 * It is also the sturdier of the two here. A third of the bar is a hard width, and the walk —
 * two labelled buttons around a counter — is wider than the empty track it used to sit in was
 * ever asked to be; `minmax(0, 1fr)` would have let it squash rather than overflow, silently.
 * Content-sized groups cannot.
 *
 * Floated over the bottom of the preview rather than docked, and it is the CALLER that
 * has to place it outside the scrolling element — an absolutely positioned descendant of
 * a scroller joins that scroller's overflow, so `bottom-4` would pin it to the top of the
 * document and it would slide away with the code.
 *
 * `p-1` — 4px, one value on all four sides. A pill has no side to be the short one: the ring
 * of space between the border and the controls reads as a single margin all the way round,
 * and any two numbers here make it visibly thinner at the top and bottom than at the ends.
 *
 * Four pixels is a HAIRLINE, and deliberately so: the controls inside are pills of their own
 * carrying `py-1.5` and their own horizontal padding, so what the bar needs is the gap that
 * keeps their hover fill from touching its border — not a frame of its own. The height comes
 * from the buttons; this only stops them running into the edge.
 *
 * `rounded-full`, so the ends are true half-circles at this height rather than the soft
 * corners of `rounded-xl`. It also keeps the empty middle from reading as dead space: a pill
 * has no corners to leave empty.
 *
 * `bg-bg-tertiary`, the lightest of the three: the drawer is `bg-bg` and the file cards it
 * floats over are `bg-bg-secondary`, so this is one step above BOTH — a bar painted either
 * of their colours is not a bar, it is a hole. The two-layer shadow is what carries
 * the separation — it floats over syntax-highlighted code, which is busy, and one soft
 * shadow left it dissolving into the lines behind it. The tight layer draws the edge, the
 * broad one lifts the card off the text; with those doing the work the border stays at
 * the ordinary `border-line` rather than competing with them.
 */
export default function ChangeNavigator({
  current, total, foldedFiles, commentCount, trailing, onPrevious, onNext,
}: Props) {
  const t = useT()

  // Walking is the bar's only job — the `+N −M` summary moved to the header, where it sits
  // next to the file's name and is read once rather than navigated. So below two blocks there
  // is nowhere to go, and a bar with nothing in it is still a hairline and a band of padding
  // over the code.
  //
  // But a card FOLDED SHUT keeps the bar regardless, and that is the whole of the distinction:
  // nothing to walk because the reader hid the rows is not nothing to walk because the
  // repository holds fewer than two changes. Folding is a deliberate act — the reader standing
  // back to look at the whole review is the one who most wants this bar — so one folded card is
  // reason enough, and there is no need to guess how many blocks it hides. Counting folded
  // FILES as a lower bound on blocks would read better as arithmetic and behave worse: a
  // one-file review folded shut scores 1, and the bar would vanish at exactly the moment it
  // was asked to stay.
  //
  // What this must NOT do is stand over a review that genuinely holds one block with nothing
  // folded — a disabled `1 / 1` obstructing the code, navigating nothing. A repository-wide
  // "has changes" flag cannot tell that apart, since it is true of the one-block review too.
  //
  // COMMENTS are the third reason to stay, and the newest. They are reachable only from
  // this bar, so a review whose changes have all been committed away — or one holding a
  // single block with a note left on it — must keep the bar or lose the notes with it.
  // Which is also why `total < 2` STAYS: "one change and no comments" still gets no bar,
  // deliberately, and that is the one reading of "present when the repository has changes
  // OR comments" this does not follow to the letter.
  //
  // Kept here rather than at the call site so the panel's layout stays free of it.
  if (total < 2 && foldedFiles === 0 && commentCount === 0) return null

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-4/5">
      <div className="bg-bg-tertiary border border-line rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.3),0_14px_36px_rgba(0,0,0,0.4)] p-1 flex items-center justify-between gap-2">
        {/* The walk, at the LEFT end: previous, the counter it moves, next. One group, so
            the number a press changes stays between the two buttons that change it. */}
        <div className="flex items-center gap-1">
          {/* DISABLED with nothing mounted, not hidden, which is the same rule the two
              already follow at the ends of the list — see `BUTTON_BASE`, where the 40%
              opacity and the not-allowed cursor already live. Hiding them would leave this
              group holding a counter and two gaps, and the bar would change shape every
              time a reader folded the last open card away. It also needs no condition
              of its own: with no blocks to walk, `current <= 1` and `current >= total` are
              both already true. */}
          <button
            type="button"
            onClick={onPrevious}
            disabled={current <= 1}
            aria-label={t('filePreview.previousChange')}
            title={t('filePreview.previousChange')}
            className={BUTTON_PREVIOUS}
          >
            <ChevronLeft size={18} />
            {t('filePreview.previous')}
          </button>
          {/* `tabular-nums` so the bar does not twitch as the counter passes 9 → 10.

              `0 / 0 changes` rather than the `1 / 0` a 1-indexed position reads as with
              nothing to be first of. It now means one of two things, both of them states
              the guard above deliberately kept the bar for: the reader has folded the rows
              away themselves, or the repository has no changes left and the bar is standing
              here for the comments at the other end. Either way the repository's own
              totals are in the header a few pixels up, and the bar has no second number to
              invent. */}
          <span className="text-sm text-text-secondary tabular-nums px-1.5 select-none">
            {t('filePreview.changeCounter', { current: total === 0 ? 0 : current, total })}
          </span>
          <button
            type="button"
            onClick={onNext}
            disabled={current >= total}
            aria-label={t('filePreview.nextChange')}
            title={t('filePreview.nextChange')}
            className={BUTTON_NEXT}
          >
            {t('filePreview.next')}
            <ChevronRight size={18} />
          </button>
        </div>
        {/* The comments, at the RIGHT end. Rendered even when `trailing` is absent — the
            single-file preview has no review and so no comments — because `justify-between`
            needs a second child to push the walk against: without it the group would drift
            to wherever the free space put it.

            `flex items-center`, and it is not decoration: `trailing` is an `inline-flex`
            button, so in a BLOCK wrapper it would sit on that wrapper's text baseline and
            the line box would reserve the descender space under it. The wrapper would then
            be a few pixels taller than the button it holds, and `items-center` on the bar
            centres the WRAPPER — so the button would ride above the walk beside it, which
            does not, its own children being flex items that never make a line box. */}
        <div className="flex items-center gap-1">{trailing}</div>
      </div>
    </div>
  )
}
