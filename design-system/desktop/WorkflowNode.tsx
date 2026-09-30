import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'

import { Icon } from './Icon'
import { Lock, TriangleAlert } from './icons'
import { skillIcon } from './skillIcons'
import { Text } from './Text'
import {
  workflowExitRows, WORKFLOW_ANY_EXIT, type WorkflowCanvasLinkKind, type WorkflowCanvasNode, type WorkflowCanvasNodeMode,
} from './workflowLayout'

/**
 * ONE STEP OF A WORKFLOW, AS A CARD ON THE CANVAS: the skill's glyph and name, and a
 * port for every way the skill can end.
 *
 * Drawn by `WorkflowCanvas` through xyflow's `nodeTypes`, never placed by hand: its
 * props are xyflow's `NodeProps`, and everything it shows arrives in `data`, already
 * translated. Nothing here is a `ReactNode` slot, by the folder's rule.
 *
 * ONE WAY IN, THE WAYS OUT BELOW IT. Links arrive at the one port on the header's left,
 * and leave from the rows under it (`workflowExitRows`): a conditional link from the row
 * naming the outcome it is taken on (the handle's id IS the outcome's name), so "review,
 * when it ends on changes_requested, suggests resolve" reads off the card without a
 * legend; an unconditional one from the last row, `anyExit` ("When done"), or from the
 * one row of a card with a single outcome, which says the same. The header has no port
 * out. Every row is drawn, linked or not: an outcome that leads nowhere is part of what
 * the flow says.
 *
 * A PORT IN USE SAYS SO: bigger, and ringed in the stroke of the link plugged into it
 * (`ports`): the accent for an automatic one, grey for a suggestion.
 *
 * THE GROUND IS OPAQUE (`bg-bg-secondary`), unlike most of this folder's translucent
 * surfaces: a link running under a card must not show through it.
 *
 * IDENTIFIERS ARE `<code>`, not `Text`: the skill folder and the outcome names are
 * written as the skills spell them, in the mono face `CommandChip` uses for a command,
 * and `Text` carries a face of its own that a `font-mono` would fight.
 *
 * Its heights are `workflowLayout.ts`'s: `h-14` header, `h-6` a row, `pb-2` under the
 * rows. Change one side and the columns start overlapping.
 *
 * WHAT THE EDITOR NEEDS TO SEE, on the header's right: a lock on a built-in step (it
 * cannot be removed, so it should not look like it could), a custom step's mode as a
 * small plate, and a warning badge whose tooltip is the warning. A step named by a
 * problem wears a red border; the selected step a ring in the accent. None of it is drawn
 * unless the node says so, so the read-only canvas looks exactly as it did.
 *
 * LINKS ARE DRAWN FROM THE PORTS, in the editor (`connectable`): dragged out of an
 * outcome's row, a link is taken only on that outcome; out of the "When done" row,
 * whatever the step ended on. They land on the header's left port. The lanes of a loop's
 * verticals and detours stay out of it: they are where a link is drawn, not a place to
 * start one.
 */

/** The words the card draws beside a node's own, translated by the caller. */
export interface WorkflowNodeLabels {
  /** The lock's tooltip and accessible name: "Built-in step, locked". */
  locked: string
  /** A custom step's mode, on its plate. */
  blocking: string
  advisory: string
}

export interface WorkflowNodeData extends Record<string, unknown> {
  node: WorkflowCanvasNode
  /** Drawn with the selection ring. The editable canvas sets it; the read-only one never does. */
  selected?: boolean
  /** Needed only when the node carries `locked` or `mode`; without them neither mark is drawn. */
  labels?: WorkflowNodeLabels
  /** Its ports start and take links: the editor's canvas, when it may draw them. */
  connectable?: boolean
  /** The "whatever it ended on" row's word: "When done". */
  anyExit?: string
  /** The ports a link is plugged into, by handle id, and the kind of that link: drawn in its stroke. */
  ports?: Readonly<Record<string, WorkflowCanvasLinkKind>>
}

export type WorkflowNodeType = Node<WorkflowNodeData, 'workflow'>

/** The port an unconditional link leaves from (the last row), and the one every link arrives at. */
export const WORKFLOW_DEFAULT_HANDLE = WORKFLOW_ANY_EXIT
export const WORKFLOW_TARGET_HANDLE = 'in'

/**
 * The ports of a link between two cards of one column (the steps of a loop, see
 * `workflowLayout.ts`): out of the bottom and into the top going down, out of the top
 * and into the bottom going up. The two directions sit either side of the card's
 * middle, so the pair of links runs side by side instead of on top of each other.
 * Every card carries them, and they are invisible (`.ms-wf-lane`): a dot on the edge
 * of every card for a link only the loop's two have would read as a port with nothing
 * plugged in.
 */
export const WORKFLOW_VERTICAL_HANDLES = {
  down: { source: 'down-out', target: 'down-in' },
  up: { source: 'up-out', target: 'up-in' },
} as const

/**
 * Where a `side` detour comes back in: the card's right edge, level with its header,
 * so the arrow points at the card from the gap it ran down. Invisible like the lanes.
 */
export const WORKFLOW_SIDE_TARGET_HANDLE = 'side-in'

/**
 * Where a `self` loop comes back in: the top edge, near the right corner, clear of the
 * two lanes a loop's vertical links use, so a step that retries itself never shares a
 * line with the step before it.
 */
export const WORKFLOW_SELF_TARGET_HANDLE = 'self-in'
const SELF_LANE = { left: '88%' }

/** Spelled as styles: xyflow positions a handle by `left`, which no class here sets per port. */
const DOWN_LANE = { left: '38%' }
const UP_LANE = { left: '62%' }

/** Spelled in full, per state, so Tailwind finds every class. The problem's red border stays under a selection. */
const FRAMES = {
  rest: 'border-line-strong',
  problem: 'border-red ring-2 ring-red/25',
  selected: 'border-accent ring-2 ring-accent/40',
  selectedProblem: 'border-red ring-2 ring-accent/40',
} as const

/** A custom step's plate: `blocking` in the accent, because it can stop the flow; `advisory` neutral. */
const MODE_TONES: Record<WorkflowCanvasNodeMode, string> = {
  blocking: 'border-accent/40 text-accent',
  advisory: 'border-line-strong text-text-secondary',
}

export function WorkflowNode({ data }: NodeProps<WorkflowNodeType>) {
  const { node, selected = false, labels, connectable = false, anyExit = '', ports } = data
  // A used port wears its link's stroke (`workflowCanvas.css`).
  const used = (handle: string) => (ports?.[handle] ? `ms-wf-port-${ports[handle]}` : undefined)
  const exits = workflowExitRows(node)
  const frame = selected
    ? node.problem ? FRAMES.selectedProblem : FRAMES.selected
    : node.problem ? FRAMES.problem : FRAMES.rest
  const mode = !node.locked && node.mode && labels ? node.mode : null

  return (
    // `h-full w-full`: the node's box is set by the canvas (`WORKFLOW_NODE_WIDTH`,
    // `workflowNodeHeight`), and the card fills it rather than sizing itself a second time.
    <div
      className={`relative h-full w-full rounded-xl border bg-bg-secondary text-ink shadow-sm ${frame}`}
      aria-current={selected ? 'true' : undefined}
    >
      <Handle type="source" position={Position.Bottom} id={WORKFLOW_VERTICAL_HANDLES.down.source} style={DOWN_LANE} className="ms-wf-lane" isConnectable={false} />
      <Handle type="target" position={Position.Top} id={WORKFLOW_VERTICAL_HANDLES.down.target} style={DOWN_LANE} className="ms-wf-lane" isConnectable={false} />
      <Handle type="source" position={Position.Top} id={WORKFLOW_VERTICAL_HANDLES.up.source} style={UP_LANE} className="ms-wf-lane" isConnectable={false} />
      <Handle type="target" position={Position.Bottom} id={WORKFLOW_VERTICAL_HANDLES.up.target} style={UP_LANE} className="ms-wf-lane" isConnectable={false} />
      <Handle type="target" position={Position.Top} id={WORKFLOW_SELF_TARGET_HANDLE} style={SELF_LANE} className="ms-wf-lane" isConnectable={false} />
      <div
        className="relative flex h-14 items-center gap-2.5 border-b border-line px-3"
      >
        <Handle type="target" position={Position.Left} id={WORKFLOW_TARGET_HANDLE} isConnectable={connectable} className={used(WORKFLOW_TARGET_HANDLE)} />
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
          <Icon glyph={skillIcon(node.skill)} size="md" tone="inherit" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <Text size="sm" weight="bold" className="truncate" title={node.label}>
            {node.label}
          </Text>
          <code className="truncate font-mono text-[10px] leading-4 text-text-secondary" title={node.skill}>
            {node.skill}
          </code>
        </span>
        {(node.warning || (node.locked && labels) || mode) && (
          <span className="flex flex-shrink-0 flex-col items-end gap-1">
            <span className="flex items-center gap-1">
              {node.warning && (
                <span
                  role="img"
                  aria-label={node.warning}
                  title={node.warning}
                  className="flex h-5 w-5 items-center justify-center rounded-md bg-orange/15 text-orange"
                >
                  <Icon glyph={TriangleAlert} size="xs" tone="inherit" />
                </span>
              )}
              {node.locked && labels && (
                <span role="img" aria-label={labels.locked} title={labels.locked} className="flex h-5 w-5 items-center justify-center text-icon-muted">
                  <Icon glyph={Lock} size="xs" tone="inherit" />
                </span>
              )}
            </span>
            {mode && labels && (
              <span className={`rounded-md border px-1 text-[9px] font-medium leading-[14px] ${MODE_TONES[mode]}`}>
                {labels[mode]}
              </span>
            )}
          </span>
        )}
        <Handle type="target" position={Position.Right} id={WORKFLOW_SIDE_TARGET_HANDLE} className="ms-wf-lane" isConnectable={false} />
      </div>

      <ul className="pb-2">
        {exits.map((exit) => (
          <li key={exit} className="relative flex h-6 items-center justify-end pl-3 pr-4">
            {exit === WORKFLOW_ANY_EXIT ? (
              <Text size="2xs" tone="secondary" className="truncate italic" title={anyExit}>{anyExit}</Text>
            ) : (
              <code className="truncate font-mono text-[10px] leading-4 text-text-secondary" title={exit}>
                {exit}
              </code>
            )}
            <Handle type="source" position={Position.Right} id={exit} isConnectable={connectable} className={used(exit)} />
          </li>
        ))}
      </ul>
    </div>
  )
}
