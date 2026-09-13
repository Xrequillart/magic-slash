/**
 * The one shape an icon action is drawn in, anywhere in the app.
 *
 * IT IS THE TICKET BADGE'S SHAPE. `TrackerBadge` (components/icons/TrackerIcons.tsx)
 * is what the card above this one wears — `h-6 … rounded-lg` on a filled `bg-ink/5`
 * ground, no border — and these three sat right under it in dashed 10px outlines, a
 * second, older button language two cards apart in the same column. One family now:
 * same height, same radius, same ground, so the eye reads the sidebar as one object
 * instead of two generations of it.
 *
 * ICON-ONLY, and the tooltip carries the name. Written out the chips run to some
 * 270px, which is most of a 288px sidebar at its narrowest — the repository's own
 * name would be truncated to nothing to make room for three verbs. The mark says
 * enough: a play triangle, VS Code's ribbon, GitHub's cat.
 *
 * WHAT IS LEFT OF IT. The eight SQUARE chips are `ButtonIcon` from the design system
 * now, and `ACTION_CHIP_SQUARE` went with them. What stays are the three that are not
 * icon-only — a branch name, a refresh with its word beside it, and the scripts menu
 * with its chevron — which is why this file is still here: they wear the same ground,
 * the same height and the same radius as the buttons, and that agreement is the thing
 * worth keeping in one place. The values are `ButtonIcon`'s own `sm` rung; a change to
 * either has to be made in both, which is the price of a chip that is not a button.
 *
 * IT LIVES HERE AND NOT IN `agent-info-sidebar/`, where it was written. The left
 * sidebar's AGENTS header wears it too now, and a left-hand control importing
 * `repoActionChip` from the right-hand panel's folder would have been the file name
 * lying about who owns the vocabulary. It is the app's, not one card's.
 */
export const ACTION_CHIP =
  'h-6 inline-flex items-center justify-center rounded-lg bg-ink/5 text-icon ' +
  'border-none cursor-pointer transition-colors flex-shrink-0'

/**
 * Scripts, which is a MENU and not a link. It keeps the chevron the other two have no
 * business carrying, so it is a shade wider than square — the one place the row is
 * allowed to be uneven, because the difference is what says "this one opens something".
 */
export const ACTION_CHIP_PILL = 'px-1.5 gap-0.5'
