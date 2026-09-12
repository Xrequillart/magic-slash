import { TicketIdLink, TicketIdPlaceholder } from './TicketIdLink'
import { StatusPill } from './StatusPill'
import { AgentTitleField, AgentDescriptionField, type AgentIdentity } from './AgentIdentityFields'
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

export function TicketHeader({
  metadata,
  agentId,
  taskSelection,
  identity,
  onStatusChange,
}: TicketHeaderProps) {
  return (
    <div className="bg-surface rounded-xl p-4">
      {/* Ticket ID + Status Badge */}
      <div className="flex items-center justify-between mb-3">
        {metadata?.ticketId ? (
          // One target: the badge opens the ticket in Tasks. See `TicketIdLink`.
          <TicketIdLink
            ticketId={metadata.ticketId}
            taskSelection={taskSelection}
            className="gap-1.5"
          />
        ) : (
          // Not a dead label: it opens Tasks to pick one. See `TicketIdPlaceholder`.
          <TicketIdPlaceholder agentId={agentId} />
        )}
        {metadata && (
          <StatusPill status={metadata.status ?? ''} agentType={metadata.type} onStatusChange={onStatusChange} />
        )}
      </div>

      {/* Title and description come from AgentIdentityFields: SpecPanel renders the
          same two fields for a planning agent, which has no ticket card at all. */}
      <AgentTitleField identity={identity} />
      {/* `mt-1` and not the `mt-3` this was: both fields now carry `py-1.5` of their own,
          so 12px of margin sat on top of 12px of padding and pushed a description away
          from the title it belongs to. 4px keeps the two hover grounds from touching
          while reading as one block. */}
      <div className="mt-1">
        <AgentDescriptionField identity={identity} />
      </div>
    </div>
  )
}
