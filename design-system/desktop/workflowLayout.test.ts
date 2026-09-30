import { describe, expect, it } from 'vitest'

import {
  layoutWorkflow,
  orthogonalPath,
  workflowInsertSlots,
  workflowNodeHeight,
  WORKFLOW_COLUMN_GAP,
  WORKFLOW_INSERT_LABEL_CLEARANCE,
  WORKFLOW_NODE_WIDTH,
  type WorkflowCanvasLink,
  type WorkflowCanvasNode,
} from './workflowLayout'

/**
 * The canvas's layout is the one piece of it that can be wrong while looking fine: a
 * loop laid out along a row, whose links then run over or under the cards, or a node no entry reaches that is quietly
 * never drawn. Tested on the default flow's shape, which is the graph every repository
 * shows until it has one of its own, and on a custom flow with a review ⇄ resolve loop,
 * the shape a loop takes in practice.
 */

const node = (id: string, outcomes: string[] = []): WorkflowCanvasNode => ({
  id,
  label: id,
  skill: `magic-${id}`,
  outcomes,
})

// The default flow: one line, plan to done, with pr → resolve its one conditional link.
const DEFAULT_NODES: WorkflowCanvasNode[] = [
  node('plan', ['planned']),
  node('start', ['implemented']),
  node('commit', ['committed']),
  node('pr', ['pr_created', 'review_comments', 'ci_green']),
  node('resolve', ['resolved']),
  node('done', ['done']),
]

const DEFAULT_LINKS: WorkflowCanvasLink[] = [
  { from: 'plan', to: 'start', kind: 'suggest' },
  { from: 'start', to: 'commit', kind: 'suggest' },
  { from: 'commit', to: 'pr', kind: 'suggest' },
  { from: 'pr', to: 'resolve', kind: 'auto', outcome: 'review_comments' },
  { from: 'resolve', to: 'done', kind: 'suggest' },
]

// A custom flow that keeps a review step, looping with resolve.
const NODES: WorkflowCanvasNode[] = [
  node('plan', ['planned']),
  node('start', ['implemented']),
  node('commit', ['committed']),
  node('pr', ['pr_created', 'review_comments', 'ci_green']),
  node('review', ['approved', 'changes_requested', 'commented']),
  node('resolve', ['resolved']),
  node('done', ['done']),
]

// Listing pr → resolve BEFORE pr → review, so the loop is not found in link order.
const LINKS: WorkflowCanvasLink[] = [
  { from: 'plan', to: 'start', kind: 'suggest' },
  { from: 'start', to: 'commit', kind: 'suggest' },
  { from: 'commit', to: 'pr', kind: 'suggest' },
  { from: 'pr', to: 'resolve', kind: 'auto', outcome: 'review_comments' },
  { from: 'pr', to: 'review', kind: 'suggest', outcome: 'pr_created' },
  { from: 'review', to: 'resolve', kind: 'suggest', outcome: 'changes_requested' },
  { from: 'review', to: 'done', kind: 'suggest', outcome: 'approved' },
  { from: 'resolve', to: 'review', kind: 'suggest' },
]

describe('layoutWorkflow', () => {
  it('lays the default flow out as one line, a column per step, every link forward', () => {
    const { layers, routes } = layoutWorkflow(DEFAULT_NODES, DEFAULT_LINKS, ['plan', 'start'])
    expect(layers).toEqual({ plan: 0, start: 1, commit: 2, pr: 3, resolve: 4, done: 5 })
    expect(DEFAULT_LINKS.map((_, i) => routes[i])).toEqual(DEFAULT_LINKS.map(() => 'forward'))
  })

  it('puts each step one column after the one it follows, the review ⇄ resolve loop in one', () => {
    const { layers } = layoutWorkflow(NODES, LINKS, ['plan', 'start'])
    expect(layers).toEqual({ plan: 0, start: 1, commit: 2, pr: 3, review: 4, resolve: 4, done: 5 })
  })

  it('lands every link between columns exactly one column on, so none skips a card', () => {
    const { layers, routes } = layoutWorkflow(NODES, LINKS, ['plan', 'start'])
    LINKS.forEach((link, i) => {
      if (routes[i] === 'forward') expect(layers[link.to] - layers[link.from]).toBe(1)
    })
  })

  it('draws the loop as a link down and a link up, and every other link forward', () => {
    const { routes } = layoutWorkflow(NODES, LINKS, ['plan', 'start'])
    const vertical = LINKS.map((link, i) => [`${link.from}→${link.to}`, routes[i]]).filter(([, route]) => route !== 'forward')
    expect(vertical).toEqual([['review→resolve', 'down'], ['resolve→review', 'up']])
  })

  it('lays columns out left to right, a card width and a gap apart', () => {
    const { positions } = layoutWorkflow(NODES, LINKS, ['plan', 'start'])
    expect(positions.plan.x).toBe(0)
    expect(positions.start.x).toBeGreaterThan(WORKFLOW_NODE_WIDTH)
    expect(positions.commit.x - positions.start.x).toBe(positions.start.x - positions.plan.x)
  })

  it('stacks the two steps of the loop without overlap, in declaration order', () => {
    const { positions } = layoutWorkflow(NODES, LINKS, ['plan', 'start'])
    expect(positions.resolve.x).toBe(positions.review.x)
    expect(positions.resolve.y).toBeGreaterThan(positions.review.y + workflowNodeHeight(3))
  })

  it('stacks a loop of three in one column too', () => {
    const three = [node('a'), node('b'), node('c'), node('d')]
    const ring: WorkflowCanvasLink[] = [
      { from: 'a', to: 'b', kind: 'suggest' },
      { from: 'b', to: 'c', kind: 'suggest' },
      { from: 'c', to: 'd', kind: 'suggest' },
      { from: 'd', to: 'b', kind: 'suggest' },
    ]
    expect(layoutWorkflow(three, ring, ['a']).layers).toEqual({ a: 0, b: 1, c: 1, d: 1 })
  })

  it('sends a loop link past a card between its ends round the side, never straight through it', () => {
    const three = [node('a'), node('b'), node('c'), node('d')]
    const ring: WorkflowCanvasLink[] = [
      { from: 'a', to: 'b', kind: 'suggest' },
      { from: 'b', to: 'c', kind: 'suggest' },
      { from: 'c', to: 'd', kind: 'suggest' },
      { from: 'd', to: 'b', kind: 'suggest' },
    ]
    const { routes } = layoutWorkflow(three, ring, ['a'])
    expect(ring.map((_, i) => routes[i])).toEqual(['forward', 'down', 'down', 'side'])
  })

  it('draws a node linked to itself as a loop of its own', () => {
    const { routes, layers } = layoutWorkflow([node('a'), node('b')], [
      { from: 'a', to: 'a', kind: 'suggest' },
      { from: 'a', to: 'b', kind: 'suggest' },
    ], ['a'])
    expect(routes[0]).toBe('self')
    expect(layers).toEqual({ a: 0, b: 1 })
  })

  it('still places a node that no entry reaches', () => {
    const lonely = [...NODES, node('audit', ['ok'])]
    const { positions, layers } = layoutWorkflow(lonely, LINKS, ['plan', 'start'])
    expect(positions.audit).toBeDefined()
    expect(layers.audit).toBe(0)
  })

  it('ignores a link to a node it was not given rather than failing', () => {
    const { positions } = layoutWorkflow(NODES, [...LINKS, { from: 'done', to: 'ghost', kind: 'suggest' }], ['plan'])
    expect(Object.keys(positions).sort()).toEqual(NODES.map((n) => n.id).sort())
  })

  it('gives the same answer for the same input, whatever the order of the links', () => {
    const once = layoutWorkflow(NODES, LINKS, ['plan', 'start'])
    const again = layoutWorkflow(NODES, [...LINKS].reverse(), ['plan', 'start'])
    expect(again.positions).toEqual(once.positions)
    expect(layoutWorkflow(NODES, LINKS, ['plan', 'start'])).toEqual(once)
  })
})

describe('orthogonalPath', () => {
  it('starts and ends on the given points, and rounds every corner in between', () => {
    const path = orthogonalPath([[0, 0], [30, 0], [30, 100], [0, 100]])
    expect(path.startsWith('M 0 0')).toBe(true)
    expect(path.endsWith('L 0 100')).toBe(true)
    expect(path.match(/Q/g)).toHaveLength(2)
  })
})

describe('workflowInsertSlots', () => {
  // The editable line: the default flow with a custom step between start and commit.
  const LINE: WorkflowCanvasNode[] = [
    DEFAULT_NODES[0],
    DEFAULT_NODES[1],
    { id: 'custom:lint', label: 'Lint', skill: 'lint', outcomes: [], mode: 'blocking' },
    ...DEFAULT_NODES.slice(2),
  ]
  const LINE_LINKS: WorkflowCanvasLink[] = [
    { from: 'plan', to: 'start', kind: 'suggest' },
    { from: 'start', to: 'custom:lint', kind: 'auto' },
    { from: 'custom:lint', to: 'commit', kind: 'suggest' },
    { from: 'commit', to: 'pr', kind: 'suggest' },
    { from: 'pr', to: 'resolve', kind: 'auto', outcome: 'review_comments' },
    { from: 'resolve', to: 'done', kind: 'suggest' },
  ]
  const { positions } = layoutWorkflow(LINE, LINE_LINKS, ['plan', 'start'])
  const slots = workflowInsertSlots(LINE, LINE_LINKS, positions)

  it('gives one slot per gap of the line and one at each end, numbered 0 to length', () => {
    expect(slots.map((s) => s.slot)).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
  })

  it('puts the ends half a gap out from the first and last cards', () => {
    expect(slots[0].x).toBe(positions.plan.x - WORKFLOW_COLUMN_GAP / 2)
    expect(slots[7].x).toBe(positions.done.x + WORKFLOW_NODE_WIDTH + WORKFLOW_COLUMN_GAP / 2)
  })

  it('centres a slot between two cards in the gap between them, never over a card', () => {
    for (let i = 1; i < LINE.length; i++) {
      const left = positions[LINE[i - 1].id].x + WORKFLOW_NODE_WIDTH
      const right = positions[LINE[i].id].x
      expect(slots[i].x).toBe((left + right) / 2)
    }
  })

  it('sits on an unlabelled link between two headers, at their height', () => {
    // start and the custom step: one outcome row against none, so the headers differ.
    const header = (id: string) => positions[id].y + 1 + 28
    expect(slots[2].y).toBe((header('start') + header('custom:lint')) / 2)
  })

  it('drops under the outcome label of a conditional link rather than covering it', () => {
    const pr = LINE.find((n) => n.id === 'pr')!
    const port = positions.pr.y + 1 + 56 + pr.outcomes.indexOf('review_comments') * 24 + 12
    const mid = (port + positions.resolve.y + 1 + 28) / 2
    expect(slots[5].y).toBe(mid + WORKFLOW_INSERT_LABEL_CLEARANCE)
  })

  it('still gives a slot between two cards no link joins', () => {
    const two = [node('a'), node('b')]
    const { positions: p } = layoutWorkflow(two, [], ['a', 'b'])
    expect(workflowInsertSlots(two, [], p).map((s) => s.slot)).toEqual([0, 1, 2])
  })

  it('offers a single slot on an empty line', () => {
    expect(workflowInsertSlots([], [], {})).toEqual([{ slot: 0, x: 0, y: 0 }])
  })
})
