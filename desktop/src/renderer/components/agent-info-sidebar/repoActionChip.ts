/**
 * The one shape the repository header's actions are drawn in.
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
 * The hover tint is each action's own colour and the rest is shared, so a new action
 * added here cannot drift from the row: `${REPO_ACTION_CHIP} ${REPO_ACTION_SQUARE} …`.
 */
export const REPO_ACTION_CHIP =
  'h-6 inline-flex items-center justify-center rounded-lg bg-ink/5 text-icon ' +
  'border-none cursor-pointer transition-colors flex-shrink-0'

/** A single mark, centred: VS Code and GitHub. */
export const REPO_ACTION_SQUARE = 'w-6'

/**
 * Scripts, which is a MENU and not a link. It keeps the chevron the other two have no
 * business carrying, so it is a shade wider than square — the one place the row is
 * allowed to be uneven, because the difference is what says "this one opens something".
 */
export const REPO_ACTION_PILL = 'px-1.5 gap-0.5'
