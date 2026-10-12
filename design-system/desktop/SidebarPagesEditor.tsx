import { useState, type DragEvent, type KeyboardEvent } from 'react'
import { GripVertical } from './icons'
import { Card } from './Card'
import { Icon } from './Icon'
import { Select } from './Select'
import { Text } from './Text'
import { placeQuickSetting } from './quickSettingsOrder'
import type { IconComponent } from './types'

/**
 * ARRANGING THE SIDEBAR'S MENU: the pages it draws, in which order, and which of them it
 * leaves out.
 *
 * One plate of rows, one row per page, in the order the menu will draw them. A row is the
 * page as the menu shows it (its mark and its name) between a grip on the left and a
 * visibility select on the right. A hidden page stays in the list, dimmed, at its place:
 * hiding is not removing, and showing it again puts it back exactly where it was.
 *
 * ── TWO ROADS TO A NEW ORDER ──────────────────────────────────────────────────────
 *
 * Drag a row by anywhere onto another to put it before or after it, past the middle of
 * the target. Or focus the grip, which is a button for that reason, and press the up or
 * down arrow: a drag-only control is one a keyboard cannot use.
 *
 * THE LIST IS DATA AND SO IS THE ANSWER, on `QuickSettingsEditor`'s model: the pages
 * arrive as ids with a mark and a name, a reorder goes back as the whole new order of ids
 * and a visibility change as one id and its new state. Which page an id opens is the
 * app's, not this component's.
 */

export interface SidebarPagesEditorItem {
  id: string
  /** Translated. The page's name, as the menu shows it. */
  label: string
  icon: IconComponent
  /** False when the menu leaves it out. */
  visible: boolean
}

export interface SidebarPagesEditorProps {
  /** Every page, in the menu's order, hidden ones included. */
  items: SidebarPagesEditorItem[]
  /** The whole new order of ids, after a drag or an arrow key. */
  onReorder: (ids: string[]) => void
  onVisibilityChange: (id: string, visible: boolean) => void
  /** The two options of the select. Translated. */
  showLabel: string
  hideLabel: string
  /** The grip's accessible name, per row ("Move Tasks"). Translated. */
  moveLabel: (label: string) => string
  /** The select's accessible name, per row ("Tasks visibility"). Translated. */
  visibilityLabel: (label: string) => string
  className?: string
}

const MIME = 'application/x-sidebar-page'

export function SidebarPagesEditor({
  items, onReorder, onVisibilityChange, showLabel, hideLabel, moveLabel, visibilityLabel, className = '',
}: SidebarPagesEditorProps) {
  const [dragId, setDragId] = useState<string | null>(null)
  // The index the dragged row would be inserted BEFORE; `items.length` is last.
  const [dropAt, setDropAt] = useState<number | null>(null)

  const ids = items.map((item) => item.id)

  const place = (id: string, at: number) => {
    const next = placeQuickSetting(ids, id, at)
    if (next.join() !== ids.join()) onReorder(next)
  }

  const start = (event: DragEvent, id: string) => {
    event.dataTransfer.setData(MIME, id)
    event.dataTransfer.effectAllowed = 'move'
    setDragId(id)
  }
  const end = () => {
    setDragId(null)
    setDropAt(null)
  }

  // Over a row: before it, or after it past its middle.
  const over = (event: DragEvent<HTMLElement>, index: number) => {
    if (!dragId) return
    event.preventDefault()
    const box = event.currentTarget.getBoundingClientRect()
    setDropAt(event.clientY > box.top + box.height / 2 ? index + 1 : index)
  }
  const drop = (event: DragEvent) => {
    event.preventDefault()
    if (dragId && dropAt !== null) place(dragId, dropAt)
    end()
  }

  // The keyboard's road: one place up or down. `+ 2` because the insertion point is
  // measured on the list WITH the row still in it (see placeQuickSetting).
  const nudge = (event: KeyboardEvent, index: number) => {
    if (event.key === 'ArrowUp' && index > 0) {
      event.preventDefault()
      place(ids[index], index - 1)
    } else if (event.key === 'ArrowDown' && index < ids.length - 1) {
      event.preventDefault()
      place(ids[index], index + 2)
    }
  }

  const options = [
    { value: 'show', label: showLabel },
    { value: 'hide', label: hideLabel },
  ]

  return (
    <Card ground="raised" padding="none" className={className}>
      <ul className="flex flex-col divide-y divide-line-subtle" onDrop={drop} onDragOver={(event) => dragId && event.preventDefault()}>
        {items.map((item, index) => (
          <li
            key={item.id}
            draggable
            onDragStart={(event) => start(event, item.id)}
            onDragEnd={end}
            onDragOver={(event) => over(event, index)}
            className={`relative flex items-center gap-3 px-3 py-2.5 ${dragId === item.id ? 'opacity-30' : ''}`}
          >
            {/* Where the row would land: a bar on the seam above this row, or below the last. */}
            {dragId && dropAt === index && (
              <span aria-hidden="true" className="absolute left-3 right-3 -top-px h-0.5 rounded-full bg-accent" />
            )}
            {dragId && dropAt === items.length && index === items.length - 1 && (
              <span aria-hidden="true" className="absolute left-3 right-3 -bottom-px h-0.5 rounded-full bg-accent" />
            )}
            <button
              type="button"
              aria-label={moveLabel(item.label)}
              title={moveLabel(item.label)}
              onKeyDown={(event) => nudge(event, index)}
              className="flex h-6 w-4 shrink-0 cursor-grab items-center justify-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 active:cursor-grabbing"
            >
              <Icon glyph={GripVertical} size="sm" tone="muted" />
            </button>
            <span className={`flex min-w-0 flex-1 items-center gap-2.5 ${item.visible ? '' : 'opacity-50'}`}>
              <Icon glyph={item.icon} size="md" tone="default" className="shrink-0" />
              <Text size="sm" tone="ink" className="truncate" title={item.label}>{item.label}</Text>
            </span>
            {/* A fixed width, as `Select` asks of a column of pickers: omitted, it fills the
                row and the page's name is squeezed to nothing. 156 holds the longest option
                of both languages ("Toujours afficher") with its chevron. */}
            <Select
              size="md"
              width={156}
              fit
              value={item.visible ? 'show' : 'hide'}
              options={options}
              onChange={(value) => onVisibilityChange(item.id, value === 'show')}
              ariaLabel={visibilityLabel(item.label)}
            />
          </li>
        ))}
      </ul>
    </Card>
  )
}
