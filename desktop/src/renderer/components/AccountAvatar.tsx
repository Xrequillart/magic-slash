import { Avatar } from '@ds/desktop'
import { useT } from '../i18n'
import { ACCOUNT_AVATAR_VARIANTS, type AccountAvatarVariant } from './accountAvatarSize'

/**
 * THE APP'S account photo: `Avatar` from the design system, plus the two things the
 * design system has no business knowing — which SURFACE is drawing it, and what to
 * call it in the reader's language.
 *
 * A person, as a round photo — or as a generic icon when there is none.
 *
 * It started as the signed-in account alone, and the `roster` variant is what widened
 * it: the org members list draws the same badge for every colleague. Nothing about the
 * drawing had to change for that — the bytes reach it the same way, and the fallback is
 * the same glyph — so the component stayed one rather than being copied with a new
 * name. What did change is `alt`, which could be a constant only while there was
 * exactly one person it could be describing.
 *
 * The source is ALWAYS a data URL produced by the main process, never a remote one,
 * and that is a hard constraint rather than a convenience. The Storage bucket holding
 * these photos is private: the only web-facing form of the object is a signed URL,
 * which expires, so an `<img src>` pointed at one would work for an hour and then
 * render a broken box for the rest of the session — keeping it alive would mean
 * renewing the URL on a timer for a 44 px picture. The main process fetches the bytes
 * once and hands the renderer `data:image/webp;base64,…`, which is also the established
 * contract for every other image the renderer draws (`file-preview/ImageView.tsx`).
 * The main window's CSP would in fact allow a remote image (`desktop/index.html`
 * carries `img-src 'self' data: https:`); the two auxiliary windows do NOT
 * (`popover.html` and `quick-launch.html` stop at `data:`), so bytes rather than a
 * URL is also what would let a menu-bar surface render this component unchanged.
 *
 * The no-photo fallback is the icon, never a letter. An initial is a different thing:
 * `InitialsAvatar` draws one because a GitHub comment has to say WHICH of several
 * people wrote it. Here there is only ever one account, already named in full a few
 * pixels away, so a letter would add a decoration that reads like information. Same
 * badge geometry as that component though — `bg-accent/20` fill, `text-accent` mark,
 * `rounded-full` — so the two never look like two different systems.
 *
 * THREE VARIANTS, one per caller, measured against the surface each one lands on —
 * the identity card (`w-11`), the settings rail footer (`w-5`, the size of the initial
 * badge it replaced) and the sidebar account button (`w-3.5`, the size of the
 * `CircleUserRound` it replaced). The earlier note here said the second size would
 * arrive with the second caller rather than be guessed in advance, and it was right to:
 * the guess it warned against was `w-6`, and neither of the two real surfaces wanted
 * that.
 *
 * `variant` and not `size`, because the table it indexes carries the FALLBACK CHROME
 * too. The sidebar's no-photo state has to stay the bare glyph it is today — a pill
 * appearing behind the icon would be a visible change for everyone who never uploads
 * a photo — while the card and the footer keep their filled badge. See
 * `accountAvatarSize.ts` for the table and for why that deviates from the brief.
 */

interface Props {
  /** A `data:` URL from `profile.getAvatar()` or `org.memberAvatars()`, or null for the icon fallback. */
  dataUrl: string | null
  /** Which surface is drawing it. Defaults to the identity card, the first caller. */
  variant?: AccountAvatarVariant
  /**
   * Alternative text, defaulting to "Account photo" — the right answer for every
   * surface that draws the signed-in user and no answer at all for one that draws
   * a colleague.
   *
   * Pass the EMPTY STRING where the person is already named in text beside the photo,
   * as the members list names them by email. That is not a shortcut around writing one:
   * an `alt` that repeats the adjacent label makes a screen reader say the same person
   * twice per row, and the image is decorative precisely because the name is already
   * there. A surface that shows a face with no name needs a real string.
   *
   * `Avatar` itself takes no default — it cannot read a translation — so the default
   * lives here, which is the only place in the two that can.
   */
  alt?: string
}

export function AccountAvatar({ dataUrl, variant = 'card', alt }: Props) {
  const t = useT()
  const { size, fallback } = ACCOUNT_AVATAR_VARIANTS[variant]

  return <Avatar src={dataUrl} alt={alt ?? t('cloud.avatar.alt')} size={size} fallback={fallback} />
}
