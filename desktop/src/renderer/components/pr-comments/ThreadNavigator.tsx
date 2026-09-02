import { ChevronLeft, ChevronRight, MessageSquareCode } from 'lucide-react'
import { BUTTON_NEXT, BUTTON_PREVIOUS } from '../file-preview/ChangeNavigator'
import { useT } from '../../i18n'

interface Props {
  /** 1-indexed position of the code comment last jumped to; 0 before the first jump. */
  current: number
  /** How many inline threads the conversation holds. */
  total: number
  onPrevious: () => void
  onNext: () => void
}

/**
 * The bar at the foot of the conversation panel that walks its CODE comments.
 *
 * The conversation is one chronological list — review summaries, PR comments and inline
 * threads interleaved in the order they were written — which is the order a review is
 * read in, but not the order somebody comes back to it in: "what did they say about my
 * code" means the inline threads, and those can sit anywhere in the list, under a page of
 * bot summaries. This is the same answer `ChangeNavigator` gives the same question in a
 * file — previous, a counter, next — in the same pill, with the same buttons, at the same
 * place, so the two drawers feel like one product. Alt+↑/↓ drives it too; see the panel.
 *
 * Absent with nothing to walk: a PR whose review is all summaries has no code comment to
 * jump to, and a bar reading `0 / 0` would be saying so in the least useful way.
 */
export default function ThreadNavigator({ current, total, onPrevious, onNext }: Props) {
  const t = useT()

  if (total === 0) return null

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
      <div className="bg-bg-tertiary border border-line rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.3),0_14px_36px_rgba(0,0,0,0.4)] p-1 flex items-center gap-1">
        <button
          type="button"
          onClick={onPrevious}
          disabled={current <= 1}
          aria-label={t('prComments.previousCodeComment')}
          title={t('prComments.previousCodeComment')}
          className={BUTTON_PREVIOUS}
        >
          <ChevronLeft size={18} />
          {t('filePreview.previous')}
        </button>
        {/* `tabular-nums` so the pill does not twitch as the counter passes 9 → 10. `0 / N`
            before the first jump: the reader is at the top of the list, on no code comment
            in particular, and the bar should say "N to see" rather than pretend to be on
            the first one. */}
        <span className="flex items-center gap-1.5 text-sm text-text-secondary tabular-nums px-1.5 select-none">
          <MessageSquareCode size={15} className="shrink-0" />
          {t('prComments.codeCommentCounter', { current, total })}
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={current >= total}
          aria-label={t('prComments.nextCodeComment')}
          title={t('prComments.nextCodeComment')}
          className={BUTTON_NEXT}
        >
          {t('filePreview.next')}
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}
