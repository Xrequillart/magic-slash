import { useEffect, useRef, useState } from 'react'
import { NodeResizer, type Node, type NodeProps, type ResizeParams } from '@xyflow/react'

/**
 * A STICKY NOTE ON THE WORKFLOW CANVAS: a card of free text, the way a post-it sits on a
 * FigJam board. Not a step, not an end note, not a frame: no port, nothing the skills read.
 *
 * WRITTEN ON THE CARD ITSELF, the FigJam way. At rest the whole card is taken by, text
 * included: the textarea lets the pointer through. A DOUBLE-CLICK starts writing, and only
 * then is the textarea `nodrag` and `nowheel`, so selecting words and scrolling a long text
 * neither drag the card nor pan the canvas. The text is handed over (`onChangeText`) once
 * the field is left, on ⌘Enter or on Escape, and the card is back to being dragged.
 * Read-only, the same text, its lines kept. Empty, it says so (`placeholder`).
 *
 * Its paper is the admin's colour (`color`), tinted over the card's opaque ground so the
 * links under it never show through. Selected, it is resized from its edges and corners
 * (xyflow's `NodeResizer`), like a frame.
 */

export interface WorkflowCanvasSticky {
  /** Its node id on the canvas: `sticky:s1`. */
  id: string
  text: string
  /** `#RRGGBB`. */
  color: string
  x: number
  y: number
  width: number
  height: number
}

export interface WorkflowStickyData extends Record<string, unknown> {
  sticky: WorkflowCanvasSticky
  /** What an empty sticky note reads: "Write something…". */
  placeholder?: string
  /** Drawn with the selection ring, and its edges become handles. Editable canvas only. */
  selected?: boolean
  /** Its text, once the field is left. Without it, the text is read-only. */
  onChangeText?: (id: string, text: string) => void
  /** Resizable while selected: the box as it is dragged, and once let go. */
  onResize?: (id: string, box: ResizeParams) => void
  onResizeEnd?: (id: string, box: ResizeParams) => void
  minWidth?: number
  minHeight?: number
}

export type WorkflowStickyType = Node<WorkflowStickyData, 'sticky'>

export function WorkflowSticky({ data }: NodeProps<WorkflowStickyType>) {
  const { sticky, placeholder = '', selected = false, onChangeText, onResize, onResizeEnd, minWidth, minHeight } = data
  const [draft, setDraft] = useState(sticky.text)
  // A text changed elsewhere (undo, a reload) is the one to show.
  useEffect(() => setDraft(sticky.text), [sticky.text])
  // Writing: the textarea takes the pointer. At rest, the card does.
  const [editing, setEditing] = useState(false)
  const field = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = field.current
    if (!editing || !el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
  }, [editing])
  const commit = () => {
    setEditing(false)
    if (draft !== sticky.text) onChangeText?.(sticky.id, draft)
  }
  const tint = { backgroundImage: `linear-gradient(${sticky.color}40, ${sticky.color}40)` }

  return (
    <>
      {onResizeEnd && (
        <NodeResizer
          isVisible={selected}
          minWidth={minWidth}
          minHeight={minHeight}
          color={sticky.color}
          onResize={(_, box) => onResize?.(sticky.id, box)}
          onResizeEnd={(_, box) => onResizeEnd(sticky.id, box)}
        />
      )}
      <div
        className={`flex h-full w-full flex-col rounded-lg border bg-bg-secondary p-1 shadow-md ${selected ? 'ring-2 ring-accent/40' : ''}`}
        style={{ ...tint, borderColor: `${sticky.color}99` }}
        aria-current={selected ? 'true' : undefined}
        onDoubleClick={onChangeText ? () => setEditing(true) : undefined}
      >
        {onChangeText ? (
          <textarea
            ref={field}
            value={draft}
            readOnly={!editing}
            tabIndex={editing ? 0 : -1}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if ((event.key === 'Enter' && (event.metaKey || event.ctrlKey)) || event.key === 'Escape') {
                event.preventDefault()
                // Escape writes too, then lets go: the canvas's own Escape is not for this press.
                event.stopPropagation()
                event.currentTarget.blur()
              }
            }}
            placeholder={placeholder}
            aria-label={placeholder}
            className={`min-h-0 flex-1 resize-none bg-transparent px-2 py-1 text-sm font-normal leading-5 text-ink outline-none placeholder:text-text-secondary ${
              editing ? 'nodrag nowheel cursor-text' : 'pointer-events-none select-none'
            }`}
          />
        ) : (
          <div className={`min-h-0 flex-1 overflow-hidden whitespace-pre-wrap break-words px-2 py-1 text-sm font-normal leading-5 ${sticky.text ? 'text-ink' : 'italic text-text-secondary'}`}>
            {sticky.text || placeholder}
          </div>
        )}
      </div>
    </>
  )
}
