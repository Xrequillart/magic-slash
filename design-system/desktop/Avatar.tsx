import { AVATAR_SIZES, type AvatarSize } from './avatarSizes'
import { DEFAULT_PORTRAIT_SRC } from './defaultAvatar'
import { Icon } from './Icon'
import { CircleUserRound } from './icons'
import { Text } from './Text'

/**
 * A person, as a round photo — or as an `Icon` when there is none.
 *
 * IT KNOWS NOTHING ABOUT WHO. No account, no session, no fetch: it takes the bytes
 * it is given and draws them. The app decides whose face it is, where the bytes come
 * from and what to say when they are missing.
 *
 * THE NO-PHOTO FALLBACK IS A FACE NOW. It was an accent-tinted pill with a
 * `CircleUserRound` in it — the shape a form draws where a picture is missing — and the
 * app has thirty drawn portraits to offer instead, one of which is the default. So an
 * account that has never chosen anything wears `DEFAULT_PORTRAIT_SRC` rather than the
 * mark for a person, and the pill is gone rather than kept as an option nothing asks
 * for. See `defaultAvatar.ts` for why that picture is a `data:` URL and not a file.
 *
 * THE OTHER TWO FALLBACKS STAYED, and both for reasons a portrait does not answer:
 *
 *  • `glyph` is the bare mark on nothing, which the title bar's account row draws at
 *    14px. A portrait at that size is a smudge, and — the part that actually decides it
 *    — the mark there takes `currentColor`, which is how the whole row turns yellow
 *    when no repository is configured. A picture cannot inherit a colour, so drawing
 *    one there would quietly delete a signal.
 *  • `initials` is a letter, for a list where WHICH person matters before a name is
 *    read: a PR thread of several authors, at 24px, from queries that ask for
 *    `author{login}` and deliberately never select `avatarUrl`. Those people have no
 *    account here, so the default portrait would make every one of them the same
 *    stranger; a letter is what that data can actually draw.
 */

/**
 * What the no-photo state looks like, and the reason this is a prop rather than a
 * consequence of the size.
 *
 * `portrait` is the default drawn face — the identity card, the account menu, the
 * members roster: anywhere a PERSON with an account is missing a photo. `glyph` is the
 * bare mark on nothing, which the title bar's account row draws. `initials` is an
 * accent plate with a letter on it, for a list where WHICH person matters before a name
 * is read. All three are orthogonal to the size, and pinning them together is what made
 * the app's old table name screens instead of drawings.
 */
export type AvatarFallback = 'portrait' | 'glyph' | 'initials'

export interface AvatarProps {
  /**
   * A `data:` URL, or null for the fallback.
   *
   * ALWAYS a data URL in this app and never a remote one, though nothing here
   * enforces it: the photos live in a private bucket whose only web-facing form is a
   * signed URL that expires, so an `<img src>` pointed at one works for an hour and
   * then draws a broken box. The main process hands over the bytes instead. Two of
   * the app's three windows also carry a CSP that stops at `data:`.
   */
  src: string | null
  /**
   * Alternative text. REQUIRED, and with no default — the app has a translation for
   * "Account photo" and this folder has no way to read one. Pass the empty string
   * where the person is already named in text beside the photo: that is not a
   * shortcut around writing one, it is the correct answer for a decorative image, and
   * an `alt` repeating the adjacent label makes a screen reader say the same person
   * twice per row.
   */
  alt: string
  size?: AvatarSize
  fallback?: AvatarFallback
  /**
   * The name the monogram is taken from, for `fallback="initials"`. Ignored by the
   * other two.
   *
   * A NAME, not a monogram: the component takes the first character and puts it in
   * upper case, and that is deliberately not negotiable from outside. One letter is
   * what a round 24px plate fits — two is a plate with type overflowing it — and a
   * call site free to pass a string would eventually pass a login's first two
   * tokens, which for `greptile-apps[bot]` reads as an acronym for nothing.
   *
   * Empty, or whitespace: the plate draws `?` rather than nothing, so a row whose
   * author the API reported as null still has a mark where every other row has one.
   */
  name?: string
  /** Layout only — a margin, a ring. Not the box, which the size owns. */
  className?: string
}

export function Avatar({ src, alt, size = 'lg', fallback = 'portrait', name, className = '' }: AvatarProps) {
  const { box, bare, initial } = AVATAR_SIZES[size]

  // The default portrait is drawn by the SAME line as a real photo, and not merely by a
  // similar one: it is a 256px WebP on a plate, exactly what the app stores, so any
  // difference in the box, the crop or the radius here would be a face that moves the
  // moment somebody uploads one.
  const photo = src ?? (fallback === 'portrait' ? DEFAULT_PORTRAIT_SRC : null)
  if (photo) {
    return <img src={photo} alt={alt} className={`${box} rounded-full object-cover shrink-0 ${className}`} />
  }

  if (fallback === 'glyph') {
    // No pill — but the BOX, so the footprint does not change the moment a photo is
    // missing. It carries no colour of its own, which is the other half of the point:
    // `tone="inherit"` lets the mark take `currentColor` from whatever is around it,
    // and that is what turns it yellow with the rest of the row when the sidebar has
    // no repository configured. `tone="default"` would freeze it at `text-icon` and
    // quietly break the signal.
    return (
      <span className={`${box} flex items-center justify-center shrink-0 ${className}`}>
        <Icon glyph={CircleUserRound} size={bare} tone="inherit" />
      </span>
    )
  }

  // `initials`, and the last branch rather than one of three: the accent plate used to
  // be shared with `badge`, which is gone — a person with an account has a portrait now.
  // What is left of it is this, and it is the only thing that still draws the plate.
  return (
    <span
      title={alt || name}
      className={`${box} flex items-center justify-center rounded-full bg-accent/20 text-accent shrink-0 ${className}`}
    >
      {/* `inherit`, so the letter takes the wrapper's `text-accent` rather than naming a
          second colour beside the fill it has to read against.

          `bold` and not the semibold this drew before it came here: the shipped family
          has no 600 face, and 600 and 700 measure as the same drawing. See `Text`. */}
      <Text size={initial} weight="bold" tone="inherit">
        {(name?.trim()[0] ?? '?').toUpperCase()}
      </Text>
    </span>
  )
}
