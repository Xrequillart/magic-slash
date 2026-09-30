import '@xyflow/react/dist/base.css'
import './workflowCanvas.css'

import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import {
  Background, BackgroundVariant, Panel, ReactFlow, useReactFlow, type Connection, type Edge, type IsValidConnection, type Node, type NodeChange, type OnConnectEnd,
} from '@xyflow/react'

import { Button } from './Button'
import { CanvasMinimap, CANVAS_MINIMAP_SIZE } from './CanvasMinimap'
import { Pencil } from './icons'
import { Text } from './Text'
import { WorkflowDock, type WorkflowDockProps } from './WorkflowDock'
import { WorkflowEdge, type WorkflowEdgeType } from './WorkflowEdge'
import {
  WORKFLOW_SELF_TARGET_HANDLE, WORKFLOW_SIDE_TARGET_HANDLE, WORKFLOW_TARGET_HANDLE, WORKFLOW_VERTICAL_HANDLES,
  WorkflowNode, type WorkflowNodeLabels, type WorkflowNodeType,
} from './WorkflowNode'
import {
  workflowCardHeight, workflowCardWidths, workflowExitOf, workflowOutcomeOfExit, workflowPositions, type WorkflowCanvasLink, type WorkflowCanvasLinkKind, type WorkflowCanvasNode,
} from './workflowLayout'

/**
 * A WORKFLOW ON AN INFINITE CANVAS, the way FigJam draws a board: a dotted ground
 * that goes on in every direction, the flow's steps as cards on it, their links
 * between them, and a minimap in the corner saying where the view is.
 *
 * READ-ONLY BY DEFAULT, and every xyflow switch that could say otherwise is off: nothing
 * drags, nothing connects, nothing is selected or takes focus. What is left is moving
 * around, and that follows FigJam's hands rather than xyflow's defaults:
 *
 *  - two fingers on a trackpad PAN (`panOnScroll`), where xyflow would zoom;
 *  - dragging the ground pans too, and so does Space + drag (xyflow's
 *    `panActivationKeyCode`, `Space` by default);
 *  - a pinch zooms, and so does ⌘ + scroll (`zoomActivationKeyCode`, `Meta` by
 *    default), between a quarter and twice the size.
 *
 * THE LAYOUT IS COMPUTED where no place is passed: `workflowLayout.ts` puts the steps in
 * columns from the entry nodes, and `positions` overrides it card by card, with the
 * places the editor left them at (`workflowPositions`).
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
 *  - pressing a card or a link calls `onSelect` with it, pressing the ground with
 *    `null`, and `selected` is drawn: CONTROLLED, never xyflow's own selection, which
 *    stays off (`elementsSelectable`), so nothing can be selected the caller did not say.
 *    A card takes the keyboard's focus too, and Enter or Space selects it.
 *  - with `onMove`, cards are DRAGGED. The card follows the pointer on its own while it
 *    moves, and `onMove(id, position)` reports where it was let go; `positions` is where
 *    the caller keeps them (a card without one is laid out, `workflowPositions`).
 *  - with `onConnect`, links are DRAWN out of a card's ports onto another card's left
 *    port: `onConnect(from, to, outcome)`, the outcome being the row it left from, none
 *    from the header. A second link between the same two cards, or a card to itself,
 *    cannot be drawn.
 *  - `focusRequest` centres the view on a node, keeping the zoom unless it is too far
 *    out to read. A request is `{ id, n }`: bump `n` to centre on the same node again.
 *  - `dock` floats the editor's `WorkflowDock` at the bottom centre. Data, not a node:
 *    the dock reads the flow's store, so the canvas draws it inside the flow.
 *
 * READ-ONLY, `onEdit` puts an Edit button in the corner above the minimap: the way into
 * the full-screen editor.
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
  /** The last row of a card without exactly one outcome, the way out whatever it ended on: "When done". */
  anyExit?: string
  /** WITH `onEdit` ONLY. The button above the minimap: "Edit". */
  edit?: string
  /** EDITABLE ONLY. A card's switch, on a step that is on, off, and on start: "Turn off", "Turn on", "Start cannot be turned off". */
  disable?: string
  enable?: string
  alwaysOn?: string
  /** READ-ONLY ONLY. The shut eye on a step that is off: "Turned off". */
  off?: string
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
  /** Where each card was left, by id. A card missing from it is laid out. */
  positions?: Readonly<Record<string, { x: number; y: number }>>
  /** A card was dragged and let go there. Editable only; nothing drags without it. */
  onMove?: (id: string, position: { x: number; y: number }) => void
  /** A link was drawn, out of `outcome`'s port (none: the header's). Editable only; nothing connects without it. */
  onConnect?: (from: string, to: string, outcome?: string) => void
  /** A card's switch was pressed: turn it on (`true`) or off. Editable only; the switches are greyed without it. */
  onToggle?: (id: string, enabled: boolean) => void
  /** Centre the view on `id`, again each time `n` changes. */
  focusRequest?: { id: string; n: number } | null
  /** The Edit button above the minimap, and what it opens. Not drawn without it. */
  onEdit?: () => void
  /** The editor's dock, floating at the bottom centre. Not drawn without it. */
  dock?: WorkflowDockProps
  /** No border, no rounded corners: a canvas that IS the screen, the full-screen editor's. */
  frameless?: boolean
  /**
   * Whether two fingers on a trackpad (the wheel) move around the canvas. Off, the wheel
   * is left to the page the canvas sits in, which scrolls past it instead: a canvas in a
   * settings page must not swallow the page's scroll. Dragging still pans, a pinch still zooms.
   */
  scrollPans?: boolean
  /** Where the legend sits. Top left unless the corner is taken, as the editor's title takes it. */
  legend?: 'top-left' | 'bottom-left'
  /** The minimap in the corner. On by default; off for a canvas that is an illustration of a flow, not a place to move around. */
  minimap?: boolean
}

const NODE_TYPES = { workflow: WorkflowNode }
const EDGE_TYPES = { workflow: WorkflowEdge }

/** The two strokes, in the order the legend reads them. Also the labels' keys. */
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

/** The Edit button clears the minimap: its height, xyflow's 15px panel margin, and a gap. */
const EDIT_OFFSET = { marginBottom: CANVAS_MINIMAP_SIZE.height + 15 + 8 }

export function WorkflowCanvas({
  nodes,
  links,
  entry,
  labels,
  className = '',
  editable = false,
  selected = null,
  onSelect,
  positions: stored,
  onMove,
  onConnect,
  onToggle,
  focusRequest = null,
  onEdit,
  dock,
  frameless = false,
  legend = 'top-left',
  scrollPans = true,
  minimap = true,
}: WorkflowCanvasProps) {
  // Where a card is being dragged to, until it is let go and the caller has its place.
  const [dragged, setDragged] = useState<Record<string, { x: number; y: number }>>({})

  // The layout depends on the flow and the stored places alone, so selecting or
  // re-rendering never redoes it.
  // Each card is as wide as its words (`workflowCardWidth`), and the columns follow.
  const { anyExit, blocking, advisory } = labels
  const widths = useMemo(() => workflowCardWidths(nodes, { anyExit, blocking, advisory }), [nodes, anyExit, blocking, advisory])
  const { layout, centres } = useMemo(() => {
    const layout = workflowPositions(nodes, links, entry, stored, widths)
    const centres = new Map(nodes.map((node) => [node.id, {
      x: layout.positions[node.id].x + widths[node.id] / 2,
      y: layout.positions[node.id].y + workflowCardHeight(node) / 2,
    }]))
    return { layout, centres }
  }, [nodes, links, entry, stored, widths])

  const { flowNodes, flowEdges } = useMemo(() => {
    const byId = new Map(nodes.map((node) => [node.id, node]))
    const nodeLabels: WorkflowNodeLabels | undefined = editable
      ? {
          disable: labels.disable ?? '', enable: labels.enable ?? '', alwaysOn: labels.alwaysOn ?? '',
          blocking: labels.blocking ?? '', advisory: labels.advisory ?? '',
        }
      : undefined

    const connectable = editable && !!onConnect
    const flowNodes: WorkflowNodeType[] = nodes.map((node) => ({
      id: node.id,
      type: 'workflow',
      position: dragged[node.id] ?? layout.positions[node.id],
      // Computed sizes, not measured ones: see WORKFLOW_NODE_WIDTH on why the minimap needs them.
      width: widths[node.id],
      height: workflowCardHeight(node),
      // And handed over as MEASURED too. Nodes are rebuilt on every change, and xyflow
      // drops what it measured of a node's ports whenever the node it is handed carries
      // no `measured`: until the card was measured again, which a card whose size did not
      // change never is, its links were not drawn and no link could land on it.
      measured: { width: widths[node.id], height: workflowCardHeight(node) },
      data: {
        node,
        anyExit: labels.anyExit,
        ...(editable
          ? { selected: selected?.type === 'node' && selected.id === node.id, labels: nodeLabels, connectable, onToggle }
          : { off: labels.off }),
      },
      ...(editable ? { ariaLabel: node.label } : {}),
    }))

    const flowEdges: WorkflowEdgeType[] = links.flatMap((link, i) => {
      const from = byId.get(link.from)
      if (!from || !byId.has(link.to)) return []
      // A link leaves from the row it is taken on (`workflowExitOf`): its outcome's, or
      // the "whatever it ended on" row, which is also where a link on an outcome its node
      // does not declare leaves from instead of vanishing (xyflow drops an edge whose
      // handle is missing).
      // Between two neighbouring steps of a loop, the link runs straight down or up
      // instead, and its outcome is carried by its label alone. The two detours leave
      // from the port like a forward link, and come back in where they can without
      // crossing a card: the right side (`side`), or the top (`self`).
      const route = layout.routes[i] ?? 'forward'
      const port = workflowExitOf(from, link.outcome)
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
        data: {
          kind: link.kind, outcome: link.outcome, route,
          ...(isSelected ? { selected: true } : {}),
          ...(from.disabled || byId.get(link.to)!.disabled ? { muted: true } : {}),
        },
        ...(editable ? { ariaLabel: `${from.label} → ${byId.get(link.to)!.label}` } : {}),
      }]
    })

    // Which ports a link is plugged into, and the stroke they then wear: `auto` wins.
    const ports = new Map<string, Record<string, WorkflowCanvasLinkKind>>()
    const plug = (nodeId: string, handle: string | null | undefined, kind: WorkflowCanvasLinkKind) => {
      if (!handle) return
      const own = ports.get(nodeId) ?? {}
      if (own[handle] !== 'auto') own[handle] = kind
      ports.set(nodeId, own)
    }
    for (const edge of flowEdges) {
      const kind = edge.data?.kind ?? 'suggest'
      plug(edge.source, edge.sourceHandle, kind)
      plug(edge.target, edge.targetHandle, kind)
    }
    for (const node of flowNodes) node.data = { ...node.data, ports: ports.get(node.id) }

    return { flowNodes, flowEdges }
  }, [nodes, links, layout, widths, dragged, labels, editable, selected, onConnect, onToggle])

  const select = editable ? onSelect : undefined
  const onNodeClick = useCallback((_: unknown, node: Node) => {
    if (node.type === 'workflow') select?.({ type: 'node', id: node.id })
  }, [select])
  const onEdgeClick = useCallback((_: unknown, edge: Edge) => {
    select?.({ type: 'link', from: edge.source, to: edge.target })
  }, [select])
  const onPaneClick = useCallback(() => select?.(null), [select])

  // xyflow moves nothing on its own with controlled nodes: the card follows the pointer
  // here, and lands where the caller says once it is let go.
  const move = editable ? onMove : undefined
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    const moves = changes.filter((change) => change.type === 'position' && change.position)
    if (moves.length === 0) return
    setDragged((was) => {
      const next = { ...was }
      for (const change of moves) if (change.type === 'position' && change.position) next[change.id] = change.position
      return next
    })
  }, [])
  const onNodeDragStop = useCallback((_: unknown, node: Node) => {
    move?.(node.id, node.position)
    setDragged((was) => {
      const { [node.id]: _gone, ...rest } = was
      return rest
    })
  }, [move])

  const connect = editable ? onConnect : undefined
  const onConnectLink = useCallback((connection: Connection) => {
    const from = nodes.find((node) => node.id === connection.source)
    if (!from || !connection.target) return
    connect?.(connection.source, connection.target, workflowOutcomeOfExit(from, connection.sourceHandle))
  }, [connect, nodes])
  // A link let go ON A CARD rather than on its port lands on the card: a 7px port is a
  // small target, and the card is what the admin is aiming at. Started from a card's
  // left port, the link runs the other way, from the card it was dropped on.
  const onConnectEnd = useCallback<OnConnectEnd>((event, state) => {
    if (!connect || state.isValid || !state.fromNode || !state.fromHandle) return
    const point = 'changedTouches' in event ? event.changedTouches[0] : event
    const card = document.elementFromPoint(point.clientX, point.clientY)?.closest('.react-flow__node-workflow')
    const other = card?.getAttribute('data-id')
    if (!other || other === state.fromNode.id) return
    const [from, to] = state.fromHandle.type === 'source' ? [state.fromNode.id, other] : [other, state.fromNode.id]
    if (links.some((link) => link.from === from && link.to === to)) return
    const source = nodes.find((node) => node.id === from)
    const handle = state.fromHandle.type === 'source' ? state.fromHandle.id : null
    connect(from, to, source ? workflowOutcomeOfExit(source, handle) : undefined)
  }, [connect, links, nodes])
  const isValidConnection = useCallback<IsValidConnection>((connection) =>
    connection.source !== connection.target &&
    !links.some((link) => link.from === connection.source && link.to === connection.target),
  [links])

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
      className={`ms-workflow-canvas relative w-full overflow-hidden bg-bg ${frameless ? '' : 'rounded-xl border border-line '}${editable ? 'ms-wf-editable ' : ''}${className}`.trim()}
      onKeyDown={editable ? onKeyDown : undefined}
    >
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        nodesDraggable={!!move}
        nodesConnectable={!!connect}
        onNodesChange={move ? onNodesChange : undefined}
        onNodeDragStop={move ? onNodeDragStop : undefined}
        onConnect={connect ? onConnectLink : undefined}
        onConnectEnd={connect ? onConnectEnd : undefined}
        isValidConnection={isValidConnection}
        connectionRadius={28}
        deleteKeyCode={null}
        elementsSelectable={false}
        nodesFocusable={editable}
        edgesFocusable={false}
        onNodeClick={select ? onNodeClick : undefined}
        onEdgeClick={select ? onEdgeClick : undefined}
        onPaneClick={select ? onPaneClick : undefined}
        panOnScroll={scrollPans}
        zoomOnScroll={scrollPans}
        preventScrolling={scrollPans}
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
        <Panel position={legend}>
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
        {minimap && <CanvasMinimap label={labels.minimap} />}
        {onEdit && (
          <Panel position="bottom-right" style={EDIT_OFFSET}>
            <Button tone="solid" size="sm" icon={Pencil} onClick={onEdit}>{labels.edit ?? ''}</Button>
          </Panel>
        )}
        {dock && (
          <Panel position="bottom-center">
            <WorkflowDock {...dock} />
          </Panel>
        )}
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
