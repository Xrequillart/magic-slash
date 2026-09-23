import { Avatar } from './Avatar'
import { Icon } from './Icon'
import { Label, type LabelTone } from './Label'
import { Status, type StatusTone } from './Status'
import { Text } from './Text'
import type { IconComponent } from './types'

/**
 * One event in a history, on the rail that says the events are a sequence — who did it,
 * what they did, how, and when.
 *
 * It came in with a plan's edit history, where three kinds of event share one timeline: a
 * revision of the spec (by hand, or through a Claude agent), a link pinned or taken off,
 * and a change of status. All are "somebody did something to this plan at some moment", so
 * they are one row with one shape, and the page interleaves them by date.
 *
 * `CommitLine`'s SPLIT, NOT ITS RAIL. The rail is drawn per row in two halves meeting at a
 * tick, exactly as a branch's commits are, so a row knows only whether it is the first or
 * the last. But not in yellow: yellow is the branch's own unpushed work, and a history is
 * nobody's pending anything. The rail is a hairline and the tick hollow, until the row is
 * SELECTED — the one state this row has that a commit does not.
 *
 * SELECTABLE, OPTIONALLY. A revision can be picked to see what it changed; a link event
 * or a status change cannot. Given `onSelect` the row is a button that says whether it is pressed;
 * without it the row is a plain line with no hover and nothing in the tab order — the
 * rule `Label` follows, and for its reason.
 *
 * WHAT IT NEVER KNOWS: who the person is, what a relative date looks like in the reader's
 * language, what the badge means. Every word arrives translated; the face arrives as bytes
 * for `Avatar`; the badge as a word and a `Label` tone. No slot takes a node — see the note
 * on `badge` for why a badge is data here.
 */

/**
 * The rail and the tick, drawn per ROW. Private: `CommitRail`'s reasoning, in a different
 * colour and with a state. `-my-2` cancels the row's own `py-2` so consecutive segments
 * meet — the gap `CommitRail` documents.
 */
function TimelineRail({ first, last, selected }: { first: boolean; last: boolean; selected: boolean }) {
  return (
    <div className="relative self-stretch -my-2 w-3 flex-shrink-0 flex items-center justify-center">
      {!first && <span className="absolute left-1/2 -translate-x-1/2 top-0 bottom-1/2 w-px bg-ink/15" />}
      {!last && <span className="absolute left-1/2 -translate-x-1/2 top-1/2 bottom-0 w-px bg-ink/15" />}
      {/* Filled when selected, hollow otherwise: the rail says where the row is, the fill
          says it is the one being looked at. `bg-bg` for the hollow centre, for the
          reason `CommitRail` gives — never a literal white. */}
      <span
        className={`relative w-2.5 h-2.5 rounded-full border-2 ${selected ? 'border-accent bg-accent' : 'border-ink/25 bg-bg'}`}
      />
    </div>
  )
}

export interface TimelineLineProps {
  /** Who did it — a name or an address, already resolved. Truncates. */
  actor: string
  /**
   * Their face: the bytes and the alternative text `Avatar` needs. `alt` is usually the
   * empty string here, since the name is written right beside it.
   */
  avatar: { src: string | null; alt: string }
  /** What they did, already translated: "edited the spec", "pinned a link". */
  action: string
  /**
   * The thing the action was done to — a link's title, a section — drawn after the action
   * in ink, with `icon` in front of it. Optional: a revision of the spec has no object to
   * name beyond the spec itself.
   */
  detail?: string
  /**
   * A second, quieter name for the object, after `detail`: a link's address when its title
   * is the detail. Truncates first.
   */
  detailNote?: string
  /** The object's tooltip, when it should say more than `detail`: a link's full address. */
  detailTitle?: string
  /**
   * The mark in front of `detail`: the tool a link opens, from `@ds/desktop/icons`. A
   * component, never a node.
   */
  icon?: IconComponent
  /**
   * HOW it was done, as a `Label`: "By hand" on a neutral plate, "With Claude · Planner" on
   * Claude Code's. DATA AND NOT A SLOT: a `ReactNode` here would let every caller draw its
   * own chip, and the whole point of a badge is that the same answer looks the same on
   * every row.
   */
  badge?: { label: string; tone?: LabelTone; icon?: IconComponent }
  /**
   * A STATUS THAT CHANGED, drawn as the two `Status` plates it went between — the same
   * plates the plan wears in its heading and in the list — with an arrow from one to the
   * other. `from` is absent for a first status. Takes the place of `detail`.
   *
   * Data and not a slot, for `badge`'s reason: a status has to look like itself on every
   * row, and the plates are this component's to draw. `title` is the tooltip over both,
   * for a raw value the words above had to round off.
   */
  statusChange?: {
    from?: { label: string; tone?: StatusTone }
    to: { label: string; tone?: StatusTone }
    title?: string
  }
  /** When, already formatted and translated — "2h ago". */
  date: string
  /** The full date, for the tooltip. The relative one above loses the day after a week. */
  dateTitle?: string
  /** First in the list: no rail above the tick. */
  first?: boolean
  /** Last in the list: no rail below it. */
  last?: boolean
  /** The row being looked at: the tick filled, the row on a tinted ground. */
  selected?: boolean
  /**
   * Makes the row a toggle button. Absent, the row is plain text — see the header.
   */
  onSelect?: () => void
  /** The button's tooltip and accessible hint, when the row is one. Translated. */
  selectLabel?: string
  /** Margins and placement. Not the rail, the ground or the type. */
  className?: string
}

export function TimelineLine({
  actor,
  avatar,
  action,
  detail,
  detailNote,
  detailTitle,
  icon,
  badge,
  statusChange,
  date,
  dateTitle,
  first = false,
  last = false,
  selected = false,
  onSelect,
  selectLabel,
  className = '',
}: TimelineLineProps) {
  // ONE background class per state, never two on one element: which of two wins is Tailwind's
  // emit order, not the order they were written in.
  const ground = selected ? 'bg-accent/10' : onSelect ? 'bg-transparent hover:bg-ink/5' : ''
  const inner = (
    <>
      <TimelineRail first={first} last={last} selected={selected} />
      <Avatar src={avatar.src} alt={avatar.alt} size="md" />
      {/* One truncating run — the actor, the action, the object — so a long title gives
          way before the badge and the date, which are what a row is scanned for. */}
      <span className="flex items-center gap-1.5 min-w-0 flex-1">
        <Text size="sm" weight="medium" className="truncate flex-shrink-0 max-w-[40%]" title={actor}>
          {actor}
        </Text>
        <Text size="sm" tone="secondary" className="flex-shrink-0">
          {action}
        </Text>
        {statusChange ? (
          <span className="flex items-center gap-1.5 min-w-0" title={statusChange.title}>
            {statusChange.from && (
              <>
                <Status size="xs" label={statusChange.from.label} tone={statusChange.from.tone} />
                <Text size="sm" tone="secondary" aria-hidden className="flex-shrink-0">→</Text>
              </>
            )}
            <Status size="xs" label={statusChange.to.label} tone={statusChange.to.tone} />
          </span>
        ) : detail && (
          <span className="flex items-center gap-1 min-w-0">
            {icon && <Icon glyph={icon} size="xs" tone="muted" className="flex-shrink-0" />}
            <Text size="sm" className="truncate" title={detailTitle ?? detail}>
              {detail}
            </Text>
            {detailNote && (
              <Text size="xs" tone="secondary" className="truncate min-w-0" title={detailTitle ?? detailNote}>
                {detailNote}
              </Text>
            )}
          </span>
        )}
      </span>
      {badge && <Label size="xs" tone={badge.tone} icon={badge.icon}>{badge.label}</Label>}
      <Text size="xs" tone="secondary" className="flex-shrink-0 opacity-70" title={dateTitle ?? date}>
        {date}
      </Text>
    </>
  )

  // `py-2` on the row and not a `space-y` on the list: the rail is drawn per row, and any
  // gap between rows would break it. See `TimelineRail`.
  const row = `flex items-center gap-2.5 py-2 px-2 rounded-lg text-left w-full ${ground} ${className}`.trim()
  if (!onSelect) return <div className={row}>{inner}</div>
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      title={selectLabel}
      className={`${row} border-none cursor-pointer transition-colors`}
    >
      {inner}
    </button>
  )
}
