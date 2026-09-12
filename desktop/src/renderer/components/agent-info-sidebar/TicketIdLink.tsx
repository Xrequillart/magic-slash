import { TicketPlus } from 'lucide-react'
import { useStore } from '../../store'
import { detectTicketProvider } from './utils'
import { TrackerBadge } from '../icons/TrackerIcons'
import type { TaskSelection } from '../../utils/taskSelection'
import { useT } from '../../i18n'

/**
 * The badge's shape when there is no tracker to draw — an id matching neither, and the
 * empty state below. `h-6 … rounded-lg text-xs` is `TrackerBadge`'s own `sm` geometry,
 * repeated rather than imported because that component only knows the two trackers: the
 * point is that all three read as one family and keep the row at one height.
 */
const NEUTRAL_BADGE = 'h-6 gap-1.5 px-2 rounded-lg text-xs inline-flex items-center flex-shrink-0'

/**
 * An agent's ticket id, as ONE badge that opens the ticket in the Tasks modal.
 *
 * It used to carry two targets, the glyph opening the tracker in the browser and the
 * id opening it here. One won: Tasks is where this app renders the body, the labels,
 * the state and the "start an agent" action, and the ticket page it lands on carries
 * its own link out to GitHub or Jira — so the browser was never lost, only moved one
 * step further in. Two targets inside a badge the width of `PROJ-123` also meant two
 * hit areas of a few pixels each, and no way to tell them apart by looking.
 *
 * THE BADGE ITSELF IS THE BOARD'S. `TrackerBadge` is what a Tasks card wears, down to
 * Atlassian's blue at 14% for Jira and our own `ink/5` grey for GitHub — and this badge
 * opens that very card, so it would be strange for it to be a different object. It also
 * moves a decision this file used to own (which colour, which mark, how it reads out
 * loud) to the one place that already answers it for every other surface.
 *
 * Shared because both cards show a ticket: TicketHeader for an implementation agent,
 * SpecPanel for a planning one once `/magic:plan` has created the ticket. The click
 * would otherwise work or not depending on the kind of agent, which is an
 * inconsistency the reader cannot predict.
 *
 * The tracker is NOT threaded in as a prop: it is a function of the id alone, so it
 * is derived here rather than passed down through both cards.
 */
export function TicketIdLink({
  ticketId,
  taskSelection,
  className = '',
}: {
  ticketId: string
  /**
   * The row Tasks should open on, or null when the ticket could not be placed — a
   * closed issue, an untracked repository, an id typed by hand. NULL IS NOT A DEAD
   * CLICK: the modal then opens on the list narrowed to this id, which says "no open
   * ticket matches" on its own rather than leaving the reader on a generic backlog.
   */
  taskSelection: TaskSelection | null
  /** Extra classes for the button, which differ per card. */
  className?: string
}) {
  const openTasksModal = useStore((s) => s.openTasksModal)
  const t = useT()

  const provider = detectTicketProvider(ticketId)
  const label = t('agentInfo.ticketOpenInTasks')

  return (
    <button
      onClick={() => openTasksModal({ selection: taskSelection, query: ticketId })}
      title={label}
      aria-label={label}
      className={`inline-flex rounded-lg cursor-pointer bg-transparent border-none p-0 transition-opacity hover:opacity-80 ${className}`}
    >
      {/* An id belonging to neither tracker is still a valid ticket here — a reference
          typed by hand — and a wrong mark beside it would be worse than none. It gets
          the neutral chip rather than no badge at all, so the row does not change shape
          depending on how the id was written. */}
      {provider ? (
        <TrackerBadge tracker={provider} ticketId={ticketId} title={label} />
      ) : (
        <span className={`${NEUTRAL_BADGE} bg-ink/5 text-ink font-semibold`}>{ticketId}</span>
      )}
    </button>
  )
}

/**
 * The same slot for an agent with no ticket, and the way to give it one.
 *
 * A grey chip and not the bare grey text this was: the row it sits in holds a badge and
 * a status pill, and a naked line of 40%-opacity text beside two filled shapes read as
 * something that had failed to load. `bg-ink/5` is the grey `TrackerBadge` gives GitHub,
 * so the empty state and the filled one are the same object in two states.
 *
 * It is a BUTTON because the state is fixable from here: `/magic:start` normally writes
 * the ticket id, and an agent started by hand — or one whose ticket was only decided
 * later — had no way to acquire one short of restarting it. Pressing this opens Tasks in
 * picking mode, where a card attaches instead of opening. See `tasksPickAgentId`.
 */
export function TicketIdPlaceholder({
  agentId,
  className = '',
}: {
  /** The agent the picked ticket is attached to. */
  agentId: string
  className?: string
}) {
  const openTasksModal = useStore((s) => s.openTasksModal)
  const t = useT()
  const label = t('agentInfo.addTicket')

  return (
    <button
      onClick={() => openTasksModal({ selection: null, query: '', pickForAgentId: agentId })}
      title={t('agentInfo.addTicketHint')}
      className={`${NEUTRAL_BADGE} bg-ink/5 text-text-secondary font-medium cursor-pointer border-none
        hover:bg-ink/10 hover:text-ink transition-colors ${className}`}
    >
      <TicketPlus className="w-3.5 h-3.5 shrink-0" />
      {label}
    </button>
  )
}
