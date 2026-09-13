import { Avatar } from './Avatar'
import { Icon } from './Icon'
import { AlertTriangle } from './icons'
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
 * NO ACTIVE STATE, and that is the app's own shape rather than an omission: every one
 * of these opens an OVERLAY, which closes back onto whatever was underneath. A row
 * that stayed lit for a page you had already dismissed would be lying. The day the
 * sidebar navigates rather than overlays, this grows one.
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
  onClick: () => void
  /** Margins. Not the padding, the radius, the gap or either colour. */
  className?: string
}

export function MenuSidebarItem({
  label,
  icon,
  avatar,
  shortcut,
  alert = false,
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
      className={`relative w-full flex items-center justify-start gap-2 px-2 py-2 rounded-lg
        text-xs font-medium border-none cursor-pointer transition-all
        ${alert ? 'text-yellow hover:bg-yellow/10' : 'text-text-secondary hover:bg-text-secondary/10 hover:text-ink'}
        ${className}`}
    >
      {avatar ? (
        <Avatar src={avatar.src} alt={avatar.alt} size="xs" fallback="glyph" />
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
