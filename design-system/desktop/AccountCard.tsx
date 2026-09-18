import { AVATAR_SIZES } from './avatarSizes'
import { Avatar } from './Avatar'
import { Banner } from './Banner'
import type { CardAlert } from './cardAlert'
import { Button } from './Button'
import { FieldTable, type FieldTableAction, type FieldTableRow } from './FieldTable'
import { Icon } from './Icon'
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
 *
 * ── AN ACCOUNT IS NOT ALWAYS A PERSON ─────────────────────────────────────────────
 *
 * The Connections tab holds the SAME CARD about a service: who you are on Atlassian,
 * where, and the one button that ends it. It was drawn by hand there — its own plate,
 * its own hairline, its own `BTN_PRIMARY` string — and it had already drifted into a
 * different button height and a different padding from this one, which is the exact
 * drift this card was extracted to stop.
 *
 * So the three things that block did and this one could not are props now, and each is
 * a STATE of an account rather than a decoration:
 *
 *  • `mark` is the front, where `avatar` is a face. A service has no photo and its logo
 *    is the only thing on the card that says which service it is.
 *  • `alert` is the credential no longer being ACCEPTED — still on disk, still listed,
 *    and useless until it is renewed. That is not a row, because it is not a setting;
 *    it is a fact about the account the card is already showing, which is what `Banner`
 *    is for.
 *  • `note` is the promise at the foot: where the credential is kept and who never sees
 *    it. It is about the card as a whole rather than about any line of it.
 */

/**
 * The card's row and its controls ARE `FieldTable`'s, named here because the call sites
 * say `AccountCardRow` and because that is the honest name for what a caller of this
 * card is building. The shape left for the profile card to share it — see `FieldTable`,
 * which is where the three columns and every note about them now live.
 */
export type AccountCardAction = FieldTableAction
export type AccountCardRow = FieldTableRow

/**
 * THE FRONT OF A CARD ABOUT A SERVICE — a logo on its own tile, where a person gets a
 * face.
 *
 * ON `Avatar`'s `lg` GEOMETRY, read from the ladder rather than respelled: 44px of box
 * and a 24px glyph inside it. That is what keeps the identity band exactly as tall with
 * a mark as with a photo, so a page stacking the two kinds of card has one row height
 * and not two that nearly agree.
 *
 * SQUARE WHERE THE FACE IS ROUND, and that is the one difference worth having. A round
 * plate is a portrait convention; every one of these logos is drawn on a square grid
 * and a circle crops it. `rounded-xl` is the tile the repositories and the trackers
 * already wear everywhere else in the app.
 */
export interface AccountCardMark {
  /** The logo. `brand.tsx` holds the ones this product borrows. */
  glyph: IconComponent
  /**
   * The service's name — the tile's accessible name and its tooltip.
   *
   * NOT TRANSLATED, and it is the one string on this card that never is: "Jira" is
   * "Jira" in every language. It is still the caller's, because this folder has no
   * business knowing which services the app talks to.
   */
  title: string
  /**
   * The tile's ground, as a VALUE — `JIRA_CHIP_GROUND` and its kind, which travel with
   * the marks in `brand.tsx`.
   *
   * A brand's tint can never be a token: it is somebody else's colour, and a class in
   * this system's palette would be the app claiming it. Absent, the tile takes the
   * theme's own plate, which is what a mark painted in `currentColor` wants.
   */
  tint?: string
}

/**
 * SOMETHING IS WRONG WITH THIS ACCOUNT, and what to do about it — one band across the
 * card, under the identity it is about.
 *
 * `Banner` draws it, in its `inset` layout, which exists for exactly this: a band of a
 * card rather than a strip on a page, square and full-bleed, with the message and the
 * fix both wrapping. What the card adds is the negative margin that takes it to its own
 * edges, because the card has padding and the band must not.
 *
 * NOT A ROW. A row is a setting — a thing with a value that you can change. "Atlassian
 * is refusing this credential" has no value and nothing to set; it is the reason the
 * account above it does not work.
 */
export type AccountCardAlert = CardAlert

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
   * The front, for an account that is not a person's — see `AccountCardMark`.
   *
   * WITH `avatar` AND NOT BESIDE IT: a card has one subject, so it has one front. Both
   * would draw two, which is a card about two things.
   */
  mark?: AccountCardMark
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
  /**
   * The account is listed but not working — see `AccountCardAlert`. Absent is the
   * ordinary case and draws nothing.
   */
  alert?: AccountCardAlert
  /**
   * THE LAST LINE, under a hairline: what holds true for the whole card.
   *
   * Where this credential is kept and who never sees it, in the app's own words. It is
   * not a row for the reason the alert is not one — it names no setting — and it is not
   * a `hint`, because that line belongs to the identity above and this one belongs to
   * the card. Translated.
   */
  note?: string
  /** Margins and width. Not the ground, the padding or the radius. */
  className?: string
}

export function AccountCard({
  avatar,
  mark,
  name,
  hint,
  actions = [],
  rows = [],
  alert,
  note,
  className = '',
}: AccountCardProps) {
  return (
    <div className={`flex flex-col gap-4 rounded-xl bg-surface p-4 ${className}`.trim()}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {/* `lg` — 44px, large enough to read a face and small enough to sit on one
              line of a card. `portrait` rather than `initials`: there is only ever one
              account here and it is named in full a few pixels away, so a letter would
              add a decoration that reads like information — and an account with no photo
              has a drawn face of its own now, which is the thing this card is about. */}
          {avatar && <Avatar src={avatar.src} alt={avatar.alt} size="lg" fallback="portrait" />}

          {/* The service's front. The box and the glyph come from `AVATAR_SIZES.lg` —
              the face's own rung — so the two never disagree about how tall this band
              is; see `AccountCardMark`. `role="img"` with a name, because on a card
              that says "Not connected" the logo is the only thing naming the service,
              which makes it content rather than decoration. */}
          {mark && (
            <span
              role="img"
              aria-label={mark.title}
              title={mark.title}
              className={`${AVATAR_SIZES.lg.box} flex shrink-0 items-center justify-center rounded-xl ${
                mark.tint ? '' : 'bg-surface-strong'
              }`.trim()}
              style={mark.tint ? { backgroundColor: mark.tint } : undefined}
            >
              {/* `tone="inherit"`: a mark that paints itself keeps its own brand colours,
                  and one drawn in `currentColor` takes the card's ink. Either way the
                  design system has nothing to say about it. */}
              <Icon glyph={mark.glyph} size={AVATAR_SIZES.lg.glyph} tone="inherit" />
            </span>
          )}

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

      {/* THE BAND ABOUT THE ACCOUNT ITSELF, between the identity and the settings —
          `Banner` in the one layout built to be part of a card. `-mx-4` is the card's
          own padding, given back: an inset band is square because it spans its card
          edge to edge, and a square strip inset by 16px would read as a rounded shape
          somebody forgot to round. */}
      {alert && (
        <Banner
          layout="inset"
          variant={alert.variant ?? 'danger'}
          icon={alert.icon}
          hint={alert.hint}
          actions={alert.actions}
          className="-mx-4"
        >
          {alert.message}
        </Banner>
      )}

      {/* THE TABLE IS `FieldTable` NOW, and the hairline over its first row is what
          separates it from the identity band above — which is why `flush` is not passed
          here and is passed by the profile card, whose whole body is the table. */}
      {rows.length > 0 && <FieldTable rows={rows} />}

      {/* The foot, under its own hairline for the table's reason: what it says is about
          everything above it rather than about the line it follows. */}
      {note && (
        <Text size="xs" tone="secondary" className="border-t border-line-subtle pt-3 opacity-50">
          {note}
        </Text>
      )}
    </div>
  )
}
