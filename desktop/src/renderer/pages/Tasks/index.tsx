import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Github, ListTodo, RefreshCw, SearchX } from 'lucide-react'
import type { RepositoryConfig } from '../../../types'
import { useConfig } from '../../hooks/useConfig'
import { useOrgAgents } from '../../hooks/useOrgAgents'
import { useTasks } from '../../hooks/useTasks'
import { useStore } from '../../store'
import {
  buildTaskRows,
  countOpenIssues,
  countTotalOpen,
  filterTaskRows,
  NO_FILTER,
  sortTaskRows,
  taskFilterEpics,
  taskFilterRepos,
} from '../../utils/taskRows'
import { buildBoard, countBoard } from '../../utils/taskBoard'
import { buildAgentedIssues, normalizeTicketId, taskAgentRefs, terminalAgentSignature } from '../../utils/taskAgents'
import type { TaskSelection } from '../../utils/taskSelection'
import { seedFromTarget, shouldClearSeededQuery } from '../../utils/taskSelection'
import { readsFrom } from '../../../tracker'
import { useT, type MessageKey } from '../../i18n'
import { WaveLoader } from '../../components/WaveLoader'
import { SweepPane } from '../../components/SweepPane'
import { GitHubNotConnected } from './GitHubNotConnected'
import { TaskDetailPage } from './TaskDetailPage'
import { TaskBoard } from './TaskBoard'
import { openCountLabel, sprintCountLabel } from './parts'
import { TaskFilters, type TaskFilterValue } from './TaskFilters'

/**
 * The two views this page swaps between, ranked. `SweepPane` reads the sign of
 * the gap to pick which way the pages travel: opening an issue sweeps in from
 * the right, going back sweeps out to the right.
 */
function pagePosition(pageKey: string): number {
  return pageKey === 'list' ? 0 : 1
}

/**
 * Every switch here is a sub-page being opened or closed, never a move along a
 * rail — so all of them travel sideways. Declared at module scope because
 * `SweepPane` reads it during render and a fresh closure per render would be a
 * new prop identity every time.
 */
function alwaysSideways(): boolean {
  return true
}

/**
 * The Tasks page — ONE repository's work, as a board of four columns.
 *
 * Structurally `pages/Dashboard/index.tsx`: the same full-screen shell inside a
 * PageModal, whose title and chrome the modal renders. What it draws is the tickets of
 * the repository named in the picker at the top — its open GitHub issues, its Jira
 * sprint, or both when the repository is tracked in both — dealt into Blocked, Backlog,
 * In progress and Done by `buildBoard`.
 *
 * IT USED TO BE A LIST OF EVERY REPOSITORY AT ONCE, one collapsible card each, and the
 * two changes that followed from becoming a board are worth naming because most of the
 * code below is still shaped by the list:
 *
 *  • ONE REPOSITORY AT A TIME. Four columns holding six repositories' tickets are four
 *    columns nobody can read down. The picker is therefore not a filter with an "all"
 *    state but the page's subject, and it is remembered on the ACCOUNT rather than in
 *    page state — see `Config.tasksRepo` and `repoKey` below. The app keeps no config
 *    file, so the cloud is the only place a picked repository survives being killed.
 *
 *  • EVERY TICKET, including the ones a teammate is already on. The list showed a
 *    sprint's In Progress column only where an agent was attached, because its one
 *    affirmative action was "start an agent" and offering to duplicate work in flight
 *    would have been wrong. A board has a column for work in flight, so showing it is
 *    the point; what the card carries instead is the agent marker. The rule that did
 *    the hiding is gone from `buildTaskRows`.
 *
 * ROWS ARE STILL THE INTERMEDIATE FORM, and still one per TRACKER TARGET rather than
 * per repository: a repo the ladder leaves at `ask` has both trackers configured and
 * contributes a row for each, and two services planned in one Jira project share a
 * single row that names both (see `TaskRow.repos`). The board deals every row's tickets
 * into the same four columns, so a repository tracked in both places gets one board with
 * each card carrying its own tracker's mark.
 *
 * The read happens in the main process (`tasks:listOpenIssues`) and arrives over IPC:
 * nothing here touches the network, and neither the GitHub token nor the Atlassian
 * credential ever crosses the bridge.
 */
export function TasksPage() {
  const { snapshot, loading, reload } = useTasks()
  const { config, updateTasksRepo } = useConfig()
  // Mounting this here fires an `org:listAgents` IPC every time the modal opens.
  // Deliberate, and affordable: it is the only way to know a TEAMMATE has an agent
  // on an issue, the roster is small, and the only other consumer (Team →
  // RepoSection) never co-mounts with this page. (The org realtime subscription is
  // opened once at startup and is not this page's to pay for.)
  const { agents } = useOrgAgents()
  // The other half of the same question, and the half that answers it for someone
  // with no organization at all: the agents running on THIS machine right now.
  //
  // Subscribed to a SIGNATURE, not to the array. `terminals` is rewritten on every
  // pty tick — `updateTerminalState`, `updateTerminalMetadata` and
  // `updateTerminalRepositories` all `.map()` it, and the statusLine writes
  // metadata at a high rate — while the two fields this page reads change only when
  // an agent actually picks up or drops a ticket. A string collapses that into an
  // `Object.is` the store can compare, so the index below is rebuilt when the
  // ANSWER changes rather than several times a second.
  const terminalsKey = useStore((s) => terminalAgentSignature(s.terminals))
  /**
   * The ticket this page was opened ON, when it was opened from somewhere else — the
   * ticket id in the right sidebar. Null whenever the modal was opened by hand.
   *
   * Read here and consumed ONCE below, the same one-shot deep link `Config` takes for
   * `settingsInitialTab`: the field is cleared as soon as it has been applied, so ⌘J
   * afterwards gives the plain backlog rather than replaying the last ticket clicked.
   */
  const tasksInitialTarget = useStore((s) => s.tasksInitialTarget)
  const setTasksInitialTarget = useStore((s) => s.setTasksInitialTarget)
  const t = useT()

  /**
   * What the controls at the top are set to. See `TaskFilters`.
   *
   * Page state and not config: a filter is what you are doing right now, not how you
   * like the page — and the modal unmounts this page when it closes, so a board narrowed
   * to one search term never greets you narrowed the next time you open it. The
   * REPOSITORY is the exception and is not held here at all; see `repoKey` below.
   *
   * Seeded from the target's query when the page was opened on a ticket, so a ticket
   * that has no card here — closed, untracked repository, an id typed by hand — lands on
   * a board narrowed to it and an empty state that says so, rather than on a full board
   * the reader has to search by hand for the ticket they just clicked.
   */
  const seed = seedFromTarget(tasksInitialTarget)

  const [filter, setFilter] = useState<TaskFilterValue>({ ...NO_FILTER, query: seed.query })

  /**
   * The repository the reader has picked SINCE THE PAGE OPENED, and null while they
   * have not.
   *
   * Null is not "no repository": it is "this page has not been told, so fall back" —
   * which `repo` below resolves against the saved choice and then against the first
   * repository on offer. Three states rather than two, and the third is what lets a
   * saved repository that has since been deleted resolve to something without the page
   * having to detect it.
   *
   * Seeded from the deep-link target, so a ticket clicked in the agent sidebar opens on
   * the board of ITS repository whatever the saved one is. Deliberately NOT persisted:
   * following a link is navigation, not a choice about where you usually work, and
   * writing it would quietly move the board every time somebody clicked a ticket.
   */
  const [repoKey, setRepoKey] = useState<string | null>(seed.selection?.configKey ?? null)

  /**
   * The selected ticket as a (repository, identity) PAIR, not as the ticket object.
   *
   * Issue numbers and Jira keys are both per repository, so the config key is half
   * the identity either way; the other half is what `TaskSelection` is discriminated
   * on. Holding the pair rather than the object also means a reload re-derives what
   * the detail page shows from the fresh snapshot — and a ticket that has left the
   * list in the meantime sends the page back to it instead of leaving a stale copy
   * open.
   *
   * Null is the list; anything else is that ticket's page. One piece of state for
   * both, so the two views cannot both believe they are on screen.
   *
   * Seeded from the target the page was opened with, in the INITIALISER rather than in
   * an effect, and that is the point: `useTasks` returns `snapshot: null, loading:
   * true` on the first render and the page early-returns a loader, so an effect would
   * not have run yet by the time the snapshot lands. Held as the pair it is, the
   * identity simply waits here until `selection` below can resolve it against the
   * rows — which is also what makes an unresolvable ticket fall back to the filter on
   * its own instead of needing to be detected.
   */
  const [selected, setSelected] = useState<TaskSelection | null>(seed.selection)

  /**
   * The target is consumed exactly once, the way `Config` consumes `settingsInitialTab`.
   * Both pieces of state above are already seeded from it, so all that is left is to
   * put the store back — otherwise the next ⌘J would reopen this page on the ticket
   * somebody clicked in the sidebar an hour ago rather than on their backlog.
   */
  useEffect(() => {
    if (tasksInitialTarget) setTasksInitialTarget(null)
  }, [tasksInitialTarget, setTasksInitialTarget])

  /**
   * The query this page put in the box ITSELF, kept so the effect under `selection` —
   * its only other reader — can tell it apart from anything the reader typed. Empty
   * string when the page was not opened on a ticket, or on one with no query.
   *
   * The seeded STRING rather than a "still to be cleared" flag, because the flag could
   * not tell the two apart: a ticket that never resolves to a row leaves it un-flipped
   * indefinitely, and the reader who then clears the box, searches for something else
   * and opens a ticket by hand would have had their own query wiped. Coming back to a
   * list they narrowed themselves is the correct behaviour, and only the query this
   * page wrote for them is that effect's business.
   */
  const seededQuery = useRef(seed.query)

  /**
   * The one scrolling element of the page, and the offset the backlog was left at.
   *
   * The list and the issue are two pages sharing this pane (see `SweepPane`
   * below), so the pane survives the switch and would otherwise hand the issue
   * the offset the list was scrolled to. Opening one therefore scrolls to the
   * top, and coming back restores what `select` saved — the detail used to be a
   * column beside a list that was never unmounted, and keeping the backlog
   * exactly where it was left is the part of that worth carrying over.
   */
  const paneRef = useRef<HTMLDivElement>(null)
  const listOffsetRef = useRef(0)

  /**
   * Which tickets already have an agent, per repository, built once for the page.
   *
   * A map rather than a predicate called per row: the alternative walks the whole
   * roster again for each of up to fifty tickets per repository.
   *
   * Built from the SNAPSHOT's keys, not from the rows — the inversion this page used
   * to have the other way up. The rows now need this index to build (a Jira sprint's
   * In Progress column is filtered on it), so deriving it from them would be a
   * cycle. The snapshot's group keys are the same set either way: `buildTaskRows`
   * reorders groups and drops issues, never groups.
   */
  const agentedIssues = useMemo(
    () => buildAgentedIssues(
      // DEDUPLICATED, because an undecided repository contributes two groups and this
      // index is keyed by repository, not by card: the two share one answer to "which
      // of this repo's tickets has an agent", and asking twice would walk the whole
      // roster a second time for a `Set` that must come out identical.
      [...new Set((snapshot?.groups ?? []).map((group) => group.configKey))],
      config?.repositories ?? {},
      // Read non-reactively: `terminalsKey` above is this page's subscription to
      // the terminals, and it is in the dependency list in this read's stead.
      taskAgentRefs(agents, useStore.getState().terminals),
    ),
    [snapshot?.groups, config?.repositories, agents, terminalsKey],
  )

  /**
   * Every row the read produced, before either control has had a say.
   *
   * Kept apart from `rows` below because three things need the UNFILTERED set: the
   * repository picker's own list of options, the "nothing matched" state (which has
   * to know there WAS something to match), and the counter's "of N" form.
   */
  const allRows = useMemo(
    () => buildTaskRows(snapshot?.groups ?? [], config?.repositories ?? {}, agentedIssues),
    [snapshot?.groups, config?.repositories, agentedIssues],
  )

  const filterRepos = useMemo(() => taskFilterRepos(allRows), [allRows])

  /**
   * The repository the board is actually showing, resolved from three places in order
   * of how much they know about what the reader wants.
   *
   * 1. What they have PICKED since the page opened, or the ticket they arrived on.
   * 2. What they LEFT IT ON, read back off the account (`Config.tasksRepo`). This is
   *    the whole point of storing it in the cloud: the app keeps no config file, so
   *    without this the picker would have to be re-picked after every quit.
   * 3. The FIRST repository on offer, for an account that has never picked one — and
   *    for one whose saved repository has since been deleted, renamed or stopped being
   *    tracked. That fallback is why the saved value needs no validation on the way in
   *    (see `updateTasksRepo`): a key that no longer names anything simply fails to
   *    match here.
   *
   * `''` only when there is nothing to offer at all, which is the empty-state path
   * below rather than a board with no repository in it.
   */
  const repo = useMemo(() => {
    const offered = filterRepos.map((entry) => entry.configKey)
    if (repoKey && offered.includes(repoKey)) return repoKey
    // Skipped once the reader has picked: their choice outranks the saved one even
    // while the write of it is still in flight.
    if (!repoKey && config?.tasksRepo && offered.includes(config.tasksRepo)) return config.tasksRepo
    return offered[0] ?? ''
  }, [repoKey, config?.tasksRepo, filterRepos])

  /**
   * What the controls are set to, with the resolved repository in it.
   *
   * Assembled here rather than held in `filter`, because the repository is the one
   * control whose value the page can work out for itself — and a `useState` seeded from
   * a config that arrives asynchronously would have to be corrected by an effect, which
   * is a render with the wrong board on screen.
   */
  const filterValue: TaskFilterValue = useMemo(() => ({ ...filter, configKey: repo }), [filter, repo])

  /** The rows of the picked repository, before the search and the epic have had a say. */
  const repoRows = useMemo(
    () => (repo ? filterTaskRows(allRows, { ...NO_FILTER, configKey: repo }) : []),
    [allRows, repo],
  )

  /**
   * The epics the picker can offer, off THIS REPOSITORY's rows before the search
   * narrows them — an option list that shrinks as you use it takes away the entry you
   * meant to switch to, and one drawn from every repository would offer epics the board
   * cannot show. An empty array hides the control entirely; see `TaskFilters`.
   */
  const filterEpics = useMemo(() => taskFilterEpics(repoRows), [repoRows])

  /**
   * The name of the sprint the board is showing, for the chip beside the repository
   * picker. `undefined` for a GitHub-only repository, and for a Jira one whose read
   * could not name its sprint — `TaskFilters` then draws no chip at all.
   *
   * Off `repoRows` and NOT off `rows`, which is the whole point of taking it here: the
   * sprint is a property of the repository, not of what survived the search, and read
   * from the narrowed rows it would blink out the moment a query matched no Jira ticket
   * — leaving the reader to conclude the sprint had ended.
   *
   * The first Jira row that has one. A repository tracked in both places contributes a
   * GitHub row as well, and two services planned in one Jira project share a single row
   * (see `TaskRow.repos`), so there is at most one sprint here to name.
   */
  const sprintName = useMemo(() => {
    for (const row of repoRows) {
      if (row.tracker === 'jira' && row.sprintName) return row.sprintName
    }
    return undefined
  }, [repoRows])

  const { rows, total, totalOpen, truncatedSprint } = useMemo(() => {
    // Sorted AFTER filtering, which is both the cheaper order and the only correct
    // one for the counts below: they are taken off what is on screen, and a sort that
    // ran first would reorder rows the filter is about to drop.
    const shown = sortTaskRows(filterTaskRows(allRows, filterValue), filterValue.sort)
    const count = countOpenIssues(shown)
    return {
      rows: shown,
      total: count,
      // `countTotalOpen` reports what the REPOSITORY holds — the number behind "showing
      // 50 of 214" — and that sentence is false the moment a search is on: the 214 is
      // the whole backlog, not the part that matched. Passing the shown count instead is
      // what makes `openCountLabel` drop the second number rather than print a ratio
      // nobody asked about. The repository picker alone keeps it, since a repository's
      // own total is still its own total.
      totalOpen: filterValue.query.trim() ? count : countTotalOpen(shown),
      // Whether a SPRINT was cut short by its page size. A different admission from
      // GitHub's: `/rest/api/3/search/jql` is paginated by cursor and returns no total,
      // so there is no second number to print — only "showing the first N".
      truncatedSprint: shown.some((row) => row.tracker === 'jira' && row.truncated),
    }
  }, [allRows, filterValue])

  /** The rows on screen, dealt into the four columns. See `buildBoard`. */
  const board = useMemo(() => buildBoard(rows), [rows])

  /**
   * The configuration of every repository behind the rows, by key — what a card needs
   * to know whether an agent can be opened in it.
   *
   * Built once for the board rather than read per card: `useConfig` subscribes to the
   * whole config, and a subscription per card would re-render every card on the board
   * whenever any setting anywhere changed.
   */
  const repoConfigs = useMemo(() => {
    const configs: Record<string, RepositoryConfig | undefined> = {}
    for (const row of rows) {
      for (const entry of row.repos) configs[entry.configKey] = config?.repositories?.[entry.configKey]
    }
    return configs
  }, [rows, config?.repositories])

  /**
   * Pick a repository, and remember it.
   *
   * Written to the cloud and not awaited: the board switches on the local state the
   * moment this is called, and the write is what makes the choice survive the app being
   * killed. A failed write therefore costs the reader nothing today and the saved
   * repository tomorrow, which is why it is swallowed rather than surfaced — there is no
   * action to offer for it.
   */
  const pickRepo = useCallback((next: string) => {
    setRepoKey(next)
    void updateTasksRepo(next).catch(() => {})
  }, [updateTasksRepo])

  /** Everything the bar changes EXCEPT the repository, which has somewhere else to go. */
  const changeFilter = useCallback((next: TaskFilterValue) => {
    const { configKey, ...rest } = next
    setFilter((prev) => ({ ...prev, ...rest }))
    if (configKey && configKey !== repo) pickRepo(configKey)
  }, [repo, pickRepo])


  /**
   * The selected issue AND the repository row it belongs to, derived from the
   * rows and never stored: see `selected`. Null the moment either half stops
   * existing — a repository dropped from the config, or an issue closed since
   * the last read — which is what takes the detail page down instead of leaving
   * a stale copy of it open.
   */
  const selection = useMemo(() => {
    if (!selected) return null
    // The TRACKER is half the lookup, not just half the guard below. An undecided
    // repository has a GitHub card and a Jira card under one config key, and a find
    // on the key alone returns whichever the sort put first — so opening a Jira
    // ticket on such a repo would land on the GitHub row and bounce straight back to
    // the list.
    const row = rows.find(
      (candidate) => candidate.configKey === selected.configKey && candidate.tracker === selected.tracker,
    )
    if (!row) return null

    if (selected.tracker === 'jira') {
      // The tracker has to match as well as the key: a repository switched from Jira
      // to GitHub under a held selection is exactly the case that must send the page
      // back to the list rather than read a Jira key off a GitHub row.
      if (row.tracker !== 'jira') return null
      // WORTH KNOWING: this memo drops to null the moment the ticket leaves the rows —
      // a Reload after the ticket left the sprint takes an open panel back to the board.
      // Being finished no longer does it, since the Done column is read too.
      const issue = row.issues.find((candidate) => candidate.key === selected.key)
      // `id` in the form `buildAgentedIssues` keyed the index by, so the page can look
      // an agent up without knowing the folding rule: Jira is case-insensitive about
      // keys, and an agent whose ticket was typed `per-1234` is on `PER-1234`. It is
      // also what the sweep's page key is built from, which is opaque either way.
      return issue ? { tracker: 'jira' as const, row, issue, id: normalizeTicketId(issue.key) } : null
    }

    if (row.tracker !== 'github') return null
    const issue = row.issues.find((candidate) => candidate.number === selected.number)
    return issue ? { tracker: 'github' as const, row, issue, id: String(issue.number) } : null
  }, [selected, rows])

  /**
   * The query the page was SEEDED with has done its job once the ticket is actually
   * open, so it goes.
   *
   * Without this, `back()` would land on a backlog narrowed to the single ticket that
   * was just being read — a query the reader never typed and would have to find the
   * box to clear.
   *
   * The rule itself is `shouldClearSeededQuery`, pure and tested there: the box has to
   * still hold the seeded string character for character, so a reader who cleared it
   * and searched for something else of their own keeps their query — whether they did
   * that before opening a ticket or after this page's own query failed to resolve to a
   * row. The ref is emptied only when the query actually goes, which is what keeps the
   * unresolved case working: until a ticket resolves, the seeded query IS the fallback
   * and has to stay.
   *
   * Watching the query as well as the selection cannot loop. Clearing re-runs this
   * effect, but the ref is empty by then and the rule answers no on the second pass.
   */
  useEffect(() => {
    if (!shouldClearSeededQuery(seededQuery.current, filter.query, !!selection)) return
    seededQuery.current = ''
    setFilter((prev) => ({ ...prev, query: '' }))
  }, [selection, filter.query])

  /**
   * Which of the two views is on screen. A change is what plays the sweep.
   *
   * The TRACKER is part of it, structurally rather than incidentally. A GitHub key
   * (`github:api#234`) and a Jira one (`jira:api#PROJ-234`) cannot collide today,
   * because a Jira key always carries a letter prefix and a hyphen — but that is a
   * fact about Jira's key format, and the page would be relying on it to tell two
   * different tickets apart. Naming the tracker means it does not have to.
   */
  const pageKey = selection ? `${selection.tracker}:${selection.row.configKey}#${selection.id}` : 'list'

  useEffect(() => {
    paneRef.current?.scrollTo({ top: pageKey === 'list' ? listOffsetRef.current : 0 })
  }, [pageKey])

  /**
   * Whether any configured repository resolves to each tracker AT ALL.
   *
   * Read from the config rather than from the groups, because it is the one thing
   * the groups cannot say: the main process drops a GitHub-tracked repository whose
   * issues address does not parse into an owner and a repo, and a Jira-tracked one
   * with no project key, so "no groups" covers two different situations per source —
   * nothing is tracked there, or something is and none of it has usable coordinates.
   * Telling a person the first when the second is true sends them to change a setting
   * that is already right.
   *
   * Both flags, because they now decide different things: the GitHub one whether the
   * "not connected" panel is even relevant (a user with no GitHub repository must
   * never see it), and the pair of them which of the four empty states applies.
   */
  const { hasGitHubRepos, hasJiraRepos } = useMemo(() => {
    const configured = Object.values(config?.repositories ?? {})
    // `readsFrom`, the same predicate the main process filters on, so these flags
    // and the groups that arrive cannot disagree. An undecided repository counts on
    // BOTH sides — it really does have both — which is what puts a logged-out `gh`
    // behind the one-line notice rather than the full-page wall for someone whose
    // Jira sprint is on screen and perfectly readable.
    return {
      hasGitHubRepos: configured.some((entry) => readsFrom(entry, 'github')),
      hasJiraRepos: configured.some((entry) => readsFrom(entry, 'jira')),
    }
  }, [config?.repositories])

  // Stable because it is handed to every memoised card on the board.
  // ONE entry point for both trackers, which is what keeps the preserved scroll
  // free: the offset is saved here, so a Jira row gets it by going through the same
  // door a GitHub row does.
  const select = useCallback((next: TaskSelection) => {
    // Read here rather than in the effect above: by the time that runs, the pane
    // has already been scrolled to the top of the ticket.
    listOffsetRef.current = paneRef.current?.scrollTop ?? 0
    setSelected(next)
  }, [])

  const back = useCallback(() => setSelected(null), [])

  if (loading && !snapshot) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 flex items-center justify-center gap-2 text-text-secondary text-sm">
          <WaveLoader className="text-accent" />
          <span>{t('tasks.loading')}</span>
        </div>
      </div>
    )
  }

  // `gh` missing or logged out: a state, not an empty backlog. Saying "no issues"
  // here would send someone hunting for issues that were never read.
  //
  // TWO conditions now guard it, and both are the fix for the same bug. The panel
  // takes the WHOLE page, so it may only render when there is nothing else to show:
  // a user with no GitHub repository at all is not missing anything (they were shown
  // this wall in place of their Jira sprint until this change), and one who has both
  // gets the compact notice above the list instead.
  //
  // Named once and tested twice, because the wall and the one-line notice below are
  // the same news: only "is there anything else on this page" separates them, so only
  // that is asked twice.
  const githubMissing = !!snapshot && !snapshot.connected.github && hasGitHubRepos

  if (githubMissing && !hasJiraRepos) {
    return (
      <div className="h-full flex flex-col">
        <GitHubNotConnected onRetry={reload} busy={loading} />
      </div>
    )
  }

  /**
   * Why the page is empty, and where the setting that fixes it lives.
   *
   * Four states rather than the two this had, because a tracker was added and every
   * combination of the two flags is a genuinely different sentence: nobody tracks
   * anything anywhere; GitHub repositories with no parseable issues address; Jira
   * repositories with no project key; or both at once, where naming only one of the
   * two fixes would send half the reader's repositories to the wrong settings field.
   */
  const emptyState: { title: MessageKey; hint: MessageKey } =
    hasGitHubRepos && hasJiraRepos ? { title: 'tasks.noCoordinates', hint: 'tasks.noCoordinatesHint' }
      : hasGitHubRepos ? { title: 'tasks.noAddress', hint: 'tasks.noAddressHint' }
        : hasJiraRepos ? { title: 'tasks.jira.noProject', hint: 'tasks.jira.noProjectHint' }
          : { title: 'tasks.noRepos', hint: 'tasks.noReposHint' }

  /**
   * Is the emptiness below a NARROWING of something, rather than a board that was never
   * read at all? It gates both the control bar and the search's own empty state, and it
   * is what keeps the latter apart from the four configuration hints.
   *
   * The query half is not redundant with the rows half. This page can be opened on a
   * ticket that has no card here — a closed one, or one in a repository nobody tracks —
   * and then there is a query over an EMPTY board: on the rows alone the page would hide
   * the bar holding an invisible query, and blame the configuration for a ticket the
   * reader had just clicked.
   */
  const narrowable = allRows.length > 0 || !!filter.query.trim()

  /**
   * Whether the SEARCH is what emptied the board, as opposed to the repository simply
   * having nothing in it.
   *
   * `countBoard` and not `rows.length`: a repository whose read failed contributes a row
   * with no tickets in it, and on the row count alone a failed read would be reported as
   * "nothing matched your search" — with the failure's own explanation rendered directly
   * underneath it.
   */
  const noMatch = narrowable && countBoard(board) === 0 && rows.every((row) => !row.error)

  return (
    // One scrolling pane holding two pages: the backlog, and the issue that
    // replaces it. The detail was a 500px column beside this list until the
    // width itself became the problem — an issue body is prose with headings,
    // code and tables in it, and none of those survive being folded into a
    // column two words wide.
    <div ref={paneRef} className="h-full overflow-y-auto">
      {/* The title and its chrome are rendered by the hosting modal.

          The page's padding is on the SWEEP LAYERS, not on the pane: a `sticky`
          child measures its offset from the scrolling element's padding box, so
          padding here would make the issue page's sticky column pin a full 24px
          higher than it looks like it should. Both layers carry it, so the page
          on its way out keeps the same inset as the one arriving.

          The TOP inset is left to each page instead. The issue page's pinned bar
          has to cover it — an opaque band stopping 24px short of the pane's edge
          would leave a strip of issue body sliding past above it — and it can only
          own that space by being the thing that provides it. */}
      <SweepPane
        pageKey={pageKey}
        order={pagePosition}
        horizontal={alwaysSideways}
        scrollRef={paneRef}
        className="px-6 pb-6"
      >
        {selection ? (
          <TaskDetailPage
            // Spread so the (tracker, issue) pair stays correlated: the page's props
            // are a discriminated union, and passing the two separately would let a
            // Jira ticket be handed to the GitHub branch.
            {...(selection.tracker === 'jira'
              ? { tracker: 'jira' as const, issue: selection.issue }
              : { tracker: 'github' as const, issue: selection.issue })}
            // EVERY repository the card stands for, paired with its configuration —
            // usually one, and two when a tracker target is shared (see `TaskRow.repos`).
            // The page needs the whole list rather than the first: it is what the trail
            // names, and what decides whether a repository can be picked for the agent
            // at all or the choice has to be left to `/magic:start`.
            repos={selection.row.repos.map((entry) => ({
              ...entry,
              config: config?.repositories?.[entry.configKey],
            }))}
            // Read out of the same set the list's dot reads, so the page and the
            // row it was opened from can never disagree about this ticket. `id` is
            // already in the index's own form (see the memo), so there is no second
            // place here that has to know the folding rule.
            hasAgent={selection.row.agentedIssues.has(selection.id)}
            paneRef={paneRef}
            onBack={back}
          />
        ) : (
          <div className="flex flex-col gap-3 pt-6">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <ListTodo className="w-4 h-4" />
              <span>{t('tasks.section')}</span>
              <span className="ml-auto flex items-center gap-3">
                {rows.length > 0 && (
                  <span className="text-xs text-text-secondary/50">
                    {/* "showing 50 of 214" wins when there IS a second number — it is
                        strictly more than "showing the first 50", and only the GitHub
                        half can ever supply it. The sprint form is the fallback for a
                        board whose Jira half was cut short. */}
                    {totalOpen > total
                      ? openCountLabel(total, t, totalOpen)
                      : sprintCountLabel(total, t, truncatedSprint)}
                  </span>
                )}
                <button
                  onClick={reload}
                  disabled={loading}
                  title={t('tasks.reload')}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-text-secondary border border-line rounded-lg hover:bg-surface-strong hover:text-ink transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>{t('tasks.reload')}</span>
                </button>
              </span>
            </div>

            {/* Past the early return above, `githubMissing` implies `hasJiraRepos`. */}
            {githubMissing && (
              // The GitHub half is unreadable and the Jira half is not, so the page
              // keeps rendering and says what is missing in one line rather than
              // covering the sprint with the full panel.
              <div className="flex items-start gap-2 px-4 py-2.5 text-xs bg-surface-subtle border border-line-subtle rounded-lg">
                <Github className="w-3.5 h-3.5 text-icon-muted flex-shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-text-secondary">{t('tasks.github.title')}</span>
                  <span className="text-text-secondary/60">{t('tasks.github.partialFix')}</span>
                </div>
              </div>
            )}

            {/* Only once there is something to work with. Four controls over a page
                that read nothing are four things to read before finding out there is
                nothing there — and the repository picker would have nothing to offer.
                See `narrowable` for why an empty board can still qualify. */}
            {narrowable && (
              <TaskFilters
                value={filterValue}
                repos={filterRepos}
                epics={filterEpics}
                {...(sprintName ? { sprintName } : {})}
                onChange={changeFilter}
              />
            )}

            {/* Three outcomes, in the order of how much they blame. The search matching
                nothing is a DIFFERENT state from the four configuration hints, and the
                distinction matters: those send the reader to a settings field, and doing
                that because they mistyped a ticket id would be the page blaming its
                configuration for their search. */}
            {noMatch ? (
              <div className="py-10 flex flex-col items-center justify-center text-text-secondary text-sm gap-2 bg-surface-subtle border border-line-subtle rounded-xl">
                <SearchX className="w-8 h-8 text-icon-muted" />
                <p>{t('tasks.filter.noMatch')}</p>
                <button
                  // The repository is NOT cleared — it has no cleared state, and this
                  // button is about undoing a search rather than leaving the board.
                  onClick={() => setFilter(NO_FILTER)}
                  className="mt-1 px-2.5 py-1 text-xs font-medium text-text-secondary border border-line rounded-lg hover:bg-surface-strong hover:text-ink transition-colors"
                >
                  {t('tasks.filter.clearAll')}
                </button>
              </div>
            ) : rows.length === 0 ? (
              <div className="py-10 flex flex-col items-center justify-center text-text-secondary text-sm gap-2 bg-surface-subtle border border-line-subtle rounded-xl">
                <ListTodo className="w-8 h-8 text-icon-muted" />
                {/* Not "no tickets": nobody asked the question, or the ones who did
                    have no readable coordinates — and with two trackers that is four
                    situations, not two. Every fix is a per-repository setting, so
                    each hint names the one that applies. */}
                <p>{t(emptyState.title)}</p>
                <p className="text-xs text-text-secondary/60 max-w-sm text-center">
                  {t(emptyState.hint)}
                </p>
              </div>
            ) : (
              // The board draws its four columns whatever is in them — an empty column
              // says so itself, and a repository with nothing open at all is four empty
              // columns rather than a message, because that IS the state of its board.
              <TaskBoard board={board} rows={rows} repoConfigs={repoConfigs} onSelect={select} />
            )}
          </div>
        )}
      </SweepPane>
    </div>
  )
}
