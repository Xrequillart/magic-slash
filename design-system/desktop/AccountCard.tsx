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
 * different paddings. Here the difference is DATA — a face or no face, one row of
 * actions or two — and the arrangement is the same either way.
 *
 * NO BORDER. It was `bg-surface border border-line-strong rounded-xl`, and a hairline
 * around a plate that is already a different colour from the ground is the same thing
 * said twice — `Button`'s header states the rule and `RepositoryItem` learned it the
 * same way. The surface is what separates the card from the page behind it.
 *
 * ── THE ACTIONS ARRIVE AS DATA ────────────────────────────────────────────────────
 *
 * `Banner` made this move first and the argument is the same: the app was passing
 * RENDERED BUTTONS, so every call site re-decided the height, the tone and the gap, and
 * two buttons meaning the same thing on two surfaces did not match. A list of
 * `{ label, icon, onClick }` lets this card draw every one of them at one rung in one
 * tone family — and rank them, which a caller handing over finished markup cannot ask
 * for.
 *
 * TWO GROUPS, because the card has two rows and they mean different things. `actions`
 * sit beside the identity: they act on the SESSION — sign in, sign out, join with an
 * invitation. `manage` sits under a rule: it acts on the ACCOUNT itself — the photo,
 * the password, the email, and deleting the whole thing. A reader looking for "how do I
 * leave" and a reader looking for "how do I change my email" are not looking in the
 * same place, and the rule between them is what says so.
 *
 * THE RULE IS DRAWN ONLY WHEN THERE IS A SECOND ROW. Signed out there is nothing to
 * manage, so the card is one line and the hairline would be a divider under nothing.
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
  /**
   * PUSHED TO THE FAR END OF ITS ROW.
   *
   * Exactly one control in this card asks for it — deleting the account — and it is a
   * flag rather than a third group because the gap IS the statement: it is in the manage
   * row because that is what it manages, and it is held away from the rest because
   * nothing else in that row is irreversible.
   */
  trailing?: boolean
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
  /** The email, or the line saying nobody is signed in. Translated. */
  name: string
  /** The line under it, quieter. Translated. */
  hint?: string
  /** Beside the identity — what acts on the session. */
  actions?: AccountCardAction[]
  /** Under a rule — what acts on the account. Empty draws no rule. */
  manage?: AccountCardAction[]
  /** Margins and width. Not the ground, the padding or the radius. */
  className?: string
}

/**
 * One row of controls.
 *
 * `md` FOR BOTH ROWS, which is 28px and what the app's hand-built buttons already stood
 * at — `px-3 py-1.5 text-xs` around a 14px mark measures exactly that. So nothing moves
 * on screen and every control in the card is now the same height by construction rather
 * than because five class strings happened to agree.
 *
 * `flex-wrap` on the manage row and NOT on the one beside the identity: five controls
 * on a 48rem card wrap on a narrow window, and they are a set with no order to lose. The
 * identity row is a name and at most two buttons, and wrapping it would put the sign-out
 * under the email it belongs beside.
 */
function ActionRow({
  actions,
  wrap,
  className = '',
}: {
  actions: AccountCardAction[]
  wrap?: boolean
  className?: string
}) {
  return (
    // `w-full` on the wrapping row and not on the other, because it is what makes
    // `trailing`'s `ml-auto` mean anything: a shrink-to-content row has no spare space
    // for an auto margin to take, so the one control held away from the rest would sit
    // flush against them.
    <div
      className={`flex items-center gap-2 ${wrap ? 'w-full flex-wrap' : 'flex-shrink-0'} ${className}`.trim()}
    >
      {actions.map((action) => (
        <Button
          key={action.id}
          size="md"
          tone={action.tone ?? 'neutral'}
          icon={action.icon}
          busy={action.busy}
          disabled={action.disabled}
          onClick={action.onClick}
          className={action.trailing ? 'ml-auto' : ''}
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
  manage = [],
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

        {actions.length > 0 && <ActionRow actions={actions} />}
      </div>

      {/* THE RULE IS THE ROW'S OWN, not a wrapper around it: a second flex container
          here would have been a shrink-to-content row inside a full-width one, and the
          `ml-auto` that holds the destructive action apart would have had no space to
          take. */}
      {manage.length > 0 && (
        <ActionRow actions={manage} wrap className="border-t border-line-subtle pt-3" />
      )}
    </div>
  )
}
