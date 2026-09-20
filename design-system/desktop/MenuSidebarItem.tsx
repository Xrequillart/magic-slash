import { Avatar } from './Avatar'
import { Icon } from './Icon'
import { AlertTriangle, Image as ImageGlyph } from './icons'
import { Text } from './Text'
import type { IconComponent } from './types'

/**
 * One row of the sidebar's menu: a mark, a word, and the keys that get you there.
 *
 * THE APP HAD SIX OF THESE AND WROTE THE SAME CLASS STRING SIX TIMES — Plans, Tasks
 * and Skills in the sidebar, and three more inside the account control, which is one
 * row wearing three different faces depending on whether you are signed in, signed
 * out, or running without the cloud. They had already drifted: only the account row
 * truncated its label, so it was the only one of the six that survived a long name.
 *
 * THE SHORTCUT IS PART OF THE ROW, not a decoration on it. Every one of these opens a
 * page that also answers to a key, and putting the accelerator anywhere else — a
 * tooltip, a help screen — is how an app ends up with shortcuts nobody knows. It sits
 * quiet on the right at half opacity: there to be read when you look for it, not to
 * compete with the word.
 *
 * IT GREW AN ACTIVE STATE, on the terms the previous note set: every row in the app's
 * own sidebar opens an OVERLAY, which closes back onto whatever was underneath, so a
 * row that stayed lit for a page you had already dismissed would be lying — and the
 * note ended "the day the sidebar navigates rather than overlays, this grows one". The
 * skills rail is that day. It NAVIGATES: picking a skill replaces the pane beside it
 * and the row stays picked, which is a fact about the screen rather than a decoration.
 *
 * `active` IS THEREFORE OPTIONAL AND UNDEFINED BY DEFAULT — `ButtonIcon.active`'s rule,
 * and for its reason. A row that never lights up and a row that is currently unlit are
 * two different claims, and only the second is a `false`.
 */

export interface MenuSidebarItemProps {
  /** The word. Translated, and it truncates — see the note on the six copies. */
  label: string
  /** The mark. Ignored when `avatar` is given. */
  icon?: IconComponent
  /**
   * A PERSON in front of the word instead of a glyph — the account row is this.
   *
   * An object and not a node, the way `Label`'s is: `{ src, alt }` is data this hands
   * to `Avatar`, where a `ReactNode` would be a slot and the end of this component
   * being one thing. Bare, never a badge — the account row has always drawn a naked
   * glyph when there is no photo, and a pill appearing behind it would be a visible
   * change for everyone who never uploads one.
   */
  avatar?: { src: string | null; alt: string }
  /**
   * A SQUARE PICTURE in front of the word — a skill's own artwork, as the skills rail
   * draws it. Wins over `icon`, loses to `avatar`.
   *
   * SQUARE AND NOT `avatar`, which is the whole reason it is a second slot rather than
   * a flag: `Avatar` is `rounded-full` throughout because it draws a FACE, and a picture
   * a skill shipped with is artwork. A round crop of artwork cuts its corners off.
   * `SkillCard` makes the same call at 48px.
   *
   * Data and not a node, the way `avatar` is, and `alt` is the empty string for its
   * reason: the label beside it already names the thing.
   */
  thumb?: { src: string | null; alt: string }
  /**
   * The accelerator, pre-formatted by the caller — `⌘T`, `Ctrl+,`. Which modifier a
   * platform spells is the app's question, not this folder's.
   */
  shortcut?: string
  /**
   * Something needs attention behind this row: it turns yellow and takes a badge.
   *
   * ONE PROP FOR BOTH, because the app has never wanted one without the other — the
   * account row goes yellow and grows a triangle for the same fact, that no repository
   * is configured yet. Two props would be two ways to say it and one way to get it
   * half right.
   */
  alert?: boolean
  /**
   * This row is the pane currently open beside it. See the note at the top.
   *
   * It takes the accent ground at rest and its word comes up to full ink — the one
   * case a row in a quiet column is allowed to announce a colour before being touched,
   * because the column is no longer a list of equal siblings. `aria-current="page"`
   * says the same thing out loud.
   */
  active?: boolean
  onClick: () => void
  /** Margins. Not the padding, the radius, the gap or either colour. */
  className?: string
}

export function MenuSidebarItem({
  label,
  icon,
  avatar,
  thumb,
  shortcut,
  alert = false,
  active,
  onClick,
  className = '',
}: MenuSidebarItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      // `relative` at all times rather than only under `alert`: the badge is absolutely
      // positioned against this box, and a class that appears with the thing it anchors
      // is a class that will one day appear a frame late.
      // `aria-current` and not `aria-pressed`: this row is the open PAGE, where
      // `ButtonIcon.active` is a control that is switched on. The two are read out
      // differently, and only one of them is true here.
      aria-current={active ? 'page' : undefined}
      className={`relative w-full flex items-center justify-start gap-2 px-2 py-2 rounded-lg
        text-xs font-medium border-none cursor-pointer transition-all
        ${
          alert
            ? 'text-yellow hover:bg-yellow/10'
            : active
              ? 'bg-accent/15 text-ink'
              : 'text-text-secondary hover:bg-text-secondary/10 hover:text-ink'
        }
        ${className}`}
    >
      {avatar ? (
        <Avatar src={avatar.src} alt={avatar.alt} size="xs" fallback="glyph" />
      ) : thumb ? (
        // 20px, `rounded` — the radius a 20px square wears inside an `rounded-lg` row.
        // The plate stays under the picture so a row with no artwork is the same shape
        // as one with it, rather than a glyph floating where a square should be.
        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center overflow-hidden rounded bg-surface-strong">
          {thumb.src ? (
            <img src={thumb.src} alt={thumb.alt} className="h-full w-full object-cover" />
          ) : (
            <Icon glyph={ImageGlyph} size="2xs" tone="inherit" />
          )}
        </span>
      ) : (
        icon && <Icon glyph={icon} tone="inherit" className="flex-shrink-0" />
      )}

      {/* `inherit`, because the row owns the colour — secondary, ink on hover, or
          yellow throughout when something is wrong. A tone here would fight all three. */}
      <Text tone="inherit" className="truncate">
        {label}
      </Text>

      {shortcut && (
        <span className="ml-auto text-xs opacity-50 flex-shrink-0">{shortcut}</span>
      )}

      {alert && (
        // It sits on the CORNER of the row and not in the line, which is what makes it
        // read as an alarm rather than as one more thing in a list of controls.
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow rounded-full flex items-center justify-center">
          {/* THE BARE GLYPH and not an `Icon`: 10px is below the scale — `Icon` bottoms
              out at 12 — and passing a size through `className` would put two width
              classes on one element, where which of them wins is decided by the order
              Tailwind emitted them in. `ButtonIcon` learned that one the hard way. */}
          <AlertTriangle className="w-2.5 h-2.5 text-bg" />
        </span>
      )}
    </button>
  )
}
