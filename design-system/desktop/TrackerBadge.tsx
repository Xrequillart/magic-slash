import { Github, Jira, JIRA_CHIP_GROUND } from './icons'
import { Label, type LabelSize } from './Label'

/**
 * WHICH OF THE TWO TRACKERS a ticket came from — as a chip carrying its id, and as a
 * tile carrying nothing else.
 *
 * It lived in the app, under `components/icons/`, which is where it was first needed
 * and is how the agent sidebar came to draw a SECOND GitHub mark on a different grid
 * without anyone noticing. The marks themselves moved here first (`brand.tsx`); this
 * is the rest of it — the tile, the badge, and the one rule that is genuinely about
 * these two products rather than about badges: a Jira mark keeps its own blues, a
 * GitHub mark takes the theme's ink.
 *
 * TWO PRODUCTS AND NOT A CATALOGUE. `LabelTone` already names both, and so does
 * `brand.tsx`; a third place naming them is not the risk — a table of every tracker
 * anyone might ever wire up would be. These are the two the app reads from.
 */

export type Tracker = 'github' | 'jira'

/**
 * The tracker's mark on a tile of its own — the repository tile's shape, applied to
 * the two trackers.
 *
 * A repository is drawn as a `rounded-xl` square filled with its own colour at 12% and
 * its mark in that colour on top; a bare glyph beside a ticket read as a smaller,
 * flatter kind of thing on the pages that show both. Same geometry here, with each
 * tracker's own ground: Jira's brand blue, GitHub's neutral surface — its mark is
 * `currentColor`, so it takes the theme's ink and stays legible on the dark themes.
 *
 * The blue is an inline style rather than a class because it is the BRAND's blue — the
 * same `#2684FF` the mark itself is painted in — and not a theme token. It is
 * `JIRA_CHIP_GROUND` and not a literal: the value travels with the mark, beside Claude
 * Code's coral and for the same reason.
 *
 * `title` rather than `aria-hidden`: on a mixed page the mark is the only thing saying
 * which tracker a row came from, so it is content and not decoration. The mark inside
 * stays hidden from the tree — the accessible name is on the tile, or a screen reader
 * reads the tracker twice.
 */
const TILE_SIZES = {
  /**
   * A pinned bar, where the mark stands beside 12px type and a 28px button: a list
   * row's tile there would be taller than the text it introduces.
   */
  xs: { tile: 'w-6 h-6 rounded-md', mark: 'w-3.5 h-3.5' },
  /** A list row: big enough to centre on two lines of text without crowding them. */
  sm: { tile: 'w-8 h-8 rounded-lg', mark: 'w-4 h-4' },
  /** A page title, and the repository tile's own size. */
  md: { tile: 'w-10 h-10 rounded-xl', mark: 'w-5 h-5' },
  /** A settings card, where the tile is the only thing on the left of the row. */
  lg: { tile: 'w-12 h-12 rounded-xl', mark: 'w-6 h-6' },
} as const

export type TrackerTileSize = keyof typeof TILE_SIZES

export interface TrackerTileProps {
  tracker: Tracker
  size?: TrackerTileSize
  /** The accessible name and the tooltip. Already translated. */
  title?: string
  /** Margins and placement. Not the ground, the size or the radius. */
  className?: string
}

export function TrackerTile({ tracker, size = 'md', title, className = '' }: TrackerTileProps) {
  const { tile, mark } = TILE_SIZES[size]
  const jira = tracker === 'jira'

  return (
    <span
      className={`flex items-center justify-center flex-shrink-0 ${tile} ${
        jira ? '' : 'bg-surface-strong text-ink'
      } ${className}`.trim()}
      style={jira ? { backgroundColor: JIRA_CHIP_GROUND } : undefined}
      title={title}
      role="img"
      aria-label={title}
    >
      {jira ? <Jira className={mark} /> : <Github className={mark} />}
    </span>
  )
}

export interface TrackerBadgeProps {
  tracker: Tracker
  /** `PER-1234` or `#234`, printed exactly as given. */
  ticketId: string
  size?: LabelSize
  /**
   * Replaces the default "Jira · PER-1234" tooltip, for a badge that fills a BUTTON:
   * the pointer then has to be told what pressing it does, and the id it would have
   * repeated is already the label under the cursor.
   */
  title?: string
  /** Margins and placement. Not the ground, the height or the radius. */
  className?: string
}

/**
 * The id and its tracker as ONE chip — a `Label` in the tracker's own tone.
 *
 * The ground, the mark and the geometry are `Label`'s. What is here is the one thing
 * that is not: which of the two tones a tracker takes, and the tooltip that names it.
 *
 * THE `sr-only` NAME IS GONE WITH THE SPAN IT NEEDED. `Label` takes a string, so there
 * is nowhere to hide a second one inside it. The `title` carries the tracker for the
 * pointer as before; a screen reader gets the id alone, which is the label as written.
 */
export function TrackerBadge({
  tracker,
  ticketId,
  size = 'sm',
  title,
  className = '',
}: TrackerBadgeProps) {
  const name = tracker === 'jira' ? 'Jira' : 'GitHub'

  return (
    <Label
      tone={tracker === 'jira' ? 'jira' : 'github'}
      size={size}
      title={title ?? `${name} · ${ticketId}`}
      className={className}
    >
      {ticketId}
    </Label>
  )
}
