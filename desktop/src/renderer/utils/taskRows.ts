import type { RepositoryConfig, TaskIssue, TaskRepoGroup } from '../../types'
import { getProjectColorMap } from './projectColors'

/**
 * One repository's card on the Tasks page: the group the main process read, plus
 * the two things only the renderer can decide — what colour its dot is, and what
 * order its issues are in.
 */
export interface TaskRow extends TaskRepoGroup {
  color: string
}

/**
 * Newest first — most recently OPENED first — on the field the query already
 * sorted by.
 *
 * Sorted again here rather than trusted, because a group is not always one query:
 * the ordering has to survive anything the main process concatenates or retries,
 * and an issue with no `createdAt` must sink rather than jump to the top.
 */
export function sortIssues(issues: TaskIssue[]): TaskIssue[] {
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
): TaskRow[] {
  const colorMap = getProjectColorMap(Object.keys(repositories), repositories)

  const rows: TaskRow[] = groups.map((group) => ({
    ...group,
    color: colorMap[group.configKey],
    issues: sortIssues(group.issues),
  }))

  rows.sort((a, b) =>
    Number(!!b.error) - Number(!!a.error)
    || b.issues.length - a.issues.length
    || a.name.localeCompare(b.name),
  )

  return rows
}

/** How many open issues the page is showing, across every repository that answered. */
export function countOpenIssues(rows: TaskRow[]): number {
  return rows.reduce((total, row) => total + row.issues.length, 0)
}

/**
 * How many open issues those repositories actually HAVE.
 *
 * Different from `countOpenIssues` the moment any repository hit the query's
 * `first: 50` cap. The page shows both, so the header can say "showing 50 of 214"
 * rather than presenting a capped page as the whole backlog.
 *
 * A group with no `totalOpen` — one that failed, or one read before the count was
 * asked for — contributes what it could show, never less.
 */
export function countTotalOpen(rows: TaskRow[]): number {
  return rows.reduce((total, row) => total + (row.totalOpen ?? row.issues.length), 0)
}
