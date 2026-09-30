/**
 * WHERE EACH NODE OF A WORKFLOW SITS ON THE CANVAS, computed rather than stored.
 *
 * The read-only canvas has no saved positions to show (nothing edits a flow yet), so
 * it lays the graph out itself: left to right, one column per step, the way the cycle
 * reads. A module of its own, with no React and no xyflow in it, because it is the
 * one part of the canvas that can be wrong without looking wrong, and the root test
 * suite can only load a file that imports nothing.
 *
 * The editor lets cards be dragged, and a moved card keeps its place
 * (`workflowPositions`): the layout is then what a card without one falls back to.
 *
 * THE DATA TYPES LIVE HERE TOO, and they are the canvas's own, not the desktop's
 * `WorkflowNode` / `WorkflowLink` (`desktop/src/workflow/model.ts`): this folder cannot
 * import app code, and the canvas needs a display name the engine has no business
 * carrying. The names differ on purpose, so a file importing both never has to alias.
 *
 * No dagre, no elk. A workflow is a handful of nodes in a mostly linear chain, with a
 * loop or two at most, and longest-path layering with each loop stacked in a column
 * draws that exactly; a layout engine would be a dependency in both apps for a graph
 * this size.
 */

export type WorkflowCanvasLinkKind = 'auto' | 'suggest'

/** How a custom step holds the flow: `blocking` stops it on failure, `advisory` reports and goes on. */
export type WorkflowCanvasNodeMode = 'blocking' | 'advisory'

export interface WorkflowCanvasNode {
  /** Unique within the flow. Links name nodes by it. */
  id: string
  /** What the node is called on the canvas, as the caller words it: "Review". */
  label: string
  /** The skill folder it runs (`magic-review`), shown under the label as written. */
  skill: string
  /** What the skill can end on. Each one gets a port a conditional link leaves from. */
  outcomes: string[]
  /** A built-in step: the editor offers no way to remove it, nor to change what it runs. */
  locked?: boolean
  /** Turned off: drawn greyed, its links faded. The skills skip it. */
  disabled?: boolean
  /** The one step that cannot be turned off (start): its switch is drawn, greyed. */
  alwaysOn?: boolean
  /**
   * A custom step's ground, a `#RRGGBB` tinted over the card's own (`WORKFLOW_STEP_COLORS`).
   * Left out on the built-in steps, which wear the plain ground.
   */
  color?: string
  /** A custom step's mode, drawn on its card. Left out on the built-in steps. */
  mode?: WorkflowCanvasNodeMode
  /** Something worth knowing about the step, already translated: a badge, and this as its tooltip. */
  warning?: string
  /** The step is named by a problem that blocks saving: drawn with an error ring. */
  problem?: boolean
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
/** A card's width follows its words, between these two. Past the widest, they truncate. */
export const WORKFLOW_NODE_MIN_WIDTH = 210
export const WORKFLOW_NODE_MAX_WIDTH = 360
const WORKFLOW_NODE_HEADER = 56
const WORKFLOW_NODE_ROW = 24
const WORKFLOW_NODE_FOOT = 8
/** The card's `border`, top and bottom. */
const WORKFLOW_NODE_BORDER = 2

/** Room between two columns (edge labels live there) and between two cards of one column. */
export const WORKFLOW_COLUMN_GAP = 80
/**
 * Taller than a card's margin needs to be: the two steps of a loop (a custom flow's
 * review ⇄ resolve, say) are stacked in one column, and the two links between them run
 * in this gap, one carrying its outcome's label.
 */
const ROW_GAP = 72

/**
 * THE WAYS OUT OF A CARD, one row and one port each, and the header has none: a link
 * leaves from the row it is taken on.
 *
 *  - each OUTCOME the skill declares is a row, and a link conditioned on it leaves there;
 *  - a link taken WHATEVER the outcome leaves from the last row, `WORKFLOW_ANY_EXIT`,
 *    drawn on every card that has not exactly one outcome (a custom step has none, PR has
 *    three);
 *  - a card with EXACTLY ONE outcome has no such row: whatever it ended on is that
 *    outcome, so its one row carries its unconditional links too.
 */
export const WORKFLOW_ANY_EXIT = 'default'

export function workflowExitRows(node: Pick<WorkflowCanvasNode, 'outcomes'>): string[] {
  return node.outcomes.length === 1 ? node.outcomes : [...node.outcomes, WORKFLOW_ANY_EXIT]
}

/** The row a link leaves `node` from: its outcome's, or the "whatever it ended on" one. */
export function workflowExitOf(node: Pick<WorkflowCanvasNode, 'outcomes'>, outcome: string | undefined): string {
  if (outcome !== undefined && node.outcomes.includes(outcome)) return outcome
  return node.outcomes.length === 1 ? node.outcomes[0] : WORKFLOW_ANY_EXIT
}

/**
 * The outcome a link drawn out of `exit` is taken on: none from the "whatever" row, and
 * none from the one row of a single-outcome card either, since it stands for the same.
 */
export function workflowOutcomeOfExit(node: Pick<WorkflowCanvasNode, 'outcomes'>, exit: string | null | undefined): string | undefined {
  if (!exit || exit === WORKFLOW_ANY_EXIT || node.outcomes.length === 1) return undefined
  return node.outcomes.includes(exit) ? exit : undefined
}

/** The words a card draws besides its node's own, which its width has to hold too. */
export interface WorkflowCardWords {
  /** The "whatever it ended on" row: "When done". */
  anyExit?: string
  /** A custom step's mode plate. */
  blocking?: string
  advisory?: string
}

/** Every card's width, by id: `workflowCardWidth` for each. */
export type WorkflowCardWidths = Readonly<Record<string, number>>

// The faces the card is set in (`WorkflowNode`): the label in `Text`'s, the skill and
// the outcomes in the mono one `CommandChip` uses.
const SANS = "'Cera Pro', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
const MONO = "'SF Mono', Monaco, monospace"
const LABEL_FONT = `700 14px ${SANS}`
const CODE_FONT = `400 10px ${MONO}`
const EXIT_FONT = `italic 400 10px ${SANS}`
const PLATE_FONT = `500 9px ${SANS}`

let measurer: CanvasRenderingContext2D | null | undefined
/**
 * How wide `text` is set in `font`, in canvas pixels. Measured off a 2D canvas where
 * there is a document; estimated from its length where there is none (the test suite),
 * which is all a layout test needs.
 */
function textWidth(text: string, font: string): number {
  if (measurer === undefined) {
    measurer = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d')
  }
  if (!measurer) return text.length * parseFloat(font.replace(/^.*?(\d+)px.*$/, '$1')) * 0.6
  measurer.font = font
  return measurer.measureText(text).width
}

/**
 * WHAT A CARD'S WORDS NEED, between `WORKFLOW_NODE_MIN_WIDTH` and `WORKFLOW_NODE_MAX_WIDTH`:
 * the header (its padding, the skill's glyph, the label or the skill folder, whichever is
 * wider, and the marks on its right) or the widest exit row, whichever is wider. The
 * sums are `WorkflowNode`'s classes spelled in pixels; change one side and the words
 * start truncating early, or the card grows past them. A few pixels spare: a web font
 * still loading is measured in its fallback.
 */
export function workflowCardWidth(node: WorkflowCanvasNode, words: WorkflowCardWords = {}): number {
  const SPARE = 6
  const BORDER = 2
  // px-3, the 32px glyph and its gap-2.5 on the left, px-3 on the right.
  const headerChrome = 12 + 32 + 10 + 12
  const title = Math.max(textWidth(node.label, LABEL_FONT), textWidth(node.skill, CODE_FONT))
  // The switch and a warning (20px each, gap-1), over the mode plate (px-1 and its border).
  const badges = 20 + (node.warning ? 24 : 0)
  const modeWord = node.mode ? words[node.mode] : undefined
  const plate = modeWord ? textWidth(modeWord, PLATE_FONT) + 10 : 0
  const header = headerChrome + title + 10 + Math.max(badges, plate)
  // pl-3 and pr-4 around each row's word.
  const rows = workflowExitRows(node).map((exit) =>
    12 + 16 + (exit === WORKFLOW_ANY_EXIT ? textWidth(words.anyExit ?? '', EXIT_FONT) : textWidth(exit, CODE_FONT)),
  )
  const width = Math.ceil(Math.max(header, ...rows) + BORDER + SPARE)
  return Math.min(WORKFLOW_NODE_MAX_WIDTH, Math.max(WORKFLOW_NODE_MIN_WIDTH, width))
}

export function workflowCardWidths(nodes: WorkflowCanvasNode[], words: WorkflowCardWords = {}): Record<string, number> {
  return Object.fromEntries(nodes.map((node) => [node.id, workflowCardWidth(node, words)]))
}

/** A card's height, from its rows. */
export function workflowCardHeight(node: Pick<WorkflowCanvasNode, 'outcomes'>): number {
  return workflowNodeHeight(workflowExitRows(node).length)
}

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
 *  - `down` / `up`: between two ADJACENT cards of one column, the steps of a loop.
 *    Straight down from the upper card's bottom, or straight up from the lower card's
 *    top, each on its own side of the card's middle so the pair reads as the loop it is;
 *  - `side`: between two cards of one column with a card between them (a loop of three
 *    steps or more, closing from the bottom card back to the top one). A straight line
 *    would cross the card between, so it leaves the source's port, runs down or up the
 *    gap on the column's right, and comes back into the target's right side;
 *  - `self`: a node linked to itself. Out of its port, up over its own corner, and
 *    down into its top.
 *
 * Both detours are drawn by `orthogonalPath`.
 */
export type WorkflowLinkRoute = 'forward' | 'down' | 'up' | 'side' | 'self'

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
 *    another skip a column UNDER the card between (pr → resolve under review, in a
 *    custom flow with a review ⇄ resolve loop). Put in one column instead, the loop's
 *    steps stack, their links are short verticals between them, and every link into
 *    the loop reaches its target one column on.
 * 2. Between loops the graph is acyclic; each loop's column is the longest path to it
 *    from one nothing points at. An entry is such a node unless a forward link reaches
 *    it, which is how plan (0) → start (1) keeps start one column right of plan.
 * 3. Inside a column, cards are stacked in declaration order (review above resolve in
 *    that loop) and the stack is centred on the tallest column, so a single card next to a pair
 *    sits between them.
 *
 * A loop of three steps or more stacks the same way; its links between cards that are
 * not neighbours take the `side` route around the ones between. Deterministic for a
 * given input: nothing iterates a Set or an object whose order depends on anything but
 * the arrays passed in.
 */
export function layoutWorkflow(
  nodes: WorkflowCanvasNode[],
  links: WorkflowCanvasLink[],
  entry: string[],
  widths: WorkflowCardWidths = {},
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
    col.reduce((sum, node) => sum + workflowCardHeight(node), 0) + ROW_GAP * (col.length - 1)
  const tallest = Math.max(0, ...columns.map((col) => (col ? heightOf(col) : 0)))

  // A column is as wide as its widest card, the cards flush left in it.
  const widthOf = (node: WorkflowCanvasNode) => widths[node.id] ?? WORKFLOW_NODE_WIDTH
  const positions: Record<string, { x: number; y: number }> = {}
  let x = 0
  columns.forEach((col) => {
    if (!col) {
      x += WORKFLOW_NODE_WIDTH + WORKFLOW_COLUMN_GAP
      return
    }
    let y = (tallest - heightOf(col)) / 2
    for (const node of col) {
      positions[node.id] = { x, y }
      y += workflowCardHeight(node) + ROW_GAP
    }
    x += Math.max(...col.map(widthOf)) + WORKFLOW_COLUMN_GAP
  })

  // Two ends in one column can only be two steps of one loop: a link between columns
  // always lands at least one column on. Neighbours in the column are joined straight;
  // anything with a card between them goes round it.
  const rowOf = new Map<string, number>()
  for (const col of columns) col?.forEach((node, row) => rowOf.set(node.id, row))
  const routes: Record<number, WorkflowLinkRoute> = {}
  for (const { link, i } of usable) {
    if (link.from === link.to) routes[i] = 'self'
    else if (layers[link.from] !== layers[link.to]) routes[i] = 'forward'
    else {
      const step = rowOf.get(link.to)! - rowOf.get(link.from)!
      routes[i] = step === 1 ? 'down' : step === -1 ? 'up' : 'side'
    }
  }

  return { positions, layers, routes }
}

/**
 * A RIGHT-ANGLED PATH through `points`, its corners rounded to `radius`: the detours of
 * the `side` and `self` routes. Each corner is pulled in by the radius along both of its
 * segments, never past half a segment, so a short stub still turns cleanly.
 */
export function orthogonalPath(points: [number, number][], radius = 12): string {
  let path = `M ${points[0][0]} ${points[0][1]}`
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i - 1]
    const [cx, cy] = points[i]
    const [nx, ny] = points[i + 1]
    const inLen = Math.hypot(cx - px, cy - py)
    const outLen = Math.hypot(nx - cx, ny - cy)
    const r = Math.min(radius, inLen / 2, outLen / 2)
    const ax = cx - ((cx - px) / (inLen || 1)) * r
    const ay = cy - ((cy - py) / (inLen || 1)) * r
    const bx = cx + ((nx - cx) / (outLen || 1)) * r
    const by = cy + ((ny - cy) / (outLen || 1)) * r
    path += ` L ${ax} ${ay} Q ${cx} ${cy} ${bx} ${by}`
  }
  const [lx, ly] = points[points.length - 1]
  return `${path} L ${lx} ${ly}`
}

/**
 * WHERE EACH CARD IS DRAWN, once the editor may have moved some: the stored position
 * where there is one, the computed layout everywhere else.
 *
 * The routes follow. A loop's straight verticals and detours only make sense between
 * cards the layout stacked itself, so a link keeps its computed route while both its
 * ends sit where the layout put them, and becomes a plain `forward` curve as soon as
 * either was moved. A node linked to itself stays `self` wherever it is.
 *
 * Exported for the editor too: before an edit to the links, it pins every card still
 * laid out at the place it is drawn at, so that a new link never reshuffles the columns
 * under the admin's eyes. It has to pass the `widths` the canvas draws with
 * (`workflowCardWidths`, with the same words), or it pins them somewhere else.
 */
export function workflowPositions(
  nodes: WorkflowCanvasNode[],
  links: WorkflowCanvasLink[],
  entry: string[],
  stored: Readonly<Record<string, { x: number; y: number }>> = {},
  widths: WorkflowCardWidths = {},
): Pick<WorkflowLayout, 'positions' | 'routes'> {
  const layout = layoutWorkflow(nodes, links, entry, widths)
  const positions: WorkflowLayout['positions'] = {}
  const moved = new Set<string>()
  for (const node of nodes) {
    const own = stored[node.id]
    const computed = layout.positions[node.id]
    positions[node.id] = own ?? computed
    if (own && (own.x !== computed.x || own.y !== computed.y)) moved.add(node.id)
  }
  const routes: WorkflowLayout['routes'] = {}
  for (const [i, route] of Object.entries(layout.routes)) {
    const link = links[Number(i)]
    routes[Number(i)] = route === 'self' || (!moved.has(link.from) && !moved.has(link.to)) ? route : 'forward'
  }
  return { positions, routes }
}
