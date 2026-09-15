import { Banner, BANNER_BAND_HEIGHT } from '@ds/desktop'
import { TicketPlus, X } from '@ds/desktop/icons'
import { useT } from '../../i18n'

/**
 * The banner's height, and the offset the two bands that pin UNDER it have to use —
 * the filter bar and, through it, the board's column headings.
 *
 * Stated as a number for `FILTER_BAR_H`'s reason, which this now stacks on top of:
 * sticky bands know nothing about each other, so a band that pins at `top: 0` while
 * another already sits there is a band hiding one.
 *
 * It is the design system's own number now rather than a copy of it. The band is a
 * `Banner` with `layout="band"`, which draws itself at exactly this height — so a
 * re-export is the only form of the constant that cannot drift from what is on screen.
 */
export const PICK_BAR_H = BANNER_BAND_HEIGHT

/**
 * The band that says the board is being used to CHOOSE a ticket rather than to read
 * one, pinned for as long as that is true.
 *
 * It has to be pinned and not merely rendered at the top: the reason a card behaves
 * differently from usual is stated here, and a reason that scrolls away leaves a board
 * whose cards silently do something else. Picking is also the one mode with no other
 * marker on screen — the cards look exactly as they always do.
 *
 * `accent` and `band` are the two halves of what this is, and both are the design
 * system's words now. `accent` because this is a state the reader put the app into and
 * can leave, unlike the two informational panels on this page, and it is the only thing
 * here that is not simply a fact about the backlog. `band` because it is pinned: that
 * layout is the opaque, square-cornered, full-bleed drawing a tinted strip has to take
 * when the page scrolls underneath it.
 *
 * WHAT IS LEFT FOR THIS FILE TO SAY, which is the pinning and nothing else. `sticky
 * top-0 z-30` are facts about this page — `z-30` puts it over the filter bar's `z-20`,
 * which is the order they are stacked in — and the design system has no way to know
 * them. The ground, the height, the hairline, the mark's plate and both lines of type
 * are `Banner`'s.
 *
 * The `px-6` that used to be here is gone WITHOUT being replaced, and it is worth
 * saying why rather than leaving it to look like an oversight: the band layout carries
 * the same 24px itself, for the same reason this did — the band is a sibling of the
 * sweep layers, not a child, so it sits directly on a scrolling pane that has no
 * padding of its own.
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
    <Banner
      variant="accent"
      layout="band"
      icon={TicketPlus}
      className="sticky top-0 z-30"
      // What the click does, and just as importantly what it does NOT do: the same
      // gesture on this board normally opens a ticket, and the Play button on a card
      // starts an agent. Neither happens here.
      hint={t('tasks.pick.hint')}
      actions={
        <button
          onClick={onCancel}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-text-secondary
            border border-line rounded-lg hover:bg-surface-strong hover:text-ink transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          {t('tasks.pick.cancel')}
        </button>
      }
    >
      {t('tasks.pick.title', { name: agentName })}
    </Banner>
  )
}
