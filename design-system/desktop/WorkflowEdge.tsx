import { BaseEdge, EdgeLabelRenderer, getBezierPath, getStraightPath, type Edge, type EdgeProps } from '@xyflow/react'

import {
  WORKFLOW_COLUMN_GAP, WORKFLOW_NODE_WIDTH, type WorkflowCanvasLinkKind, type WorkflowLinkRoute,
} from './workflowLayout'

/**
 * ONE LINK OF A WORKFLOW: what may run after a step, and whether it does so on its own.
 *
 * TWO STROKES FOR TWO PROMISES, which is the whole drawing:
 *
 *  - `auto` is a SOLID accent line with a dot travelling along it. The next skill
 *    runs by itself, so the link is drawn as something already moving. The dot is the
 *    animation and not a dash offset, because a moving dash is a dashed line, and
 *    dashed is what `suggest` means.
 *  - `suggest` is a DASHED neutral line, standing still. It is offered at the end of
 *    the run and happens only if the user says so.
 *
 * Colour alone does not carry the difference (solid or dashed does), so it survives
 * a theme whose accent is close to its lines, and a reader who cannot tell the two
 * apart by hue. The dot stops under `prefers-reduced-motion` (see
 * `workflowCanvas.css`, where the strokes are painted from the theme's roles).
 *
 * A CONDITIONAL LINK CARRIES ITS OUTCOME'S NAME, on a plate at its middle, as the
 * skills spell it. The port it leaves from names it too; the label is what keeps a
 * link readable where it arrives, far from that port. A link that skips a column
 * (pr → resolve, over review) would have its middle on the card it skips, where the
 * plate reads as part of that card: its label sits in the first gap instead, next to
 * the port it leaves from.
 *
 * THE STEPS OF A LOOP (review ⇄ resolve) are stacked in one column by
 * `workflowLayout.ts`, and the links between them are straight verticals in the gap
 * between the two cards: one down, one up, side by side. Nothing runs backwards over
 * the cards or under them any more.
 *
 * Drawn by `WorkflowCanvas` through xyflow's `edgeTypes`; all it knows arrives in
 * `data`.
 */

export interface WorkflowEdgeData extends Record<string, unknown> {
  kind: WorkflowCanvasLinkKind
  /** The outcome the link is taken on, drawn as its label. Absent on an unconditional link. */
  outcome?: string
  /** Across columns, or up / down between two steps of a loop stacked in one column. */
  route: WorkflowLinkRoute
  /**
   * The id of the canvas's arrowhead markers, without the kind suffix. Per canvas, so
   * two canvases on one page (the showcase) never reference each other's defs.
   */
  markerId: string
}

export type WorkflowEdgeType = Edge<WorkflowEdgeData, 'workflow'>

/** Spelled in full, per kind, so Tailwind finds every class. */
const LABEL_TONES: Record<WorkflowCanvasLinkKind, string> = {
  auto: 'border-accent/40 text-accent',
  suggest: 'border-line-strong text-text-secondary',
}

export function WorkflowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps<WorkflowEdgeType>) {
  const kind = data?.kind ?? 'suggest'
  let path: string, labelX: number, labelY: number
  if (data && data.route !== 'forward') {
    [path, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY })
  } else {
    [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition })
    if (targetX - sourceX > WORKFLOW_NODE_WIDTH + WORKFLOW_COLUMN_GAP * 1.5) {
      labelX = sourceX + WORKFLOW_COLUMN_GAP / 2
      labelY = sourceY
    }
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        className={`ms-wf-edge-${kind}`}
        markerEnd={data ? `url(#${data.markerId}-${kind})` : undefined}
      />
      {kind === 'auto' && (
        <circle r={3} className="ms-wf-pulse">
          <animateMotion dur="2.4s" repeatCount="indefinite" path={path} />
        </circle>
      )}
      {data?.outcome && (
        <EdgeLabelRenderer>
          <code
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
            className={`nodrag nopan pointer-events-none absolute rounded-md border bg-bg-secondary px-1.5 py-0.5 font-mono text-[10px] leading-4 ${LABEL_TONES[kind]}`}
          >
            {data.outcome}
          </code>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
