'use client'

import { useState } from 'react'
import { Agent, AGENT_STATES, type AgentState } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Stage, type PropRow } from '../parts'

/** What each state is, in the words the app's tooltip uses. */
const MEANING: Record<AgentState, string> = {
  idle: 'nothing to show — and nothing is shown',
  working: 'the agent is at work; nothing is waiting on you',
  waiting: 'the agent is asking you something',
  completed: 'it finished',
  error: 'it stopped on something',
}

const PROPS: PropRow[] = [
  {
    name: 'name',
    type: 'string',
    required: true,
    description:
      'What the agent is called. It truncates: a title is written by whoever started the agent, and the column is 288px at its narrowest.',
  },
  {
    name: 'state',
    type: "'idle' | 'working' | 'waiting' | 'completed' | 'error'",
    required: true,
    description:
      'A workflow, not a severity. waiting is not a worse working — it is the agent’s turn ending and yours beginning.',
  },
  {
    name: 'ticketId',
    type: 'string',
    description:
      'A ticket id in front of the name, drawn quieter than it. Not a Label: a plate here would be a third weight in a row that already has a title and a badge, and the id is a prefix to the name rather than a thing beside it.',
  },
  {
    name: 'active',
    type: 'boolean',
    fallback: 'false',
    description:
      'This is the row being looked at. It takes the state’s ground at rest instead of only on hover — so the selected row is the one that is already coloured, rather than one wearing a selection colour of its own.',
  },
  { name: 'title', type: 'string', description: 'The tooltip — the state in words. The glyph has no other voice.' },
  { name: 'onClick', type: '(event) => void', description: 'Selecting the agent.' },
  {
    name: 'draggable / onDragStart',
    type: 'boolean / (event) => void',
    description: 'The sidebar reorders its list by dragging; the menu-bar panel does not.',
  },
  { name: 'className', type: 'string', fallback: "''", description: 'Margins and width. Not the grounds, the padding or any of the state colours.' },
]

/** A list you can actually select in, because that is half of what the row is. */
function List({ withTickets = false }: { withTickets?: boolean }) {
  const [active, setActive] = useState<AgentState>('working')
  return (
    <div className="flex w-full max-w-xs flex-col gap-0.5">
      {AGENT_STATES.map((state) => (
        <Agent
          key={state}
          name={`${state} agent`}
          state={state}
          ticketId={withTickets ? 'PER-5138' : undefined}
          active={active === state}
          title={MEANING[state]}
          onClick={() => setActive(state)}
        />
      ))}
    </div>
  )
}

export function AgentEntry({
  theme,
  onOpen,
}: {
  theme: DesktopTheme
  onOpen?: (id: string) => void
}) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader
        title="Agent"
        uses={[
          { id: 'loader', label: 'Loader' },
          { id: 'icon', label: 'Icon' },
          { id: 'text', label: 'Text' },
        ]}
        onOpen={onOpen}
      >
        One agent, as a row: what it is called and what it is doing. A list of a dozen is read
        by scanning the right-hand edge, not by reading a dozen titles — so the state is a
        shape and a colour, and the title is what you check once you have found the row.
      </EntryHeader>

      <EntrySection
        title="The five states"
        note="Click a row: the one being looked at takes the state's own ground rather than a selection colour of its own. One hue per state, spent three ways — on the glyph, on the active ground, and on the hover — because a row that hovered grey while its badge was orange would be two components in one line."
      >
        <Stage theme={theme} className="flex flex-col gap-4">
          <List />
          <div className="flex flex-col gap-1">
            {AGENT_STATES.map((state) => (
              <span key={state} className="font-mono text-[10px] text-text-secondary">
                {state} · {MEANING[state]}
              </span>
            ))}
          </div>
        </Stage>
      </EntrySection>

      <EntrySection
        title="Idle draws nothing"
        note="Not a grey dot, not an empty circle: nothing at all. A sidebar that puts a mark beside every agent makes the ones actually doing something invisible — and most agents in a list are idle most of the time. A quiet list stays quiet."
      >
        <Stage theme={theme} className="flex w-full max-w-xs flex-col gap-0.5">
          <Agent name="reviewing the PR" state="working" />
          <Agent name="waiting on you" state="waiting" />
          <Agent name="ran yesterday" state="idle" />
          <Agent name="another idle one" state="idle" />
          <Agent name="done" state="completed" />
        </Stage>
      </EntrySection>

      <EntrySection
        title="With a ticket id"
        note="The menu-bar panel draws one and the sidebar does not, which is exactly why this is a prop: they were two hand-written copies of one row, and the copies had already drifted on this."
      >
        <Stage theme={theme} className="flex flex-col gap-4">
          <List withTickets />
        </Stage>
      </EntrySection>

      <EntrySection
        title="The name gives way"
        note="min-w-0 on the growing child, or a flex item refuses to shrink below its content and the badge is pushed off the end instead of the name giving way. The badge is the thing you are scanning for; it never moves."
      >
        <Stage theme={theme} className="flex flex-col gap-4">
          <div className="flex w-[288px] flex-col gap-0.5">
            <Agent
              name="rework the onboarding wizard so the invite flow stops asking twice"
              state="working"
              ticketId="PER-5138"
            />
            <Agent name="short one" state="waiting" />
          </div>
          <span className="font-mono text-[10px] text-text-secondary">
            288px — the sidebar at its narrowest
          </span>
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { Agent } from '@ds/desktop'

<Agent
  name={terminal.metadata?.title || terminal.name}
  state={terminal.state}
  active={isActive || isSplitTarget}
  onClick={onSelect}
  draggable={draggable}
  onDragStart={handleDragStart}
/>`}</Snippet>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The <code>waiting</code> glyph <em>arrives</em> rather than gestures — a small lift
          with a tilt into it, a settle back past level, then rest, which is the motion of a
          message landing in a list. That state is the agent asking you something, not the
          agent being slow: nothing moves until the person answers. The keyframes travel with
          the component, the way <code>Loader</code>’s do.
        </p>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          It replaced two hand-written rows and the app’s <code>stateColors</code> table, which
          held five state hues in three variants and now has no readers at all. The sidebar row
          also carried a <code>group/agent</code> class for a hover nothing ever claimed: no{' '}
          <code>group-hover/agent</code> existed anywhere in the app.
        </p>
      </EntrySection>
    </article>
  )
}
