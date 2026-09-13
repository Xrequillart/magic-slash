import { Card } from './Card'
import { EditableText, type EditableTextProps } from './EditableText'
import { Label, type LabelProps } from './Label'
import { Status, type StatusProps } from './Status'

/**
 * Who an agent is: the ticket it is on, where that ticket stands, and the two things
 * a person wrote about it.
 *
 * FOUR FACTS IN ONE CARD, in the order a reader needs them. The ticket and the status
 * share the top row because they are the same question asked twice — WHICH piece of
 * work, and HOW FAR — and a reader scanning a column of agents answers both from that
 * row without reading a word. The title and the description are underneath because
 * they are what you read once you have found the agent you wanted.
 *
 * BOTH HALVES OF THE TOP ROW MAY BE ABSENT, and they are absent for different reasons.
 * An agent with no status has not reported one yet; an agent with no ticket has one to
 * be given, which is why the empty slot is still a control — see `quiet` on `Label`.
 * The row survives either way rather than collapsing, because a card whose header
 * appears and disappears reads as two different cards.
 *
 * EVERYTHING ARRIVES AS DATA. The ticket is a `Label`'s props, the status is a
 * `Status`'s, and each field is an `EditableText`'s — so the app decides which tracker
 * a ticket belongs to, which states exist and what the strings say, and this decides
 * only where the four of them sit. The same split every card in this folder makes.
 */

export interface TitleAgentCardProps {
  /**
   * The ticket, as the badge that opens it — or the invitation to pick one, which is
   * the same badge wearing `quiet`. One prop for both, because the slot is the slot: a
   * card whose header changed shape with the state would be two cards.
   *
   * Absent entirely only where there is no slot at all.
   */
  ticket?: Omit<LabelProps, 'size' | 'truncate'>
  /**
   * Where the work stands, and the picker that moves it. Absent while an agent has
   * reported nothing — which is not the same as a status of "none", and the card says
   * so by drawing nothing rather than an empty pill.
   *
   * ONLY `size` IS THE CARD'S: the row stands at one height. `className` stays the
   * caller's, as it does on the ticket beside it — `Status` already limits it to
   * layout, and taking it away here would leave no way to hang a margin or a marker on
   * the pill. The site's scroll tour rings this one through it.
   */
  status?: Omit<StatusProps, 'size'>
  /** The agent's own name. A heading, and the card's loudest line. */
  title: Omit<EditableTextProps, 'variant' | 'multiline' | 'as' | 'className'>
  /** What it is for, in a line or two. */
  description: Omit<EditableTextProps, 'variant' | 'multiline' | 'as' | 'className'>
  /** Margins. Not the ground, the radius or the padding — those are the card's. */
  className?: string
}

export function TitleAgentCard({
  ticket,
  status,
  title,
  description,
  className = '',
}: TitleAgentCardProps) {
  return (
    /**
     * NO `overflow-hidden`, which a card is otherwise tempting to give: the status
     * picker is an absolutely positioned panel that hangs BELOW this row, and a card
     * that clipped its own children would cut the menu off at the first option.
     */
    <Card className={className}>
      <div className="flex items-center justify-between mb-3 gap-2">
        {ticket ? <Label {...ticket} size="sm" /> : <span />}
        {status && <Status {...status} />}
      </div>

      <EditableText as="h2" variant="title" {...title} />

      {/* `mt-1` and not the `mt-3` this was: both fields carry `py-1.5` of their own, so
          12px of margin sat on top of 12px of padding and pushed a description away from
          the title it belongs to. 4px keeps the two hover grounds from touching while
          still reading as one block. */}
      <div className="mt-1">
        <EditableText multiline {...description} />
      </div>
    </Card>
  )
}
