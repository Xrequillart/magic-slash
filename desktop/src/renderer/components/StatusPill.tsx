import { useT } from '../i18n'
import type { MessageKey } from '../i18n'

/**
 * A short word about a ticket, as one pill.
 *
 * It used to live in `pages/Dashboard/parts.tsx` and belonged to the Team page, which is
 * gone. It survives here because the Tasks board and the ticket page both draw it, and a
 * component two pages share has no business living inside one of them.
 *
 * WHAT ITS CALLERS ACTUALLY PASS, which is not what `STATUS_CONFIG` below is keyed on:
 * every remaining call site feeds it a GitHub or Jira LABEL (`TaskCard`, `TaskDetailPage`
 * — `labels.map(label => <StatusPill status={label} />)`). A label is a repository's own
 * word, so it misses the map and renders neutral, which is the intended reading of it.
 * `pages/Tasks/parts.tsx` says the same thing from the other side, explaining why the
 * Jira status pill is deliberately NOT this component.
 *
 * So the map below is reached only when a label happens to be spelled like one of the
 * workflow's own statuses. The `/magic:*` workflow status has an owner of its own —
 * `components/agent-info-sidebar/StatusPill.tsx`, whose `STATUS_OPTIONS` is the editable
 * version with its own colours and its own `statusPill.*` strings. If nothing ever needs
 * the read-only colouring here, this component is a label pill and should be named and
 * typed as one, with `STATUS_CONFIG` and the `status.*` keys retiring with it.
 */

// Workflow-status → label + badge color. Statuses mirror
// TerminalMetadata.status; anything unrecognized falls through to a neutral pill.
export const STATUS_CONFIG: Record<string, { labelKey: MessageKey; className: string }> = {
  // Planning first: it precedes any code. `orange` and `cyan` are the two tokens this
  // map had not spent yet, so unlike the sidebar picker — where both hues were already
  // taken and the pills need a ring to stay distinct — plain tints are enough here.
  planning:             { labelKey: 'status.planning',         className: 'bg-orange/15 text-orange' },
  planned:              { labelKey: 'status.planned',          className: 'bg-cyan/15 text-cyan' },
  'in progress':        { labelKey: 'status.inProgress',       className: 'bg-accent/15 text-accent' },
  committed:            { labelKey: 'status.committed',        className: 'bg-yellow/15 text-yellow' },
  'ready for PR':       { labelKey: 'status.readyForPR',       className: 'bg-blue/15 text-blue' },
  'PR created':         { labelKey: 'status.prCreated',        className: 'bg-blue/15 text-blue' },
  'CI green':           { labelKey: 'status.ciGreen',          className: 'bg-teal/15 text-teal' },
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
