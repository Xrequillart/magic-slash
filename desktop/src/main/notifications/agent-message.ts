import { basename } from 'path'
import type { Translate } from '../../i18n'

// ---------------------------------------------------------------------------
// The words an agent-state notification says ("an agent is waiting", "an agent
// has finished").
//
// Its whole job is naming WHICH agent, which is harder than it looks: the name a
// terminal is created with is a counter the renderer generates ("Claude 3", see
// getNextTerminalName / App.tsx), so a notification that interpolated it named
// nothing the person could act on. The ticket id and the title only appear later,
// once a skill has reported them.
//
// Pure, like pr-review-message.ts: a bound `t` plus plain data, so the sentences
// are asserted from a node test.
// ---------------------------------------------------------------------------

export interface AgentSubjectInput {
  /** Ticket id, once a skill has reported one. The identity the person thinks in. */
  ticketId?: string
  /** Human title, also skill-reported ("Refonte du menu"). */
  title?: string
  /** Creation name — usually the generated "Claude N", so never trusted alone. */
  name?: string
  /** Repository paths, in the order the agent touched them. Only the first is used. */
  repositories?: string[]
}

const clean = (value?: string): string | undefined => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

/**
 * How the agent is named inside a notification body.
 *
 * Ordered by how much the name tells somebody who is not looking at the app: the
 * ticket needs no context, a title carries its own, and the generated name gets
 * the repository appended because on its own it is just a number.
 */
export function agentSubject(t: Translate, { ticketId, title, name, repositories }: AgentSubjectInput): string {
  const ticket = clean(ticketId)
  if (ticket) return ticket

  const named = clean(title)
  if (named) return t('notification.agent.subject.named', { name: named })

  const fallback = clean(name)
  if (!fallback) return t('notification.agent.subject.unknown')

  // basename of a path that may or may not have a trailing slash; `repositories`
  // holds absolute paths, and only the first is named — an agent spanning three
  // repositories would otherwise spend the whole body listing them.
  const repo = clean(repositories?.[0])
  const repoName = repo ? basename(repo.replace(/\/+$/, '')) : undefined
  return repoName
    ? t('notification.agent.subject.namedWithRepo', { name: fallback, repo: repoName })
    : t('notification.agent.subject.named', { name: fallback })
}

/** Title and body for an agent reaching `waiting` or `completed`. */
export function agentNotification(
  t: Translate,
  state: 'waiting' | 'completed',
  subjectInput: AgentSubjectInput,
): { title: string; body: string } {
  const subject = agentSubject(t, subjectInput)
  return state === 'waiting'
    ? { title: t('notification.waiting.title'), body: t('notification.waiting.body', { subject }) }
    : { title: t('notification.completed.title'), body: t('notification.completed.body', { subject }) }
}
