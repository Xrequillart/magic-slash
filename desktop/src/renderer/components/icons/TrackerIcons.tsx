import { Github, Jira } from '@ds/desktop/icons'
import { Label, type LabelSize } from '@ds/desktop'

/**
 * The one component that picks between the two tracker marks.
 *
 * THE MARKS THEMSELVES MOVED to `design-system/desktop/brand.tsx`, along with the
 * three others the app borrows. They were drawn here because this is where they
 * were first needed, which is how the agent sidebar came to draw a SECOND GitHub
 * mark on a different grid without anyone noticing. What stays is what is actually
 * this app's: the tile, the badge, and the rule that a Jira mark keeps its own
 * blues while a GitHub mark takes the theme's ink.
 *
 * Shown through `TrackerTile` and `TrackerBadge` below on every Tasks row, ticket
 * page and agent sidebar.
 */

/**
 * The tracker's mark on a tile of its own — the repository tile's shape, applied to
 * the two trackers.
 *
 * `RepoPage` and the rail draw a repository as a `rounded-xl` square filled with its
 * own colour at 12% and the icon in that colour on top; a bare mark beside a ticket
 * read as a smaller, flatter kind of thing on pages that show both. Same geometry
 * here, with each tracker's own ground: Jira's brand blue, GitHub's neutral surface
 * (its mark is `currentColor`, so it takes the theme's ink and stays legible on the
 * dark themes too).
 *
 * The blue is an inline style rather than a class because it is the BRAND's blue —
 * the same `#2684FF` the mark itself is painted in — and not a theme token. Tailwind
 * only emits classes it can see, so an arbitrary value would also have to be spelled
 * out per size.
 *
 * `title` rather than `aria-hidden`: on a mixed page the mark is the only thing
 * saying which tracker a row came from, so it is content and not decoration. The
 * mark inside stays hidden from the tree — the accessible name is on the tile, or a
 * screen reader would read the tracker twice.
 */
const TILE_SIZES = {
  /**
   * The pinned bar, where the mark stands beside 12px type and a 30px button: a
   * list row's tile there would be taller than the text it introduces.
   */
  xs: { tile: 'w-6 h-6 rounded-md', mark: 'w-3.5 h-3.5' },
  /** A list row: big enough to centre on two lines of text without crowding them. */
  sm: { tile: 'w-8 h-8 rounded-lg', mark: 'w-4 h-4' },
  /** A page title, and the repository tile's own size. */
  md: { tile: 'w-10 h-10 rounded-xl', mark: 'w-5 h-5' },
  /** A settings card, where the tile is the only thing on the left of the row. */
  lg: { tile: 'w-12 h-12 rounded-xl', mark: 'w-6 h-6' },
} as const

export function TrackerTile({
  tracker,
  size = 'md',
  title,
  className = '',
}: {
  tracker: 'github' | 'jira'
  size?: keyof typeof TILE_SIZES
  title?: string
  className?: string
}) {
  const { tile, mark } = TILE_SIZES[size]
  const jira = tracker === 'jira'

  return (
    <span
      className={`flex items-center justify-center flex-shrink-0 ${tile} ${
        jira ? '' : 'bg-surface-strong text-ink'
      } ${className}`}
      style={jira ? { backgroundColor: 'rgba(38, 132, 255, 0.14)' } : undefined}
      title={title}
      role="img"
      aria-label={title}
    >
      {jira ? <Jira className={mark} /> : <Github className={mark} />}
    </span>
  )
}

export function TrackerBadge({
  tracker,
  ticketId,
  size = 'sm',
  className = '',
  title,
}: {
  tracker: 'github' | 'jira'
  /** `PER-1234` or `#234`, printed exactly as given. */
  ticketId: string
  size?: LabelSize
  className?: string
  /**
   * Replaces the default "Jira · PER-1234" tooltip, for a badge that fills a BUTTON:
   * the pointer then has to be told what pressing it does, and the id it would have
   * repeated is already the label under the cursor. See `TicketIdLink`.
   */
  title?: string
}) {
  const name = tracker === 'jira' ? 'Jira' : 'GitHub'

  // A `Label` with the tracker's tone. The ground, the mark and the geometry moved
  // there; what stays here is the one thing that is this app's — which tracker a row
  // came from, and saying it out loud.
  //
  // THE `sr-only` NAME IS GONE WITH THE SPAN IT NEEDED. `Label` takes a string, so
  // there is nowhere to hide a second one inside it. The `title` carries the tracker
  // for the pointer as before; a screen reader gets the id alone, which is the label
  // as written. Restoring the spoken name means an `aria-label` prop on `Label`, and
  // that is worth doing when a second call site needs it rather than for this one.
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
