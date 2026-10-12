import type { ReactNode } from 'react'
import { Avatar } from './Avatar'
import type { AvatarSize } from './avatarSizes'
import { Banner } from './Banner'
import type { CardAlert } from './cardAlert'
import { Card } from './Card'
import { Text } from './Text'

/**
 * ONE TURN IN A CONVERSATION: who said it and when, then what they said.
 *
 * THE DESCRIPTION IS ONE OF THESE TOO, and that is the decision the component is built
 * on. A ticket page is a description followed by a thread, and giving the replies a
 * different card would say they are a different kind of thing — they are not; the
 * description is simply the first turn. What separates them is the STRIP: the
 * description's names the field ("Description"), a comment's names a person.
 *
 * ── NO BORDER, AND NO PLATE UNDER THE STRIP EITHER ────────────────────────────────
 *
 * It was `border border-line-field` around the card and `bg-surface-subtle border-b
 * border-line-subtle` under the strip — a box, ruled off from a second box, on a page
 * whose every other edge has gone. The card is the plate now and the strip is just its
 * first line: quiet ink, then the body under it. A reader loses nothing, because the
 * strip was never distinguished by its ground — it was distinguished by being a name and
 * a date where the rest is prose.
 *
 * ── THE BODY IS `children` ────────────────────────────────────────────────────────
 *
 * The one node this file takes, and it has to be: a comment body is rendered markdown,
 * and the renderer lives in the app. What this owns is the plate, the strip, the measure
 * and the words for a turn that carried no text at all.
 *
 * ── A SECOND SURFACE, AND WHY IT IS THIS COMPONENT AND NOT A THIRD ────────────────
 *
 * A comment left on a passage of a plan's spec is the same object: somebody said
 * something, at a time, and here is what they said. It is drawn inside a card spliced
 * into the prose rather than on the app's ground, and its people have faces rather than
 * only names — which is the whole of what `ground="bare"` and `avatar` are for. Giving
 * that turn a component of its own would have said it is a different kind of thing, and
 * the two would have drifted at the first change to either.
 */

export interface CommentCardProps {
  /**
   * Who wrote it, ALREADY DECORATED — `@ada` on a tracker whose people are handles,
   * `Ada Lovelace` on one whose people are names.
   *
   * The `@` is the caller's and not this file's, and the distinction is real: a login is
   * a handle and wears one everywhere in that product, while `@Ada Lovelace` reads as a
   * mention of an account that does not exist.
   *
   * Absent, `title` is drawn instead — for the description, and for the turns neither
   * tracker attributes: an app posting through an API, an account since deleted.
   */
  author?: string
  /**
   * The verb after the name — "commented". Already translated, and only ever drawn
   * beside an `author`.
   */
  verb?: string
  /**
   * What the strip says when there is no author: "Description", "Comment". Already
   * translated.
   */
  title?: string
  /** When, already formatted. At the far end of the strip. */
  date?: string
  /**
   * That it was changed after it was posted — the word, and the full sentence for the
   * pointer.
   *
   * IN THE TOOLTIP AND NOT ON THE STRIP, which has one line and a name already on it.
   */
  edited?: { label: string; title: string }
  /**
   * What the body says when there is none. A turn with no text is still a turn — an
   * attachment, a reaction, a transition a tracker recorded as a comment — so it keeps
   * its card and says so rather than rendering as an empty box.
   */
  empty?: string
  /**
   * A FACE BEFORE THE NAME, when the surface has one to draw.
   *
   * Optional, and absent is not a degraded card: a tracker's comments come from queries
   * that ask for a login and deliberately never select an avatar url, so a photo there
   * would be a network round trip per author. A plan's comments come from an
   * organization's own roster, where the bytes are already in hand.
   *
   * The whole `Avatar` contract rather than a bare url, because the two fallbacks are
   * genuinely different answers: `portrait` for a person with an account and no photo,
   * `initials` for somebody this app knows only by a handle. `alt` is normally the empty
   * string here — the name is printed in the very next breath, and an alt repeating it
   * makes a screen reader say the same person twice per turn.
   */
  avatar?: { src: string | null; alt: string; size?: AvatarSize; fallback?: 'portrait' | 'glyph' | 'initials'; name?: string }
  /**
   * Controls at the end of the strip — Edit, Delete, Reply.
   *
   * A NODE AND NOT A LIST OF HANDLERS, on the same reasoning as `children`: what a reply
   * button looks like is this file's business, but which actions a turn offers, what they
   * are called and who may see them is entirely the app's — it depends on who is logged in
   * and on policies this folder cannot read. After `date`, which keeps the timestamp where
   * it sits on every other card in the app.
   */
  actions?: ReactNode
  /**
   * Whether the turn brings its own plate.
   *
   * `card` is the default and is what a ticket page draws: a raised surface on the app's
   * ground. `bare` drops the plate, the padding and the radius, for a turn rendered INSIDE
   * a surface that already has all three — a comment card spliced into prose, where a
   * second plate would read as a box inside a box. Everything else about the turn — the
   * strip, the order, the words for an empty body — is identical, which is the point of
   * the prop: it is the same component either way, so the two surfaces cannot drift.
   *
   * A rung and not a `className`, for `Card`'s own reason: two ground or padding classes
   * on one element are decided by Tailwind's emit order, not by who passed them.
   */
  ground?: 'card' | 'bare'
  /**
   * A WRITE ON THIS TURN THAT DID NOT LAND — see `CardAlert`, the one shape the cards in
   * this folder share.
   *
   * UNDER THE BODY, where `SettingsCard` and `HealthCard` put theirs, and not inset at the
   * card's edges the way `AccountCard` does. Two reasons, and both are facts about this
   * card rather than preferences: a turn is drawn on two grounds — `card` with `px-5 py-4`
   * and `bare` with none at all — so a full-bleed band would need the padding given back
   * twice, once per rung; and what a turn's strip reports is something that happened to the
   * WORDS above it, so it belongs after them, where the eye already is, rather than between
   * the name and what was said.
   *
   * `stacked` is the layout it wears, which is this file's decision and not the caller's
   * (`CardAlert` deliberately carries no `layout`): a turn is as narrow as the column it is
   * spliced into — a comment on a passage of prose lives inside the document's own measure —
   * and a `row` there would push its sentence into a column two words wide.
   *
   * Absent is the ordinary case and draws nothing.
   */
  alert?: CardAlert
  children?: ReactNode
  /** Margins and width. Not the plate, the padding or the radius. */
  className?: string
}

export function CommentCard({
  author,
  verb,
  title,
  date,
  edited,
  empty,
  avatar,
  actions,
  ground = 'card',
  alert,
  children,
  className = '',
}: CommentCardProps) {
  const body = (
    <>
      <div className="flex items-center gap-1.5 min-w-0">
        {avatar && (
          <Avatar
            src={avatar.src}
            alt={avatar.alt}
            size={avatar.size ?? 'md'}
            fallback={avatar.fallback ?? 'portrait'}
            name={avatar.name}
            className="mr-0.5"
          />
        )}
        {author ? (
          <>
            <Text weight="bold" className="min-w-0 truncate">
              {author}
            </Text>
            {verb && (
              <Text tone="secondary" className="flex-shrink-0">
                {verb}
              </Text>
            )}
          </>
        ) : (
          title && (
            <Text weight="bold" className="min-w-0 truncate">
              {title}
            </Text>
          )
        )}
        {edited && (
          <Text tone="secondary" title={edited.title} className="flex-shrink-0 opacity-50">
            {edited.label}
          </Text>
        )}
        {date && (
          <Text tone="secondary" className="ml-auto flex-shrink-0 opacity-50">
            {date}
          </Text>
        )}
        {/* `ml-auto` here TOO, and not only on the date: a turn with actions and no
            timestamp would otherwise hang its controls against the name. Both carry it, and
            the second one is inert once the first has taken the slack. */}
        {actions && <div className="ml-auto flex-shrink-0 flex items-center gap-1">{actions}</div>}
      </div>
      {children ?? (
        empty && (
          <Text size="sm" tone="secondary" className="opacity-40">
            {empty}
          </Text>
        )
      )}
      {alert && (
        <Banner
          variant={alert.variant ?? 'danger'}
          icon={alert.icon}
          hint={alert.hint}
          actions={alert.actions}
          layout="stacked"
          bordered
        >
          {alert.message}
        </Banner>
      )}
    </>
  )

  // `bare` is a plain box: no ground, no radius, no padding of its own. The gap stays,
  // because the space between a strip and the words under it is the turn's own rhythm
  // rather than the plate's.
  if (ground === 'bare') {
    return <div className={`flex flex-col gap-2 min-w-0 ${className}`.trim()}>{body}</div>
  }

  return (
    <Card padding="none" className={`flex flex-col gap-3 px-5 py-4 ${className}`.trim()}>
      {body}
    </Card>
  )
}
