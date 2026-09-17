import { FieldTable, type FieldTableRow } from './FieldTable'
import { Text } from './Text'

/**
 * WHO THE HUMAN IS, as the skills read it — a name, a role, a level, a style, the
 * languages they want to be spoken to in, and whatever else they wrote about themselves.
 *
 * IT IS `AccountCard`'S TABLE, and that is the whole design: the two cards sit one above
 * the other on the account page and they answer the same kind of question about
 * different subjects. One says what your account is set to, the other what you are like.
 * Drawing them differently would have been two answers to one question, on one page.
 * `FieldTable` is the shared drawing; this file is the plate around it.
 *
 * ── WHAT IT REPLACED, AND WHY ─────────────────────────────────────────────────────
 *
 * Every field used to be edited IN PLACE: a row of pills per field, a text input pinned
 * right, a textarea across the bottom, each writing on click or on blur. That is a
 * pleasant thing to use and an unreadable thing to scan — six controls stacked in a card
 * are six controls whether or not you came to change one, and the values you came to
 * READ were whichever pill happened to be lit. A table answers "what am I set to" first
 * and "how do I change it" second, which is the order a settings page is read in.
 *
 * So the editing went behind a modal, one per row. That is also what makes the free-text
 * field possible at all: a textarea has no place in a value column, and as a modal it
 * finally gets the width and the height that prose needs.
 *
 * ── NO PLATE OF ITS OWN BEYOND THE CARD'S ─────────────────────────────────────────
 *
 * `bg-surface rounded-xl` — the page's card material and the family radius, the same one
 * `AccountCard` and `ChecklistCard` stand on, because all three sit on the same page.
 *
 * NO BORDER. It had `border border-line-strong`, and a hairline around a plate that is
 * already a different colour from the page is the same thing said twice — `Button`
 * states the rule and every card on this page has since learned it. The hairlines
 * BETWEEN the rows stay: separating two things that are both here is a different job
 * from drawing a line around the whole.
 *
 * `flush` ON THE TABLE, which `AccountCard` does not pass. There, the rule over the
 * first row separates the settings from the identity band above them; here the table IS
 * the body, and a hairline across the top of a plate with nothing above it is a line
 * dividing the card from its own edge.
 */

export interface ProfileCardProps {
  /** One row per field: what it is called, what it says, and the button that edits it. */
  rows: FieldTableRow[]
  /**
   * A line ABOVE the table, for the state where there is no profile yet: what this is
   * for and why it is worth filling in.
   *
   * Absent once a profile exists, because by then the rows speak for themselves and a
   * standing explanation is a sentence the reader has already read.
   */
  intro?: string
  /**
   * A line UNDER the table, in the warning colour: a required field is still empty, so
   * nothing is being saved.
   *
   * IT IS NOT OPTIONAL POLISH. Every row here writes on its own, and a profile missing
   * its name, role or level cannot be written at all — so without this line the card
   * accepts six edits in a row and keeps none of them, while looking exactly like a card
   * that is working. The app decides when to pass it; this only draws it.
   */
  warning?: string
  /** Margins and width. Not the ground, the padding or the radius. */
  className?: string
}

export function ProfileCard({ rows, intro, warning, className = '' }: ProfileCardProps) {
  return (
    <div className={`flex flex-col rounded-xl bg-surface p-4 ${className}`.trim()}>
      {intro && (
        <Text size="xs" tone="secondary" className="mb-3 block max-w-prose opacity-60">
          {intro}
        </Text>
      )}

      {/* `flush` because this table IS the card's body — see the note at the top. */}
      <FieldTable rows={rows} flush={!intro} />

      {warning && (
        /* The one colour this card carries, and it is `yellow` rather than `red` for
           `ChecklistCard`'s reason: nothing has gone wrong, there is simply something
           still to fill in. A red line here would read as an error the reader caused. */
        <Text size="xs" tone="inherit" className="mt-3 block max-w-prose text-yellow">
          {warning}
        </Text>
      )}
    </div>
  )
}
