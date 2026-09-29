import '@xyflow/react/dist/base.css'
import './workflowCanvas.css'

import { useId, useMemo } from 'react'
import { Background, BackgroundVariant, Panel, ReactFlow } from '@xyflow/react'

import { CanvasMinimap } from './CanvasMinimap'
import { Text } from './Text'
import { WorkflowEdge, type WorkflowEdgeType } from './WorkflowEdge'
import {
  WORKFLOW_DEFAULT_HANDLE, WORKFLOW_TARGET_HANDLE, WORKFLOW_VERTICAL_HANDLES, WorkflowNode, type WorkflowNodeType,
} from './WorkflowNode'
import {
  layoutWorkflow, workflowNodeHeight, WORKFLOW_NODE_WIDTH, type WorkflowCanvasLink, type WorkflowCanvasLinkKind, type WorkflowCanvasNode,
} from './workflowLayout'

/**
 * A WORKFLOW ON AN INFINITE CANVAS, the way FigJam draws a board: a dotted ground
 * that goes on in every direction, the flow's steps as cards on it, their links
 * between them, and a minimap in the corner saying where the view is.
 *
 * READ-ONLY, and every xyflow switch that could say otherwise is off: nothing drags,
 * nothing connects, nothing is selected or takes focus. What is left is moving
 * around, and that follows FigJam's hands rather than xyflow's defaults:
 *
 *  - two fingers on a trackpad PAN (`panOnScroll`), where xyflow would zoom;
 *  - dragging the ground pans too, and so does Space + drag (xyflow's
 *    `panActivationKeyCode`, `Space` by default);
 *  - a pinch zooms, and so does ⌘ + scroll (`zoomActivationKeyCode`, `Meta` by
 *    default), between a quarter and twice the size.
 *
 * THE LAYOUT IS COMPUTED, not passed: `workflowLayout.ts` puts the steps in columns
 * from the entry nodes. A flow has no saved positions to show until someone can edit
 * one.
 *
 * DATA IN, NOTHING ELSE. Nodes, links, the entry, and every word already translated;
 * no `ReactNode` anywhere, by the folder's rule. The cards and links are this
 * folder's `WorkflowNode` and `WorkflowEdge`, registered at module scope: xyflow
 * re-mounts every node when `nodeTypes` changes identity, and a table built in the
 * render would change it on every one.
 *
 * THE THEME COMES FROM THE CSS VARIABLES, not from xyflow. `colorMode` is pinned to
 * `light` so the library never swaps its own defaults in under a dark window, and
 * `workflowCanvas.css` maps every `--xy-*` it reads onto the app's `--c-*` roles:
 * the canvas is whatever of the eight themes the app is wearing, the showcase's
 * `Stage` included.
 *
 * IT FILLS ITS BOX. xyflow measures its parent, so the caller gives the canvas a
 * height (`className="h-[520px]"`); a canvas in a box with none is zero pixels tall.
 *
 * MOUNT IT ONLY WHILE IT IS SHOWN. The Space key xyflow listens for is listened for on
 * the whole document, so a canvas left mounted in a hidden tab would still take the
 * space bar from the page around it.
 */

export interface WorkflowCanvasLabels {
  /** The canvas's accessible name: "Workflow of magic-slash". */
  canvas: string
  /** The minimap's accessible name. */
  minimap: string
  /** The legend's two words, for the two strokes. */
  auto: string
  suggest: string
}

export interface WorkflowCanvasProps {
  nodes: WorkflowCanvasNode[]
  links: WorkflowCanvasLink[]
  /** The node ids a ticket may start from: the first column. */
  entry: string[]
  labels: WorkflowCanvasLabels
  /** The box: a height is required, see above. Also margins. Not the ground or the border. */
  className?: string
}

const NODE_TYPES = { workflow: WorkflowNode }
const EDGE_TYPES = { workflow: WorkflowEdge }

/** The two strokes, in the order the legend reads them. Also the arrowheads' suffixes and the labels' keys. */
const LINK_KINDS: WorkflowCanvasLinkKind[] = ['auto', 'suggest']

/**
 * The first view: the whole flow, with room around it, but never smaller than about
 * half size. The default flow is six columns wide, and fitted whole into a settings
 * pane its words drop under legibility; past that floor the view starts centred on
 * the flow and the ends are a pan away, which the minimap shows.
 */
const FIT_VIEW = { padding: 0.12, maxZoom: 1, minZoom: 0.55 }

export function WorkflowCanvas({ nodes, links, entry, labels, className = '' }: WorkflowCanvasProps) {
  // `useId` yields `:r1:`-style ids, and a colon inside `url(#…)` is read as the end
  // of the fragment. Letters and digits only.
  const markerId = `ms-wf-arrow-${useId().replace(/[^a-zA-Z0-9]/g, '')}`

  const { flowNodes, flowEdges } = useMemo(() => {
    const layout = layoutWorkflow(nodes, links, entry)
    const byId = new Map(nodes.map((node) => [node.id, node]))

    const flowNodes: WorkflowNodeType[] = nodes.map((node) => ({
      id: node.id,
      type: 'workflow',
      position: layout.positions[node.id],
      // Fixed sizes, not measured ones: see WORKFLOW_NODE_WIDTH on why the minimap needs them.
      width: WORKFLOW_NODE_WIDTH,
      height: workflowNodeHeight(node.outcomes.length),
      data: { node },
    }))

    const flowEdges: WorkflowEdgeType[] = links.flatMap((link, i) => {
      const from = byId.get(link.from)
      if (!from || !byId.has(link.to)) return []
      // A link on an outcome its node does not declare has no port to leave from; it
      // leaves from the header instead of vanishing (xyflow drops an edge whose handle
      // is missing).
      // Between two stacked steps of a loop, the link runs straight down or up instead,
      // and its outcome is carried by its label alone.
      const route = layout.routes[i] ?? 'forward'
      const handles = route === 'forward'
        ? {
            sourceHandle: link.outcome && from.outcomes.includes(link.outcome) ? link.outcome : WORKFLOW_DEFAULT_HANDLE,
            targetHandle: WORKFLOW_TARGET_HANDLE,
          }
        : { sourceHandle: WORKFLOW_VERTICAL_HANDLES[route].source, targetHandle: WORKFLOW_VERTICAL_HANDLES[route].target }
      return [{
        id: `${link.from}-${link.to}-${i}`,
        source: link.from,
        target: link.to,
        ...handles,
        type: 'workflow',
        data: { kind: link.kind, outcome: link.outcome, route, markerId },
      }]
    })

    return { flowNodes, flowEdges }
  }, [nodes, links, entry, labels, markerId])

  return (
    <div
      className={`ms-workflow-canvas relative w-full overflow-hidden rounded-xl border border-line bg-bg ${className}`.trim()}
    >
      {/* The two arrowheads, once per canvas. Filled from the theme in the stylesheet. */}
      <svg aria-hidden="true" className="absolute h-0 w-0">
        <defs>
          {LINK_KINDS.map((kind) => (
            <marker key={kind} id={`${markerId}-${kind}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
              <path d="M0,1 L9,5 L0,9 z" className={`ms-wf-arrow-${kind}`} />
            </marker>
          ))}
        </defs>
      </svg>

      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        nodesFocusable={false}
        edgesFocusable={false}
        panOnScroll
        zoomOnDoubleClick={false}
        minZoom={0.25}
        maxZoom={2}
        fitView
        fitViewOptions={FIT_VIEW}
        colorMode="light"
        proOptions={{ hideAttribution: true }}
        aria-label={labels.canvas}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} />
        <Panel position="top-left">
          <div className="flex items-center gap-3 rounded-lg border border-line bg-bg-secondary px-2.5 py-1.5">
            {LINK_KINDS.map((kind) => (
              <span key={kind} className="flex items-center gap-1.5">
                <svg aria-hidden="true" width="22" height="6" className="overflow-visible">
                  <line x1="0" y1="3" x2="22" y2="3" className={`ms-wf-edge-${kind}`} />
                </svg>
                <Text size="2xs" tone="secondary">{labels[kind]}</Text>
              </span>
            ))}
          </div>
        </Panel>
        <CanvasMinimap label={labels.minimap} />
      </ReactFlow>
    </div>
  )
}
