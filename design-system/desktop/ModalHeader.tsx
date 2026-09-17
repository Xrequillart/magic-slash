import type { ReactNode } from 'react'
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
}: ModalHeaderProps) {
  return (
    <div
      className={`relative flex shrink-0 items-center justify-between gap-3 ${gutter === 'wide' ? 'px-6' : 'px-4'}`}
      style={{ height: MODAL_HEADER_HEIGHT }}
    >
      {/* The name keeps the left, where every window in the app puts it.
          `truncate` is on the WORD and not on the row, now that a mark shares it: on the
          row it would apply to a flex container, which ellipses nothing and would let
          the icon be the thing that got cut. The width cap keeps it clear of the centred
          strip — the same guard `AppTitleBar` puts on its own centred element. */}
      <span className="flex min-w-0 max-w-[25%] items-center gap-2">
        {icon && <Icon glyph={icon} size="sm" tone="muted" className="flex-shrink-0" />}
        <Text size="xs" weight="bold" className="truncate">{title}</Text>
      </span>

      {/* CENTRED ON THE BAND, not on the space left between the name and the buttons:
          absolutely positioned, so the two groups either side can be any width they like
          and the strip does not drift as a title or an indicator changes. `left-1/2`
          measures the header's own box, so the strip sits in the middle of the WINDOW
          rather than in the middle of what is left over. */}
      {tabs && (
        <div className="absolute left-1/2 -translate-x-1/2">
          <TabStrip
            ariaLabel={tabs.ariaLabel}
            items={tabs.items}
            activeKey={tabs.activeKey}
            onSelect={tabs.onSelect}
          />
        </div>
      )}

      <div className="flex flex-shrink-0 items-center gap-1">
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
