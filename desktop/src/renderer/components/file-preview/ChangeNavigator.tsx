import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useT } from '../../i18n'
import type { MarkerCounts } from '../../utils/diffMarkers'

interface Props {
  /** 1-indexed, because this number is read by a human, not used as an index. */
  current: number
  total: number
  /** How many rows changed, for the summary on the left. */
  counts: MarkerCounts
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
 * in a bar that is now 80% wide.
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
 * The bar floating over the bottom of the preview: what changed in this file on the
 * left, the walk through those changes in the middle, and a third slot on the right
 * that nothing fills yet.
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
 * Floated over the panel rather than docked in the header, and it is the CALLER that
 * has to place it outside the scrolling element — an absolutely positioned descendant
 * of a scroller joins that scroller's overflow, so `bottom-4` would pin it to the top
 * of the document and it would slide away with the code.
 *
 * `bg-bg-tertiary`, not `bg-bg-secondary`: the drawer itself is `bg-bg-secondary`,
 * and a card painted the colour it sits on is not a card.
 */
export default function ChangeNavigator({ current, total, counts, onPrevious, onNext }: Props) {
  const t = useT()

  // Nothing changed, nothing to say — the spec panel and an unchanged file both land
  // here. Bailing out on the COUNTS rather than on `total` is what lets the bar stand
  // for a file with a single change: it has a summary worth reading even though there
  // is nowhere to navigate to. Kept here rather than at the call site so the panel's
  // layout stays free of the condition.
  const changed = counts.added + counts.removed
  if (changed === 0) return null

  const addedLabel = t('filePreview.linesAdded', { count: counts.added })
  const removedLabel = t('filePreview.linesRemoved', { count: counts.removed })

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-4/5">
      <div className="bg-bg-tertiary border border-line rounded-xl shadow-2xl px-3 py-1.5 grid grid-cols-3 items-center">
        {/* `tabular-nums` here too: this readout changes when the reader opens another
            file, and a figure width that depends on the digits makes the two bars land
            in different places. `min-w-0` so a five-digit count truncates inside its
            own track instead of pushing on the centre. */}
        <div className="justify-self-start min-w-0 flex items-center gap-2.5 text-xs tabular-nums select-none">
          <span className="text-green" title={addedLabel} aria-label={addedLabel}>+{counts.added}</span>
          {/* U+2212, not a hyphen: it is drawn at the same width and height as the `+`
              next to it, which a hyphen is not, and these two sit side by side. */}
          <span className="text-red" title={removedLabel} aria-label={removedLabel}>−{counts.removed}</span>
        </div>
        {/* One change has nowhere to go, so the arrows and the counter drop out — the
            track stays, and so does the centre the next file's arrows appear on. */}
        <div className="justify-self-center flex items-center gap-1">
          {total >= 2 && (
            <>
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
              {/* `tabular-nums` so the card does not twitch as the counter passes 9 → 10. */}
              <span className="text-xs text-text-secondary tabular-nums px-1.5 select-none">
                {t('filePreview.changeCounter', { current, total })}
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}
