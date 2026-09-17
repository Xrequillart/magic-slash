import { Avatar } from './Avatar'
import { Button } from './Button'
import { FieldTable, type FieldTableAction, type FieldTableRow } from './FieldTable'
import { Text } from './Text'

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
 * THE TABLE ITSELF IS `FieldTable`, and every note about its three columns lives there.
 * It left this file as soon as the profile card wanted the same thing — six fields,
 * their values, an edit button each — because two cards drawing their own grid is two
 * grids that agree today and disagree after the next change to either.
 *
 * WHAT STAYS HERE is the band above it: who is signed in, and what acts on the SESSION.
 * That is the whole of the difference between this card and the profile one.
 *
 * THE RULE OVER THE FIRST ROW is therefore not decoration: it separates the settings
 * from the identity, which is the division the old card already made and the only one
 * worth keeping. A reader looking for "how do I leave" and a reader looking for "how do
 * I change my email" are not looking in the same place. Signed out there are no settings
 * at all, so the card is one line and draws no rule under nothing.
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
 * The card's row and its controls ARE `FieldTable`'s, named here because the call sites
 * say `AccountCardRow` and because that is the honest name for what a caller of this
 * card is building. The shape left for the profile card to share it — see `FieldTable`,
 * which is where the three columns and every note about them now live.
 */
export type AccountCardAction = FieldTableAction
export type AccountCardRow = FieldTableRow

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

      {/* THE TABLE IS `FieldTable` NOW, and the hairline over its first row is what
          separates it from the identity band above — which is why `flush` is not passed
          here and is passed by the profile card, whose whole body is the table. */}
      {rows.length > 0 && <FieldTable rows={rows} />}
    </div>
  )
}
