import type { JiraPriorityLevel, JiraTaskIssue, JiraTaskRepoGroup, RepositoryConfig, TaskRepoGroup } from '../../types'
import { getProjectColorMap } from './projectColors'
import { NO_AGENTS, normalizeTicketId } from './taskAgents'

/**
 * One repository's card on the Tasks page: the group the main process read, plus
 * the things only the renderer can decide — what colour its dot is, what order its
 * issues are in, whether it has to name its tracker to be told apart from a twin,
 * and (for a Jira sprint) which of its In Progress tickets somebody is actually on.
 *
 * An intersection rather than an `extends`, because `TaskRepoGroup` is a union: the
 * `color` distributes over both members, so a row narrows on `tracker` exactly as
 * the group it was built from does.
 */
export type TaskRow = TaskRepoGroup & {
  color: string
  /**
   * Whether this card has to name its tracker to be identifiable.
   *
   * True exactly when the same repository contributes a second card — the undecided
   * case, where a GitHub backlog and a Jira sprint both belong to it. Two cards
   * carrying nothing but the repo name would read as a rendering bug; two carrying
   * `ai-agents · GitHub` and `ai-agents · Jira` read as what they are.
   *
   * Off for everybody else, and that is the point: a repository with one tracker has
   * nothing to disambiguate, and stamping every card in the list with a source it
   * shares with all its neighbours is noise the reader has to look past.
   */
  showTracker: boolean
}

/**
 * A row's identity on this page: the repository AND the tracker it was read from.
 *
 * The config key alone stopped being unique when an undecided repository started
 * producing two groups, and every place that keyed on it inherited the same bug —
 * React would pair the wrong card with the wrong state, folding the GitHub card
 * would fold the Jira one, and the detail page's lookup would find whichever card
 * happened to sort first. One function, so the key cannot be spelled two ways.
 */
export function rowKey(row: Pick<TaskRepoGroup, 'tracker' | 'configKey'>): string {
  return `${row.tracker}:${row.configKey}`
}

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

  // How many cards each repository contributes, so a card can tell whether it has a
  // twin to be told apart from. Counted over the GROUPS rather than the config,
  // because that is the set actually on screen: a repo whose Jira read was skipped
  // for want of a project key has one card and needs no label.
  const cardsPerRepo = new Map<string, number>()
  for (const group of groups) cardsPerRepo.set(group.configKey, (cardsPerRepo.get(group.configKey) ?? 0) + 1)

  // One arm per tracker, and they cannot be folded into one: `group` is a union, and
  // TypeScript narrows it — and therefore `sortIssues`' element type — only inside a
  // branch. Folded, the sort would widen to `(TaskIssue | JiraTaskIssue)[]` and fit
  // neither member. Only the issues differ, so only the issues are written twice.
  const rows: TaskRow[] = groups.map((group) => {
    const color = colorMap[group.configKey]
    const showTracker = (cardsPerRepo.get(group.configKey) ?? 0) > 1
    return group.tracker === 'jira'
      ? { ...group, color, showTracker, issues: sortIssues(visibleIssues(group, agentedIssues[group.configKey] ?? NO_AGENTS)) }
      : { ...group, color, showTracker, issues: sortIssues(group.issues) }
  })

  // The tracker is the last tiebreak, and only a tiebreak: two cards of the same
  // repository sort by the rules above like any other pair, so they are adjacent
  // when their error state and backlog size agree and separated when they do not.
  // Deliberate — "failures first, then the fullest backlog" is what this order is
  // for, and grouping by repository would quietly overrule it. The tiebreak exists
  // so that a genuine tie lands the same way on every render instead of following
  // whichever half of the snapshot resolved first.
  rows.sort((a, b) =>
    Number(!!b.error) - Number(!!a.error)
    || b.issues.length - a.issues.length
    || a.name.localeCompare(b.name)
    || a.tracker.localeCompare(b.tracker),
  )

  return rows
}

/**
 * How the tickets inside each card are ordered.
 *
 * `recent` is what the page has always done and is still the default: a backlog is
 * read from the top, and the newest ticket is the one most likely to be news.
 * `priority` is the other question asked of a sprint — what should I pick up — and
 * it is a SORT rather than a filter because the answer is the whole list in a
 * different order, not a subset of it.
 *
 * Only two, deliberately. Every additional key is a menu entry that has to earn the
 * width it takes from the search box beside it.
 */
export type TaskSort = 'recent' | 'priority'

/**
 * What the controls at the top of the page are set to.
 *
 * One object rather than an argument each, so a caller cannot pass them the wrong way
 * round — they are all strings, and the compiler would have nothing to say about it.
 */
export interface TaskFilter {
  /** The repository to keep, by config key. `''` is every repository. */
  configKey: string
  /** What was typed into the search box. `''` is not searching. */
  query: string
  /** The Jira epic to keep, by epic key. `''` is every epic AND every ticket without one. */
  epicKey: string
  /**
   * The order the tickets inside each card are in.
   *
   * Carried in the same object as the three narrowing controls even though
   * `filterTaskRows` has no use for it, because it is one thing the reader has set on
   * one bar: splitting it out would give the page two pieces of state to keep in step
   * and `TaskFilters` two props that are always passed together. `sortTaskRows` is
   * what reads it.
   */
  sort: TaskSort
}

/** Neither control touched — the shape the page starts in, and a stable identity. */
export const NO_FILTER: TaskFilter = { configKey: '', query: '', epicKey: '', sort: 'recent' }

/**
 * A string in the one form the search compares on: case-folded and stripped of
 * accents.
 *
 * The accents are the half worth explaining. Ticket titles here are written in
 * French as often as in English, and a search box that will not find `création`
 * when you type `creation` is a search box people stop using — the more so on a
 * keyboard where the accented character is the harder one to reach. NFD splits an
 * accented letter into its base and a combining mark, and the range below is
 * exactly those marks, so `é` folds onto `e` and nothing else is touched.
 *
 * `toLowerCase` and not `toLocaleLowerCase`: the query and the title are folded by
 * the SAME function and only ever compared with each other, so a locale-specific
 * casing rule could only make the two disagree in a language nobody is searching in.
 */
function fold(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

/**
 * A ticket's identity as the search sees it — `#234` for a GitHub issue, `PROJ-123`
 * for a Jira one.
 *
 * The `#` is KEPT rather than stripped, and that is what makes both spellings work
 * against one `includes`: `#234` contains `234`, so typing either finds the issue.
 * Stripping it would refuse the one people copy out of GitHub.
 */
function issueId(issue: TaskRow['issues'][number]): string {
  return 'key' in issue ? issue.key : `#${issue.number}`
}

/**
 * Whether one ticket answers the search.
 *
 * SUBSTRING, on the id and on the title, and deliberately loose on both. This is a
 * filter box over a list already on screen, not a query language: every result is
 * visible and dismissible at a glance, so the expensive mistake is refusing the
 * ticket somebody is looking at — not offering one extra. Typing `23` therefore
 * surfaces `#234` as well as `#1023`, and the reader picks.
 */
function matches(issue: TaskRow['issues'][number], query: string): boolean {
  return fold(issueId(issue)).includes(query) || fold(issue.title).includes(query)
}

/**
 * The rows the two controls leave on screen.
 *
 * A function rather than two `.filter()`s in the page, for `buildTaskRows`' reason:
 * the suite runs in Node with no jsdom, so logic left in a `useMemo` is logic no
 * test can reach — and the rules below are the kind that are quietly wrong.
 *
 * THE REPOSITORY FILTER keeps a repo's cards, plural. An undecided repository has a
 * GitHub card and a Jira card (see `readsFrom` in `tracker.ts`), and picking that
 * repository means both of them: the control names a repository, not a backlog.
 *
 * A ROW THAT FAILED IS NEVER SEARCHED AWAY. It has no issues to match — its read did
 * not come back — so dropping it would be the page asserting there is no `foo` in a
 * repository it could not read at all. The card stays and goes on saying it could
 * not be read, which is the only true thing available. Every other row with nothing
 * left in it goes.
 *
 * THE EPIC FILTER IS JIRA-ONLY AND SAYS SO BY EMPTYING THE GITHUB CARDS. An epic is
 * a Jira relationship with no GitHub counterpart — an issue's `parent` is another
 * issue, not a container — so a GitHub card has nothing that can match, and the same
 * "no issues left" rule that drops an unmatched Jira card drops it. That is the
 * honest answer rather than a special case: picking an epic is asking to see one
 * epic's work, and none of it is on GitHub.
 */
export function filterTaskRows(rows: TaskRow[], filter: TaskFilter): TaskRow[] {
  const query = fold(filter.query.trim())
  if (!filter.configKey && !query && !filter.epicKey) return rows

  const kept: TaskRow[] = []
  for (const row of rows) {
    if (filter.configKey && row.configKey !== filter.configKey) continue
    if (!query && !filter.epicKey) {
      kept.push(row)
      continue
    }
    if (row.error) {
      // Kept as it is, issues and all: a failed row has none, and narrowing an empty
      // list would only be ceremony.
      kept.push(row)
      continue
    }
    // One arm per tracker for `buildTaskRows`' reason, and the whole of the narrowing
    // has to happen INSIDE each arm: hoisting the filtered array out widens it to
    // `TaskIssue[] | JiraTaskIssue[]`, which fits neither member of the row union.
    if (row.tracker === 'jira') {
      const issues = row.issues.filter(
        (issue) => (!query || matches(issue, query)) && (!filter.epicKey || issue.epic?.key === filter.epicKey),
      )
      if (issues.length > 0) kept.push({ ...row, issues })
    } else {
      // No `epic` to compare against on this half, so an epic filter empties the card
      // outright — see the note above. Written as an early `continue` rather than a
      // predicate that is always false, which would read as an oversight.
      if (filter.epicKey) continue
      const issues = row.issues.filter((issue) => matches(issue, query))
      if (issues.length > 0) kept.push({ ...row, issues })
    }
  }
  return kept
}

/**
 * Jira's priority scale as a sort key: 0 is the most urgent thing on the page.
 *
 * `unknown` sits below the five named steps rather than in the middle of them. It is
 * the tier a site's own scheme lands in when this app cannot place it (see
 * `JiraPriorityLevel`), and sorting an unplaceable priority above a `low` would be
 * the page asserting an order it has just admitted it does not know.
 */
const PRIORITY_RANK: Record<JiraPriorityLevel, number> = {
  highest: 0,
  high: 1,
  medium: 2,
  low: 3,
  lowest: 4,
  unknown: 5,
}

/**
 * Where a ticket sits in that order, with NO PRIORITY AT ALL last.
 *
 * 6 — one past `unknown` — and that is the point: a project with the priority field
 * switched off has tickets with no priority rather than tickets that are unimportant,
 * and the only honest place for them is after everything that does have one, where
 * their own relative order is still the date order they arrived in.
 */
function priorityRank(issue: JiraTaskIssue): number {
  return issue.priority ? PRIORITY_RANK[issue.priority.level] : 6
}

/**
 * The rows again, with each card's tickets in the order the sort control asks for.
 *
 * A SEPARATE PASS from `filterTaskRows`, and applied after it, because the two answer
 * different questions — which tickets, and in what order — and folding them together
 * would put a comparator inside a loop that already short-circuits on an untouched
 * filter. Kept out of the page for `filterTaskRows`' reason: the suite runs in Node
 * with no jsdom, so a comparator left in a `useMemo` is a comparator no test reaches.
 *
 * `recent` returns the rows UNTOUCHED rather than re-sorting them into the order they
 * are already in: `buildTaskRows` sorted every card by date on the way in, so this is
 * both the identity and the cheap path.
 *
 * A GITHUB CARD IS NEVER REORDERED. A GitHub issue has no priority — labels are the
 * nearest thing and they are a set, not a scale — so ranking one would mean inventing
 * a scheme out of label names. Its card keeps its date order, which is what the
 * control's other setting means anyway, and a mixed page therefore changes only where
 * there is something to change.
 */
export function sortTaskRows(rows: TaskRow[], sort: TaskSort): TaskRow[] {
  if (sort === 'recent') return rows
  return rows.map((row) => {
    if (row.tracker !== 'jira' || row.issues.length < 2) return row
    // The date order is the TIEBREAK, not a second sort: the array arrives sorted
    // newest-first, and `Array.prototype.sort` is stable in every engine this ships
    // on — so two tickets of one priority stay in the order the card already had.
    const issues = [...row.issues].sort((a, b) => priorityRank(a) - priorityRank(b))
    return { ...row, issues }
  })
}

/**
 * The repositories the control can offer, in the order the cards are in.
 *
 * Built from the ROWS and not from the config: the control filters what is on
 * screen, and offering a repository whose card is not there — one tracked nowhere,
 * or whose group never arrived — is an entry that can only ever empty the page.
 *
 * Deduplicated, because an undecided repository contributes two rows and is still
 * one repository to choose.
 */
export function taskFilterRepos(rows: TaskRow[]): { configKey: string; name: string; color: string }[] {
  const seen = new Set<string>()
  const repos: { configKey: string; name: string; color: string }[] = []
  for (const row of rows) {
    if (seen.has(row.configKey)) continue
    seen.add(row.configKey)
    repos.push({ configKey: row.configKey, name: row.name, color: row.color })
  }
  return repos
}

/**
 * The epics the control can offer, in the order the cards are in.
 *
 * `taskFilterRepos`' twin one relationship down, and built from the ROWS for its
 * reason: the control filters what is on screen, so an epic that no visible ticket
 * hangs off is an entry that can only ever empty the page. That is also what keeps
 * the list short — a project has hundreds of epics and a sprint touches four.
 *
 * Deduplicated by KEY and not by title. Two epics can legitimately share a summary
 * ("Intercom" appears twice in a long-lived project, one per year), and folding them
 * onto one entry would silently filter to whichever was seen first.
 *
 * The FIRST spelling of an epic wins where two rows disagree — the colour arrives
 * from a per-card read (see `colourEpics`), so a card whose colour lookup failed
 * would otherwise be able to strip the dot off an epic another card coloured in.
 */
export function taskFilterEpics(rows: TaskRow[]): { key: string; title: string; color?: string }[] {
  const seen = new Set<string>()
  const epics: { key: string; title: string; color?: string }[] = []
  for (const row of rows) {
    if (row.tracker !== 'jira') continue
    for (const issue of row.issues) {
      const epic = issue.epic
      if (!epic || seen.has(epic.key)) continue
      seen.add(epic.key)
      epics.push({ key: epic.key, title: epic.title, ...(epic.color ? { color: epic.color } : {}) })
    }
  }
  // By title rather than by key: the control is read as a list of names, and `PER-42`
  // sorting before `PER-4269` is an order about ids that nobody is looking at.
  return epics.sort((a, b) => a.title.localeCompare(b.title))
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
