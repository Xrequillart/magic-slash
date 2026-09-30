import { BaseEdge, EdgeLabelRenderer, getBezierPath, getStraightPath, type Edge, type EdgeProps } from '@xyflow/react'

import {
  orthogonalPath, WORKFLOW_COLUMN_GAP, WORKFLOW_NODE_WIDTH, type WorkflowCanvasLinkKind, type WorkflowLinkRoute,
} from './workflowLayout'

/**
 * ONE LINK OF A WORKFLOW: what may run after a step, and whether it does so on its own.
 *
 * TWO STROKES FOR TWO PROMISES, which is the whole drawing:
 *
 *  - `auto` is an accent line, a little heavier, with a dot travelling along it. The
 *    next skill runs by itself, so the link is drawn as something already moving.
 *  - `suggest` is a grey line, standing still. It is offered at the end of the run and
 *    happens only if the user says so.
 *
 * Both are solid, a choice of the product's. So colour does not carry the difference
 * alone: the weight and the moving dot do too, which is what a
 * reader who cannot tell the two apart by hue goes by. The dot stops under
 * `prefers-reduced-motion`, which leaves the weight (see `workflowCanvas.css`, where
 * the strokes are painted from the theme's roles).
 *
 * A CONDITIONAL LINK CARRIES ITS OUTCOME'S NAME, on a plate at its middle, as the
 * skills spell it. The port it leaves from names it too; the label is what keeps a
 * link readable where it arrives, far from that port. A link that skips a column
 * (pr → resolve over review, in a custom flow that has one) would have its middle on
 * the card it skips, where the plate reads as part of that card: its label sits in the
 * first gap instead, next to the port it leaves from.
 *
 * THE STEPS OF A LOOP (a custom flow's review ⇄ resolve, say) are stacked in one
 * column by `workflowLayout.ts`, and the links between them are straight verticals in the gap
 * between the two cards: one down, one up, side by side. Two shapes of a custom flow
 * cannot be joined straight without crossing a card, and take a right-angled detour
 * instead: a loop of three steps or more closing from its bottom card to its top one
 * (`side`, down or up the gap on the column's right), and a node linked to itself
 * (`self`, over its own corner).
 *
 * Drawn by `WorkflowCanvas` through xyflow's `edgeTypes`; all it knows arrives in
 * `data`. On the editable canvas a link is pressed to select it (xyflow's wide invisible
 * stroke takes the click), and the selected one is drawn heavier, in either kind.
 */

export interface WorkflowEdgeData extends Record<string, unknown> {
  kind: WorkflowCanvasLinkKind
  /** The outcome the link is taken on, drawn as its label. Absent on an unconditional link. */
  outcome?: string
  /** Across columns, or up / down between two steps of a loop stacked in one column. */
  route: WorkflowLinkRoute
  /** Drawn heavier, with a halo in the accent: the link the editor's inspector is showing. */
  selected?: boolean
}

export type WorkflowEdgeType = Edge<WorkflowEdgeData, 'workflow'>

/** How far a detour stands off the cards it goes round, in canvas pixels. */
const DETOUR = 28

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
  const route = data?.route ?? 'forward'
  if (route === 'side') {
    // Down or up the gap on the column's right, clear of every card between the two.
    const x = Math.max(sourceX, targetX) + DETOUR
    path = orthogonalPath([[sourceX, sourceY], [x, sourceY], [x, targetY], [targetX, targetY]])
    labelX = x
    labelY = (sourceY + targetY) / 2
  } else if (route === 'self') {
    // Out of the port, up past the card's top, and down into its corner: a loop of its
    // own. Tighter than a `side` detour, so the two never share the gap's vertical.
    const x = sourceX + DETOUR / 2
    const top = targetY - DETOUR / 2
    path = orthogonalPath([[sourceX, sourceY], [x, sourceY], [x, top], [targetX, top], [targetX, targetY]])
    labelX = x
    labelY = (sourceY + top) / 2
  } else if (route !== 'forward') {
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
        className={`ms-wf-edge-${kind}${data?.selected ? ' ms-wf-edge-selected' : ''}`}
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
