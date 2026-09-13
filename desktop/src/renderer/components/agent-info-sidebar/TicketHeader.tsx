import { TitleAgentCard } from '@ds/desktop'
import { useTicketBadge } from './TicketIdLink'
import { useStatusPicker } from './StatusPill'
import { useAgentIdentityFields, type AgentIdentity } from './AgentIdentityFields'
import type { TerminalMetadata } from '../../../types'
import type { TaskSelection } from '../../utils/taskSelection'

interface TicketHeaderProps {
  metadata: TerminalMetadata | undefined
  /** The agent this card describes — what an empty ticket slot attaches to. */
  agentId: string
  /** Where the Tasks modal opens when the id is clicked. See `TicketIdLink`. */
  taskSelection: TaskSelection | null
  /** Title and description, plus their editing state — shared with SpecPanel. */
  identity: AgentIdentity
  onStatusChange?: (status: string) => void
}

/**
 * The agent's identity card, for an implementation agent.
 *
 * WHAT IS LEFT IN THIS FILE is the four answers: which ticket, which status, and the
 * two fields' state. The card — the row, its margins, the heading, the gap under it —
 * is `TitleAgentCard` in the design system.
 *
 * A PLANNING AGENT NEVER SEES THIS. `SpecPanel` replaces it wholesale and draws the
 * same pieces in its own arrangement, which is why each of them resolves through a
 * hook rather than living inside this card: the ticket, the status and the fields all
 * have a second caller that wants them in a different shape.
 */
export function TicketHeader({
  metadata,
  agentId,
  taskSelection,
  identity,
  onStatusChange,
}: TicketHeaderProps) {
  const ticket = useTicketBadge({ ticketId: metadata?.ticketId, taskSelection, agentId })
  const status = useStatusPicker({ status: metadata?.status ?? '', agentType: metadata?.type, onStatusChange })
  const { title, description } = useAgentIdentityFields(identity)

  return (
    <TitleAgentCard
      ticket={ticket}
      // Absent while the agent has reported nothing, which is not the same as a status
      // of "none": the card draws nothing rather than an empty pill.
      status={metadata ? status : undefined}
      title={title}
      description={description}
    />
  )
}
