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
   * Zero for a single-file preview, which has no cards to fold, so that caller keeps exactly
   * the behaviour it has always had.
   */
  foldedFiles: number
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
 */
const BUTTON_BASE =
  'inline-flex items-center gap-1 py-1 rounded-md text-xs font-medium ' +
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
const BUTTON_PREVIOUS = `${BUTTON_BASE} pl-1.5 pr-2`
const BUTTON_NEXT = `${BUTTON_BASE} pl-2 pr-1.5`

/**
 * The preview's footer bar: the walk through this file's changes, centred, with an
 * empty track either side. The `+N −M` summary that used to fill the left one now sits
 * in the header, beside the file it describes.
 *
 * THREE EQUAL TRACKS (`grid-cols-3`, i.e. `repeat(3, minmax(0, 1fr))`) rather than a
 * flex row with the middle group pushed around by `justify-between` or `mx-auto`. The
 * middle group has to sit at the bar's true centre, and with flex it would sit at the
 * centre of whatever the side content left over — so adding a word on the left would
 * shift the arrows, and the reader's cursor would no longer be where the arrows are.
 * With equal tracks the middle one is centred by the template, and neither side can
 * reach it. The third track is defined by that same template and needs no element of
 * its own; whatever lands there later inherits the guarantee.
 *
 * Floated over the bottom of the preview rather than docked, and it is the CALLER that
 * has to place it outside the scrolling element — an absolutely positioned descendant of
 * a scroller joins that scroller's overflow, so `bottom-4` would pin it to the top of the
 * document and it would slide away with the code.
 *
 * It keeps the header's `px-4 py-3` even though it is a card again: at the card's old
 * `py-1.5` the bar read as a strip, and the height is what makes it findable.
 *
 * `rounded-full`, so the ends are true half-circles at this height rather than the soft
 * corners of `rounded-xl`. It also keeps the two empty outer tracks from reading as dead
 * space: a pill has no corners to leave empty.
 *
 * `bg-bg-tertiary`, not `bg-bg-secondary`: the drawer itself is `bg-bg-secondary`, and a
 * card painted the colour it sits on is not a card. The two-layer shadow is what carries
 * the separation — it floats over syntax-highlighted code, which is busy, and one soft
 * shadow left it dissolving into the lines behind it. The tight layer draws the edge, the
 * broad one lifts the card off the text; with those doing the work the border stays at
 * the ordinary `border-line` rather than competing with them.
 */
export default function ChangeNavigator({ current, total, foldedFiles, onPrevious, onNext }: Props) {
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
  // Kept here rather than at the call site so the panel's layout stays free of it.
  if (total < 2 && foldedFiles === 0) return null

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-4/5">
      <div className="bg-bg-tertiary border border-line rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.3),0_14px_36px_rgba(0,0,0,0.4)] px-4 py-3 grid grid-cols-3 items-center">
        {/* The outer tracks carry nothing today. They are what holds the middle group on
            the bar's true centre, so they stay as empty cells of the template rather
            than as elements of their own. */}
        <div />
        <div className="justify-self-center flex items-center gap-1">
          {/* DISABLED with nothing mounted, not hidden, which is the same rule the two
              already follow at the ends of the list — see `BUTTON_BASE`, where the 40%
              opacity and the not-allowed cursor already live. Hiding them would leave the
              middle track holding a counter and two gaps, and the bar would change shape
              every time a reader folded the last open card away. It also needs no condition
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
            <ChevronLeft size={16} />
            {t('filePreview.previous')}
          </button>
          {/* `tabular-nums` so the bar does not twitch as the counter passes 9 → 10.

              `0 / 0 changes` rather than the `1 / 0` a 1-indexed position reads as with
              nothing to be first of. That is now the folded state and only it — the guard
              above has already sent every review with nothing in it away — so the reader
              seeing it has just folded the rows away themselves, and the repository's own
              totals are in the header a few pixels up. The bar has no second number to
              invent. */}
          <span className="text-xs text-text-secondary tabular-nums px-1.5 select-none">
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
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
