import { CircleUserRound } from 'lucide-react'
import { useT } from '../i18n'

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
 * URL is also what lets the sidebar and menu-bar surfaces story 2 reaches render this
 * component unchanged.
 *
 * The no-photo fallback is the icon, never a letter. An initial is a different thing:
 * `InitialsAvatar` draws one because a GitHub comment has to say WHICH of several
 * people wrote it. Here there is only ever one account, already named in full a few
 * pixels away, so a letter would add a decoration that reads like information. Same
 * badge geometry as that component though — `bg-accent/20` fill, `text-accent` mark,
 * `rounded-full` — so the two never look like two different systems.
 *
 * ONE SIZE, the identity card's. A `size` prop was tempting for the sidebar and
 * menu-bar surfaces story 2 reaches, but a variant with no caller is a variant
 * nobody can see is wrong — and the sidebar badge it anticipated is `w-5`
 * (`pages/Config/index.tsx`), not the `w-6` such a prop would have guessed. The
 * second size arrives with the second caller, measured against it.
 */

/** 44 px: large enough to read a face, small enough to sit on one line of the card. */
const BOX = 'w-11 h-11'

interface Props {
  /** A `data:` URL from `profile.getAvatar()`, or null for the icon fallback. */
  dataUrl: string | null
}

export function AccountAvatar({ dataUrl }: Props) {
  const t = useT()

  if (dataUrl) {
    return (
      <img
        src={dataUrl}
        alt={t('cloud.avatar.alt')}
        className={`${BOX} rounded-full object-cover shrink-0`}
      />
    )
  }

  return (
    <span
      className={`${BOX} flex items-center justify-center rounded-full bg-accent/20 text-accent shrink-0`}
    >
      <CircleUserRound className="w-6 h-6" />
    </span>
  )
}
