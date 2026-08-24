import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useT } from '../../i18n'

interface Props {
  /** 1-indexed, because this number is read by a human, not used as an index. */
  current: number
  total: number
  onPrevious: () => void
  onNext: () => void
}

/**
 * Disabled at the ends, never hidden: a button that disappears at the first block
 * resizes the card under the cursor and moves the other one out from under it.
 */
const BUTTON_CLASS =
  'p-1 rounded-md text-text-secondary hover:bg-surface-strong hover:text-ink transition-colors ' +
  'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-text-secondary'

/**
 * The card that walks the reader through a file's changes: previous on the left,
 * the counter in the middle, next on the right.
 *
 * Floated over the bottom of the panel rather than docked in the header, and it is
 * the CALLER that has to place it outside the scrolling element — an absolutely
 * positioned descendant of a scroller joins that scroller's overflow, so `bottom-4`
 * would pin it to the top of the document and it would slide away with the code.
 *
 * `bg-bg-tertiary`, not `bg-bg-secondary`: the drawer itself is `bg-bg-secondary`,
 * and a card painted the colour it sits on is not a card.
 */
export default function ChangeNavigator({ current, total, onPrevious, onNext }: Props) {
  const t = useT()

  // One change needs no navigator, and none at all needs it even less. Bailing out
  // here rather than at the call site keeps the panel's layout free of the condition.
  if (total < 2) return null

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
      <div className="bg-bg-tertiary border border-line rounded-xl shadow-2xl px-2 py-1.5 flex items-center gap-1">
        <button
          type="button"
          onClick={onPrevious}
          disabled={current <= 1}
          aria-label={t('filePreview.previousChange')}
          title={t('filePreview.previousChange')}
          className={BUTTON_CLASS}
        >
          <ChevronLeft size={16} />
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
          className={BUTTON_CLASS}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
