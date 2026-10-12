import { useState, type DragEvent } from 'react'
import { X } from './icons'
import { ButtonIcon } from './ButtonIcon'
import { Card } from './Card'
import { CONTROL_CENTER_GRID } from './ControlCenter'
import { Text } from './Text'
import { ToggleButton } from './ToggleButton'
import { placeQuickSetting } from './quickSettingsOrder'
import type { IconComponent } from './types'

/**
 * ARRANGING THE QUICK SETTINGS SHEET: which switches it carries and in what order, by
 * dragging the sheet's own tiles.
 *
 * Two plates, one over the other. The upper one IS the sheet — the same 4×40 grid
 * (`CONTROL_CENTER_GRID`), the same lit `ToggleButton`s — so what is arranged here is what
 * comes down from the title bar, tile for tile. The lower one holds the switches the
 * sheet does not carry, unlit.
 *
 * ── THREE GESTURES, AND A CLICK FOR EACH ──────────────────────────────────────────
 *
 * Drag a tile of the sheet onto another to put it there; drag it onto the lower plate to
 * take it off; drag a tile from below onto the sheet to add it where it lands (onto the
 * plate's empty part, it goes last). Each also has a pointer-free road, because a
 * drag-only control is one a keyboard cannot use: the × on a sheet tile takes it off, and
 * pressing a tile below adds it at the end.
 *
 * Pressing a sheet tile does NOTHING here, on purpose. On the real sheet it flips the
 * setting; in an editor of the sheet's layout, flipping a setting as a side effect of
 * picking a tile up would be a surprise the reader did not ask for.
 *
 * THE LIST IS DATA AND SO IS THE ANSWER: the items arrive as ids with a mark and a name,
 * and every change goes back as the whole new order of ids. What each id does is the
 * app's (renderer/components/quickSettingTiles.ts), not this component's.
 */

export interface QuickSettingsEditorItem {
  id: string
  /** Translated. The tile's tooltip and accessible name, as on the sheet. */
  label: string
  icon: IconComponent
}

export interface QuickSettingsEditorProps {
  /** On the sheet, in order. */
  items: QuickSettingsEditorItem[]
  /** Not on it, in catalogue order. */
  available: QuickSettingsEditorItem[]
  /** The sheet's new order of ids, after any gesture. */
  onChange: (ids: string[]) => void
  /** Headings over the two plates, and what each says when empty. Translated. */
  menuLabel: string
  menuEmpty: string
  availableLabel: string
  availableEmpty: string
  /** The × button's accessible name, per tile ("Remove Notifications"). Translated. */
  removeLabel: (label: string) => string
  /** Dimmed and inert, while the sheet itself is switched off. */
  disabled?: boolean
  className?: string
}

/** What is being dragged and from where, and where it would land. */
interface DragState {
  id: string
  from: 'menu' | 'available'
}

const MIME = 'application/x-quick-setting'


export function QuickSettingsEditor({
  items, available, onChange, menuLabel, menuEmpty, availableLabel, availableEmpty, removeLabel,
  disabled = false, className = '',
}: QuickSettingsEditorProps) {
  const [drag, setDrag] = useState<DragState | null>(null)
  // The index on the sheet the dragged tile would be inserted BEFORE; `items.length` is
  // last. Null while the pointer is not over the sheet.
  const [dropAt, setDropAt] = useState<number | null>(null)
  const [overAvailable, setOverAvailable] = useState(false)

  const ids = items.map((item) => item.id)

  const insert = (id: string, at: number) => {
    const next = placeQuickSetting(ids, id, at)
    if (next.join() !== ids.join()) onChange(next)
  }
  const remove = (id: string) => onChange(ids.filter((x) => x !== id))

  const start = (event: DragEvent, id: string, from: DragState['from']) => {
    event.dataTransfer.setData(MIME, id)
    event.dataTransfer.effectAllowed = 'move'
    setDrag({ id, from })
  }
  const end = () => {
    setDrag(null)
    setDropAt(null)
    setOverAvailable(false)
  }

  // Over a sheet tile: before it, or after it past its middle.
  const overTile = (event: DragEvent<HTMLElement>, index: number) => {
    if (!drag) return
    event.preventDefault()
    event.stopPropagation()
    const box = event.currentTarget.getBoundingClientRect()
    setDropAt(event.clientX > box.left + box.width / 2 ? index + 1 : index)
  }
  const dropOnMenu = (event: DragEvent) => {
    event.preventDefault()
    if (drag) insert(drag.id, dropAt ?? items.length)
    end()
  }
  const dropOnAvailable = (event: DragEvent) => {
    event.preventDefault()
    if (drag?.from === 'menu') remove(drag.id)
    end()
  }

  return (
    <div className={`flex flex-col gap-4 ${disabled ? 'pointer-events-none opacity-40' : ''} ${className}`.trim()}>
      <div className="flex flex-col gap-2">
        <Text size="xs" tone="secondary">{menuLabel}</Text>
        {/* THE SHEET, at the sheet's own width: `w-fit` around the 4×40 grid. */}
        <Card
          ground="raised"
          className={`w-fit transition-shadow ${drag && dropAt !== null ? 'ring-2 ring-accent/40' : ''}`}
        >
          <div
            className={`${CONTROL_CENTER_GRID} min-h-10`}
            onDragOver={(event) => {
              if (!drag) return
              event.preventDefault()
              if (dropAt === null) setDropAt(items.length)
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropAt(null)
            }}
            onDrop={dropOnMenu}
          >
            {items.length === 0 && (
              <Text size="xs" tone="secondary" className="col-span-4 self-center opacity-60">{menuEmpty}</Text>
            )}
            {items.map((item, index) => (
              <span
                key={item.id}
                draggable={!disabled}
                onDragStart={(event) => start(event, item.id, 'menu')}
                onDragEnd={end}
                onDragOver={(event) => overTile(event, index)}
                className={`group relative cursor-grab active:cursor-grabbing ${drag?.id === item.id ? 'opacity-30' : ''}`}
              >
                {/* Where the tile would land: a bar in the gap before this tile, or after
                    the last one. */}
                {drag && dropAt === index && (
                  <span aria-hidden="true" className="absolute -left-2 top-1 bottom-1 w-0.5 rounded-full bg-accent" />
                )}
                {drag && dropAt === items.length && index === items.length - 1 && (
                  <span aria-hidden="true" className="absolute -right-2 top-1 bottom-1 w-0.5 rounded-full bg-accent" />
                )}
                <ToggleButton icon={item.icon} checked onChange={() => {}} caption={false} label={item.label} />
                <ButtonIcon
                  icon={X}
                  size="2xs"
                  tone="solid"
                  title={removeLabel(item.label)}
                  onClick={() => remove(item.id)}
                  className="absolute -right-1.5 -top-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                />
              </span>
            ))}
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-2">
        <Text size="xs" tone="secondary">{availableLabel}</Text>
        <div
          className={`rounded-xl border border-dashed p-4 transition-colors ${
            overAvailable && drag?.from === 'menu' ? 'border-accent bg-accent/5' : 'border-line'
          }`}
          onDragOver={(event) => {
            if (drag?.from !== 'menu') return
            event.preventDefault()
            setOverAvailable(true)
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOverAvailable(false)
          }}
          onDrop={dropOnAvailable}
        >
          {available.length === 0 ? (
            <Text size="xs" tone="secondary" className="opacity-60">{availableEmpty}</Text>
          ) : (
            <div className="flex flex-wrap gap-3">
              {available.map((item) => (
                <span
                  key={item.id}
                  draggable={!disabled}
                  onDragStart={(event) => start(event, item.id, 'available')}
                  onDragEnd={end}
                  className={`cursor-grab active:cursor-grabbing ${drag?.id === item.id ? 'opacity-30' : ''}`}
                >
                  {/* Pressing adds it at the end: the keyboard's road onto the sheet. */}
                  <ToggleButton
                    icon={item.icon}
                    checked={false}
                    onChange={() => insert(item.id, items.length)}
                    caption={false}
                    label={item.label}
                  />
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
