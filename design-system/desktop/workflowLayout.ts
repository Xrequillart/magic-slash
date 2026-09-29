/**
 * WHERE EACH NODE OF A WORKFLOW SITS ON THE CANVAS, computed rather than stored.
 *
 * The read-only canvas has no saved positions to show (nothing edits a flow yet), so
 * it lays the graph out itself: left to right, one column per step, the way the cycle
 * reads. A module of its own, with no React and no xyflow in it, because it is the
 * one part of the canvas that can be wrong without looking wrong, and the root test
 * suite can only load a file that imports nothing.
 *
 * THE DATA TYPES LIVE HERE TOO, and they are the canvas's own, not the desktop's
 * `WorkflowNode` / `WorkflowLink` (`desktop/src/workflow/model.ts`): this folder cannot
 * import app code, and the canvas needs a display name the engine has no business
 * carrying. The names differ on purpose, so a file importing both never has to alias.
 *
 * No dagre, no elk. A workflow is a handful of nodes in a mostly linear chain with one
 * loop, and longest-path layering with the loop stacked in a column draws that exactly; a layout engine would be a
 * dependency in both apps for a graph this size.
 */

export type WorkflowCanvasLinkKind = 'auto' | 'suggest'

export interface WorkflowCanvasNode {
  /** Unique within the flow. Links name nodes by it. */
  id: string
  /** What the node is called on the canvas, as the caller words it: "Review". */
  label: string
  /** The skill folder it runs (`magic-review`), shown under the label as written. */
  skill: string
  /** What the skill can end on. Each one gets a port a conditional link leaves from. */
  outcomes: string[]
}

export interface WorkflowCanvasLink {
  from: string
  to: string
  /** `auto` chains on its own (a solid line), `suggest` is only offered (dashed). */
  kind: WorkflowCanvasLinkKind
  /** Taken only when `from` ended on this outcome: the link leaves from that port and carries its name. */
  outcome?: string
}

/**
 * The node's box, in canvas pixels. Shared with `WorkflowNode`, which draws exactly
 * these heights (`h-14` header, `h-6` per outcome row, `pb-2` under them, a hairline
 * border around), so the columns this module stacks never overlap the cards drawn
 * into them.
 *
 * `WorkflowCanvas` also hands these to xyflow as each node's `width` / `height`. It has
 * to: a flow whose nodes are not stored by the caller never records what xyflow
 * measured, and the minimap skips every node it has no size for. It drew an empty
 * frame until this was passed.
 */
export const WORKFLOW_NODE_WIDTH = 224
const WORKFLOW_NODE_HEADER = 56
const WORKFLOW_NODE_ROW = 24
const WORKFLOW_NODE_FOOT = 8
/** The card's `border`, top and bottom. */
const WORKFLOW_NODE_BORDER = 2

/** Room between two columns (edge labels live there) and between two cards of one column. */
export const WORKFLOW_COLUMN_GAP = 80
/**
 * Taller than a card's margin needs to be: the review ⇄ resolve pair is stacked in one
 * column, and the two links between them run in this gap, one carrying its outcome's
 * label.
 */
const ROW_GAP = 72

export function workflowNodeHeight(outcomeCount: number): number {
  return (
    WORKFLOW_NODE_HEADER +
    outcomeCount * WORKFLOW_NODE_ROW +
    (outcomeCount > 0 ? WORKFLOW_NODE_FOOT : 0) +
    WORKFLOW_NODE_BORDER
  )
}

/**
 * How a link is drawn, decided by where its two ends landed:
 *
 *  - `forward`: to a later column, left to right, out of the source's port;
 *  - `down` / `up`: between two cards of ONE column, the steps of a loop. Straight
 *    down from the upper card's bottom, or straight up from the lower card's top, each
 *    on its own side of the card's middle so the pair reads as the loop it is.
 */
export type WorkflowLinkRoute = 'forward' | 'down' | 'up'

export interface WorkflowLayout {
  /** Top-left corner of each node, by id. Every node is placed, reachable or not. */
  positions: Record<string, { x: number; y: number }>
  /** The column each node landed in, by id. 0 is the entry column. */
  layers: Record<string, number>
  /** How each link is drawn, by index into the links given. Absent for a link that is not drawn. */
  routes: Record<number, WorkflowLinkRoute>
}

/**
 * Columns by longest path from the entry nodes, THE STEPS OF A LOOP SHARING ONE.
 *
 * 1. The loops are found first: the strongly connected components of the graph
 *    (Tarjan's walk, children in declaration order). A loop has no longest path, and
 *    laid out along a row it made one of its links run backwards over the cards and
 *    another skip a column UNDER the card between (pr → resolve under review). Put in
 *    one column instead, the loop's steps stack, their links are short verticals
 *    between them, and every link into the loop reaches its target one column on.
 * 2. Between loops the graph is acyclic; each loop's column is the longest path to it
 *    from one nothing points at. An entry is such a node unless a forward link reaches
 *    it, which is how plan (0) → start (1) keeps start one column right of plan.
 * 3. Inside a column, cards are stacked in declaration order (review above resolve)
 *    and the stack is centred on the tallest column, so a single card next to a pair
 *    sits between them.
 *
 * A loop of three steps or more stacks the same way, and its link from the bottom card
 * back to the top one then crosses the card between: a v1 limit the default flow never
 * reaches. Deterministic for a given input: nothing iterates a Set or an object whose
 * order depends on anything but the arrays passed in.
 */
export function layoutWorkflow(
  nodes: WorkflowCanvasNode[],
  links: WorkflowCanvasLink[],
  entry: string[],
): WorkflowLayout {
  const index = new Map(nodes.map((node, i) => [node.id, i]))
  // Links to or from a node that is not drawn are dropped here rather than crashing
  // the walk: the canvas shows what it can of a definition it was handed.
  const usable = links
    .map((link, i) => ({ link, i }))
    .filter(({ link }) => index.has(link.from) && index.has(link.to))

  const children = new Map<string, string[]>()
  for (const node of nodes) children.set(node.id, [])
  for (const { link } of usable) children.get(link.from)!.push(link.to)
  for (const list of children.values()) list.sort((a, b) => index.get(a)! - index.get(b)!)

  // 1. Loops: Tarjan's strongly connected components. `component` maps a node to the
  //    first-declared node of its loop (itself when it is in none).
  const component = new Map<string, string>()
  const order = new Map<string, number>()
  const low = new Map<string, number>()
  const stack: string[] = []
  const onStack = new Set<string>()
  const visit = (id: string) => {
    order.set(id, order.size)
    low.set(id, order.get(id)!)
    stack.push(id)
    onStack.add(id)
    for (const to of children.get(id)!) {
      if (!order.has(to)) {
        visit(to)
        low.set(id, Math.min(low.get(id)!, low.get(to)!))
      } else if (onStack.has(to)) {
        low.set(id, Math.min(low.get(id)!, order.get(to)!))
      }
    }
    if (low.get(id) !== order.get(id)) return
    const members: string[] = []
    let member: string
    do {
      member = stack.pop()!
      onStack.delete(member)
      members.push(member)
    } while (member !== id)
    const head = members.reduce((a, b) => (index.get(a)! <= index.get(b)! ? a : b))
    for (const m of members) component.set(m, head)
  }
  const roots = [...entry.filter((id) => index.has(id)), ...nodes.map((node) => node.id)]
  for (const id of roots) if (!order.has(id)) visit(id)

  // 2. Longest path between loops, relaxed in topological order.
  const heads = nodes.map((node) => node.id).filter((id) => component.get(id) === id)
  const between = usable
    .map(({ link }) => ({ from: component.get(link.from)!, to: component.get(link.to)! }))
    .filter(({ from, to }) => from !== to)
  const incoming = new Map<string, number>(heads.map((id) => [id, 0]))
  for (const { to } of between) incoming.set(to, incoming.get(to)! + 1)
  const column = new Map<string, number>(heads.map((id) => [id, 0]))
  const ready = heads.filter((id) => incoming.get(id) === 0)
  while (ready.length > 0) {
    const id = ready.shift()!
    for (const { from, to } of between) {
      if (from !== id) continue
      column.set(to, Math.max(column.get(to)!, column.get(id)! + 1))
      const left = incoming.get(to)! - 1
      incoming.set(to, left)
      if (left === 0) ready.push(to)
    }
  }
  const layers: Record<string, number> = {}
  for (const node of nodes) layers[node.id] = column.get(component.get(node.id)!)!

  // 3. Stack each column, centred on the tallest one.
  const columns: WorkflowCanvasNode[][] = []
  for (const node of nodes) (columns[layers[node.id]] ??= []).push(node)
  const heightOf = (col: WorkflowCanvasNode[]) =>
    col.reduce((sum, node) => sum + workflowNodeHeight(node.outcomes.length), 0) + ROW_GAP * (col.length - 1)
  const tallest = Math.max(0, ...columns.map((col) => (col ? heightOf(col) : 0)))

  const positions: Record<string, { x: number; y: number }> = {}
  columns.forEach((col, layer) => {
    if (!col) return
    let y = (tallest - heightOf(col)) / 2
    for (const node of col) {
      positions[node.id] = { x: layer * (WORKFLOW_NODE_WIDTH + WORKFLOW_COLUMN_GAP), y }
      y += workflowNodeHeight(node.outcomes.length) + ROW_GAP
    }
  })

  // Two ends in one column can only be two steps of one loop: a link between columns
  // always lands at least one column on.
  const routes: Record<number, WorkflowLinkRoute> = {}
  for (const { link, i } of usable) {
    const from = positions[link.from]
    const to = positions[link.to]
    routes[i] = layers[link.from] !== layers[link.to] || link.from === link.to ? 'forward' : to.y > from.y ? 'down' : 'up'
  }

  return { positions, layers, routes }
}
