import { MiniMap } from '@xyflow/react'

/**
 * WHERE THE VIEW IS, on a canvas bigger than it: the whole graph in miniature, with
 * the part on screen outlined in the accent.
 *
 * It must be rendered INSIDE a canvas (it reads xyflow's store), which is why
 * `WorkflowCanvas` draws it itself rather than taking it as a child: this folder has
 * no slots. Exported so the showcase can document it, and so the future editor's
 * canvas can place it the same way.
 *
 * Pannable and zoomable: dragging the outline moves the view, which on a long flow is
 * faster than panning the canvas itself. Its colours are the theme's roles, set in
 * `workflowCanvas.css` through xyflow's `--xy-minimap-*` variables, not props: a prop
 * would need a colour VALUE, and this folder only names roles.
 */

export interface CanvasMinimapProps {
  /** Its accessible name, translated: "Minimap". */
  label: string
}

/**
 * Small enough to leave the corner to the graph, big enough to find a node in. Exported
 * for what sits above it in the same corner: the canvas's Edit button.
 */
export const CANVAS_MINIMAP_SIZE = { width: 168, height: 112 }

export function CanvasMinimap({ label }: CanvasMinimapProps) {
  return (
    <MiniMap
      ariaLabel={label}
      pannable
      zoomable
      position="bottom-right"
      nodeBorderRadius={6}
      style={CANVAS_MINIMAP_SIZE}
    />
  )
}
