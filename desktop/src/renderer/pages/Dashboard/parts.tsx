import type { OrgAgent } from '../../../types'
import { useT } from '../../i18n'
import type { MessageKey } from '../../i18n'

/**
 * Presentational vocabulary shared by the Team page. Extracted so the repository
 * rows and the agent rows inside them cannot drift into two dialects of the same
 * pill and badge.
 */

// Workflow-status → label + badge color. Statuses mirror
// TerminalMetadata.status; anything unrecognized falls through to a neutral pill.
export const STATUS_CONFIG: Record<string, { labelKey: MessageKey; className: string }> = {
  'in progress':        { labelKey: 'status.inProgress',       className: 'bg-accent/15 text-accent' },
  committed:            { labelKey: 'status.committed',        className: 'bg-yellow/15 text-yellow' },
  'ready for PR':       { labelKey: 'status.readyForPR',       className: 'bg-blue/15 text-blue' },
  'PR created':         { labelKey: 'status.prCreated',        className: 'bg-blue/15 text-blue' },
  'in review':          { labelKey: 'status.inReview',         className: 'bg-purple/15 text-purple' },
  'changes requested':  { labelKey: 'status.changesRequested', className: 'bg-red/15 text-red' },
  'Review addressed':   { labelKey: 'status.reviewAddressed',  className: 'bg-green/15 text-green' },
  'PR merged':          { labelKey: 'status.prMerged',         className: 'bg-green/15 text-green' },
}

export function StatusPill({ status }: { status?: string }) {
  const t = useT()
  if (!status) return null
  const config = STATUS_CONFIG[status]
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${config?.className ?? 'bg-surface text-text-secondary'}`}>
      {config ? t(config.labelKey) : status}
    </span>
  )
}

export function TicketBadge({ ticketId }: { ticketId?: string }) {
  if (!ticketId) return null
  return (
    <span className="text-xs text-accent/80 bg-accent/10 px-2 py-0.5 rounded flex-shrink-0">
      {ticketId}
    </span>
  )
}

export function OwnerLabel({ agent, emailByOwner }: { agent: OrgAgent; emailByOwner: Map<string, string> }) {
  const t = useT()
  const label = agent.ownerId ? emailByOwner.get(agent.ownerId) ?? agent.ownerId : t('dashboard.unassigned')
  return <span className="text-xs text-text-secondary/60 truncate">{label}</span>
}
