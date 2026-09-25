'use client'

import { useState } from 'react'
import { TitleAgentCard, type StatusOption } from '@ds/desktop'
import { TicketPlus } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

/** A coder's own states, as the app offers them. */
const STATUSES: StatusOption[] = [
  { value: '', label: 'no status', tone: 'neutral' },
  { value: 'in progress', label: 'in progress', tone: 'yellow' },
  { value: 'committed', label: 'committed', tone: 'cyan' },
  { value: 'ready for PR', label: 'ready for PR', tone: 'orange' },
  { value: 'PR created', label: 'PR created', tone: 'green' },
  { value: 'in review', label: 'in review', tone: 'blue' },
]

const PROPS: PropRow[] = [
  {
    name: 'ticket',
    type: 'LabelProps',
    description:
      'The ticket, as the badge that opens it — or the invitation to pick one, which is the same badge wearing quiet. One prop for both, because the slot is the slot: a card whose header changed shape with the state would be two cards.',
  },
  {
    name: 'status',
    type: 'StatusProps',
    description:
      'Where the work stands, and the picker that moves it. Absent while an agent has reported nothing — which is not the same as a status of “none”, and the card says so by drawing nothing rather than an empty pill.',
  },
  { name: 'title', type: 'EditableTextProps', required: true, description: 'The agent’s own name. A heading, and the card’s loudest line.' },
  { name: 'description', type: 'EditableTextProps', required: true, description: 'What it is for, in a line or two.' },
  { name: 'className', type: 'string', fallback: "''", description: 'Margins. Not the ground, the radius or the padding — those are the card’s.' },
]

/** The card with everything working: the picker, both fields, the ticket. */
function Live({
  ticketId,
  withStatus = true,
}: {
  ticketId?: string
  withStatus?: boolean
}) {
  const [status, setStatus] = useState('in progress')
  const [title, setTitle] = useState('Rework the invite flow')
  const [description, setDescription] = useState('The wizard asks for the repository twice.')
  const [editing, setEditing] = useState<'title' | 'description' | null>(null)
  const [draft, setDraft] = useState('')

  const field = (which: 'title' | 'description', value: string, set: (v: string) => void) => ({
    value,
    placeholder: which === 'title' ? 'Add a title' : 'Add a description',
    editPlaceholder: which === 'title' ? 'Add a title' : 'Add a description',
    hint: which === 'description' ? 'Enter to save · Shift+Enter for a new line' : undefined,
    editing: editing === which,
    draft,
    onDraftChange: setDraft,
    onStartEditing: () => {
      setDraft(value)
      setEditing(which)
    },
    onSave: () => {
      set(draft.trim())
      setEditing(null)
    },
    onCancel: () => setEditing(null),
  })

  const current = STATUSES.find((s) => s.value === status)

  return (
    <div className="w-[320px]">
      <TitleAgentCard
        ticket={
          ticketId
            ? { children: ticketId, tone: 'jira', title: 'Open in Tasks', onClick: () => undefined }
            : {
                children: 'Add a ticket',
                icon: TicketPlus,
                quiet: true,
                title: 'Pick a ticket for this agent',
                onClick: () => undefined,
              }
        }
        status={
          withStatus
            ? {
                label: current?.label ?? status,
                tone: current?.tone ?? 'neutral',
                value: status,
                options: STATUSES,
                onSelect: setStatus,
              }
            : undefined
        }
        title={field('title', title, setTitle)}
        description={field('description', description, setDescription)}
      />
    </div>
  )
}

export function TitleAgentCardEntry({
  theme,
  onOpen,
}: {
  theme: DesktopTheme
  onOpen?: (id: string) => void
}) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader
        title="TitleAgentCard"
        uses={usesOf('titleagentcard')}
        onOpen={onOpen}
      >
        Who an agent is: the ticket it is on, where that ticket stands, and the two things a
        person wrote about it. Four facts in one card, in the order a reader needs them.
      </EntryHeader>

      <EntrySection
        title="The whole card"
        note="The ticket and the status share the top row because they are the same question asked twice — which piece of work, and how far — and a reader scanning a column of agents answers both from that row without reading a word. The title and the description are underneath because they are what you read once you have found the agent you wanted. Everything here works: open the picker, click either field."
      >
        <Stage theme={theme} className="flex flex-wrap items-start gap-8">
          <Live ticketId="PER-5138" />
          <span className="font-mono text-[10px] text-text-secondary">
            320px — the agent sidebar’s own width
          </span>
        </Stage>
      </EntrySection>

      <EntrySection
        title="Both halves of the row may be missing"
        note="And they are missing for different reasons. An agent with no status has not reported one yet, so the card draws nothing rather than an empty pill. An agent with no ticket has one to be given — so that slot stays a control, quieter than an id: “Add a ticket” in full ink beside a status pill reads as a ticket called “Add a ticket”. The row survives either way rather than collapsing, because a card whose header appears and disappears reads as two different cards."
      >
        <Stage theme={theme} className="flex flex-wrap items-start gap-8">
          <div className="flex flex-col gap-2">
            <Live />
            <span className="font-mono text-[10px] text-text-secondary">no ticket yet</span>
          </div>
          <div className="flex flex-col gap-2">
            <Live ticketId="PER-5138" withStatus={false} />
            <span className="font-mono text-[10px] text-text-secondary">nothing reported yet</span>
          </div>
        </Stage>
      </EntrySection>

      <EntrySection
        title="The picker hangs out of the card"
        note="No overflow-hidden, which a card is otherwise tempting to give: the status picker is an absolutely positioned panel below its row, and a card that clipped its own children would cut the menu off at the first option. Open it on the card above and it runs over the description."
      >
        <Stage theme={theme} className="flex items-start gap-8">
          <Live ticketId="PER-5138" />
          <span className="font-mono text-[10px] text-text-secondary">
            press the pill and watch the menu leave the card
          </span>
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { TitleAgentCard } from '@ds/desktop'

const ticket = useTicketBadge({ ticketId, taskSelection, agentId })
const status = useStatusPicker({ status, agentType, onStatusChange })
const { title, description } = useAgentIdentityFields(identity)

<TitleAgentCard ticket={ticket} status={status} title={title} description={description} />`}</Snippet>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          Everything arrives as <em>data</em>: the ticket is a <code>Label</code>’s props, the
          status a <code>Status</code>’s, each field an <code>EditableText</code>’s. So the app
          decides which tracker a ticket belongs to, which states exist and what the strings
          say, and this decides only where the four of them sit.
        </p>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          Each of the three resolves through a hook in the app rather than living inside this
          card, and that is not ceremony: a <em>planning</em> agent never sees this card at all
          — the spec panel replaces it wholesale and draws the same pieces in its own
          arrangement. One resolution, two layouts, no chance of them disagreeing about a
          colour or a string.
        </p>
      </EntrySection>
    </article>
  )
}
