import { memo, type KeyboardEvent, type MouseEvent } from 'react'
import { ButtonIcon, type ButtonIconTone } from './ButtonIcon'
import { CopyButton } from './CopyButton'
import { Icon } from './Icon'
import { Label } from './Label'
import { Status, type StatusStrength, type StatusTone } from './Status'
import { Text } from './Text'
import { TrackerBadge, type Tracker } from './TrackerBadge'
import type { IconComponent } from './types'

/**
 * ONE TICKET ON A BOARD — three stacked bands: what it is and what you can do with it,
 * then its title, then whatever else is known about it.
 *
 * THE CARD AND NOT THE ROW, the split this folder makes everywhere else
 * (`CommitLine`/`CommitCard`, `FileModifiedLine`/`UnCommittedChangesCard`). A row is
 * full width and puts everything on two lines; a board column is a quarter of that, so
 * this stacks instead. Nothing wraps into the actions, which is the property a strip
 * could not keep once the width went.
 *
 * NO OUTLINE. It wore `border border-line-field` with a hover that swapped it for
 * `border-accent/40`, and a column of eight of them was eight rectangles drawn on a
 * plate that is already a rectangle. The PLATE is the card: `surface` on the column's
 * own `surface-subtle`, stepping to `surface-strong` under the cursor. `SkillCard`
 * dropped the same border for the same reason and the note there says it at length.
 *
 * THE AGENT TINT REPLACED THE GREEN BORDER, and it says the thing louder rather than
 * quieter: the whole plate goes green at 10% instead of a 1px rule around it, which is
 * what "somebody is already on this one" has to survive being read as, in a column
 * scanned rather than read.
 *
 * A DIV WITH A ROLE, not a `<button>`: the card contains buttons of its own, and a
 * button inside a button is invalid markup no amount of `stopPropagation` fixes. That
 * also means the keyboard half is ours to provide — a real button answers Enter and
 * Space for free, and a `role="button"` that only answers the mouse is unreachable
 * without one.
 *
 * MEMOISED, and it earns it here: a board rebuilds its columns whenever anything on the
 * page changes — a keystroke in a search box, a terminal tick — and a sprint is up to
 * seventy-five cards.
 */

/**
 * A chip on the third band: a ticket's own label, its epic, its parent.
 *
 * `color` is a CSS VALUE and the caller's — `Label.color`'s contract exactly. What a
 * hue MEANS is a fact about the caller's domain: an epic's colour comes off Jira, a
 * repository's out of the sixteen the app assigns, and a table of those meanings in a
 * design system would be the app's vocabulary stored in the shared folder.
 */
export interface TicketCardTag {
  /** Stable across renders. The word is usually it; it is separate because it need not be. */
  id: string
  /** The word on the plate, already translated. */
  label: string
  color?: string
  /**
   * The tooltip, and the half of the fact a chip in a 200px column loses first: an
   * epic's key, a parent's title.
   */
  title?: string
  /** Lets the word ellipsise rather than hold the chip's full width. */
  truncate?: boolean
}

/** A plain word on the third band — who filed it, how many of its children are done. */
export interface TicketCardNote {
  id: string
  text: string
  title?: string
}

/** The state plate on the third band: the site's own word for the column. */
export interface TicketCardStatus {
  /** Already translated, or the site's own word — see `Status.label`. */
  label: string
  tone?: StatusTone
  strength?: StatusStrength
}

/**
 * A MARK BESIDE THE ID, for the field that decides which of two tickets you pick up.
 *
 * Priority, today. It sits on the first band rather than down with the metadata
 * because that is the line the eye lands on — below, it was one badge among a status,
 * an epic, a reporter and every label, read only by somebody already reading the card.
 * `Status`'s own `markOnly`: the arrow survives being skimmed, the word is one hover
 * away.
 */
export interface TicketCardMark {
  icon: IconComponent
  tone?: StatusTone
  /** What the mark means, in full — the tooltip and the accessible name. */
  label: string
}

/** The card's one affirmative action, in the slot at the end of the first band. */
export interface TicketCardAction {
  icon: IconComponent
  /** The tooltip and the accessible name. Already translated. */
  title: string
  onClick: () => void
  tone?: ButtonIconTone
  disabled?: boolean
}

export interface TicketCardProps {
  tracker: Tracker
  /** `PER-1234` or `#234`, printed exactly as given. */
  ticketId: string
  /**
   * What the ticket is about. TWO LINES AT MOST, then an ellipsis — a column is too
   * narrow to promise a whole title, and a card that grows to four lines of it pushes
   * the rest of its column off the screen.
   */
  title: string
  /** The mark beside the id. See `TicketCardMark`. */
  mark?: TicketCardMark
  status?: TicketCardStatus
  tags?: TicketCardTag[]
  notes?: TicketCardNote[]
  /** A link to put on the clipboard, when the ticket has one to offer. */
  copy?: { value: string; label: string; copiedLabel: string }
  /**
   * The launch. ABSENT DRAWS NOTHING rather than a disabled button: a greyed-out Play
   * invites the press it then refuses, and the reasons a card has no action — somebody
   * is already on it, the ticket is finished, the board is being used to pick one — are
   * all "there is nothing to start" and none of them is worth a dead control.
   */
  action?: TicketCardAction
  /**
   * SOMEBODY IS ALREADY ON THIS ONE. Tints the whole plate and puts a mark where the
   * action would be — a statement, not a button, because there is nothing here to press.
   */
  agent?: { icon: IconComponent; label: string }
  onOpen: () => void
  /** Margins and width. Not the plate, the padding or the radius. */
  className?: string
}

export const TicketCard = memo(function TicketCard({
  tracker,
  ticketId,
  title,
  mark,
  status,
  tags = [],
  notes = [],
  copy,
  action,
  agent,
  onOpen,
  className = '',
}: TicketCardProps) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onOpen()
  }

  // The card opens the ticket, so without this one click on a control inside it would
  // both act AND navigate away from the button that was pressed. Stopped once, on the
  // cluster, rather than in each control: `ButtonIcon` and `CopyButton` take an
  // `onClick` with no event, and a design system's buttons should not have to know they
  // might be nested in something clickable.
  const stop = (event: MouseEvent) => event.stopPropagation()

  // The third band draws only when it HAS something. Without the guard a GitHub issue
  // with no author, no parent, no children and no labels would draw an empty row and
  // the gap above it.
  const hasMeta = !!status || tags.length > 0 || notes.length > 0

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={onKeyDown}
      className={`group flex flex-col gap-2 p-3 rounded-lg cursor-pointer transition-colors ${
        agent ? 'bg-green/10 hover:bg-green/15' : 'bg-surface hover:bg-surface-strong'
      } ${className}`.trim()}
    >
      {/* WHAT this is, and the two things you can do with it without opening it. One
          line, never wrapping: the id truncates before the buttons give up any width,
          because a half-visible id is still an id and a half-visible button is not a
          button. */}
      <div className="flex items-center gap-2 min-w-0">
        {/* The mark and the id as ONE chip, on the tracker's own ground. Always, on
            every card: a board mixes a repository's GitHub issues and its Jira tickets
            in the same columns, so this is what says which of the two a card came from. */}
        <TrackerBadge tracker={tracker} ticketId={ticketId} />
        {mark && (
          <Status
            label={mark.label}
            tone={mark.tone ?? 'neutral'}
            icon={mark.icon}
            markOnly
          />
        )}
        <span className="ml-auto flex items-center gap-1 flex-shrink-0" onClick={stop}>
          {copy && (
            <CopyButton
              value={copy.value}
              label={copy.label}
              copiedLabel={copy.copiedLabel}
              size="sm"
            />
          )}
          {/* THE SAME SLOT, THREE OUTCOMES — which is what keeps the cards of a column
              aligned whatever state they are in. An agent puts a mark where the button
              was; a card with neither leaves it empty. */}
          {agent ? (
            <span
              title={agent.label}
              aria-label={agent.label}
              role="img"
              className="flex items-center justify-center h-6 w-6 rounded-lg bg-green/20 text-green flex-shrink-0"
            >
              <Icon glyph={agent.icon} size="sm" tone="inherit" />
            </span>
          ) : action ? (
            <ButtonIcon
              icon={action.icon}
              title={action.title}
              onClick={action.onClick}
              tone={action.tone ?? 'ghost'}
              disabled={action.disabled}
              size="sm"
            />
          ) : null}
        </span>
      </div>

      <Text size="sm" className="line-clamp-2 leading-snug">
        {title}
      </Text>

      {hasMeta && (
        // `flex-wrap`, because in a column this WILL wrap and a row that clipped its
        // chips would be hiding the one piece of metadata people label tickets for.
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {status && (
            <Status label={status.label} tone={status.tone ?? 'neutral'} strength={status.strength} size="xs" />
          )}
          {tags.map((tag) => (
            <Label
              key={tag.id}
              size="xs"
              color={tag.color}
              title={tag.title ?? tag.label}
              truncate={tag.truncate}
              className={tag.truncate ? 'max-w-[10rem]' : ''}
            >
              {tag.label}
            </Label>
          ))}
          {notes.map((note) => (
            <Text
              key={note.id}
              tone="secondary"
              title={note.title ?? note.text}
              className="truncate max-w-[10rem]"
            >
              {note.text}
            </Text>
          ))}
        </div>
      )}
    </div>
  )
})
