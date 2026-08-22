import { useState, useRef, useCallback } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { useClickOutside } from '../../hooks/useClickOutside'
import { STATUSES_BY_TYPE, resolveAgentType } from './utils'
import { useT, type MessageKey } from '../../i18n'

// Every colour here is a theme token. `committed` and `Review addressed` used to be
// `cyan-500`/`cyan-400` and `teal-500`/`teal-400` straight from Tailwind's palette —
// fixed values that do not follow the theme, so on any of the four light themes the
// pill was pale blue on white and unreadable. The tokens carry a per-theme value
// (desktop/src/themes.ts), dark on a light window and bright on a dark one.
//
// The nine colour tokens were already spent by the nine entries below, so the two
// planning statuses re-use `orange` and `cyan` at a lower alpha. They carried a ring
// as well, to hold them apart from `ready for PR` and `committed`, which use the same
// hue at /20 — but a ring is not part of the design language here and no other pill
// wears one, so the fill alpha is now the only thing separating those pairs. A neutral
// grey was not an option: that is UNKNOWN_STATUS_STYLE, and a known status must never
// look like one this version failed to recognise.
const STATUS_OPTIONS = [
  { value: '',             labelKey: 'statusPill.none',    bg: 'bg-surface-strong',      text: 'text-text-secondary' },
  // First in the array because it reads as workflow order: planning precedes any code.
  { value: 'planning',     labelKey: 'statusPill.planning',    bg: 'bg-orange/10', text: 'text-orange' },
  { value: 'planned',      labelKey: 'statusPill.planned',     bg: 'bg-cyan/10',   text: 'text-cyan' },
  { value: 'in progress',  labelKey: 'statusPill.inProgress',  bg: 'bg-yellow/20',     text: 'text-yellow' },
  { value: 'committed',    labelKey: 'statusPill.committed',     bg: 'bg-cyan/20',       text: 'text-cyan' },
  { value: 'ready for PR', labelKey: 'statusPill.readyForPR',  bg: 'bg-orange/20',     text: 'text-orange' },
  { value: 'PR created',   labelKey: 'statusPill.prCreated',    bg: 'bg-green/20',      text: 'text-green' },
  // The palette was already spent on the eight statuses around it (see themes.ts),
  // so this one takes `accent` — the last role not spoken for here.
  { value: 'CI green',     labelKey: 'statusPill.ciGreen',      bg: 'bg-accent/20',     text: 'text-accent' },
  { value: 'in review',    labelKey: 'statusPill.inReview',     bg: 'bg-blue/20',       text: 'text-blue' },
  { value: 'changes requested', labelKey: 'statusPill.changesRequested', bg: 'bg-red/20', text: 'text-red' },
  { value: 'Review addressed', labelKey: 'statusPill.reviewAddressed', bg: 'bg-teal/20', text: 'text-teal' },
  { value: 'PR merged',    labelKey: 'statusPill.prMerged',     bg: 'bg-purple/20',     text: 'text-purple' },
] as const

// Neutral badge for a non-empty status that isn't in STATUS_OPTIONS (e.g. a newer
// skill/desktop version drift). Show the raw value rather than silently falling
// back to "no status", which would hide that the workflow actually progressed.
const UNKNOWN_STATUS_STYLE = { bg: 'bg-surface-strong', text: 'text-text-secondary' } as const

// `labelKey: null` marks the unknown case: there is no catalogue entry for a
// status this version does not know, so the raw value is carried through instead.
function getStatusOption(status: string): {
  value: string
  labelKey: MessageKey | null
  rawLabel?: string
  bg: string
  text: string
} {
  const match = STATUS_OPTIONS.find(s => s.value === status)
  if (match) return match
  if (status) return { value: status, labelKey: null, rawLabel: status, ...UNKNOWN_STATUS_STYLE }
  return STATUS_OPTIONS[0]
}

interface StatusPillProps {
  status: string
  /**
   * The agent's kind. The picker offers only that kind's statuses — a coder has no
   * use for `planning` and a planner never reaches `PR merged`, and one list of
   * twelve made both workflows read as branches of a single longer one.
   */
  agentType: string | undefined
  onStatusChange?: (status: string) => void
}

/**
 * The agent's status, as a pill that opens the picker.
 *
 * Lifted out of TicketHeader because SpecPanel needs it too: while an agent is
 * `planning`, the spec panel REPLACES the ticket header, and TicketHeader was the
 * only place in the app that rendered `metadata.status`. Rendering the panel
 * without re-injecting this would have removed the at-a-glance marker that tells a
 * planning agent from an implementation one — the opposite of the point.
 */
export function StatusPill({ status, agentType, onStatusChange }: StatusPillProps) {
  const t = useT()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setIsOpen(false), [])
  useClickOutside(containerRef, isOpen, close)

  const statusOption = getStatusOption(status)

  // Filtered from the full table rather than kept as a second list, so the colours and
  // labels stay defined once. An agent whose current status is not in its kind's list
  // — the tail of a switch this build did not make — still renders it above, through
  // getStatusOption; it just cannot be re-selected from the menu.
  const offered = STATUS_OPTIONS.filter(o =>
    (STATUSES_BY_TYPE[resolveAgentType(agentType)] as readonly string[]).includes(o.value)
  )

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer border-none ${statusOption.bg} ${statusOption.text}`}
      >
        {statusOption.labelKey ? t(statusOption.labelKey) : statusOption.rawLabel}
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute top-full right-0 mt-1 z-50 min-w-[160px] bg-bg-tertiary border border-border/50 rounded-lg shadow-xl py-1 overflow-hidden">
          {offered.map((option) => {
            const isSelected = status === option.value
            return (
              <button
                key={option.value || '__no_status__'}
                onClick={() => {
                  onStatusChange?.(option.value)
                  setIsOpen(false)
                }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-surface-strong transition-colors border-none cursor-pointer ${
                  isSelected ? 'bg-surface' : ''
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${option.text}`} style={{ backgroundColor: 'currentColor' }} />
                <span className={isSelected ? 'text-ink font-medium' : 'text-text-secondary'}>
                  {t(option.labelKey)}
                </span>
                {isSelected && (
                  <Check className="w-3 h-3 text-ink ml-auto" />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
