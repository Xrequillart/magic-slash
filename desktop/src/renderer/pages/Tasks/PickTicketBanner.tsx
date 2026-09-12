import { TicketPlus, X } from 'lucide-react'
import { useT } from '../../i18n'

/**
 * The banner's height, and the offset the two bands that pin UNDER it have to use —
 * the filter bar and, through it, the board's column headings.
 *
 * Stated as a number for `FILTER_BAR_H`'s reason, which this now stacks on top of:
 * sticky bands know nothing about each other, so a band that pins at `top: 0` while
 * another already sits there is a band hiding one. 28px of content between 12px of
 * padding either side, plus the hairline.
 */
export const PICK_BAR_H = 53

/**
 * The band that says the board is being used to CHOOSE a ticket rather than to read
 * one, pinned for as long as that is true.
 *
 * It has to be pinned and not merely rendered at the top: the reason a card behaves
 * differently from usual is stated here, and a reason that scrolls away leaves a board
 * whose cards silently do something else. Picking is also the one mode with no other
 * marker on screen — the cards look exactly as they always do.
 *
 * `px-6` ALONE, and this is the one thing to get right about it: it is a sibling of the
 * sweep layers, not a child, so it sits directly on the scrolling pane — which has no
 * padding of its own. `TaskFilters` pairs the same `px-6` with `-mx-6` because it IS
 * inside a layer that already pays for 24px either side and has to give them back; doing
 * the same here pushed the band 24px past both edges of the pane and scrolled the page
 * sideways. Full-bleed and opaque is already what a band on the pane is.
 *
 * `z-30` puts it over the filter bar's `z-20`, which is the order they are stacked in.
 *
 * `accent` and not a neutral surface: this is a state the reader put the app into and
 * can leave, unlike the two informational panels on this page, and it is the only thing
 * here that is not simply a fact about the backlog.
 */
export function PickTicketBanner({
  agentName,
  onCancel,
}: {
  /** Whose ticket is being chosen, named so two open agents cannot be confused. */
  agentName: string
  onCancel: () => void
}) {
  const t = useT()

  return (
    <div
      className="sticky top-0 z-30 px-6 bg-bg-secondary border-b border-line
        flex items-center gap-3 min-w-0"
      style={{ height: PICK_BAR_H }}
    >
      <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-accent/15 text-accent flex-shrink-0">
        <TicketPlus className="w-4 h-4" />
      </span>
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-medium text-ink truncate">
          {t('tasks.pick.title', { name: agentName })}
        </span>
        {/* What the click does, and just as importantly what it does NOT do: the same
            gesture on this board normally opens a ticket, and the Play button on a card
            starts an agent. Neither happens here. */}
        <span className="text-[11px] text-text-secondary/70 truncate">{t('tasks.pick.hint')}</span>
      </div>
      <button
        onClick={onCancel}
        className="ml-auto flex items-center gap-1 px-2 py-1 text-xs font-medium text-text-secondary
          border border-line rounded-lg hover:bg-surface-strong hover:text-ink transition-colors flex-shrink-0"
      >
        <X className="w-3.5 h-3.5" />
        {t('tasks.pick.cancel')}
      </button>
    </div>
  )
}
