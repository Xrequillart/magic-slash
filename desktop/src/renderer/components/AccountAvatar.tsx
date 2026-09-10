import { CircleUserRound } from 'lucide-react'
import { useT } from '../i18n'
import { ACCOUNT_AVATAR_VARIANTS, type AccountAvatarVariant } from './accountAvatarSize'

/**
 * The signed-in account, as a round photo — or as a generic icon when there is none.
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
  /** A `data:` URL from `profile.getAvatar()`, or null for the icon fallback. */
  dataUrl: string | null
  /** Which surface is drawing it. Defaults to the identity card, the first caller. */
  variant?: AccountAvatarVariant
}

export function AccountAvatar({ dataUrl, variant = 'card' }: Props) {
  const t = useT()
  const { box, glyph, badge } = ACCOUNT_AVATAR_VARIANTS[variant]

  if (dataUrl) {
    return (
      <img
        src={dataUrl}
        alt={t('cloud.avatar.alt')}
        className={`${box} rounded-full object-cover shrink-0`}
      />
    )
  }

  // No pill, no wrapper, and deliberately NO colour class: the glyph inherits
  // `currentColor` from the button around it, which is what turns it yellow with the
  // rest of the row when no repository is configured. A `text-accent` here — or a
  // `<span>` that carried one — would freeze it at the accent colour and quietly
  // break that signal.
  if (!badge) {
    return <CircleUserRound className={`${glyph} shrink-0`} />
  }

  return (
    <span
      className={`${box} flex items-center justify-center rounded-full bg-accent/20 text-accent shrink-0`}
    >
      <CircleUserRound className={glyph} />
    </span>
  )
}
