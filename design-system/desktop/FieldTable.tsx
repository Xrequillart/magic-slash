import { Fragment } from 'react'
import { Button, type ButtonTone } from './Button'
import { Text } from './Text'
import type { IconComponent } from './types'

/**
 * A LIST OF SETTINGS AS A TABLE — what each one is called, what it is set to, and what
 * you can do about it.
 *
 * It came out of `AccountCard`, where it was the whole of the card below the identity
 * band, and it left as soon as a second card wanted the same thing: the profile card is
 * the same question asked about a different subject — six fields, their values, an edit
 * button each. Two cards drawing their own three-column grid is two grids that agree
 * today and disagree after the next change to either.
 *
 * ── THREE COLUMNS ─────────────────────────────────────────────────────────────────
 *
 * The name of the setting, its value, and what you can do about it. The point of
 * columns over a stack of self-contained lines is that the eye stops hunting: every
 * value starts at the same x, so "what is my email" is one downward scan of one column
 * rather than five left-to-right reads. It is also what makes the labels a LIST — they
 * line up, so `Avatar` and `Password` read as members of one set rather than as two
 * strings that happen to begin two rows.
 *
 * `max-content minmax(0,1fr) auto`, and the order of those three IS the layout. The
 * labels take exactly the width of the longest of them and no more, so that column is as
 * narrow as its contents allow; the actions take exactly what their buttons need; and
 * the VALUE gets everything left over, because it is the column holding the thing that
 * can be arbitrarily long — an address, a paragraph of free prose — and the only one
 * where extra width buys anything.
 *
 * `minmax(0,1fr)` AND NOT `1fr`, which is the whole difference between a value that
 * truncates and a card that a long address pushes off its own edge. A `1fr` track floors
 * at `auto`, so it never shrinks below its content's minimum — and an email address has
 * no break opportunity, so that minimum is the entire string. `min-w-0` on the cell is
 * not enough on its own: it frees the ITEM, while the TRACK is still sized from the
 * content. Tailwind's own `grid-cols-*` emit `minmax(0, 1fr)` for exactly this reason;
 * an arbitrary value does not get that for free.
 *
 * ONE GRID AND NOT A GRID PER ROW, which is the mistake this shape invites: a row that
 * sized its own columns would align with nothing, and five of them would be five tables
 * stacked up. So each row is a `Fragment` contributing three cells to one grid, and the
 * column widths are decided once, across all of them.
 *
 * ── IT DOES NOT KNOW WHAT IT IS DRAWING ───────────────────────────────────────────
 *
 * `camille@acme.dev` is an address, `••••••••` is a stand-in, `16 September 2026` is a
 * date and `No username yet` is an absence — all four are the same `value` prop, because
 * drawing them differently would be the table claiming to understand what the app put
 * there. `unset` is the one distinction it draws, and it draws it because the app said
 * so rather than by inspecting the string.
 *
 * ── NO PLATE, NO RADIUS, NO PADDING ───────────────────────────────────────────────
 *
 * It is the ROWS and the card around it is the PANEL, the split this folder makes
 * everywhere (`CollapsibleLine`/`PullRequestCard`, `CommitLine`/`CommitCard`). What it
 * does draw is the hairline ABOVE each row, first one included — that rule is what
 * separates the table from whatever the card puts above it, and a `divide-y` is
 * precisely the spelling that omits it.
 */

/** One control on the right of a row. */
export interface FieldTableAction {
  /** Stable across renders — 'change-email', 'edit-role'. Not an index. */
  id: string
  /** The word on it, already translated. */
  label: string
  onClick: () => void
  /** A mark before the word. Optional, and every one of the app's carries one. */
  icon?: IconComponent
  /**
   * How loud. `neutral` unless stated — these controls are almost all equal.
   *
   * `danger` is tinted rather than filled, which is `Button`'s own judgement and the
   * right one here: deleting an account should read as available, never as the obvious
   * next step.
   */
  tone?: Extract<ButtonTone, 'neutral' | 'accent' | 'danger'>
  /** The action is in flight. Spins the mark and blocks a second press. */
  busy?: boolean
  disabled?: boolean
}

/**
 * One setting, as three cells.
 *
 * The three are separate props rather than one composed string because they are three
 * COLUMNS, and a column only reads as one if every row puts the same kind of thing in
 * it. A caller that composed "Email: camille@acme.dev" itself would be handing the table
 * a single cell, and the alignment would be gone.
 */
export interface FieldTableRow {
  /** Stable across renders — 'email', 'password'. Not an index. */
  id: string
  /** Column one: what the setting is called. Already translated. */
  label: string
  /**
   * Column two: what it is set to.
   *
   * ABSENT IS LEGITIMATE and means this setting has no value to show: deleting an
   * account is a thing you do, not a thing that is set to something. That cell then
   * holds the `hint` alone, which is how the longest explanation on a card gets the
   * width it needs without a column of its own.
   */
  value?: string
  /**
   * The value is not chosen yet, so `value` is standing in for one — "No username yet",
   * "Nothing written yet". Draws it quiet, so an absence does not read as a value.
   */
  unset?: boolean
  /**
   * The line under the value, quieter — what the setting means, or what pressing its
   * button is going to do.
   *
   * IT WRAPS, where the value truncates, and the two are opposite on purpose. A value is
   * a VALUE: an address cut short still shows its beginning and keeps a `title` to
   * recover the rest, and a table whose row heights depended on how long somebody's
   * email is would be ragged. A hint is a SENTENCE, and half a sentence is not a shorter
   * sentence — the clause that gets cut is the one at the end, which is where "this
   * cannot be undone" lives.
   */
  hint?: string
  /** Column three. One or two; a row with two is the exception. */
  actions: FieldTableAction[]
}

export interface FieldTableProps {
  rows: FieldTableRow[]
  /**
   * Drop the hairline above the FIRST row.
   *
   * Default is to draw it, because the usual caller puts something above the table — an
   * identity band, an intro line — and that rule is what separates the two. A card whose
   * whole body is the table wants it gone: a hairline across the top of a plate, with
   * nothing above it, is a line dividing the card from its own edge.
   */
  flush?: boolean
  /** Margins and width. Not the columns, the padding or the dividers. */
  className?: string
}

/**
 * The controls on the right of a row.
 *
 * `sm` — 28px. The row itself is the object and the buttons are what you do to it, so
 * they sit a rung quieter than a button carrying a section.
 *
 * `flex-shrink-0`, so a long value truncates and the buttons do not: the value is the
 * part with a `title` and an ellipsis to fall back on, and a button squeezed to half its
 * label is unreadable with nothing to recover it.
 */
function RowActions({ actions }: { actions: FieldTableAction[] }) {
  return (
    <div className="flex flex-shrink-0 items-center gap-2">
      {actions.map((action) => (
        <Button
          key={action.id}
          size="sm"
          tone={action.tone ?? 'neutral'}
          icon={action.icon}
          busy={action.busy}
          disabled={action.disabled}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      ))}
    </div>
  )
}

export function FieldTable({ rows, flush = false, className = '' }: FieldTableProps) {
  if (rows.length === 0) return null

  return (
    <div className={`grid grid-cols-[max-content_minmax(0,1fr)_auto] ${className}`.trim()}>
      {rows.map((row, index) => {
        /* THE LAST ROW'S PADDING IS DROPPED BY INDEX rather than by `last:`, because in
           a grid `:last-child` is the last CELL — the third one of the last row — so a
           `last:pb-0` would unpad one cell of three and leave the row lopsided. The
           first row's rule goes the same way, for the same reason. */
        const rule = index === 0 && flush ? '' : 'border-t border-line-subtle'
        const cell = `${rule} pt-3 ${index === rows.length - 1 ? '' : 'pb-3'}`
        return (
          <Fragment key={row.id}>
            {/* `min-h-7` on the first line of all three cells — the height of a `sm`
                button — so the label, the value and the buttons share one band whatever
                the row's total height. Without it a row carrying a three-line hint would
                centre its label against the whole block and the column would stop
                reading as a column. */}
            <div className={`${cell} flex min-h-7 items-center pr-6`}>
              <Text size="sm" tone="secondary" className="whitespace-nowrap opacity-70">
                {row.label}
              </Text>
            </div>

            <div className={`${cell} flex min-w-0 flex-col justify-center pr-4`}>
              {row.value && (
                <div className="flex min-h-7 min-w-0 items-center">
                  {/* `title` recovers what truncation cut — which is why the value
                      truncates and the hint below it does not. */}
                  <Text
                    size="sm"
                    tone={row.unset ? 'secondary' : 'ink'}
                    className={`truncate ${row.unset ? 'opacity-60' : ''}`.trim()}
                    title={row.value}
                  >
                    {row.value}
                  </Text>
                </div>
              )}
              {row.hint && (
                <Text
                  size="xs"
                  tone="secondary"
                  className={`max-w-prose opacity-50 ${row.value ? 'mt-0.5' : 'flex min-h-7 items-center'}`}
                >
                  {row.hint}
                </Text>
              )}
            </div>

            <div className={`${cell} flex min-h-7 items-center justify-end`}>
              <RowActions actions={row.actions} />
            </div>
          </Fragment>
        )
      })}
    </div>
  )
}
