import { MenuSidebarItem, type MenuSidebarItemProps } from './MenuSidebarItem'

/**
 * The sidebar's menu: the rows that take you somewhere, as one list.
 *
 * IT IS A `<nav>`, which is the whole reason it exists as a component rather than as
 * a `<div>` around three buttons. Four controls that navigate are a landmark a screen
 * reader can jump to; four buttons in a column are four buttons. The app drew them
 * loose, so the one part of the sidebar that IS navigation was the one part not
 * announced as such.
 *
 * ITEMS AND NOT CHILDREN. `Status` takes options, `SelectIcon` takes groups, and this
 * takes rows, for the same reason all three do: a list whose contents arrive as nodes
 * is a list that cannot promise anything about them — and the promise here is that
 * every row is the same row. It is also what lets the account control, which is one
 * row wearing three faces, hand over a row instead of rendering one.
 *
 * THE ORDER IS THE CALLER'S and it carries meaning: in the app it is the order the
 * work happens in — you plan something, then you pick it up, and Skills is the
 * reference material for doing so. Putting the reference list above either view of
 * live work would be filing the manual in front of the job. This component would have
 * no way to know that, so it does not try.
 *
 * WHERE IT SITS IS ALSO THE CALLER'S. The rhythm between rows belongs here; the
 * padding around the group belongs to whatever column it is dropped into, and arrives
 * through `className`.
 */

export interface MenuSidebarEntry extends MenuSidebarItemProps {
  /** Stable across renders — a route name, not an index. */
  id: string
}

export interface MenuSidebarProps {
  items: MenuSidebarEntry[]
  /**
   * What this navigation IS, translated — "Pages", "Main". A page with two landmarks
   * and no names on them is a page with two places called "navigation", which is worse
   * for a reader moving by landmark than having none at all. The app's sidebar has
   * exactly that: this menu, and the agent list below it.
   */
  ariaLabel?: string
  /** Where the group sits: the column's padding, a margin. Not the gap between rows. */
  className?: string
}

export function MenuSidebar({ items, ariaLabel, className = '' }: MenuSidebarProps) {
  return (
    <nav aria-label={ariaLabel} className={`flex flex-col gap-1 ${className}`.trim()}>
      {items.map(({ id, ...item }) => (
        <MenuSidebarItem key={id} {...item} />
      ))}
    </nav>
  )
}
