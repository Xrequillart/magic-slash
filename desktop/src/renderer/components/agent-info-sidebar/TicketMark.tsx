import { GithubMark, JiraMark } from '../icons/TrackerIcons'

/**
 * The tracker glyph that sits next to a ticket ID.
 *
 * Renders nothing for an ID that matches neither tracker — a hand-typed reference is
 * still a valid ticket ID here, and a wrong mark next to it would be worse than none.
 *
 * Shared because both cards show a ticket: TicketHeader for an implementation agent,
 * SpecPanel for a planning one once `/magic:plan` has created the ticket.
 */
export function TicketMark({ provider }: { provider: 'github' | 'jira' | null }) {
  if (provider === 'github') return <GithubMark className="w-3.5 h-3.5 flex-shrink-0" />
  if (provider === 'jira') return <JiraMark className="w-3.5 h-3.5 flex-shrink-0" />
  return null
}
