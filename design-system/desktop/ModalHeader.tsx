import type { CSSProperties, ReactNode } from 'react'
import { TRAFFIC_LIGHT_GUTTER } from './AppTitleBar'
import { ButtonIcon } from './ButtonIcon'
import { Icon } from './Icon'
import { Maximize2, Minimize2, X } from './icons'
import { TabStrip, type TabStripItem } from './TabStrip'
import { Text } from './Text'
import type { IconComponent } from './types'

/**
 * THE BAND ACROSS THE TOP OF EVERY DIALOG IN THE APP — a mark and a name on the left,
 * the pages in the middle when there are several, and the two controls that act on the
 * WINDOW rather than on what is inside it on the right.
 *
 * It was written twice. The page overlay had one shape — a mark, a heading, a centred
 * `TabStrip`, a full-screen button and a close — and the dialog had another: a bare
 * `<h3>` and a close, at a different height, with a different padding, and a rule under
 * it that the overlay's header did not have. Two headers is two answers to "what does
 * the top of a dialog look like", and the day one of them grew a tab strip the other
 * could not follow.
 *
 * THE TWO BUTTONS ARE `ButtonIcon`s, which is the whole reason this is worth extracting
 * rather than copying: both headers had hand-rolled `<button className="p-1.5 …">` with
 * their own hover, their own radius and their own idea of the mark's size. A control
 * that is only a mark is `ButtonIcon`, everywhere, and this was the last place in the
 * app still arguing with that.
 *
 * NO RULE UNDER IT. There was a `border-b` and it went with the frame's own border: a
 * dialog is one surface, and a line drawn across it says the header is a separate panel
 * sitting on the body. The header is told apart by its height and its weight, which is
 * how every window in this app tells its chrome from its content.
 *
 * EVERYTHING IS DATA, `Label`'s rule: the mark is an `IconComponent` and not a node, the
 * tabs are `TabStrip`'s own items, and every word arrives translated. `right` is the one
 * slot, for the chrome a PAGE owns rather than the dialog — the plans list hangs a live
 * indicator there — and it sits before the buttons because those two are the last thing
 * in the row in every window in the app.
 */

export interface ModalHeaderProps {
  /**
   * The name of what is open. With `tabs` it names the ACTIVE page: the strip in the
   * middle is what you choose with, this is what you are on.
   */
  title: string
  /** The mark beside it, naming the same page the word does. */
  icon?: IconComponent
  /**
   * The pages this dialog switches between, when it hosts more than one.
   *
   * `TabStrip`'s own items, so a second level of pages here looks like every other one
   * in the app rather than like a control this header invented. A dialog with a single
   * page passes nothing, which is most of them.
   */
  tabs?: {
    items: TabStripItem[]
    activeKey: string
    onSelect: (key: string) => void
    ariaLabel: string
  }
  /** A page's own chrome, before the buttons — a live indicator, a count. */
  right?: ReactNode
  /**
   * How far in the title sits, so the header can line up with the body under it.
   *
   * A RUNG AND NOT A `className`, for the reason every other size in this folder is: a
   * second spelling of the padding wins or loses on the order Tailwind emitted the two,
   * and a header that disagreed with its own dialog by four pixels is precisely the bug
   * this is here to stop — the app's dialog sat at `px-5` against this header's `px-4`
   * for as long as both were hand-written.
   *
   * `default` is the page overlay, which is a window and pads like one. `wide` is the
   * dialog, whose body has room to breathe and would otherwise start eight pixels right
   * of its own title.
   */
  gutter?: 'default' | 'wide'
  /**
   * THE EXPAND CONTROL, and absent it simply is not drawn.
   *
   * A page overlay can take the whole window and a confirmation dialog cannot — there
   * is nothing in "are you sure?" to expand into. So this is optional rather than a
   * boolean that some callers set to false: a prop that is not passed draws nothing,
   * where a `false` would still be a decision this component had to hold.
   */
  fullScreen?: {
    expanded: boolean
    onToggle: () => void
    /** The tooltip while it would expand, and while it would shrink. Translated. */
    expandTitle: string
    collapseTitle: string
  }
  /**
   * Dismiss. OPTIONAL, for the one dialog that puts its own close somewhere else: a
   * dialog opening on a hero image carries the button in the image's corner, and a
   * second one in the band under it would be two ways out of one window.
   */
  onClose?: () => void
  /** The close button's tooltip — where the Escape hint goes. Translated. */
  closeTitle?: string
  /**
   * KEEP THE TRAFFIC LIGHTS' 64px CLEAR, because a dialog that reaches the top of the
   * window does not get them out of the way.
   *
   * macOS draws its three buttons OVER the web content when the window is
   * `titleBarStyle: 'hidden'`, so a full-screen page overlay is painted UNDER them, not
   * instead of them. Without this the overlay's mark and title sit exactly where the
   * lights are — `px-4` is 16px and the close button starts at 16px.
   *
   * A MARGIN ON THE TITLE AND NOT A SPACER IN THE ROW, which is the one thing here worth
   * explaining. A spacer would be a flex child and would bring the row's `gap-2` with it,
   * so an overlay that is NOT full screen would carry 8px of indent it never asked for.
   * A margin that is zero when the prop is off costs the other case nothing, and it is a
   * length at both ends, so it travels with the panel over the same 300ms rather than
   * popping in on the first frame.
   *
   * THE CALLER'S, and in the app it is the window's: `PageModal` passes it only while
   * full screen, and only while the window is not in NATIVE fullscreen — the lights are
   * gone there, and a gutter kept for them would be a hole nothing fills.
   */
  trafficLightGutter?: boolean
  /**
   * LET THE WINDOW BE DRAGGED BY THIS BAND.
   *
   * For the one case where this header is the only chrome left on screen: a full-screen
   * page overlay covers the app's own title bar, and that bar is what the window was
   * dragged by. Without this the window becomes immovable for as long as the overlay is
   * open, which is a dialog that has quietly taken the window hostage.
   *
   * THE CONTROLS OPT BACK OUT, and they have to — Electron hands macOS a set of
   * RECTANGLES computed from the DOM rather than a hit-test, so a button merely painted
   * over a drag region does not reclaim its pixels; only `no-drag` does. The tab strip
   * and the right-hand group carry it. The title does not, deliberately: dragging a
   * window by the name of what is in it is what every window on the platform does.
   *
   * A browser ignores `-webkit-app-region` entirely, so a drawing of the app pays
   * nothing for this.
   */
  draggable?: boolean
}

/**
 * 48px, and it is the number both headers had already landed on independently. Written
 * here once rather than as `h-12` at two call sites, which is how two headers that agree
 * today stop agreeing.
 */
export const MODAL_HEADER_HEIGHT = 48

export function ModalHeader({
  title,
  icon,
  tabs,
  right,
  fullScreen,
  onClose,
  closeTitle,
  gutter = 'default',
  trafficLightGutter = false,
  draggable = false,
}: ModalHeaderProps) {
  /** See `draggable` — the controls have to opt out of the region the band opts into. */
  const noDrag = (draggable ? { WebkitAppRegion: 'no-drag' } : {}) as CSSProperties

  return (
    // THREE TRACKS AND NOT AN ABSOLUTE STRIP — `minmax(0,1fr) auto minmax(0,1fr)`.
    //
    // The strip was absolutely centred on the band, which centred it perfectly and let
    // it go UNDER the title when the band got narrow: the title's guard was a share of
    // the header's own width (`max-w-[25%]`), a number that knows nothing about where
    // the strip actually starts. At 72rem the two never met and the guard read as
    // sufficient. At the narrow overlay's 51rem they very nearly do — 30px apart with
    // today's longest tab set — and one longer page name would have put a word across
    // the pills with no ellipsis anywhere.
    //
    // Two equal side tracks centre the middle one on the BAND just as exactly, because
    // `1fr` and `1fr` are equal by construction — so nothing is given up — and the sides
    // are now real columns with a width: `minmax(0, …)` lets the left one shrink below
    // its text, which is what turns a word too long for the space into an ellipsis
    // instead of an overlap. The strip cannot be reached at all.
    <div
      className={`grid shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 ${gutter === 'wide' ? 'px-6' : 'px-4'}`}
      style={{
        height: MODAL_HEADER_HEIGHT,
        ...(draggable ? { WebkitAppRegion: 'drag' } : {}),
      } as CSSProperties}
    >
      {/* The name keeps the left, where every window in the app puts it.
          `truncate` is on the WORD and not on the row, now that a mark shares it: on the
          row it would apply to a flex container, which ellipses nothing and would let
          the icon be the thing that got cut.

          The margin is the traffic lights' gutter — see `trafficLightGutter` for why it
          is a margin here rather than a spacer in the row, and why it is animated. */}
      <span
        className="flex min-w-0 items-center gap-2 transition-[margin] duration-300 ease-out motion-reduce:transition-none"
        style={{ marginInlineStart: trafficLightGutter ? TRAFFIC_LIGHT_GUTTER : 0 }}
      >
        {icon && <Icon glyph={icon} size="sm" tone="muted" className="flex-shrink-0" />}
        <Text size="xs" weight="bold" className="truncate">{title}</Text>
      </span>

      {/* The middle track, which is the strip's when there is one and empty when there is
          not — an empty cell rather than no cell, so the buttons stay in the THIRD track
          and keep the right edge whatever the header holds.

          The strip is WRAPPED rather than given the property itself, because `TabStrip`
          takes a `className` and not a `style`, and `-webkit-app-region` has no Tailwind
          utility. The wrapper is a bare grid item at the same `auto` width the strip was,
          so it changes nothing about where the strip sits. */}
      {tabs ? (
        <div style={noDrag}>
          <TabStrip
            ariaLabel={tabs.ariaLabel}
            items={tabs.items}
            activeKey={tabs.activeKey}
            onSelect={tabs.onSelect}
          />
        </div>
      ) : (
        <span />
      )}

      <div className="flex flex-shrink-0 items-center justify-self-end gap-1" style={noDrag}>
        {right}
        {/* Expanding comes BEFORE closing: it acts on the overlay rather than on what is
            inside it, and closing stays the last thing in the row, where every window in
            the app puts it. */}
        {fullScreen && (
          <ButtonIcon
            icon={fullScreen.expanded ? Minimize2 : Maximize2}
            title={fullScreen.expanded ? fullScreen.collapseTitle : fullScreen.expandTitle}
            onClick={fullScreen.onToggle}
          />
        )}
        {onClose && <ButtonIcon icon={X} title={closeTitle ?? ''} onClick={onClose} />}
      </div>
    </div>
  )
}
