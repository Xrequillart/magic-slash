import { Status, type StatusOption, type StatusProps, type StatusStrength, type StatusTone } from '@ds/desktop'
import { STATUSES_BY_TYPE, resolveAgentType } from './utils'
import { useT, type MessageKey } from '../../i18n'

/**
 * The workflow's twelve states, and what each one wears.
 *
 * WHAT IS LEFT IN THIS FILE is the catalogue — which states exist, what they are
 * called, and which hue each takes. The plate, the chevron, the picker and the
 * dismissing all moved to `Status` in the design system, which owns how a state
 * LOOKS and knows nothing about what these ones mean. The split is `ProgressBar`'s:
 * the shape is shared, the vocabulary is the app's.
 *
 * Every colour is a theme ROLE and not a value. These were `cyan-500`/`teal-400`
 * straight from Tailwind's palette once — fixed colours that do not follow the theme,
 * so on any of the four light themes the pill was pale blue on white and unreadable.
 *
 * TEN ROLES, TWELVE STATES, so two pairs share a hue and are held apart by the fill
 * alpha alone: `planning` against `ready for PR` in orange, `planned` against
 * `committed` in cyan. That is what `strength: 'soft'` is for, and it is the only
 * reason the design system carries a second alpha at all.
 *
 * NEUTRAL IS RESERVED. It is what an empty status wears, and what a status this build
 * does not recognise wears — so no known state may be given it. A known state
 * rendering grey would be claiming we failed to recognise it.
 */
const STATUS_CATALOGUE: readonly {
  value: string
  labelKey: MessageKey
  tone: StatusTone
  strength?: StatusStrength
}[] = [
  { value: '', labelKey: 'statusPill.none', tone: 'neutral' },
  // First in the array because it reads as workflow order: planning precedes any code.
  { value: 'planning', labelKey: 'statusPill.planning', tone: 'orange', strength: 'soft' },
  { value: 'planned', labelKey: 'statusPill.planned', tone: 'cyan', strength: 'soft' },
  { value: 'in progress', labelKey: 'statusPill.inProgress', tone: 'yellow' },
  { value: 'committed', labelKey: 'statusPill.committed', tone: 'cyan' },
  { value: 'ready for PR', labelKey: 'statusPill.readyForPR', tone: 'orange' },
  { value: 'PR created', labelKey: 'statusPill.prCreated', tone: 'green' },
  // The palette was already spent on the eight statuses around it (see themes.ts),
  // so this one takes `accent` — the last role not spoken for here.
  { value: 'CI green', labelKey: 'statusPill.ciGreen', tone: 'accent' },
  { value: 'in review', labelKey: 'statusPill.inReview', tone: 'blue' },
  { value: 'changes requested', labelKey: 'statusPill.changesRequested', tone: 'red' },
  { value: 'Review addressed', labelKey: 'statusPill.reviewAddressed', tone: 'teal' },
  { value: 'PR merged', labelKey: 'statusPill.prMerged', tone: 'purple' },
]

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
 * The status, as `Status`'s props.
 *
 * A HOOK BESIDE THE COMPONENT for the reason the ticket badge has one: `TitleAgentCard`
 * takes the picker as data and the spec panel renders it itself. Resolving the
 * catalogue once is what keeps the two from disagreeing about a colour.
 */
export function useStatusPicker({
  status,
  agentType,
  onStatusChange,
}: StatusPillProps): Omit<StatusProps, 'size' | 'className'> {
  const t = useT()

  const current = STATUS_CATALOGUE.find(s => s.value === status)

  // Filtered from the full catalogue rather than kept as a second list, so the colours
  // and labels stay defined once. An agent whose current status is not in its kind's
  // list — the tail of a switch this build did not make — still renders on the plate;
  // it just cannot be re-selected from the menu.
  const allowed = STATUSES_BY_TYPE[resolveAgentType(agentType)] as readonly string[]
  const options: StatusOption[] = STATUS_CATALOGUE
    .filter(o => allowed.includes(o.value))
    .map(o => ({ value: o.value, label: t(o.labelKey), tone: o.tone, strength: o.strength }))

  return {
    // An unrecognised status carries its RAW value through rather than falling back to
    // "no status", which would hide that the workflow actually progressed — a newer
    // skill talking to an older desktop is the case that produces it.
    label: current ? t(current.labelKey) : status,
    tone: current?.tone ?? 'neutral',
    strength: current?.strength,
    value: status,
    options,
    onSelect: onStatusChange,
  }
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
export function StatusPill(props: StatusPillProps) {
  return <Status {...useStatusPicker(props)} />
}
