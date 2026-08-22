import { TicketMark } from './TicketMark'
import { StatusPill } from './StatusPill'
import { AgentTitleField, AgentDescriptionField, type AgentIdentity } from './AgentIdentityFields'
import type { TerminalMetadata } from '../../../types'
import { useT } from '../../i18n'

interface TicketHeaderProps {
  metadata: TerminalMetadata | undefined
  ticketLink: string | null
  ticketProvider: 'github' | 'jira' | null
  /** Title and description, plus their editing state — shared with SpecPanel. */
  identity: AgentIdentity
  onStatusChange?: (status: string) => void
}

export function TicketHeader({
  metadata,
  ticketLink,
  ticketProvider,
  identity,
  onStatusChange,
}: TicketHeaderProps) {
  const t = useT()

  return (
    <div className="bg-surface rounded-xl p-4">
      {/* Ticket ID + Status Badge */}
      <div className="flex items-center justify-between mb-3">
        {metadata?.ticketId ? (
          // The mark hangs off the ticket ID, not off the link: it says which tracker
          // the ID belongs to, which is worth showing even when no URL could be built
          // for it. `group-hover:underline` sits on the label alone so the underline
          // stops at the text instead of running under the mark.
          ticketLink ? (
            <button
              onClick={() => window.electronAPI.shell.openExternal(ticketLink)}
              className="group flex items-center gap-1.5 text-ink text-xs font-semibold cursor-pointer bg-transparent border-none p-0"
            >
              <TicketMark provider={ticketProvider} />
              <span className="group-hover:underline">{metadata.ticketId}</span>
            </button>
          ) : (
            <span className="flex items-center gap-1.5 text-ink text-xs font-semibold">
              <TicketMark provider={ticketProvider} />
              {metadata.ticketId}
            </span>
          )
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
