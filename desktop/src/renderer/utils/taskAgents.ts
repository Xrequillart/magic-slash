import type { OrgAgent, RepositoryConfig, TerminalInfo } from '../../types'
import { pathBelongsToRepo } from '../../repoMatch'
import { isAgentTerminal } from './agentTerminals'

/**
 * Which issues on the Tasks page already have an agent against them.
 *
 * Two sources, unioned, because either one alone answers the question for only
 * half the users: `useOrgAgents()` is cloud+org scoped and returns `[]` for
 * anybody who has no organization, and the local terminals only know about
 * agents running on THIS machine right now. A person working alone would never
 * see the marker without the second; a teammate's agent would never show without
 * the first.
 *
 * Pure, and in `utils/` with a sibling test, for the reason `taskRows.ts` is:
 * the suite runs in Node with no jsdom, so the logic a component would otherwise
 * bury in a `useMemo` is the only part that can be locked down.
 */

/**
 * The minimum an agent has to expose to be cross-referenced with an issue.
 *
 * Structural rather than `OrgAgent`, because a local terminal is one of these too
 * — it simply never has `repositoryIds`. Anything that satisfies this shape can be
 * fed in, and `OrgAgent` already does.
 */
export interface TaskAgentRef {
  ticketId?: string
  repositories: string[]
  repositoryIds?: string[]
}

/**
 * The one empty set every agent-free repository is given. See `buildAgentedIssues`.
 *
 * Exported because `taskRows.ts` needs the SAME instance for its own fallback: two
 * empty sets would be equal in content and different in identity, which is the one
 * property this constant exists for.
 */
export const NO_AGENTS: ReadonlySet<string> = new Set<string>()

/**
 * A Jira issue key — `PROJ-123` — in any casing anyone might have typed it in.
 *
 * The project part is a letter followed by letters, digits or underscores, which is
 * what Jira itself accepts: `SUP2`, `AB_CD` and `X1` are all real project keys. A
 * letters-only pattern reads as the common case and silently fails on the rest —
 * the id would skip the upper-casing below, so an agent stored as `sup2-14` would
 * never fold onto the `SUP2-14` the sprint query returns, and the row would show no
 * agent against work somebody is visibly doing.
 */
const JIRA_KEY = /^[a-z][a-z0-9_]*-\d+$/i

/**
 * A ticket id in the one form this page compares on.
 *
 * `/magic:start` writes `agents.ticket_id` as `"234"` for a GitHub issue, and the
 * display code is what adds the `#`. A hand-typed `#234` is a real thing to find
 * in that column though, so both fold to the same key rather than silently
 * failing to match.
 *
 * A JIRA-SHAPED key is upper-cased on top of that, and nothing else is. Jira
 * itself is case-insensitive about keys — `per-1234` browses to `PER-1234` — so
 * the two spellings are one ticket and have to fold together, or a sprint row
 * would show no agent against work somebody is visibly doing. The rule is
 * deliberately narrow: upper-casing every id would turn a GitHub branch name or
 * some other free-text value into a different string for no reason, and this
 * function's whole job is to invent no equivalences it cannot justify.
 */
export function normalizeTicketId(id?: string): string {
  if (!id) return ''
  const bare = id.trim().replace(/^#/, '').trim()
  return JIRA_KEY.test(bare) ? bare.toUpperCase() : bare
}

/**
 * Local agents in the shape the cross-reference reads.
 *
 * No `repositoryIds`: a terminal carries paths on this machine and nothing else,
 * which is exactly the case `pathBelongsToRepo` exists for.
 *
 * `isAgentTerminal` because the store's list is not all agents — the sidebar's own
 * terminal and the script runner's live in it under reserved id prefixes. Neither
 * carries a `ticketId` today, so dropping them changes nothing on screen; it is the
 * codebase's existing answer to the question, stated rather than relied on.
 */
export function terminalAgentRefs(terminals: TerminalInfo[]): TaskAgentRef[] {
  return terminals
    .filter((terminal) => isAgentTerminal(terminal.id))
    .map((terminal) => ({
      ticketId: terminal.metadata?.ticketId,
      repositories: terminal.repositories ?? [],
    }))
}

/**
 * Whether this agent is working in the repository this row is about.
 *
 * `repositoryIds` decides ALONE when it is there: it is the portable link
 * (`agent_repositories` → `repositories.id`), it is what a teammate's agent can be
 * trusted on, and it is the only thing that separates issue 12 of one repository
 * from issue 12 of another. An agent that carries ids and none of them is this
 * repo's is a NO, never a reason to fall back to paths — the fallback would undo
 * the very discrimination the ids just made.
 *
 * Paths are the fallback for an agent with no ids: a local terminal, or an org row
 * delivered by realtime before its links were loaded. `pathBelongsToRepo` rather
 * than a basename compare, because `/magic:start` replaces an agent's repositories
 * with its WORKTREE (`…/magic-slash-234`), and only that helper knows the ticket
 * suffix belongs to `magic-slash`.
 *
 * `repoRows.ts`'s `belongs` is this same rule, written for the Team page. The two
 * want one home next to `pathBelongsToRepo` in `repoMatch.ts`; until they get it,
 * a change to the ids-beat-paths precedence has to be made in both.
 */
function agentIsOnRepo(agent: TaskAgentRef, configKey: string, repo?: RepositoryConfig): boolean {
  if (agent.repositoryIds && agent.repositoryIds.length > 0) {
    return !!repo?.id && agent.repositoryIds.includes(repo.id)
  }
  return agent.repositories.some((path) => pathBelongsToRepo(path, configKey, repo?.path))
}

/**
 * The normalized ticket ids that have an agent on them, per repository config key.
 *
 * A map rather than a predicate so the whole page costs one pass over the agents:
 * the rows are memoised, and a function called once per issue would walk every
 * agent again for each of up to fifty issues per repository.
 *
 * An agent with no `ticketId` contributes nothing — it is an agent on the
 * repository, not on any issue of it — so those are dropped ONCE, before the key
 * loop, rather than re-tested and re-normalized for every repository.
 *
 * Repositories with no agent on them all share `NO_AGENTS`. Every asked-for key
 * gets an entry either way, but a fresh empty `Set` per key per rebuild would give
 * every memoised card a new prop identity on every rebuild — and "no agent here"
 * is the common case, so that is most of the page.
 */
export function buildAgentedIssues(
  configKeys: string[],
  repositories: Record<string, RepositoryConfig>,
  agents: TaskAgentRef[],
): Record<string, ReadonlySet<string>> {
  const ticketed = agents
    .map((agent) => ({ agent, ticketId: normalizeTicketId(agent.ticketId) }))
    .filter((candidate) => candidate.ticketId !== '')

  const index: Record<string, ReadonlySet<string>> = {}

  for (const configKey of configKeys) {
    const repo = repositories[configKey]
    const found = new Set<string>()
    for (const { agent, ticketId } of ticketed) {
      if (agentIsOnRepo(agent, configKey, repo)) found.add(ticketId)
    }
    index[configKey] = found.size > 0 ? found : NO_AGENTS
  }

  return index
}

/**
 * A string that changes exactly when what `terminalAgentRefs` would return changes.
 *
 * The store rewrites its `terminals` array on every pty tick, so subscribing a
 * component to the array subscribes it to keystrokes. This is the same information
 * as an `Object.is`-comparable value: the page can subscribe to it and read the
 * terminals themselves non-reactively, so the index downstream is rebuilt when an
 * agent picks up or drops a ticket rather than several times a second.
 */
export function terminalAgentSignature(terminals: TerminalInfo[]): string {
  return terminalAgentRefs(terminals)
    .map((ref) => `${ref.ticketId ?? ''}\u0000${ref.repositories.join('\u0001')}`)
    .join('\u0002')
}

/**
 * The org roster and the local terminals as one list.
 *
 * Not deduplicated: this feeds a set of ticket ids, so an agent that appears in
 * both — the common case, one's own running agent — adds the same key twice and
 * costs nothing. Matching them up would mean guessing which local terminal is
 * which cloud row, and getting that wrong is worse than a redundant `Set.add`.
 */
export function taskAgentRefs(orgAgents: OrgAgent[], terminals: TerminalInfo[]): TaskAgentRef[] {
  return [...orgAgents, ...terminalAgentRefs(terminals)]
}
