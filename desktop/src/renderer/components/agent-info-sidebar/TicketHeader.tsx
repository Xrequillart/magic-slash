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
      <div className="mt-3">
        <AgentDescriptionField identity={identity} />
      </div>
    </div>
  )
}
