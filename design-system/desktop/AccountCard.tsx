import { Fragment } from 'react'
import { Avatar } from './Avatar'
import { Button, type ButtonTone } from './Button'
import { Text } from './Text'
import type { IconComponent } from './types'

/**
 * WHO IS SIGNED IN, and everything you can do about it — the card at the top of the
 * account page.
 *
 * ONE CARD FOR BOTH STATES, which is the first thing worth saying because the app drew
 * it as two: a signed-in branch with a face, a name and a row of five controls, and a
 * signed-out branch with two lines of text and a pair of buttons. They shared a plate
 * and nothing else, so the two halves had drifted into different button heights and
 * different paddings. Here the difference is DATA — a face or no face, a list of
 * settings or none — and the arrangement is the same either way.
 *
 * NO BORDER. It was `bg-surface border border-line-strong rounded-xl`, and a hairline
 * around a plate that is already a different colour from the ground is the same thing
 * said twice — `Button`'s header states the rule and `RepositoryItem` learned it the
 * same way. The surface is what separates the card from the page behind it.
 *
 * ── THE SETTINGS ARE A TABLE ──────────────────────────────────────────────────────
 *
 * The five things you can change about an account used to be FIVE BUTTONS IN A WRAPPING
 * ROW under a rule, ranked only by order and by one `ml-auto` holding the destructive
 * one apart. That arrangement answers "what can I press" and refuses to answer "what is
 * it set to": a row of verbs has nowhere to put the email address the change-email
 * button is about to change, so the address lived in the card's title and the photo had
 * no representation at all beyond the face.
 *
 * THREE COLUMNS: the name of the setting, its value, and what you can do about it. The
 * point of columns over five self-contained lines is that the eye stops hunting — every
 * value starts at the same x, so "what is my email" is one downward scan of one column
 * rather than five left-to-right reads. It is also what makes the labels a LIST: they
 * line up, so `Avatar` and `Password` read as members of one set rather than as two
 * strings that happen to begin two rows.
 *
 * `max-content minmax(0,1fr) auto`, and the order of those three IS the layout. The
 * labels take exactly the width of the longest of them and no more, so that column is
 * as narrow as its contents allow; the actions take exactly what their buttons need;
 * and the VALUE gets everything left over, because it is the column holding the thing
 * that can be arbitrarily long — an address, a three-clause warning — and the only one
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
 * sized its own columns would align with nothing, and five of them would be five
 * tables stacked up. So each row is a `Fragment` contributing three cells to one grid,
 * and the column widths are decided once, across all of them.
 *
 * THE CARD DOES NOT KNOW WHAT KIND OF VALUE IT IS DRAWING. `camille@acme.dev` is an
 * address, `••••••••` is a stand-in, `16 September 2026` is a date and `No username
 * yet` is an absence — all four are the same `value` prop, because drawing them
 * differently would be the card claiming to understand what the app put there. `unset`
 * is the one distinction it draws, and it draws it because the app said so rather than
 * by inspecting the string.
 *
 * THE RULES ARE BETWEEN THE ROWS AND ABOVE THE FIRST. The one above separates the
 * settings from the identity, which is the division the old card already made and the
 * only one worth keeping: a reader looking for "how do I leave" and a reader looking
 * for "how do I change my email" are not looking in the same place. Signed out there
 * are no settings at all, so the card is one line and draws no rule under nothing.
 *
 * ── THE ACTIONS ARRIVE AS DATA ────────────────────────────────────────────────────
 *
 * `Banner` made this move first and the argument is the same: the app was passing
 * RENDERED BUTTONS, so every call site re-decided the height, the tone and the gap, and
 * two buttons meaning the same thing on two surfaces did not match. A list of
 * `{ label, icon, onClick }` lets this card draw every one of them at one rung in one
 * tone family.
 *
 * `actions` sit beside the IDENTITY and act on the session — sign in, sign out, join
 * with an invitation. Everything else acts on one setting and belongs to that setting's
 * line.
 */

/**
 * One control. `Banner`'s shape, plus the two states a control that talks to a server
 * needs — which that one does not, because a banner's actions are all local.
 */
export interface AccountCardAction {
  /** Stable across renders — 'sign-out', 'change-email'. Not an index. */
  id: string
  /** The word on it, already translated. */
  label: string
  onClick: () => void
  /** A mark before the word. Optional, and every one of the app's carries one. */
  icon?: IconComponent
  /**
   * How loud. `neutral` unless stated — the card's controls are almost all equal.
   *
   * `accent` IS THE ONE AFFIRMATIVE ACTION and there is at most one per card: signing
   * in, on a card with nobody signed in. `danger` is tinted rather than filled, which is
   * `Button`'s own judgement and the right one here — deleting an account should read as
   * available, never as the obvious next step.
   */
  tone?: Extract<ButtonTone, 'neutral' | 'accent' | 'danger'>
  /** The action is in flight. Spins the mark and blocks a second press. */
  busy?: boolean
  disabled?: boolean
}

/**
 * One setting, as three cells: what it is CALLED, what it is SET TO, and what you can
 * do about it.
 *
 * The three are separate props rather than one composed string because they are three
 * COLUMNS, and a column only reads as one if every row puts the same kind of thing in
 * it. A caller that composed "Email: camille@acme.dev" itself would be handing the
 * table a single cell, and the alignment would be gone.
 */
export interface AccountCardRow {
  /** Stable across renders — 'email', 'password'. Not an index. */
  id: string
  /** Column one: what the setting is called. Already translated. */
  label: string
  /**
   * Column two: what it is set to — an address, a handle, a date, a row of bullets
   * standing in for a password.
   *
   * ABSENT IS LEGITIMATE and means this setting has no value to show: deleting an
   * account is a thing you do, not a thing that is set to something. That cell then
   * holds the `hint` alone, which is how the longest explanation on the card gets the
   * width it needs without a column of its own.
   */
  value?: string
  /**
   * The value is not chosen yet, so `value` is standing in for one — "No username
   * yet". Draws it quiet, so an absence does not read as a value.
   */
  unset?: boolean
  /**
   * The line under the value, quieter — what the setting means, or what pressing its
   * button is going to do.
   *
   * IT WRAPS, where the value truncates, and the two are opposite on purpose. A value
   * is a VALUE: an address cut short still shows its beginning and keeps a `title` to
   * recover the rest, and a table whose row heights depended on how long somebody's
   * email is would be ragged. A hint is a SENTENCE, and half a sentence is not a
   * shorter sentence — the clause that gets cut is the one at the end, which is where
   * "this cannot be undone" lives.
   */
  hint?: string
  /** Column three. One or two; the avatar's row is the only one with two. */
  actions: AccountCardAction[]
}

export interface AccountCardProps {
  /**
   * The face. ABSENT IS A STATE and not a missing prop: nobody is signed in, so there is
   * no person to draw and the card opens on the name alone. `{ src: null }` is the other
   * case — somebody IS signed in and has never uploaded a photo, which draws the badge.
   *
   * `alt` is the caller's for `Avatar`'s reason: this folder cannot read a translation.
   */
  avatar?: { src: string | null; alt: string }
  /**
   * WHO THIS IS: the handle they picked, the email address while they have not picked
   * one, or the line saying nobody is signed in. Which of those it is, is the app's
   * decision — see the header. Translated.
   */
  name: string
  /** The line under it, quieter. Translated. */
  hint?: string
  /** Beside the identity — what acts on the SESSION. */
  actions?: AccountCardAction[]
  /** One line per setting, under a rule. Empty draws no rule. */
  rows?: AccountCardRow[]
  /** Margins and width. Not the ground, the padding or the radius. */
  className?: string
}

/**
 * The controls on the right of a line.
 *
 * `sm` AND NOT THE `md` THE WRAPPING ROW USED. 28px was right for a row of five buttons
 * carrying the whole weight of the section; here the line itself is the object and the
 * buttons are what you do to it, so they sit a rung quieter — the same rung
 * `RepositoryItem` puts its own row controls at.
 *
 * `flex-shrink-0`, so a long email truncates and the buttons do not: the value is the
 * part with a `title` and an ellipsis to fall back on, and a button squeezed to half its
 * label is unreadable with nothing to recover it.
 */
function RowActions({ actions }: { actions: AccountCardAction[] }) {
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

export function AccountCard({
  avatar,
  name,
  hint,
  actions = [],
  rows = [],
  className = '',
}: AccountCardProps) {
  return (
    <div className={`flex flex-col gap-4 rounded-xl bg-surface p-4 ${className}`.trim()}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {/* `lg` — 44px, large enough to read a face and small enough to sit on one
              line of a card. `badge` rather than `initials`: there is only ever one
              account here and it is named in full a few pixels away, so a letter would
              add a decoration that reads like information. */}
          {avatar && <Avatar src={avatar.src} alt={avatar.alt} size="lg" fallback="badge" />}

          <div className="flex min-w-0 flex-col">
            <Text size="sm" weight="medium" className="truncate" title={name}>
              {name}
            </Text>
            {hint && (
              <Text size="xs" tone="secondary" className="mt-0.5 truncate opacity-50">
                {hint}
              </Text>
            )}
          </div>
        </div>

        {actions.length > 0 && (
          <div className="flex flex-shrink-0 items-center gap-2">
            {actions.map((action) => (
              <Button
                key={action.id}
                size="md"
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
        )}
      </div>

      {/* ONE GRID FOR EVERY ROW, so the three columns are measured once and the
          labels and buttons of five rows line up. `max-content` gives the label column
          exactly the width of the longest label and not a pixel more; `auto` gives the
          actions what their buttons need; `1fr` hands the rest to the value, which is
          the only column whose contents can be arbitrarily long.

          THE RULE IS EACH CELL'S OWN `border-t` and not a `divide-y` on the grid: the
          rule above the FIRST row is the one separating the settings from the identity,
          and `divide-y` is precisely the spelling that omits it. `Item` makes the same
          choice for the same reason.

          THE LAST ROW'S PADDING IS DROPPED BY INDEX rather than by `last:`, because in
          a grid `:last-child` is the last CELL — the third one of the last row — so a
          `last:pb-0` would unpad one cell of three and leave the row lopsided. */}
      {rows.length > 0 && (
        <div className="grid grid-cols-[max-content_minmax(0,1fr)_auto]">
          {rows.map((row, index) => {
            const cell = `border-t border-line-subtle pt-3 ${index === rows.length - 1 ? '' : 'pb-3'}`
            return (
              <Fragment key={row.id}>
                {/* `min-h-7` on the first line of all three cells — the height of a
                    `sm` button — so the label, the value and the buttons share one
                    band whatever the row's total height. Without it a row carrying a
                    three-line hint would centre its label against the whole block and
                    the column would stop reading as a column. */}
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
      )}

    </div>
  )
}
