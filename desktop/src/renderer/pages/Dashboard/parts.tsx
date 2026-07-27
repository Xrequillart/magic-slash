import { Coins } from 'lucide-react'
import type { OrgAgent, OrgAgentPRReview } from '../../../types'
import { useT } from '../../i18n'
import type { MessageKey } from '../../i18n'

/**
 * Presentational vocabulary shared by every Team-page widget. Extracted so the
 * attention widgets and the flow panel cannot drift into two dialects of the same
 * card, pill and badge.
 */

export type StatTone = 'default' | 'warn' | 'bad'

const TONE_CLASSES: Record<StatTone, { border: string; value: string }> = {
  default: { border: 'border-line-field', value: 'text-ink' },
  warn: { border: 'border-yellow/25', value: 'text-yellow' },
  bad: { border: 'border-red/25', value: 'text-red' },
}

/**
 * A headline number in a card.
 *
 * `sub` carries the honesty qualifier — sample size, "shown raw", a ratio — and is
 * deliberately part of the tile rather than optional decoration: a median with no
 * indication of how many samples back it is the exact failure this page exists to
 * avoid.
 */
export function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  tone = 'default',
}: {
  icon: typeof Coins
  label: string
  value: string
  sub?: string
  tone?: StatTone
}) {
  const classes = TONE_CLASSES[tone]
  return (
    <div className={`bg-surface border ${classes.border} rounded-xl p-4 flex flex-col gap-1.5 min-w-0`}>
      <div className="flex items-center gap-1.5 text-xs text-text-secondary">
        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      <div className={`text-lg font-semibold ${classes.value} truncate`}>{value}</div>
      {sub && <div className="text-xs text-text-secondary/60 truncate">{sub}</div>}
    </div>
  )
}

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

// PR review status → label + badge color for the "awaiting review" widget.
export const PR_STATUS_CONFIG: Record<NonNullable<OrgAgentPRReview['status']>, { labelKey: MessageKey; className: string }> = {
  pending:              { labelKey: 'prReview.pending',          className: 'bg-blue/15 text-blue' },
  commented:            { labelKey: 'prReview.commented',        className: 'bg-purple/15 text-purple' },
  'changes-requested':  { labelKey: 'prReview.changesRequested', className: 'bg-red/15 text-red' },
  approved:             { labelKey: 'prReview.approved',         className: 'bg-green/15 text-green' },
}

export function RepoTag({ repo }: { repo: string }) {
  const name = repo.split('/').pop() ?? repo
  return (
    <span className="text-xs text-text-secondary/60 bg-surface-subtle border border-line-subtle px-1.5 py-0.5 rounded font-mono">
      {name}
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
