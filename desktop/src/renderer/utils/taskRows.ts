import type { JiraTaskIssue, JiraTaskRepoGroup, RepositoryConfig, TaskRepoGroup } from '../../types'
import { getProjectColorMap } from './projectColors'
import { NO_AGENTS, normalizeTicketId } from './taskAgents'

/**
 * One repository's card on the Tasks page: the group the main process read, plus
 * the three things only the renderer can decide — what colour its dot is, what
 * order its issues are in, and (for a Jira sprint) which of its In Progress tickets
 * somebody is actually on.
 *
 * An intersection rather than an `extends`, because `TaskRepoGroup` is a union: the
 * `color` distributes over both members, so a row narrows on `tracker` exactly as
 * the group it was built from does.
 */
export type TaskRow = TaskRepoGroup & { color: string }

/**
 * Newest first — most recently OPENED first — on the field the query already
 * sorted by.
 *
 * Sorted again here rather than trusted, because a group is not always one query:
 * the ordering has to survive anything the main process concatenates or retries,
 * and an issue with no `createdAt` must sink rather than jump to the top.
 */
export function sortIssues<T extends { createdAt: string }>(issues: T[]): T[] {
  // A plain relational compare, not `localeCompare`: these are ISO-8601 strings,
  // which already sort lexicographically, and a collator is an order of magnitude
  // dearer per comparison for an answer that cannot differ.
  return [...issues].sort((a, b) => {
    const left = a.createdAt || ''
    const right = b.createdAt || ''
    return right < left ? -1 : right > left ? 1 : 0
  })
}

/**
 * The sprint tickets this repository's card actually shows.
 *
 * The main process sends the whole sprint minus what is finished, because only
 * THIS side can apply the rule the ticket asks for: an In Progress ticket appears
 * only when a Magic Slash agent — the reader's own, or a teammate's — is on it. The
 * agent roster is cloud and store state that never crosses the bridge, so the
 * filter cannot live where the read does.
 *
 * The rule is not "hide what nobody is doing". A sprint's In Progress column is
 * everyone's work in flight, and listing all of it on a page whose one affirmative
 * action is "start an agent" would offer to duplicate work already under way. What
 * is left is what the page can honestly propose: the To Do column, plus the tickets
 * an agent is on — those marked as taken.
 */
function visibleIssues(group: JiraTaskRepoGroup, agented: ReadonlySet<string>): JiraTaskIssue[] {
  return group.issues.filter(
    (issue) => issue.statusCategory !== 'indeterminate' || agented.has(normalizeTicketId(issue.key)),
  )
}

/**
 * Build the page's rows from the snapshot's groups and the FULL repository config.
 *
 * The colour map is built from every configured repository, not from the
 * GitHub-tracked subset. `getProjectColorMap` assigns by INDEX, so a map built from
 * the subset would repaint a repo's dot the moment a DIFFERENT repo's tracker
 * changed — a colour that moves on an unrelated edit is not an identity. Stability
 * within this page is the whole claim: the sidebar seeds its own map from the
 * running terminals' project names, so a repo with no explicit `color` can still
 * draw a different colour there, and this comment should not be read as promising
 * otherwise.
 *
 * Order: failed groups first, then the fullest backlog, then alphabetical. A
 * failure is the one thing on this page that asks something of the reader, so it
 * cannot sit at the bottom where an empty repo would put it.
 */
export function buildTaskRows(
  groups: TaskRepoGroup[],
  repositories: Record<string, RepositoryConfig>,
  /**
   * Which ticket ids already have an agent, per repository config key — the index
   * `buildAgentedIssues` produces. Required rather than optional: a caller that
   * forgot it would silently list every In Progress ticket in the sprint, which is
   * the one outcome `visibleIssues` exists to prevent.
   */
  agentedIssues: Record<string, ReadonlySet<string>>,
): TaskRow[] {
  const colorMap = getProjectColorMap(Object.keys(repositories), repositories)

  // One arm per tracker, and they cannot be folded into one: `group` is a union, and
  // TypeScript narrows it — and therefore `sortIssues`' element type — only inside a
  // branch. Folded, the sort would widen to `(TaskIssue | JiraTaskIssue)[]` and fit
  // neither member. Only the issues differ, so only the issues are written twice.
  const rows: TaskRow[] = groups.map((group) => {
    const color = colorMap[group.configKey]
    return group.tracker === 'jira'
      ? { ...group, color, issues: sortIssues(visibleIssues(group, agentedIssues[group.configKey] ?? NO_AGENTS)) }
      : { ...group, color, issues: sortIssues(group.issues) }
  })

  rows.sort((a, b) =>
    Number(!!b.error) - Number(!!a.error)
    || b.issues.length - a.issues.length
    || a.name.localeCompare(b.name),
  )

  return rows
}

/** How many tickets the page is showing, across every repository that answered. */
export function countOpenIssues(rows: TaskRow[]): number {
  return rows.reduce((total, row) => total + row.issues.length, 0)
}

/**
 * How many tickets those repositories actually HAVE.
 *
 * Different from `countOpenIssues` the moment any repository hit the query's
 * `first: 50` cap. The page shows both, so the header can say "showing 50 of 214"
 * rather than presenting a capped page as the whole backlog.
 *
 * A group with no `totalOpen` — one that failed, or one read before the count was
 * asked for — contributes what it could show, never less. EVERY Jira group is in
 * that position and always will be: `/rest/api/3/search/jql` returns no `total` at
 * all (see `JiraTaskRepoGroup`), so a truncated sprint contributes the page it
 * could read. The number is therefore a floor rather than a census, which is the
 * same claim it already made for a failed GitHub group.
 */
export function countTotalOpen(rows: TaskRow[]): number {
  return rows.reduce(
    (total, row) => total + (row.tracker === 'github' ? row.totalOpen ?? row.issues.length : row.issues.length),
    0,
  )
}
