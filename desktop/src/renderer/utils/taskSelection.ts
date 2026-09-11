import type { RepositoryConfig } from '../../types'
import { pathBelongsToRepo, repoBasename } from '../../repoMatch'
import { normalizeTicketId } from './taskAgents'
import { detectTicketProvider } from '../components/agent-info-sidebar/utils'

/**
 * The ticket the page has opened, as the pair that identifies it — DISCRIMINATED BY
 * TRACKER, because the two halves of the Tasks page do not agree on what a ticket's
 * identity is.
 *
 * A GitHub issue is a number, per repository. A Jira ticket is a key, `PROJ-123`,
 * and has no number at all. Folding them into one `{ configKey, id: string }` would
 * make every consumer re-derive which of the two reads to make from the shape of the
 * string — and the detail panel's two IPC channels, two error unions and two `hasAgent`
 * lookups all need the answer stated rather than sniffed.
 *
 * Lives HERE rather than beside the card that produces one, because it is no longer
 * that card's alone: the right sidebar builds one too, from a ticket id and a set of
 * paths (see `resolveTaskSelection`), and a type owned by one of two producers would
 * have made the other import a component module for a type.
 */
export type TaskSelection =
  | { tracker: 'github'; configKey: string; number: number }
  | { tracker: 'jira'; configKey: string; key: string }

/**
 * How specifically a repository claims `agentPath`, as the length of the handle it
 * matched ON — or null when it does not claim it at all.
 *
 * `pathBelongsToRepo` accepts EITHER handle, the config key or the local folder's own
 * basename (a repository registered as `api` whose folder is `poppins-api` matches
 * through the folder), so the two are tried one at a time here rather than together:
 * the length that means anything is the length of the candidate that actually matched.
 * Measuring both would let a repo keyed `magic` whose folder happens to be
 * `…/verylongreponame` claim `…/magic-slash-291` more specifically than `magic-slash`
 * does, on the strength of a name that had nothing to do with the match.
 */
function matchedHandleLength(
  agentPath: string,
  configKey: string,
  repoPath: string | undefined,
): number | null {
  let best: number | null = null
  for (const candidate of [configKey, repoPath ? repoBasename(repoPath) : '']) {
    // Passed as the `name` alone, with no `repoPath`, so each call answers for ONE
    // candidate — which is the whole point of asking twice.
    if (!candidate || !pathBelongsToRepo(agentPath, candidate)) continue
    if (best === null || candidate.length > best) best = candidate.length
  }
  return best
}

/**
 * The configured repository an agent's working directory belongs to, by config key.
 *
 * Resolved PER PATH, in the order the agent carries them: the first path that belongs
 * to any configured repository decides, and the later ones are never consulted. That
 * is `resolveRepoIds`' rule in repoMatch.ts — "Order follows `paths`, so the FIRST
 * path decides which org an agent lands in when it spans several" — and the two answer
 * the same question about the same agent, so they have to agree. Comparing across all
 * paths at once made an agent on `[…/magic-slash-291, …/poppins-website]` open the
 * ticket against `poppins-website`, purely because that name is longer.
 *
 * WITHIN one path the LONGEST match wins, and that is the whole reason this is not a
 * `find`. `pathBelongsToRepo` accepts a worktree suffix — `magic-slash-291` belongs to
 * `magic-slash` — and `slash-291` satisfies that same suffix shape, so a config key
 * `magic` claims `…/magic-slash-291` exactly as `magic-slash` does. With both
 * configured, `Object.entries` order would decide which, i.e. the order the settings
 * happened to be written in. The longer candidate is the more specific one, and it is
 * the one the worktree was actually named after.
 */
function resolveConfigKey(
  repoPaths: string[],
  repositories: Record<string, RepositoryConfig>,
): string | null {
  for (const repoPath of repoPaths) {
    let best: { configKey: string; length: number } | null = null

    for (const [configKey, repo] of Object.entries(repositories)) {
      const length = matchedHandleLength(repoPath, configKey, repo.path || undefined)
      if (length === null) continue
      if (!best || length > best.length) best = { configKey, length }
    }

    if (best) return best.configKey
  }

  return null
}

/**
 * An agent's ticket, as the selection the Tasks page opens on — or null when it
 * cannot be identified.
 *
 * Pure, and in `utils/` with a sibling test, for the reason `taskAgents.ts` is: the
 * suite runs in Node with no jsdom, and the cross-referencing is the part worth
 * locking down. The sidebar's `useMemo` only calls it.
 *
 * The identity is built THROUGH `normalizeTicketId`, never from the raw metadata
 * value, because the Tasks page compares EXACTLY (`issue.key === selected.key`,
 * `issue.number === selected.number`): a Jira key has to arrive upper-cased
 * (`per-5030` → `PER-5030`, and Jira is case-insensitive about keys, so those are one
 * ticket) and a GitHub issue as a NUMBER — `'#291'` or `'291'` would both miss.
 *
 * Null for three genuinely different failures, all of which mean the same thing to
 * the caller — there is no row to open: no ticket at all, an id that matches neither
 * tracker's shape (a hand-typed reference is still a valid ticket id), or paths that
 * belong to no configured repository. The click stays live either way: the page then
 * falls back to the filter, which is why this returns null rather than throwing.
 */
export function resolveTaskSelection(
  ticketId: string | undefined,
  repoPaths: string[],
  repositories: Record<string, RepositoryConfig>,
): TaskSelection | null {
  const configKey = resolveConfigKey(repoPaths, repositories)
  if (!configKey) return null
  return taskSelectionFor(ticketId, configKey)
}

/**
 * The same selection, for a caller that ALREADY KNOWS the repository.
 *
 * The plan detail page is that caller: a plan row carries the cloud `repoId` its spec
 * was uploaded against, and `configKeyForRepoId` turns that into the config key
 * directly — there are no agent working directories to match against, and going through
 * `resolveTaskSelection` would have meant inventing a path just to have it parsed back
 * into the key we started from.
 *
 * The tracker is still read off the ID and never off the caller, which is what lets one
 * plan's tickets mix a Jira epic with GitHub issues without either being mislabelled.
 * Null for an id of neither shape, and for a repository this machine has not configured
 * — a teammate's plan on a repo never cloned here. Both mean the same thing to the
 * caller: the click still works, it just lands on the list rather than on the ticket.
 */
export function taskSelectionFor(
  ticketId: string | undefined,
  configKey: string | undefined,
): TaskSelection | null {
  const id = normalizeTicketId(ticketId)
  if (!id || !configKey) return null

  const tracker = detectTicketProvider(id)
  if (!tracker) return null

  return tracker === 'github'
    ? { tracker: 'github', configKey, number: Number(id) }
    : { tracker: 'jira', configKey, key: id }
}

/**
 * What the sidebar asks the Tasks page to open on: the ticket it could place, and the
 * id to narrow the list by when it could not.
 *
 * Both fields travel together because the page cannot know which of the two it will
 * need until the snapshot lands. A null `selection` with a query is therefore a normal
 * state and not a degenerate one: it is what a ticket the sidebar could not place looks
 * like, and the query is what turns the resulting backlog into "no open ticket matches
 * #412" rather than a full list the reader has to search by hand.
 *
 * Lives here rather than in the store for the same reason `TaskSelection` does: the
 * seeding decisions below are pure, and a type owned by the store would have made them
 * import it back.
 */
export interface TasksTarget {
  selection: TaskSelection | null
  query: string
}

/**
 * The page's two initial values, from the target it was opened with.
 *
 * One function for the pair rather than a reader per field, because the two are one
 * decision: seeding the query without the selection would narrow the list under a
 * ticket that is about to open on its own page, and seeding the selection without the
 * query would drop an unplaceable ticket onto the whole backlog. `null` — the plain
 * ⌘J open — is what "no ticket, no filter" looks like.
 */
export function seedFromTarget(target: TasksTarget | null | undefined): TasksTarget {
  return { selection: target?.selection ?? null, query: target?.query ?? '' }
}

/**
 * Whether the query THIS PAGE seeded should now be dropped, having opened the ticket
 * it was there to find.
 *
 * The comparison against `seeded` is the whole point, and not defensiveness. A ticket
 * that never resolves to a row leaves the seeded query in the box indefinitely — which
 * is correct, it is the fallback — so by the time a selection finally resolves, the
 * text in the box may be something the READER typed after clearing ours. Dropping that
 * would send them back to a backlog they never asked for. Only the query this page
 * wrote for them is this decision's business.
 */
export function shouldClearSeededQuery(seeded: string, current: string, resolved: boolean): boolean {
  return resolved && seeded !== '' && current === seeded
}
