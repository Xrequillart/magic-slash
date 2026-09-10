import { useStore } from '../../store'
import { TicketMark } from './TicketMark'
import { detectTicketProvider } from './utils'
import type { TaskSelection } from '../../utils/taskSelection'
import { useT } from '../../i18n'

/**
 * An agent's ticket id, as the TWO click targets it carries.
 *
 * The glyph opens the ticket in the browser — what the whole block used to do — and
 * the id text opens it in the Tasks modal, which is where this app can already render
 * the body, the labels, the state and the "start an agent" action. Splitting them is
 * what adds the second without spending the first: `TicketMark` was already there and
 * already reads as an affordance.
 *
 * Two SIBLING buttons, never nested — a button inside a button is invalid HTML and
 * browsers recover from it by dropping one of the two. The glyph carries no text, so
 * it needs an `aria-label` and not only a `title`.
 *
 * Shared because both cards show a ticket, and for the reason `TicketMark` is:
 * TicketHeader for an implementation agent, SpecPanel for a planning one once
 * `/magic:plan` has created the ticket. The click would otherwise work or not
 * depending on the kind of agent, which is an inconsistency the reader cannot predict.
 *
 * The two things it cannot work out for itself are resolved by `AgentInfoSidebar`,
 * which is the one place that has the config and the agent's paths. The tracker is
 * NOT one of them: it is a function of the id alone, so it is derived here rather
 * than threaded down through both cards as a prop neither of them reads.
 */
export function TicketIdLink({
  ticketId,
  ticketLink,
  taskSelection,
  className = '',
}: {
  ticketId: string
  /** The tracker URL, or null when no base URL is configured for it. */
  ticketLink: string | null
  /**
   * The row Tasks should open on, or null when the ticket could not be placed — a
   * closed issue, an untracked repository, an id typed by hand. NULL IS NOT A DEAD
   * CLICK: the modal then opens on the list narrowed to this id, which says "no open
   * ticket matches" on its own rather than leaving the reader on a generic backlog.
   */
  taskSelection: TaskSelection | null
  /** The wrapper's gap, which differs per card. */
  className?: string
}) {
  const openTasksModal = useStore((s) => s.openTasksModal)
  const t = useT()

  const ticketProvider = detectTicketProvider(ticketId)
  const mark = <TicketMark provider={ticketProvider} />

  return (
    <div className={`flex items-center ${className}`}>
      {/* The mark hangs off the ticket ID, not off the link: it says which tracker the
          ID belongs to, which is worth showing even when no URL could be built for it.
          Only a LINKED and RECOGNISED ticket gets a button around it — `TicketMark`
          renders nothing for an unrecognised provider, so wrapping it unconditionally
          would ship an empty clickable element offering a browser target that does not
          exist. */}
      {ticketLink && ticketProvider ? (
        <button
          onClick={() => window.electronAPI.shell.openExternal(ticketLink)}
          title={t('agentInfo.ticketOpenInBrowser')}
          aria-label={t('agentInfo.ticketOpenInBrowser')}
          className="flex items-center cursor-pointer bg-transparent border-none p-0"
        >
          {mark}
        </button>
      ) : (
        mark
      )}
      {/* `group-hover:underline` sits on the label alone so the underline stops at the
          text — and the `group` is on this button rather than on the wrapper, so
          hovering the glyph no longer underlines an id it does not act on. */}
      <button
        onClick={() => openTasksModal({ selection: taskSelection, query: ticketId })}
        title={t('agentInfo.ticketOpenInTasks')}
        className="group text-ink text-xs font-semibold cursor-pointer bg-transparent border-none p-0"
      >
        <span className="group-hover:underline">{ticketId}</span>
      </button>
    </div>
  )
}
