import { useInsertionEffect } from 'react'
import type { DragEvent, MouseEvent } from 'react'
import { Icon } from './Icon'
import { Check, MessageCircleQuestionMark, XCircle } from './icons'
import { Loader } from './Loader'
import { Text } from './Text'

/**
 * One agent, as a row: what it is called and what it is doing.
 *
 * TWO FACTS IN ONE LINE, and the second one is a glyph. A list of a dozen agents is
 * read by scanning the right-hand edge, not by reading twelve titles — so the state
 * is a shape and a colour, and the title is what you check once you have found the
 * row you wanted.
 *
 * IDLE DRAWS NOTHING. Not a grey dot, not an empty circle: nothing at all. A sidebar
 * that puts a mark beside every agent makes the ones actually doing something
 * invisible, and most agents in a list are idle most of the time. A quiet list stays
 * quiet.
 *
 * IT IS THE SAME ROW IN BOTH LISTS. The sidebar and the menu-bar panel are two views
 * of one set of agents, and a state that reads one way in the app and another in the
 * menu bar is worse than either — they had two copies of this and the copies had
 * already drifted apart on the ticket id.
 */

/**
 * What an agent can be doing.
 *
 * Named here rather than imported from the app, and that is the usual bargain: this
 * folder cannot reach into `desktop/src/types`, and the app's own `TerminalState` is
 * structurally this. The five are a WORKFLOW and not a severity — `waiting` is not a
 * worse `working`, it is the agent's turn ending and yours beginning.
 */
export type AgentState = 'idle' | 'working' | 'waiting' | 'completed' | 'error'

/** The five, in the order a reader meets them. */
export const AGENT_STATES: readonly AgentState[] = [
  'idle',
  'working',
  'waiting',
  'completed',
  'error',
]

/**
 * The colour of the state, and the two grounds built from it.
 *
 * ONE HUE PER STATE, spent three ways: on the glyph, on the row's ground when the row
 * is the one being looked at, and on its hover when it is not. A row that hovered grey
 * while its badge was orange would be two components in one line.
 */
const STATES: Record<AgentState, { text: string; ground: string; hover: string }> = {
  idle: {
    text: 'text-text-secondary',
    ground: 'bg-text-secondary/20',
    hover: 'hover:bg-text-secondary/10',
  },
  working: { text: 'text-accent', ground: 'bg-accent/20', hover: 'hover:bg-accent/10' },
  waiting: { text: 'text-orange', ground: 'bg-orange/20', hover: 'hover:bg-orange/10' },
  completed: { text: 'text-green', ground: 'bg-green/20', hover: 'hover:bg-green/10' },
  error: { text: 'text-red', ground: 'bg-red/20', hover: 'hover:bg-red/10' },
}

/**
 * The `waiting` glyph's arrival, and the only thing here that cannot be a class.
 *
 * A QUESTION BUBBLE, because that state is the agent asking you something rather than
 * the agent being slow: nothing moves until the person answers. So it ARRIVES rather
 * than gestures — a small lift with a tilt into it, a settle back past level, then
 * rest, which is the motion of a message landing in a list.
 *
 * The lift is a PERCENTAGE of the glyph's own height and not a pixel count, so it
 * reads the same at any size this is drawn at. One arrival per 3s loop and the rest is
 * most of it: the keyframes are spaced evenly so the default ease-in-out shapes the
 * motion like a breath rather than a snap — a sidebar that can hold a dozen of these
 * has to stay calm.
 *
 * Under reduced motion the animation is dropped entirely, which leaves the glyph
 * untransformed: at rest, which is where the loop spends most of its time anyway.
 */
const AGENT_CSS = `
.ds-agent-ask {
  animation: ds-agent-ask-arrive 3s ease-in-out infinite;
}
@keyframes ds-agent-ask-arrive {
  0%, 44%, 100% { transform: translateY(0) rotate(0deg); }
  14% { transform: translateY(-14%) rotate(-5deg); }
  30% { transform: translateY(0) rotate(2deg); }
}
@media (prefers-reduced-motion: reduce) {
  .ds-agent-ask { animation: none; }
}
`

const STYLE_ID = 'ds-agent-styles'

/**
 * The stylesheet, put in the document once — the same bargain `Loader` strikes, for
 * the same reason: a component that carries its own keyframes needs no wiring in
 * either app, where a CSS file in this folder would be a fourth thing to wire.
 */
function useAgentStyles() {
  useInsertionEffect(() => {
    if (document.getElementById(STYLE_ID)) return
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = AGENT_CSS
    document.head.appendChild(style)
  }, [])
}

export interface AgentProps {
  /**
   * What the agent is called. It truncates: a title is written by whoever started the
   * agent, and the column is 288px at its narrowest.
   */
  name: string
  state: AgentState
  /**
   * A ticket id in front of the name, drawn QUIETER than it. Not a `Label`: a plate
   * here would be a third weight in a row that already has a title and a badge, and
   * the id is a prefix to the name rather than a thing beside it.
   */
  ticketId?: string
  /**
   * This is the row being looked at. It takes the state's ground at rest instead of
   * only on hover, and its text goes to full ink — so the selected row is the one
   * that is already coloured, rather than one wearing a selection colour of its own.
   */
  active?: boolean
  /** The tooltip — the state in words, translated. The glyph has no other voice. */
  title?: string
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void
  draggable?: boolean
  onDragStart?: (event: DragEvent<HTMLButtonElement>) => void
  /** Margins and width. Not the grounds, the padding or any of the state colours. */
  className?: string
}

export function Agent({
  name,
  state,
  ticketId,
  active = false,
  title,
  onClick,
  draggable,
  onDragStart,
  className = '',
}: AgentProps) {
  useAgentStyles()

  const spec = STATES[state]

  return (
    <button
      type="button"
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      title={title}
      className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs text-left border-none
        transition-all ${draggable ? 'cursor-pointer active:cursor-grab' : 'cursor-pointer'}
        ${active ? `${spec.ground} text-ink` : `text-text-secondary ${spec.hover} hover:text-ink`}
        ${className}`}
    >
      {/* `min-w-0` on the growing child, or a flex item refuses to shrink below its
          content and the badge is pushed off the end instead of the name giving way. */}
      <span className="flex-1 min-w-0 truncate">
        {ticketId && <span className="text-text-secondary/70">{ticketId} </span>}
        {/* `inherit`, because the row owns the colour: secondary at rest, ink when
            active or hovered. A tone here would fight all three. */}
        <Text tone="inherit" weight="medium">
          {name}
        </Text>
      </span>

      {state !== 'idle' && (
        <span className={`flex items-center flex-shrink-0 ${spec.text}`}>
          <StateGlyph state={state} />
        </span>
      )}
    </button>
  )
}

/**
 * The state, as one mark.
 *
 * Every one of them takes the row's colour through `currentColor` rather than naming
 * its own — the wrapper above has already decided, and a glyph with an opinion would
 * be a second place to keep the five hues in step.
 */
function StateGlyph({ state }: { state: Exclude<AgentState, 'idle'> }) {
  switch (state) {
    case 'working':
      return <Loader className="flex-shrink-0" />
    case 'waiting':
      return <Icon glyph={MessageCircleQuestionMark} size="md" tone="inherit" className="ds-agent-ask" />
    case 'completed':
      return <Icon glyph={Check} size="md" tone="inherit" />
    case 'error':
      return <Icon glyph={XCircle} size="md" tone="inherit" />
  }
}
