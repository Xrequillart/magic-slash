import '@xyflow/react/dist/base.css'
import './workflowCanvas.css'

import { useCallback, useEffect, useId, useMemo, type KeyboardEvent } from 'react'
import { Background, BackgroundVariant, Panel, ReactFlow, useReactFlow, type Edge, type Node } from '@xyflow/react'

import { CanvasMinimap } from './CanvasMinimap'
import { Text } from './Text'
import { WorkflowEdge, type WorkflowEdgeType } from './WorkflowEdge'
import {
  WORKFLOW_DEFAULT_HANDLE, WORKFLOW_INSERT_SIZE, WORKFLOW_SELF_TARGET_HANDLE, WORKFLOW_SIDE_TARGET_HANDLE, WORKFLOW_TARGET_HANDLE, WORKFLOW_VERTICAL_HANDLES,
  WorkflowInsertNode, WorkflowNode, type WorkflowInsertNodeType, type WorkflowNodeLabels, type WorkflowNodeType,
} from './WorkflowNode'
import {
  layoutWorkflow, workflowInsertSlots, workflowNodeHeight, WORKFLOW_NODE_WIDTH, type WorkflowCanvasLink, type WorkflowCanvasLinkKind, type WorkflowCanvasNode,
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
 *
 * EDITABLE, ON REQUEST (`editable`), and the read-only canvas above is what you get
 * without it, to the pixel. Editable, the canvas still owns nothing: it reports and the
 * caller decides.
 *
 *  - `nodes` are read as a LINE, in order, and a "+" sits in every insert slot: `0`
 *    before the first node, `i` between `nodes[i - 1]` and `nodes[i]`, `nodes.length`
 *    after the last (`workflowInsertSlots`). Pressing one calls `onInsert(slot, button)`,
 *    the button being where the caller hangs its skill picker.
 *  - pressing a card or a link calls `onSelect` with it, pressing the ground with
 *    `null`, and `selected` is drawn: CONTROLLED, never xyflow's own selection, which
 *    stays off (`elementsSelectable`), so nothing can be selected the caller did not say.
 *    A card takes the keyboard's focus too, and Enter or Space selects it.
 *  - `focusRequest` centres the view on a node, keeping the zoom unless it is too far
 *    out to read. A request is `{ id, n }`: bump `n` to centre on the same node again
 *    (the problems list does, on every press).
 *
 * Nothing drags and nothing connects, editable or not: the line's order is the model's,
 * and a step moves by being removed and inserted again.
 */

/** What the editor needs the inspector to show: a step, or the link between two. */
export type WorkflowCanvasSelection =
  | { type: 'node'; id: string }
  | { type: 'link'; from: string; to: string }

export interface WorkflowCanvasLabels {
  /** The canvas's accessible name: "Workflow of magic-slash". */
  canvas: string
  /** The minimap's accessible name. */
  minimap: string
  /** The legend's two words, for the two strokes. */
  auto: string
  suggest: string
  /** EDITABLE ONLY. Each "+" button's accessible name and tooltip: "Add a step here". */
  insert?: string
  /** EDITABLE ONLY. The lock's tooltip on a built-in card: "Built-in step, locked". */
  locked?: string
  /** EDITABLE ONLY. A custom step's mode, on its card's plate. */
  blocking?: string
  advisory?: string
}

export interface WorkflowCanvasProps {
  nodes: WorkflowCanvasNode[]
  links: WorkflowCanvasLink[]
  /** The node ids a ticket may start from: the first column. */
  entry: string[]
  labels: WorkflowCanvasLabels
  /** The box: a height is required, see above. Also margins. Not the ground or the border. */
  className?: string
  /** Turns the editor's affordances on: selection, the "+" buttons. Off by default: read-only. */
  editable?: boolean
  /** What is selected, drawn with a ring (a card) or a heavier stroke (a link). Editable only. */
  selected?: WorkflowCanvasSelection | null
  /** A card or a link was pressed, or the ground (`null`). Editable only. */
  onSelect?: (selection: WorkflowCanvasSelection | null) => void
  /** A "+" was pressed: the slot, and the button, to anchor a picker to. Editable only; no "+" without it. */
  onInsert?: (slot: number, anchor: HTMLElement) => void
  /** Centre the view on `id`, again each time `n` changes. */
  focusRequest?: { id: string; n: number } | null
}

const NODE_TYPES = { workflow: WorkflowNode, insert: WorkflowInsertNode }
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

/** Centring on a node never leaves the view further out than this: a problem is read, not spotted. */
const FOCUS_MIN_ZOOM = 0.8
const FOCUS_DURATION = 300

type CanvasNode = WorkflowNodeType | WorkflowInsertNodeType

const INSERT_STYLE = { pointerEvents: 'all' } as const

export function WorkflowCanvas({
  nodes,
  links,
  entry,
  labels,
  className = '',
  editable = false,
  selected = null,
  onSelect,
  onInsert,
  focusRequest = null,
}: WorkflowCanvasProps) {
  // `useId` yields `:r1:`-style ids, and a colon inside `url(#…)` is read as the end
  // of the fragment. Letters and digits only.
  const markerId = `ms-wf-arrow-${useId().replace(/[^a-zA-Z0-9]/g, '')}`

  // The layout depends on the line alone, so selecting or re-rendering never redoes it.
  const { layout, slots, centres } = useMemo(() => {
    const layout = layoutWorkflow(nodes, links, entry)
    const centres = new Map(nodes.map((node) => [node.id, {
      x: layout.positions[node.id].x + WORKFLOW_NODE_WIDTH / 2,
      y: layout.positions[node.id].y + workflowNodeHeight(node.outcomes.length) / 2,
    }]))
    return { layout, slots: workflowInsertSlots(nodes, links, layout.positions), centres }
  }, [nodes, links, entry])

  const { flowNodes, flowEdges } = useMemo(() => {
    const byId = new Map(nodes.map((node) => [node.id, node]))
    const nodeLabels: WorkflowNodeLabels | undefined = editable
      ? { locked: labels.locked ?? '', blocking: labels.blocking ?? '', advisory: labels.advisory ?? '' }
      : undefined

    const flowNodes: CanvasNode[] = nodes.map((node) => ({
      id: node.id,
      type: 'workflow',
      position: layout.positions[node.id],
      // Fixed sizes, not measured ones: see WORKFLOW_NODE_WIDTH on why the minimap needs them.
      width: WORKFLOW_NODE_WIDTH,
      height: workflowNodeHeight(node.outcomes.length),
      data: {
        node,
        ...(editable ? { selected: selected?.type === 'node' && selected.id === node.id, labels: nodeLabels } : {}),
      },
      ...(editable ? { ariaLabel: node.label } : {}),
    }))

    if (editable && onInsert) {
      for (const slot of slots) {
        flowNodes.push({
          id: `insert-${slot.slot}`,
          type: 'insert',
          position: { x: slot.x - WORKFLOW_INSERT_SIZE / 2, y: slot.y - WORKFLOW_INSERT_SIZE / 2 },
          width: WORKFLOW_INSERT_SIZE,
          height: WORKFLOW_INSERT_SIZE,
          // Above the links it sits on, and never a stop of xyflow's own: the button is.
          zIndex: 1,
          focusable: false,
          // xyflow turns a node's pointer events off when nothing of its own listens on it,
          // which would leave the button unpressable on a canvas with no `onSelect`.
          style: INSERT_STYLE,
          data: { slot: slot.slot, label: labels.insert ?? '', onInsert },
        })
      }
    }

    const flowEdges: WorkflowEdgeType[] = links.flatMap((link, i) => {
      const from = byId.get(link.from)
      if (!from || !byId.has(link.to)) return []
      // A link on an outcome its node does not declare has no port to leave from; it
      // leaves from the header instead of vanishing (xyflow drops an edge whose handle
      // is missing).
      // Between two neighbouring steps of a loop, the link runs straight down or up
      // instead, and its outcome is carried by its label alone. The two detours leave
      // from the port like a forward link, and come back in where they can without
      // crossing a card: the right side (`side`), or the top (`self`).
      const route = layout.routes[i] ?? 'forward'
      const port = link.outcome && from.outcomes.includes(link.outcome) ? link.outcome : WORKFLOW_DEFAULT_HANDLE
      const handles = route === 'down' || route === 'up'
        ? { sourceHandle: WORKFLOW_VERTICAL_HANDLES[route].source, targetHandle: WORKFLOW_VERTICAL_HANDLES[route].target }
        : {
            sourceHandle: port,
            targetHandle: route === 'side' ? WORKFLOW_SIDE_TARGET_HANDLE
              : route === 'self' ? WORKFLOW_SELF_TARGET_HANDLE
              : WORKFLOW_TARGET_HANDLE,
          }
      const id = `${link.from}-${link.to}-${i}`
      const isSelected = editable && selected?.type === 'link' && selected.from === link.from && selected.to === link.to
      return [{
        id,
        source: link.from,
        target: link.to,
        ...handles,
        type: 'workflow',
        data: { kind: link.kind, outcome: link.outcome, route, markerId, ...(isSelected ? { selected: true } : {}) },
        ...(editable ? { ariaLabel: `${from.label} → ${byId.get(link.to)!.label}` } : {}),
      }]
    })

    return { flowNodes, flowEdges }
  }, [nodes, links, layout, slots, labels, markerId, editable, selected, onInsert])

  const select = editable ? onSelect : undefined
  const onNodeClick = useCallback((_: unknown, node: Node) => {
    if (node.type === 'workflow') select?.({ type: 'node', id: node.id })
  }, [select])
  const onEdgeClick = useCallback((_: unknown, edge: Edge) => {
    select?.({ type: 'link', from: edge.source, to: edge.target })
  }, [select])
  const onPaneClick = useCallback(() => select?.(null), [select])

  // Enter or Space on a focused card selects it. xyflow's own key handling selects only
  // what `elementsSelectable` allows, which is nothing here: the selection is the caller's.
  const onKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (!select || (event.key !== 'Enter' && event.key !== ' ')) return
    const target = event.target as HTMLElement
    if (!target.classList.contains('react-flow__node-workflow')) return
    const id = target.getAttribute('data-id')
    if (!id) return
    event.preventDefault()
    select({ type: 'node', id })
  }, [select])

  return (
    <div
      className={`ms-workflow-canvas relative w-full overflow-hidden rounded-xl border border-line bg-bg ${editable ? 'ms-wf-editable ' : ''}${className}`.trim()}
      onKeyDown={editable ? onKeyDown : undefined}
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
        nodesFocusable={editable}
        edgesFocusable={false}
        onNodeClick={select ? onNodeClick : undefined}
        onEdgeClick={select ? onEdgeClick : undefined}
        onPaneClick={select ? onPaneClick : undefined}
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
        <FocusOn centres={centres} request={focusRequest} />
      </ReactFlow>
    </div>
  )
}

/**
 * Moves the view onto a node when asked. A child of `ReactFlow` and not code in the
 * canvas, because `useReactFlow` reads the store `ReactFlow` provides to what it renders.
 * Draws nothing.
 */
function FocusOn({
  centres,
  request,
}: {
  centres: Map<string, { x: number; y: number }>
  request: { id: string; n: number } | null
}) {
  const { setCenter, getZoom } = useReactFlow()
  const target = request?.id
  const n = request?.n

  useEffect(() => {
    if (!target) return
    const centre = centres.get(target)
    if (!centre) return
    void setCenter(centre.x, centre.y, { zoom: Math.max(getZoom(), FOCUS_MIN_ZOOM), duration: FOCUS_DURATION })
    // `centres` is left out on purpose: an edit elsewhere on the line re-lays it out, and
    // the view must not jump back to the last node asked for every time it does.
  }, [target, n, setCenter, getZoom])

  return null
}
