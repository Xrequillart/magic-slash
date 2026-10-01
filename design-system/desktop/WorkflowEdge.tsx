import { BaseEdge, getStraightPath, type Edge, type EdgeProps } from '@xyflow/react'

import { orthogonalPath, type WorkflowCanvasLinkKind, type WorkflowLinkRoute } from './workflowLayout'

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
 * EVERY LINK IS DRAWN IN STRAIGHT SEGMENTS WITH SQUARE CORNERS, never a curve: out of
 * its port, along to the middle of the gap, up or down, and on into the next card. A
 * reader follows a right angle more easily than a bezier, the more so where several
 * links leave one step.
 *
 * Both are solid, a choice of the product's. So colour does not carry the difference
 * alone: the weight and the moving dot do too, which is what a
 * reader who cannot tell the two apart by hue goes by. The dot stops under
 * `prefers-reduced-motion`, which leaves the weight (see `workflowCanvas.css`, where
 * the strokes are painted from the theme's roles).
 *
 * NO LABEL ON THE LINE: a plate on every conditional link cluttered the canvas more than
 * it helped. The outcome a link is taken on is the row it leaves from, which wears a
 * plate of its own running into its port (`WorkflowNode`); pressing that row traces the
 * link (`traced`) and lights the port it lands on.
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
  /** The row of its source card it leaves from: an outcome, or the "whatever it ended on" one. */
  exit?: string
  /** The outcome it is taken on, none whatever it ended on: what a press on it selects. */
  outcome?: string
  /** Across columns, or up / down between two steps of a loop stacked in one column. */
  route: WorkflowLinkRoute
  /** Drawn heavier, with a halo in the accent: the link the editor's inspector is showing. */
  selected?: boolean
  /** Faded: a link into or out of a step that is turned off, which the skills never take. */
  muted?: boolean
  /** Drawn heavier, haloed in its own stroke: a link out of the outcome row the user pressed. */
  traced?: boolean
  /** Faded while another outcome's links are traced, so those read alone. */
  dimmed?: boolean
}

export type WorkflowEdgeType = Edge<WorkflowEdgeData, 'workflow'>

/** How far a detour stands off the cards it goes round, in canvas pixels. */
const DETOUR = 28

/** Square corners, on every route: see the note at the top. */
const CORNER = 0

export function WorkflowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
}: EdgeProps<WorkflowEdgeType>) {
  const kind = data?.kind ?? 'suggest'
  let path: string
  const route = data?.route ?? 'forward'
  if (route === 'side') {
    // Down or up the gap on the column's right, clear of every card between the two.
    const x = Math.max(sourceX, targetX) + DETOUR
    path = orthogonalPath([[sourceX, sourceY], [x, sourceY], [x, targetY], [targetX, targetY]], CORNER)
  } else if (route === 'self') {
    // Out of the port, up past the card's top, and down into its corner: a loop of its
    // own. Tighter than a `side` detour, so the two never share the gap's vertical.
    const x = sourceX + DETOUR / 2
    const top = targetY - DETOUR / 2
    path = orthogonalPath([[sourceX, sourceY], [x, sourceY], [x, top], [targetX, top], [targetX, targetY]], CORNER)
  } else if (route !== 'forward') {
    [path] = getStraightPath({ sourceX, sourceY, targetX, targetY })
  } else {
    // Across, then up or down in the middle of the way, then across again.
    const x = (sourceX + targetX) / 2
    path = orthogonalPath([[sourceX, sourceY], [x, sourceY], [x, targetY], [targetX, targetY]], CORNER)
  }

  const state = `${data?.selected ? ' ms-wf-edge-selected' : ''}${data?.muted ? ' ms-wf-edge-muted' : ''}${data?.traced ? ' ms-wf-edge-traced' : ''}${data?.dimmed ? ' ms-wf-edge-dimmed' : ''}`
  return (
    <>
      <BaseEdge id={id} path={path} className={`ms-wf-edge-${kind}${state}`} />
      {kind === 'auto' && !data?.muted && (
        <circle r={3} className={`ms-wf-pulse${data?.dimmed ? ' ms-wf-edge-dimmed' : ''}`}>
          <animateMotion dur="2.4s" repeatCount="indefinite" path={path} />
        </circle>
      )}
    </>
  )
}
