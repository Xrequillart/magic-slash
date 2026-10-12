import { NodeResizer, type Node, type NodeProps, type ResizeParams } from '@xyflow/react'

/**
 * A FRAME ON THE WORKFLOW CANVAS: a titled box around cards, to group them ("Checks
 * before the PR"). Not a step and not an end note: no port, no switch, nothing the skills
 * read. Drawn under the links and the cards, so it never hides one.
 *
 * Its two colours are the admin's: `border` for the border and the title, `background`
 * for the ground, tinted so the dotted canvas still shows through. A frame with no title
 * yet says so (`untitled`), quieter.
 *
 * DRAGGED, IT CARRIES WHAT IT HOLDS: that is the canvas's business (`WorkflowCanvas`),
 * which knows where every card sits. Selected in the editor, it is RESIZED from its edges
 * and corners (xyflow's `NodeResizer`), and reports the box live (`onResize`) and once let
 * go (`onResizeEnd`).
 */

export interface WorkflowCanvasFrame {
  /** Its node id on the canvas: `frame:f1`. */
  id: string
  title: string
  /** `#RRGGBB`. */
  border: string
  /** `#RRGGBB`, drawn tinted. */
  background: string
  x: number
  y: number
  width: number
  height: number
}

export interface WorkflowFrameData extends Record<string, unknown> {
  frame: WorkflowCanvasFrame
  /** What a frame with no title yet reads: "Untitled frame". */
  untitled?: string
  /** Drawn with the selection ring, and its edges become handles. Editable canvas only. */
  selected?: boolean
  /** Resizable while selected: the box as it is dragged, and once let go. */
  onResize?: (id: string, box: ResizeParams) => void
  onResizeEnd?: (id: string, box: ResizeParams) => void
  minWidth?: number
  minHeight?: number
}

export type WorkflowFrameType = Node<WorkflowFrameData, 'frame'>

export function WorkflowFrame({ data }: NodeProps<WorkflowFrameType>) {
  const { frame, untitled = '', selected = false, onResize, onResizeEnd, minWidth, minHeight } = data
  return (
    <>
      {onResizeEnd && (
        <NodeResizer
          isVisible={selected}
          minWidth={minWidth}
          minHeight={minHeight}
          color={frame.border}
          onResize={(_, box) => onResize?.(frame.id, box)}
          onResizeEnd={(_, box) => onResizeEnd(frame.id, box)}
        />
      )}
      <div
        className={`h-full w-full rounded-2xl border-2 ${selected ? 'ring-2 ring-accent/40' : ''}`}
        style={{ borderColor: frame.border, backgroundColor: `${frame.background}1F` }}
        aria-current={selected ? 'true' : undefined}
      >
        <div
          className={`truncate px-3 pt-2 text-sm font-bold ${frame.title ? '' : 'italic opacity-60'}`}
          style={{ color: frame.border }}
          title={frame.title || untitled}
        >
          {frame.title || untitled}
        </div>
      </div>
    </>
  )
}
