import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Avatar } from './Avatar'
import { Icon } from './Icon'
import { Loader } from './Loader'
import { Text } from './Text'
import type { IconComponent } from './types'

/**
 * A PANEL OF ROWS HANGING OFF SOMETHING THE CALLER DREW — the dropdown, with no
 * trigger of its own.
 *
 * `SelectIcon` beside it is a trigger AND a panel welded together: a chip with a
 * chevron that opens a list, and the chevron is the whole point of that component —
 * it is the only mark on screen saying this control opens a list rather than going
 * somewhere. That welding is exactly what makes it the wrong answer here. The account
 * dropdown hangs off a `Label` in the title bar wearing a face and a name, which is a
 * control `SelectIcon` cannot be talked into being.
 *
 * SO THIS IS THE PANEL ALONE. The caller draws whatever it likes, hands over the
 * element it drew, and owns `open` — there is no internal state to fight with, because
 * a menu that could close itself while the caller thought it was open is the bug the
 * `open` prop on `SelectIcon` exists to work around.
 *
 * ANCHORED, PORTALLED, AND IT FLIPS. Positioned against the anchor's own box and
 * right-aligned to it, portalled to the body so no ancestor's `overflow` can clip it,
 * and moved above the anchor when the room below runs out. The measurements are
 * `SelectIcon`'s, to the pixel — two menus in one app that stood off their triggers by
 * different amounts would be two menus.
 *
 * IT IS ROWS AND A HEADER, AND NEITHER IS A SLOT. `header` is data — a face, a name, a
 * line under it — and an item is data, for `Label`'s reason: a menu that took a
 * `ReactNode` would grow a form in it by the end of the quarter. What a row may be is
 * a mark, a word, a quiet trailing note, and whether it is the dangerous one.
 */

/** One row. `id` is what `onSelect` hands back; it is never drawn. */
export interface MenuItem {
  id: string
  label: string
  icon?: IconComponent
  /**
   * The quiet trailing note — an accelerator, a version number. It is the last thing
   * to be read and the first to be given up: the label truncates only after this has.
   */
  hint?: string
  /**
   * `danger` paints the row red on hover rather than at rest. AT REST AND NOT BEFORE,
   * because a permanently red row in a list of grey ones is a warning nobody is
   * heeding by the third time they open the menu — and the one row that is red all the
   * time is the one the eye lands on first, which is the opposite of what a
   * destructive action wants.
   */
  tone?: 'default' | 'danger'
  /** Half opacity, no pointer, and `onSelect` never fires for it. */
  disabled?: boolean
  /**
   * A SPINNER WHERE THE MARK GOES, and the row stops answering while it turns.
   *
   * For the row whose whole job is the wait — "check for updates", which asks a server
   * and has nothing to show until it answers. The alternative was closing the menu on
   * the press and saying nothing, which reads as a row that does nothing at all.
   *
   * It implies `disabled`'s behaviour without its look: the row keeps full contrast,
   * because it is BUSY rather than unavailable.
   */
  loading?: boolean
  /**
   * The menu stays down when this row is picked. OFF by default, which is what a
   * destination wants: you asked for the page, so the menu gets out of the way.
   *
   * ON for a row that acts in place and reports back — again, the update check. A menu
   * that dismissed itself and then had to reopen to show the answer would be asking the
   * reader to remember what they had pressed.
   */
  keepOpen?: boolean
}

/** A run of rows, with a hairline above it. `label` heads it when there is one. */
export interface MenuGroup {
  label?: string
  items: MenuItem[]
}

/**
 * WHO OR WHAT THE MENU IS ABOUT, at the top and above the first hairline.
 *
 * Not a row: it has no `id`, nothing happens when it is pressed, and it carries two
 * lines where a row carries one. A menu that made its own subject pressable would be
 * offering an action it has no name for.
 */
export interface MenuHeader {
  title: string
  subtitle?: string
  /** A face. Wins over `icon`. `{ src: null }` still draws the fallback. */
  avatar?: { src: string | null; alt: string }
  icon?: IconComponent
}

/** Sized to a row's longest word, not to the anchor — a menu is read at its text. */
const DEFAULT_WIDTH = 248
const MAX_HEIGHT = 480
/** How close to an edge the panel may sit, and how far it stands off the anchor. */
const VIEWPORT_MARGIN = 8
const ANCHOR_GAP = 6

export interface MenuProps {
  open: boolean
  /** Escape, an outside click, a scroll, a resize, or a row being picked. */
  onClose: () => void
  /**
   * The element the panel hangs from. Null while the caller's trigger has not mounted,
   * which is why this is an element and not a rect: the panel simply waits rather than
   * being positioned against a measurement taken too early.
   */
  anchor?: HTMLElement | null
  /** Names the menu for a screen reader — "Account". Translated. */
  label: string
  header?: MenuHeader
  groups: MenuGroup[]
  onSelect: (item: MenuItem) => void
  /** In pixels — the panel is positioned by hand, so the arithmetic needs the number. */
  width?: number
  /** Where to portal. `document.body` unless the theme is scoped — see `SelectIcon`. */
  portalTo?: HTMLElement | null
}

export function Menu({
  open,
  onClose,
  anchor,
  label,
  header,
  groups,
  onSelect,
  width = DEFAULT_WIDTH,
  portalTo,
}: MenuProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const panelId = useId()

  // Re-measured when the contents change: the panel is empty — and so zero-height — on
  // the frame the menu opens, and a flip decided on that frame would be decided against
  // a height the panel does not have yet.
  useLayoutEffect(() => {
    if (!open || !anchor) return

    const rect = anchor.getBoundingClientRect()
    const panelHeight = Math.min(panelRef.current?.offsetHeight ?? 0, MAX_HEIGHT)
    const spaceBelow = window.innerHeight - rect.bottom

    const top =
      panelHeight > 0 && spaceBelow < panelHeight + VIEWPORT_MARGIN
        ? Math.max(VIEWPORT_MARGIN, rect.top - panelHeight - ANCHOR_GAP)
        : rect.bottom + ANCHOR_GAP

    const left = Math.max(
      VIEWPORT_MARGIN,
      Math.min(rect.right - width, window.innerWidth - width - VIEWPORT_MARGIN),
    )

    // COMPARED AND NOT JUST SET, which is what keeps this from spinning. `groups` and
    // `header` are object literals built in the caller's render, so their identity
    // changes on every pass — this effect therefore runs on every pass, and a fresh
    // `{ top, left }` each time would re-render, rebuild them, and fire it again with
    // nothing on screen having moved. Same position, same object, no render.
    setPosition((previous) =>
      previous && previous.top === top && previous.left === left ? previous : { top, left },
    )
  }, [open, anchor, groups, header, width])

  // Forget where it was as soon as it shuts, so the next opening measures again rather
  // than painting one frame at the position the anchor used to be in.
  useEffect(() => {
    if (!open) setPosition(null)
  }, [open])

  const close = useCallback(() => onClose(), [onClose])

  // THE PANEL IS NOT A DESCENDANT OF THE ANCHOR — that is what portalling costs — so
  // containment is checked against both, and the scroll rule needs an exemption for the
  // panel itself or scrolling a long menu would close the menu being scrolled.
  useEffect(() => {
    if (!open) return

    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (anchor?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      close()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    const onScroll = (e: Event) => {
      if (panelRef.current?.contains(e.target as Node)) return
      close()
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', close)
    // capture: catches a scroll on any ancestor, not only on the window.
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open, anchor, close])

  if (!open) return null
  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={panelRef}
      id={panelId}
      role="menu"
      aria-label={label}
      style={{
        position: 'fixed',
        top: position?.top ?? -9999,
        left: position?.left ?? -9999,
        width,
        maxHeight: MAX_HEIGHT,
        // Hidden until measured, so the first paint never flashes at 0,0.
        visibility: position ? 'visible' : 'hidden',
      }}
      className="z-[60] overflow-y-auto overflow-x-hidden rounded-xl bg-bg-tertiary shadow-xl"
    >
      {header && <Header {...header} />}
      {groups.map((group, groupIndex) =>
        group.items.length === 0 ? null : (
          // Keyed by POSITION and not by label: two groups may perfectly well carry the
          // same heading, and a duplicate key there drops one of them silently.
          <div
            key={groupIndex}
            // The hairline belongs to the group BELOW it, so the first run after the
            // header keeps one and the very first run of a headerless menu does not.
            // NO MARGIN AND NO PADDING AROUND IT: the rows either side already carry
            // their own, and adding more here put a visible band of nothing on both
            // sides of every rule — which made two adjacent groups read as two menus.
            className={groupIndex > 0 || header ? 'border-t border-line' : ''}
          >
            {group.label && (
              <Text
                size="2xs"
                weight="bold"
                tone="secondary"
                className="block px-3 pb-1 pt-1.5 uppercase tracking-[0.12em] opacity-60"
              >
                {group.label}
              </Text>
            )}
            {group.items.map((item) => (
              <Row
                key={item.id}
                item={item}
                onSelect={() => {
                  if (item.disabled || item.loading) return
                  onSelect(item)
                  if (!item.keepOpen) close()
                }}
              />
            ))}
          </div>
        ),
      )}
    </div>,
    // Read at render and not in a default parameter: `document` does not exist when this
    // module is evaluated on a server.
    portalTo ?? document.body,
  )
}

/** The subject of the menu — two lines and a face, and nothing happens when pressed. */
function Header({ title, subtitle, avatar, icon }: MenuHeader) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2">
      {avatar ? (
        <Avatar src={avatar.src} alt={avatar.alt} size="md" fallback="badge" />
      ) : icon ? (
        <Icon glyph={icon} size="sm" tone="muted" className="flex-shrink-0" />
      ) : null}
      <span className="flex min-w-0 flex-col">
        <Text size="xs" weight="medium" className="truncate">{title}</Text>
        {subtitle && (
          <Text size="2xs" tone="secondary" className="truncate">{subtitle}</Text>
        )}
      </span>
    </div>
  )
}

/** One row: a mark, a word, and the quiet note that follows it. */
function Row({ item, onSelect }: { item: MenuItem; onSelect: () => void }) {
  const danger = item.tone === 'danger'
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      disabled={item.disabled || item.loading}
      className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors ${
        item.disabled
          ? 'cursor-default opacity-40'
          : item.loading
            // Busy, not unavailable: full contrast, and the hover goes because there is
            // nothing to press. A row dimmed while it works reads as one that refused.
            ? 'cursor-default text-ink'
            : danger
              ? 'text-text-secondary hover:bg-red/10 hover:text-red'
              : 'text-text-secondary hover:bg-ink/5 hover:text-ink'
      }`}
    >
      {/* The spinner stands exactly where the mark would, at the mark's own rung, so
          the word does not shift sideways when the wait begins. */}
      {item.loading ? (
        <Loader variant="spin" size="xs" tone="inherit" className="flex-shrink-0" />
      ) : item.icon ? (
        <Icon glyph={item.icon} size="xs" tone="inherit" className="flex-shrink-0" />
      ) : null}
      <Text size="xs" tone="inherit" className="min-w-0 flex-1 truncate">{item.label}</Text>
      {item.hint && (
        <Text size="2xs" tone="inherit" className="flex-shrink-0 opacity-50">{item.hint}</Text>
      )}
    </button>
  )
}
