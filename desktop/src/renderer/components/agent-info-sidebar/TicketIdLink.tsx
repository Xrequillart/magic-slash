import { Label, type LabelProps } from '@ds/desktop'
import { TicketPlus } from '@ds/desktop/icons'
import { useStore } from '../../store'
import { detectTicketProvider } from './utils'
import type { TaskSelection } from '../../utils/taskSelection'
import { useT } from '../../i18n'

/** What a ticket badge IS, resolved once: `Label`'s props and nothing else. */
export type TicketBadge = Omit<LabelProps, 'size' | 'truncate'>

/**
 * The ticket slot, as data.
 *
 * A HOOK AND NOT ONLY A COMPONENT, because two surfaces want it in two shapes:
 * `TitleAgentCard` takes the badge as `Label` props, and the spec panel draws it
 * itself in a row of its own. Resolving it once is what stops the two from disagreeing
 * about which tracker an id belongs to — or about what the empty slot looks like.
 *
 * THE TRACKER IS A FUNCTION OF THE ID, so it is derived here rather than threaded
 * through every caller. An id belonging to neither is still a valid ticket — a
 * reference typed by hand — and gets the neutral plate rather than a wrong mark beside
 * it, so the row does not change shape depending on how the id was written.
 */
export function useTicketBadge({
  ticketId,
  taskSelection,
  agentId,
}: {
  ticketId: string | undefined
  taskSelection: TaskSelection | null
  /** The agent an empty slot attaches its picked ticket to. */
  agentId: string
}): TicketBadge {
  const openTasksModal = useStore((s) => s.openTasksModal)
  const t = useT()

  if (!ticketId) {
    // EMPTY IS STILL A CONTROL: `/magic:start` normally writes the id, and an agent
    // started by hand — or one whose ticket was decided later — had no way to acquire
    // one short of restarting it. This opens Tasks in picking mode, where a card
    // attaches instead of opening. See `tasksPickAgentId`.
    return {
      children: t('agentInfo.addTicket'),
      icon: TicketPlus,
      quiet: true,
      title: t('agentInfo.addTicketHint'),
      onClick: () => openTasksModal({ selection: null, query: '', pickForAgentId: agentId }),
    }
  }

  const label = t('agentInfo.ticketOpenInTasks')
  const provider = detectTicketProvider(ticketId)

  // NO ICON PASSED: `Label`'s `jira` and `github` tones bring their own mark, which is
  // the same one `TrackerBadge` puts on a Tasks card. Naming the glyph here would be a
  // second copy of that mapping, and the two would disagree the day either moved.
  // `neutral` brings none — an id matching neither tracker is better with no mark than
  // with a wrong one.
  return {
    children: ticketId,
    tone: provider === 'jira' ? 'jira' : provider === 'github' ? 'github' : 'neutral',
    title: label,
    onClick: () => openTasksModal({ selection: taskSelection, query: ticketId }),
  }
}

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
 * THE BADGE ITSELF IS THE BOARD'S. It is a `Label` on the same tone a Tasks card wears
 * — Atlassian's blue at 14% for Jira, our own `ink/5` grey for GitHub — and this badge
 * opens that very card, so it would be strange for it to be a different object. The
 * colour and the mark are the tone's, not this file's, which is the one place that
 * already answers them for every other surface.
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
  className?: string
}) {
  // `agentId` is only read for the EMPTY slot, and this component is the filled one.
  const badge = useTicketBadge({ ticketId, taskSelection, agentId: '' })
  return <Label {...badge} className={className} />
}

/** The same slot with nothing in it, for a caller that draws the badge itself. */
export function TicketIdPlaceholder({
  agentId,
  className = '',
}: {
  /** The agent the picked ticket is attached to. */
  agentId: string
  className?: string
}) {
  const badge = useTicketBadge({ ticketId: undefined, taskSelection: null, agentId })
  return <Label {...badge} className={className} />
}
