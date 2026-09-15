import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BUTTON_ICON_SIZES, type ButtonIconSize } from './ButtonIcon'
import { Icon, type IconSize } from './Icon'
import { Check, ChevronDown } from './icons'
import { RAISED_PLATE, RAISED_PLATE_HOVER } from './plate'
import { Text, type TextSize } from './Text'
import type { IconComponent } from './types'

/**
 * A `ButtonIcon` that opens a menu — the mark, a chevron, and a list under it.
 *
 * IT IS THE CHEVRON THAT MAKES IT ONE. Beside two links that open something
 * elsewhere, a chip with no chevron promises the same thing they do; the chevron is
 * the only mark on screen saying this one opens a list instead. It turns over while
 * the panel is up, so the trigger states what it is doing rather than leaving a
 * panel floating somewhere else to say it.
 *
 * IT BORROWS TWO THINGS ON PURPOSE. The ladder is `ButtonIcon`'s, from the same
 * table — a select and a button in one header row that stood at different heights
 * would be the whole argument for a shared scale, lost. The panel is `Status`'s: one
 * ground, one radius, no border and no padding, so a menu is a menu wherever it
 * opens.
 *
 * THE PANEL IS PORTALLED AND `Status`'S IS NOT, and that is the one place they part.
 * Status opens inside a card that lets it out; this opens in a sidebar with
 * `overflow-hidden`, where an absolutely-positioned panel was clipped and vanished
 * under the terminal pane — a thing no z-index inside the sidebar can fix. Portalled
 * to `<body>` and positioned against the trigger's own box, it flips above when the
 * room below runs out.
 *
 * WHAT IT DOES NOT DO is decide what is in the list. It is handed groups of items,
 * the way `Status` is handed its options and for the same reason: the twelve scripts
 * in a repository are that repository's, not a design language.
 */

/** One row: a name, an optional trailing hint, and whether it can be picked. */
export interface SelectIconItem {
  /** What `onSelect` hands back. The caller's key, not shown. */
  id: string
  label: string
  /**
   * The quiet trailing note — for the scripts menu it is the command as it will
   * actually run, `pnpm dev`. It truncates before the label does: a name that says
   * which row this is beats a hint that says what it will do.
   */
  hint?: string
  /** Half opacity, no pointer — a script already running, say. */
  disabled?: boolean
  /**
   * THE ROW'S OWN MARK, when the rows are not all the same action.
   *
   * Absent it takes the trigger's, which is right for the scripts menu — one play
   * triangle over twelve things to play. It is wrong for a menu whose rows are the
   * KINDS of something: the sidebar's sort picker offers a clock, a pulse and a
   * repository, and repeating the sort glyph three times would say the three rows do
   * the same thing.
   */
  icon?: IconComponent
  /**
   * This row is the one in force — a check after it, its label in the accent.
   *
   * IT IS WHAT MAKES THIS A SELECT rather than a list of commands, and only some
   * menus have one: the scripts menu runs things and nothing is ever "current", so
   * the field is absent there and no row is marked. Given on any row, the panel
   * becomes a radio group for a reader rather than a plain menu.
   */
  selected?: boolean
}

/**
 * A headed run of items.
 *
 * ALWAYS GROUPS, even when there is one. A menu that is sometimes a flat list and
 * sometimes grouped is two components wearing one name, and the caller with a single
 * group can pass a single group — which is what the scripts menu does when a
 * repository has one package and the useful axis is the KIND of script rather than
 * which package it came from.
 */
export interface SelectIconGroup {
  label: string
  items: SelectIconItem[]
}

/**
 * What the trigger turns, at rest and while open.
 *
 * THREE, each with a caller. The scripts menu is purple, and it is a step DARKER while
 * open than on hover — pressing an already-open chip has to look like something
 * happened, and it cannot look like hovering it. `neutral` is the default that costs
 * nothing. `solid` is the quick-settings sheet's, and the note on it says why a
 * translucent plate could not do there.
 */
export type SelectIconTone = 'neutral' | 'purple' | 'solid'

const TONES: Record<SelectIconTone, { rest: string; open: string }> = {
  neutral: { rest: 'bg-ink/5 text-icon hover:bg-ink/10 hover:text-ink', open: 'bg-ink/10 text-ink' },
  purple: {
    rest: 'bg-ink/5 text-icon hover:bg-purple/10 hover:text-purple',
    open: 'bg-purple/20 text-purple',
  },
  /**
   * THE THIRD MENU, and the one the note above was waiting for: the pickers on
   * `ControlCenter`'s sheet. Its ground is a thin frost over the blurred app, and a
   * `bg-ink/5` trigger there is a trigger at 5% of whatever is behind — invisible on a
   * dark terminal, a smudge on a light one. `RAISED_PLATE` is `ToggleButton`'s and
   * `Stepper`'s plate, opaque, so the three stand on the sheet as one family; the
   * hover and the open state are brightness steps because a second translucent colour
   * would be a second hole.
   */
  solid: {
    rest: `${RAISED_PLATE} text-icon ${RAISED_PLATE_HOVER} hover:text-ink`,
    open: `${RAISED_PLATE} text-ink brightness-125`,
  },
}

/**
 * WHAT THE PANEL DOES WHEN THE TRIGGER GROWS.
 *
 * A menu whose words were a size apart from the control that opened it reads as a
 * different object each time it appears — the same reason `Status`'s picker follows
 * its plate. So the rows take their type from the rung, and their padding grows with
 * it: a 14px word left in a box built for 12px is a row that fits its text by
 * accident.
 *
 * `2xs`, `xs` AND `sm` ALL LAND ON THE SAME PANEL, and that is deliberate rather
 * than an oversight: a menu is read at arm's length whatever opened it, and the
 * TRIGGER is what shrinks down there, not the reading. `Text`'s new 10px rung does
 * not change that — it exists for detail under a label, and a menu row is not detail.
 *
 * The header and the hint are spelled in pixels because they are BELOW the scale —
 * 10 and 11 are not rungs of anything, they are the two sizes at which a line can sit
 * under a word without competing with it.
 */
const PANELS: Record<ButtonIconSize, { row: string; text: TextSize; mark: IconSize; small: string }> = {
  '2xs': { row: 'px-3 py-1.5', text: 'xs', mark: 'xs', small: 'text-[10px]' },
  xs: { row: 'px-3 py-1.5', text: 'xs', mark: 'xs', small: 'text-[10px]' },
  sm: { row: 'px-3 py-1.5', text: 'xs', mark: 'xs', small: 'text-[10px]' },
  md: { row: 'px-3 py-2', text: 'sm', mark: 'sm', small: 'text-[11px]' },
  lg: { row: 'px-3.5 py-2', text: 'sm', mark: 'sm', small: 'text-[11px]' },
  xl: { row: 'px-3.5 py-2.5', text: 'md', mark: 'md', small: 'text-[12px]' },
  '2xl': { row: 'px-4 py-3', text: 'md', mark: 'md', small: 'text-[12px]' },
}

type PanelScale = (typeof PANELS)[ButtonIconSize]

/**
 * WHAT A MENU IS WIDE, unless the caller says otherwise.
 *
 * 280 is the scripts menu's, and it is sized to what that menu holds: a script name
 * and the command it runs — `package` and `pnpm run package` on one line — where a
 * narrower panel truncates the hint that says what the row will do.
 *
 * IT IS A DEFAULT AND NOT A RULE, which is what `panelWidth` is for: the sidebar's
 * sort menu holds three short phrases and no hint, and 280 beside a 230px column is a
 * panel that overhangs the thing it belongs to.
 */
const DEFAULT_PANEL_WIDTH = 280
const PANEL_MAX_HEIGHT = 320
/** How close to an edge the panel may sit, and how far it stands off the trigger. */
const VIEWPORT_MARGIN = 8
const TRIGGER_GAP = 4

export interface SelectIconProps {
  /** The mark, from `@ds/desktop/icons`. */
  icon: IconComponent
  /**
   * THE WORD IN FORCE, drawn between the mark and the chevron — "Dark", "Français".
   *
   * Absent, the control is the icon-only chip it always was. Given, it becomes a field
   * that SAYS its value, for a row where three controls must read as one: the quick
   * settings put a theme picker, a scale stepper and a language picker side by side at
   * one fixed width (`className="w-44"`), and a chip that showed only its mark beside a
   * stepper that showed its number would be two controls telling different amounts.
   * The word truncates rather than widening the control — the width is the row's, not
   * the word's — and the tooltip still carries the full name.
   */
  value?: string
  /**
   * What the menu is. REQUIRED, for `ButtonIcon`'s reason: the trigger carries no
   * word, so this is the tooltip and the accessible name at once.
   */
  title: string
  groups: SelectIconGroup[]
  onSelect: (item: SelectIconItem) => void
  /**
   * Called when the panel opens. The scripts menu reads `package.json` here rather
   * than on every render of every repository card — a menu nobody opened should cost
   * nothing.
   */
  onOpen?: () => void
  /** Shown alone in the panel while `onOpen`'s work is in flight. Translated. */
  loadingLabel?: string
  loading?: boolean
  /** Shown alone when there are no groups. Translated. */
  emptyLabel?: string
  /**
   * FORCES THE PANEL OPEN OR SHUT, taking the state out of this component's hands.
   *
   * `undefined` is the normal case and the default: the control owns whether it is
   * open, which is what a menu in an app should do. Given a boolean, the caller owns
   * it instead — the trigger still calls `onOpen` when pressed, so a controlled caller
   * hears the press, but nothing here decides anything any more, and the outside-click
   * and Escape rules stand down with it: closing is the caller's to do.
   *
   * IT EXISTS FOR THE DRAWINGS. The marketing site renders this component inside
   * storyboards that open the menu on a TIMER — a pointer arrives, presses, the panel
   * appears, an item lights up — and a component that only opens on a real click
   * cannot be told that story. The alternative was a second menu drawn by hand beside
   * this one, which is the exact divergence `AppGround` exists to end.
   *
   * The app passes nothing and behaves as it always has.
   */
  open?: boolean
  size?: ButtonIconSize
  tone?: SelectIconTone
  /**
   * How wide the panel is, in pixels. 280 by default — see `DEFAULT_PANEL_WIDTH`.
   *
   * A NUMBER AND NOT A CLASS, for `PANEL_WIDTH`'s old reason: the panel is portalled
   * and positioned by hand, so this same value is what the right-alignment and the
   * viewport clamp are computed from. A Tailwind width would set the box and leave
   * the arithmetic reading the old one.
   *
   * WHAT TO PASS. The width of the longest row, not the width of the control: a menu
   * is read at its text. The sort picker asks for 190 — three short phrases, no hint,
   * and a 230px column to sit inside — and the scripts menu asks for nothing because
   * 280 is already its own. Mind the row IN FORCE when measuring: its check takes
   * room the others leave to the label.
   */
  panelWidth?: number
  /**
   * Where the panel is portalled. `document.body` by default, which is right in the
   * app: `applyTheme` writes the theme onto `document.documentElement`, so a panel
   * rendered at the end of the body inherits every colour it needs.
   *
   * IT IS NOT RIGHT EVERYWHERE, and that is why the prop exists. Somewhere the theme
   * is scoped to a container rather than to the root — the site's `/design-system`
   * ground is the case that found this — a panel portalled past that container leaves
   * the variables behind and paints `rgb(var(--c-bg-tertiary))` with nothing to
   * resolve: a menu with a transparent ground. Hand it an element INSIDE the themed
   * container and the panel is themed again.
   */
  portalTo?: HTMLElement | null
  /**
   * A PILL WITH SEMICIRCULAR ENDS rather than the rung's rounded corners — `ButtonIcon`'s
   * `round`, for the same row: a picker beside `ToggleButton` tiles that are circles.
   */
  round?: boolean
  /** Margins and placement. Not the height, the ground or the radius. */
  className?: string
}

export function SelectIcon({
  icon,
  value,
  title,
  groups,
  onSelect,
  onOpen,
  open,
  loading = false,
  loadingLabel,
  emptyLabel,
  size = 'sm',
  tone = 'neutral',
  panelWidth = DEFAULT_PANEL_WIDTH,
  portalTo,
  round = false,
  className = '',
}: SelectIconProps) {
  const [selfOpen, setSelfOpen] = useState(false)
  // Controlled when `open` is given, and its own master otherwise — see the prop's note.
  const controlled = open !== undefined
  const isOpen = open ?? selfOpen
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const panelId = useId()

  const shape = BUTTON_ICON_SIZES[size]
  const panel = PANELS[size]
  const toneSpec = TONES[tone]

  // A no-op while controlled: the dismissal rules below would otherwise shut a panel
  // the caller has said is open, and it would spring back open on the next render.
  const close = useCallback(() => {
    if (!controlled) setSelfOpen(false)
  }, [controlled])

  const toggle = useCallback(() => {
    if (!isOpen) onOpen?.()
    if (!controlled) setSelfOpen((was) => !was)
  }, [isOpen, onOpen, controlled])

  // Anchored to the trigger, right-aligned, flipping above when the space below runs
  // out. Re-measured when the contents change: the panel is empty — and so
  // zero-height — on the frame the menu opens, and a flip decided on that frame would
  // be decided against a height the panel does not have yet.
  useLayoutEffect(() => {
    if (!isOpen) return
    const trigger = triggerRef.current
    if (!trigger) return

    const rect = trigger.getBoundingClientRect()
    const panelHeight = Math.min(panelRef.current?.offsetHeight ?? 0, PANEL_MAX_HEIGHT)
    const spaceBelow = window.innerHeight - rect.bottom

    const top =
      panelHeight > 0 && spaceBelow < panelHeight + VIEWPORT_MARGIN
        ? Math.max(VIEWPORT_MARGIN, rect.top - panelHeight - TRIGGER_GAP)
        : rect.bottom + TRIGGER_GAP

    const left = Math.max(
      VIEWPORT_MARGIN,
      Math.min(rect.right - panelWidth, window.innerWidth - panelWidth - VIEWPORT_MARGIN),
    )

    setPosition({ top, left })
  }, [isOpen, loading, groups, panelWidth])

  // Closes on an outside click, on Escape, and on anything that detaches the panel
  // from its trigger.
  //
  // THE PANEL IS NOT A DESCENDANT OF THE TRIGGER — that is what portalling costs — so
  // containment has to be checked against both, and the scroll rule needs an
  // exemption for the panel itself or scrolling a long list would close the very list
  // being scrolled.
  useEffect(() => {
    // Nothing to listen for while the caller owns the state: `close` cannot act, so the
    // four listeners would be four no-ops on every document event.
    if (!isOpen || controlled) return

    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (triggerRef.current?.contains(target)) return
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
  }, [isOpen, controlled, close])

  const hasItems = groups.some((group) => group.items.length > 0)

  return (
    <>
      {/* A PILL AND NOT A SQUARE, and it is the one place this parts from the ladder's
          width: the chevron needs room the mark does not. The height and the radius
          are the rung's own, so it stands level with the buttons beside it. */}
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        title={title}
        aria-label={title}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        className={`${shape.h} ${round ? 'rounded-full' : shape.radius} inline-flex items-center ${
          value ? 'justify-between gap-2 px-3' : `justify-center gap-0.5 ${round ? 'px-2.5' : 'px-1.5'}`
        } border-none cursor-pointer transition-colors flex-shrink-0
          ${isOpen ? toneSpec.open : toneSpec.rest} ${className}`}
      >
        <Icon glyph={icon} size={shape.icon} tone="inherit" className="flex-shrink-0" />
        {/* The word, when there is one: it takes the room between the mark and the chevron
            and gives it up first — `min-w-0 flex-1 truncate` — so a fixed-width control
            stays fixed and a long name loses its tail rather than its chevron. */}
        {value && (
          <Text size={panel.text} weight="medium" tone="inherit" className="min-w-0 flex-1 truncate text-left">
            {value}
          </Text>
        )}
        {/* A rung below the mark on a chip: it is the grammar of the control, not its
            subject. On a FIELD — one with a word — it grows to the mark's own rung: a
            control that says its value is read like a select, and a select's chevron is
            what you aim for. */}
        <Icon
          glyph={ChevronDown}
          size={value ? shape.icon : 'xs'}
          tone="inherit"
          className={`flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={panelRef}
            id={panelId}
            role="menu"
            style={{
              position: 'fixed',
              top: position?.top ?? -9999,
              left: position?.left ?? -9999,
              width: panelWidth,
              maxHeight: PANEL_MAX_HEIGHT,
              // Hidden until measured, so the first paint never flashes at 0,0.
              visibility: position ? 'visible' : 'hidden',
            }}
            className="z-[60] overflow-y-auto bg-bg-tertiary rounded-lg shadow-xl"
          >
            {loading ? (
              <Message panel={panel}>{loadingLabel ?? ''}</Message>
            ) : !hasItems ? (
              <Message panel={panel}>{emptyLabel ?? ''}</Message>
            ) : (
              groups.map((group, groupIndex) =>
                group.items.length === 0 ? null : (
                  // Keyed by POSITION and not by label: nothing stops two packages in a
                  // monorepo from carrying the same name, and a duplicate key there
                  // would drop a whole group out of the menu silently.
                  <div key={groupIndex}>
                    <GroupHeader label={group.label} panel={panel} />
                    {group.items.map((item) => (
                      <Row
                        key={item.id}
                        item={item}
                        icon={icon}
                        panel={panel}
                        onSelect={() => {
                          onSelect(item)
                          close()
                        }}
                      />
                    ))}
                  </div>
                ),
              )
            )}
          </div>,
          // Read at render and not in a default parameter: `document` does not exist
          // when this module is evaluated on a server.
          portalTo ?? document.body,
        )}
    </>
  )
}

/** Loading, or empty. One line, quiet, in the row's own padding. */
function Message({ children, panel }: { children: string; panel: PanelScale }) {
  return (
    <div className={panel.row}>
      <Text size={panel.text} tone="secondary" className="opacity-50">
        {children}
      </Text>
    </div>
  )
}

/** The one header style, whatever the groups are grouping. */
function GroupHeader({ label, panel }: { label: string; panel: PanelScale }) {
  return (
    <div
      className={`${panel.row} ${panel.small} text-text-secondary/40 uppercase tracking-wider font-semibold bg-bg-secondary/40 truncate`}
    >
      {label}
    </div>
  )
}

function Row({
  item,
  icon,
  panel,
  onSelect,
}: {
  item: SelectIconItem
  icon: IconComponent
  panel: PanelScale
  onSelect: () => void
}) {
  // A radio group only where a row says it is the current one — `role` is a promise
  // to a reader, and `menuitemradio` on a menu where nothing is ever checked is a
  // promise of a state that never arrives.
  const choosable = item.selected !== undefined

  return (
    <button
      type="button"
      role={choosable ? 'menuitemradio' : 'menuitem'}
      aria-checked={choosable ? item.selected : undefined}
      onClick={() => !item.disabled && onSelect()}
      disabled={item.disabled}
      title={item.hint}
      className={`w-full flex items-center gap-2 ${panel.row} text-left border-none transition-colors ${
        item.selected ? 'bg-surface' : 'bg-transparent'
      } ${item.disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-surface cursor-pointer'}`}
    >
      {/* THE TRIGGER'S OWN MARK unless the row brought one — see `SelectIconItem.icon`.
          The menu is opened by a play triangle and every row is a thing to play; a
          second glyph there would be a second idea, while a menu of KINDS needs one
          mark per kind. It takes the accent — the rows are the one place in this
          component with an action colour, and the trigger's tone is the trigger's. */}
      <Icon glyph={item.icon ?? icon} size={panel.mark} tone="inherit" className="flex-shrink-0 text-accent" />
      <Text size={panel.text} className={`truncate ${item.selected ? 'text-accent' : ''}`}>
        {item.label}
      </Text>
      {item.hint && (
        <span className={`${panel.small} text-text-secondary/40 truncate ml-auto`}>{item.hint}</span>
      )}
      {/* `ml-auto` here and on the hint both: a row has one or the other, never both,
          and whichever is present is what pushes itself to the right edge. */}
      {item.selected && (
        <Icon glyph={Check} size={panel.mark} tone="inherit" className="flex-shrink-0 text-accent ml-auto" />
      )}
    </button>
  )
}
