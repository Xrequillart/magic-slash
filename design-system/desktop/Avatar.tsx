import { AVATAR_SIZES, type AvatarSize } from './avatarSizes'
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
 * The no-photo fallback is USUALLY the icon. It used to be the icon and nothing else,
 * on the grounds that an initial is only needed where several people appear in a list
 * and have to be told apart before a name is read — which is true, and is exactly the
 * case the PR comments panel turned out to be: a thread of several authors, at 24px,
 * from queries that ask for `author{login}` and deliberately never select `avatarUrl`.
 * A letter is what that data can draw. So the letter is a THIRD fallback here rather
 * than a second component, because everything else about the two is identical — the
 * box, the plate, the accent, the way a missing photo must not shift the row.
 */

/**
 * What the no-photo state looks like, and the reason this is a prop rather than a
 * consequence of the size.
 *
 * `badge` is the filled `bg-accent/20` pill — the identity card, the settings footer,
 * the members roster. `glyph` is the bare mark on nothing, which the left sidebar has
 * always drawn: a pill appearing behind that icon would be a visible change for
 * everyone who never uploads a photo. `initials` is the same pill as `badge` with a
 * letter in place of the mark, for a list where WHICH person matters before a name is
 * read. All three are orthogonal to the size, and pinning them together is what made
 * the app's old table name screens instead of drawings.
 */
export type AvatarFallback = 'badge' | 'glyph' | 'initials'

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

export function Avatar({ src, alt, size = 'lg', fallback = 'badge', name, className = '' }: AvatarProps) {
  const { box, glyph, bare, initial } = AVATAR_SIZES[size]

  if (src) {
    return <img src={src} alt={alt} className={`${box} rounded-full object-cover shrink-0 ${className}`} />
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

  if (fallback === 'initials') {
    return (
      <span
        title={alt || name}
        className={`${box} flex items-center justify-center rounded-full bg-accent/20 text-accent shrink-0 ${className}`}
      >
        {/* `inherit`, so the letter takes the wrapper's `text-accent` exactly as the
            mark does — one colour stated once for both fallbacks.

            `bold` and not the semibold this drew before it came here: the shipped
            family has no 600 face, and 600 and 700 measure as the same drawing. See
            `Text`'s own note. */}
        <Text size={initial} weight="bold" tone="inherit">
          {(name?.trim()[0] ?? '?').toUpperCase()}
        </Text>
      </span>
    )
  }

  return (
    <span
      className={`${box} flex items-center justify-center rounded-full bg-accent/20 text-accent shrink-0 ${className}`}
    >
      {/* `inherit` again, and here it is the wrapper's `text-accent` that it inherits —
          one colour stated once, on the thing that also carries the fill it has to
          read against. */}
      <Icon glyph={CircleUserRound} size={glyph} tone="inherit" />
    </span>
  )
}
