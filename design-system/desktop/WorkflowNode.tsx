import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'

import { ButtonIcon } from './ButtonIcon'
import { Icon } from './Icon'
import { Eye, EyeOff, Slack, StickyNote, TriangleAlert } from './icons'
import { skillIcon } from './skillIcons'
import { Text } from './Text'
import {
  workflowActionLine, workflowExitRows, WORKFLOW_ANY_EXIT, type WorkflowCanvasLinkKind, type WorkflowCanvasNode, type WorkflowCanvasNodeMode,
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
 * A LINKED OUTCOME WEARS A PLATE (`linked`), tinted in its link's stroke and running from
 * the word to the card's right edge, into the port: the row and its dot read as one
 * thing, the link's start. Pressing it traces the link (`onTrace`): the plate lights up
 * (`traced`), and so do the link and the port it lands on (`tracedPorts`), on whichever
 * card that is. Lit on the read-only canvas too, which is where a flow is read.
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
 * WHAT THE EDITOR NEEDS TO SEE, on the header's right: the step's switch, an eye open
 * or shut, on every step, built-in or custom (`onToggle`; start's is drawn greyed, it
 * cannot be turned off: `alwaysOn`), a custom step's mode as a small plate, and a warning
 * badge whose tooltip is the warning. A step named by a problem wears a red border; the
 * selected step a ring in the accent. None of it is drawn unless the node says so, so
 * the read-only canvas looks exactly as it did.
 *
 * A CUSTOM STEP WEARS ITS COLOUR (`color`): the ground tinted with it, over the card's own
 * opaque one so links still do not show through, the border and the glyph's tile in it
 * too. The built-in steps keep the plain ground, which is why no colour offered is it.
 *
 * A STEP TURNED OFF (`disabled`) is drawn greyed, dashed border, everything faded but its
 * switch, which is how it is turned back on. The read-only canvas draws the shut eye as a
 * plain mark (`off`), with nothing to press.
 *
 * LINKS ARE DRAWN FROM THE PORTS, in the editor (`connectable`): dragged out of an
 * outcome's row, a link is taken only on that outcome; out of the "When done" row,
 * whatever the step ended on. They land on the header's left port. The lanes of a loop's
 * verticals and detours stay out of it: they are where a link is drawn, not a place to
 * start one.
 */

/** The words the card draws beside a node's own, translated by the caller. */
export interface WorkflowNodeLabels {
  /** The switch's tooltip and accessible name, on a step that is on: "Turn off". */
  disable: string
  /** On a step that is off: "Turn on". */
  enable: string
  /** On start, whose switch is greyed: "Start cannot be turned off". */
  alwaysOn: string
  /**
   * On a built-in step that is on (`locked`), whose eye takes it off the canvas rather than
   * turning it off: "Remove from the canvas". `disable` without it.
   */
  hide?: string
  /** A custom step's mode, on its plate. */
  blocking: string
  advisory: string
}

export interface WorkflowNodeData extends Record<string, unknown> {
  node: WorkflowCanvasNode
  /** Drawn with the selection ring. The editable canvas sets it; the read-only one never does. */
  selected?: boolean
  /** The editor's words: without them, no switch and no mode plate are drawn. */
  labels?: WorkflowNodeLabels
  /** The switch was pressed: turn the step on (`true`) or off. Without it, the switch is drawn greyed. */
  onToggle?: (id: string, enabled: boolean) => void
  /** READ-ONLY CANVAS. The shut eye's tooltip on a step that is off: "Turned off". */
  off?: string
  /** Its ports start and take links: the editor's canvas, when it may draw them. */
  connectable?: boolean
  /** The "whatever it ended on" row's word: "When done". */
  anyExit?: string
  /** The ports a link is plugged into, by handle id, and the kind of that link: drawn in its stroke. */
  ports?: Readonly<Record<string, WorkflowCanvasLinkKind>>
  /** The exit rows a link leaves from, and its kind (`auto` wins): drawn as a plate into the port. */
  linked?: Readonly<Record<string, WorkflowCanvasLinkKind>>
  /** The exit row whose links are traced, lit. */
  traced?: string
  /** The ports a traced link lands on, by handle id, lit in its stroke. */
  tracedPorts?: Readonly<Record<string, WorkflowCanvasLinkKind>>
  /** A linked row was pressed: trace its links, or stop if they already are. */
  onTrace?: (id: string, exit: string) => void
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

/** A linked row's plate, at rest and traced, per kind. Spelled in full so Tailwind finds every class. */
const EXIT_PLATES: Record<WorkflowCanvasLinkKind, { rest: string; traced: string }> = {
  auto: {
    rest: 'bg-accent/10 text-accent hover:bg-accent/20',
    traced: 'bg-accent/25 text-accent ring-1 ring-inset ring-accent/60',
  },
  suggest: {
    rest: 'bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/20',
    traced: 'bg-text-secondary/25 text-ink ring-1 ring-inset ring-text-secondary/60',
  },
}

/** A custom step's plate: `blocking` in the accent, because it can stop the flow; `advisory` neutral. */
const MODE_TONES: Record<WorkflowCanvasNodeMode, string> = {
  blocking: 'border-accent/40 text-accent',
  advisory: 'border-line-strong text-text-secondary',
}

export function WorkflowNode({ data }: NodeProps<WorkflowNodeType>) {
  const { node, selected = false, labels, onToggle, off, connectable = false, anyExit = '', ports, linked, traced, tracedPorts, onTrace } = data
  // A used port wears its link's stroke (`workflowCanvas.css`), and a traced one lights up.
  const used = (handle: string) => {
    const lit = tracedPorts?.[handle]
    const kind = lit ?? ports?.[handle]
    return kind ? `ms-wf-port-${kind}${lit ? ' ms-wf-port-traced' : ''}` : undefined
  }
  const exits = workflowExitRows(node)
  const frame = selected
    ? node.problem ? FRAMES.selectedProblem : FRAMES.selected
    : node.problem ? FRAMES.problem : FRAMES.rest
  const mode = !node.locked && node.mode && labels ? node.mode : null
  // Everything but the switch fades on a step that is off: the switch is the way back.
  const faded = node.disabled ? 'opacity-20' : ''
  const offMark = node.disabled && !labels && off
  // The tint over the opaque ground, and the border in it while no state claims the border.
  const tint = node.color
    ? {
        backgroundImage: `linear-gradient(${node.color}29, ${node.color}29)`,
        ...(!selected && !node.problem ? { borderColor: `${node.color}80` } : {}),
      }
    : undefined

  // A lane is invisible, but where a traced link lands on one, its dot is shown lit.
  const lane = (handle: string) => (tracedPorts?.[handle] ? `ms-wf-lane ${used(handle)}` : 'ms-wf-lane')

  if (node.note !== undefined || node.action !== undefined) {
    return <NoteCard node={node} frame={frame} selected={selected} tint={tint} connectable={connectable} used={used} lane={lane} />
  }

  return (
    // `h-full w-full`: the node's box is set by the canvas (`workflowCardWidth`,
    // `workflowNodeHeight`), and the card fills it rather than sizing itself a second time.
    <div
      className={`relative h-full w-full rounded-xl border bg-bg-secondary text-ink shadow-sm ${frame}${node.disabled ? ' border-dashed' : ''}`}
      aria-current={selected ? 'true' : undefined}
      style={tint}
    >
      <Handle type="source" position={Position.Bottom} id={WORKFLOW_VERTICAL_HANDLES.down.source} style={DOWN_LANE} className="ms-wf-lane" isConnectable={false} />
      <Handle type="target" position={Position.Top} id={WORKFLOW_VERTICAL_HANDLES.down.target} style={DOWN_LANE} className={lane(WORKFLOW_VERTICAL_HANDLES.down.target)} isConnectable={false} />
      <Handle type="source" position={Position.Top} id={WORKFLOW_VERTICAL_HANDLES.up.source} style={UP_LANE} className="ms-wf-lane" isConnectable={false} />
      <Handle type="target" position={Position.Bottom} id={WORKFLOW_VERTICAL_HANDLES.up.target} style={UP_LANE} className={lane(WORKFLOW_VERTICAL_HANDLES.up.target)} isConnectable={false} />
      <Handle type="target" position={Position.Top} id={WORKFLOW_SELF_TARGET_HANDLE} style={SELF_LANE} className={lane(WORKFLOW_SELF_TARGET_HANDLE)} isConnectable={false} />
      <div
        className="relative flex h-14 items-center gap-2.5 border-b border-line px-3"
      >
        <Handle type="target" position={Position.Left} id={WORKFLOW_TARGET_HANDLE} isConnectable={connectable} className={used(WORKFLOW_TARGET_HANDLE)} />
        <span
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${node.color ? '' : 'bg-accent/10 text-accent'} ${faded}`}
          style={node.color ? { backgroundColor: `${node.color}33`, color: node.color } : undefined}
        >
          <Icon glyph={skillIcon(node.skill)} size="md" tone="inherit" />
        </span>
        <span className={`flex min-w-0 flex-1 flex-col ${faded}`}>
          <Text size="sm" weight="bold" className="truncate" title={node.label}>
            {node.label}
          </Text>
          <code className="truncate font-mono text-[10px] leading-4 text-text-secondary" title={node.skill}>
            {node.skill}
          </code>
        </span>
        {(node.warning || labels || offMark || mode) && (
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
              {labels && (
                // `nodrag` and the stopped click: pressing the switch neither drags the card
                // nor selects it.
                <span className="nodrag nopan flex" onClick={(event) => event.stopPropagation()}>
                  <ButtonIcon
                    icon={node.disabled ? EyeOff : Eye}
                    title={node.alwaysOn ? labels.alwaysOn : node.disabled ? labels.enable : (node.locked && labels.hide) || labels.disable}
                    onClick={() => onToggle?.(node.id, !!node.disabled)}
                    disabled={node.alwaysOn || !onToggle}
                    tone="ghost"
                    size="xs"
                  />
                </span>
              )}
              {offMark && (
                <span role="img" aria-label={off} title={off} className="flex h-5 w-5 items-center justify-center text-icon-muted">
                  <Icon glyph={EyeOff} size="xs" tone="inherit" />
                </span>
              )}
            </span>
            {mode && labels && (
              <span className={`rounded-md border px-1 text-[9px] font-medium leading-[14px] ${MODE_TONES[mode]} ${faded}`}>
                {labels[mode]}
              </span>
            )}
          </span>
        )}
        <Handle type="target" position={Position.Right} id={WORKFLOW_SIDE_TARGET_HANDLE} className={lane(WORKFLOW_SIDE_TARGET_HANDLE)} isConnectable={false} />
      </div>

      <ul className={`pb-2 ${faded}`}>
        {exits.map((exit) => {
          const word = exit === WORKFLOW_ANY_EXIT ? (
            <Text size="2xs" tone="inherit" className="truncate italic" title={anyExit}>{anyExit}</Text>
          ) : (
            <code className="truncate font-mono text-[10px] leading-4" title={exit}>
              {exit}
            </code>
          )
          const kind = linked?.[exit]
          return (
            <li key={exit} className="relative flex h-6 items-center justify-end pl-3 pr-4">
              {kind ? (
                // Out to the card's edge (`-mr-4` over the row's `pr-4`), where the port sits:
                // the plate runs into the dot. `nodrag` and the stopped click: pressing it
                // neither drags the card nor selects it. `pointer-events-auto`: a read-only
                // card takes no pointer, and this plate still has to.
                <button
                  type="button"
                  aria-pressed={traced === exit}
                  onClick={(event) => {
                    event.stopPropagation()
                    onTrace?.(node.id, exit)
                  }}
                  className={`nodrag nopan pointer-events-auto -mr-4 flex h-5 min-w-0 cursor-pointer items-center rounded-l-md pl-1.5 pr-4 transition-colors ${EXIT_PLATES[kind][traced === exit ? 'traced' : 'rest']}`}
                >
                  {word}
                </button>
              ) : (
                <span className="flex min-w-0 text-text-secondary">{word}</span>
              )}
              <Handle type="source" position={Position.Right} id={exit} isConnectable={connectable} className={used(exit)} />
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/**
 * AN END NOTE'S CARD: one header-high plate, its text where a step's name goes, two lines
 * at most (the inspector shows the rest). Links come in on the left like a step's, and
 * nothing goes out: there is no row and no source port. The loop lanes are drawn all the
 * same, invisible, since a link INTO a note may still be routed down or up a column.
 * Its text is `node.note`; an empty one shows `node.label` instead, quieter: the caller's
 * "Empty note". AN ACTION'S CARD is the same plate, its service's mark in place of the note's
 * glyph, and never a colour of its own, its channel and its instruction's first line as its
 * text (`workflowActionLine`).
 */
function NoteCard({ node, frame, selected, tint, connectable, used, lane }: {
  node: WorkflowCanvasNode
  frame: string
  selected: boolean
  tint?: { backgroundImage: string; borderColor?: string }
  connectable: boolean
  used: (handle: string) => string | undefined
  lane: (handle: string) => string
}) {
  // An action's card is a note's, wearing its own glyph and saying where it posts and what.
  const text = node.action ? workflowActionLine(node.action) : node.note ?? ''
  return (
    <div
      className={`relative flex h-full w-full items-center gap-2.5 rounded-xl border bg-bg-secondary px-3 text-ink shadow-sm ${frame}`}
      aria-current={selected ? 'true' : undefined}
      style={tint}
    >
      <Handle type="target" position={Position.Top} id={WORKFLOW_VERTICAL_HANDLES.down.target} style={DOWN_LANE} className={lane(WORKFLOW_VERTICAL_HANDLES.down.target)} isConnectable={false} />
      <Handle type="target" position={Position.Bottom} id={WORKFLOW_VERTICAL_HANDLES.up.target} style={UP_LANE} className={lane(WORKFLOW_VERTICAL_HANDLES.up.target)} isConnectable={false} />
      <Handle type="target" position={Position.Top} id={WORKFLOW_SELF_TARGET_HANDLE} style={SELF_LANE} className={lane(WORKFLOW_SELF_TARGET_HANDLE)} isConnectable={false} />
      <Handle type="target" position={Position.Right} id={WORKFLOW_SIDE_TARGET_HANDLE} className={lane(WORKFLOW_SIDE_TARGET_HANDLE)} isConnectable={false} />
      <Handle type="target" position={Position.Left} id={WORKFLOW_TARGET_HANDLE} isConnectable={connectable} className={used(WORKFLOW_TARGET_HANDLE)} />
      {node.action ? (
        // The service's own mark, in its own colours, on a plain tile: an action has no colour.
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-ink/5">
          <Icon glyph={Slack} size="md" tone="inherit" />
        </span>
      ) : (
        <span
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${node.color ? '' : 'bg-accent/10 text-accent'}`}
          style={node.color ? { backgroundColor: `${node.color}33`, color: node.color } : undefined}
        >
          <Icon glyph={StickyNote} size="md" tone="inherit" />
        </span>
      )}
      <Text
        size="xs"
        tone={text ? undefined : 'secondary'}
        className={`line-clamp-2 min-w-0 flex-1 leading-4 ${text ? '' : 'italic'}`}
        title={text || node.label}
      >
        {text || node.label}
      </Text>
      {node.warning && (
        <span
          role="img"
          aria-label={node.warning}
          title={node.warning}
          className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-orange/15 text-orange"
        >
          <Icon glyph={TriangleAlert} size="xs" tone="inherit" />
        </span>
      )}
    </div>
  )
}
