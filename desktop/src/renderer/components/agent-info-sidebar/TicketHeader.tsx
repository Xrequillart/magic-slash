import { TicketIdLink } from './TicketIdLink'
import { StatusPill } from './StatusPill'
import { AgentTitleField, AgentDescriptionField, type AgentIdentity } from './AgentIdentityFields'
import type { TerminalMetadata } from '../../../types'
import type { TaskSelection } from '../../utils/taskSelection'
import { useT } from '../../i18n'

interface TicketHeaderProps {
  metadata: TerminalMetadata | undefined
  ticketLink: string | null
  /** Where the Tasks modal opens when the id is clicked. See `TicketIdLink`. */
  taskSelection: TaskSelection | null
  /** Title and description, plus their editing state — shared with SpecPanel. */
  identity: AgentIdentity
  onStatusChange?: (status: string) => void
}

export function TicketHeader({
  metadata,
  ticketLink,
  taskSelection,
  identity,
  onStatusChange,
}: TicketHeaderProps) {
  const t = useT()

  return (
    <div className="bg-surface rounded-xl p-4">
      {/* Ticket ID + Status Badge */}
      <div className="flex items-center justify-between mb-3">
        {metadata?.ticketId ? (
          // Two targets, one id: the glyph opens the tracker in the browser, the text
          // opens the ticket in Tasks. See `TicketIdLink`.
          <TicketIdLink
            ticketId={metadata.ticketId}
            ticketLink={ticketLink}
            taskSelection={taskSelection}
            className="gap-1.5"
          />
        ) : (
          <span className="text-text-secondary/40 text-xs">{t('agentInfo.noTicket')}</span>
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
