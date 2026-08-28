import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Github, ListTodo, RefreshCw, SearchX } from 'lucide-react'
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
  rowKey,
  taskFilterRepos,
} from '../../utils/taskRows'
import { buildAgentedIssues, normalizeTicketId, taskAgentRefs, terminalAgentSignature } from '../../utils/taskAgents'
import { readsFrom } from '../../../tracker'
import { useT, type MessageKey } from '../../i18n'
import { WaveLoader } from '../../components/WaveLoader'
import { SweepPane } from '../../components/SweepPane'
import { GitHubNotConnected } from './GitHubNotConnected'
import { TaskDetailPage } from './TaskDetailPage'
import { openCountLabel, TasksRepoSection, type TaskSelection } from './TasksRepoSection'
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
 * The Tasks page — "what is open on my repositories", grouped by repository.
 *
 * Structurally `pages/Dashboard/index.tsx`: the same full-screen shell inside a
 * PageModal, whose title and chrome the modal renders. What it lists is one card
 * per TRACKER TARGET — the open issues of a GitHub repository, or the active sprint
 * of a Jira project. Usually that is one card per repository per tracker: a repo the
 * ladder leaves at `ask` has both configured and gets a card for each, labelled with
 * its tracker; it used to get none, which read as "nothing open here" when the truth
 * was "nobody has said which of your two trackers to look in". See `readsFrom` in
 * `tracker.ts`.
 *
 * The other direction is the one card SEVERAL repositories share, and it is the same
 * observation the other way up: two services planned in one Jira project are handed
 * the same tickets by the read, so they get one card that names both rather than two
 * copies of one backlog. `buildTaskRows` folds them on the coordinates the main
 * process read from; everything below sees a row with two entries in `repos`.
 *
 * A card is therefore identified by `rowKey(row)` — the first repository AND the
 * tracker — and not by the config key, which stopped being unique the day the second
 * card appeared.
 *
 * The read happens in the main process (`tasks:listOpenIssues`) and arrives over
 * IPC: nothing here touches the network, and neither the GitHub token nor the
 * Atlassian credential ever crosses the bridge.
 *
 * ONE THING IS DECIDED HERE AND NOWHERE ELSE: which In Progress sprint tickets are
 * shown. The rule is that a ticket in flight appears only when an agent is on it,
 * and the agent roster — the org roster and this machine's terminals — exists only
 * on this side. So the index is built first, from the snapshot's own group keys, and
 * the rows are built from it; the two used to run the other way round, which is why
 * the order below looks deliberate. It is.
 */
export function TasksPage() {
  const { snapshot, loading, reload } = useTasks()
  const { config } = useConfig()
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
  const t = useT()

  /**
   * Which cards are FOLDED, not which are open: the page is a backlog, so every
   * card starts expanded and collapsing is the deliberate act. Tracking the
   * opposite would collapse a repository the moment its group first appeared.
   *
   * Holds ROW keys — `rowKey(row)`, repository and tracker — because an undecided
   * repository has two cards and the config key no longer tells them apart.
   */
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  /**
   * What the controls at the top are set to. See `TaskFilters`.
   *
   * Page state and not config: a filter is what you are doing right now, not how you
   * like the page — and the modal unmounts this page when it closes, so a backlog
   * narrowed to one repository never greets you narrowed the next time you open it.
   */
  const [filter, setFilter] = useState<TaskFilterValue>(NO_FILTER)

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
   */
  const [selected, setSelected] = useState<TaskSelection | null>(null)

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
   * The epics the picker can offer, off the UNFILTERED rows for `filterRepos`' reason
   * — an option list that narrows as you use it takes away the entry you meant to
   * switch to. An empty array is what hides the control entirely; see `TaskFilters`.
   */
  const filterEpics = useMemo(() => taskFilterEpics(allRows), [allRows])

  const { rows, total, totalOpen } = useMemo(() => {
    // Sorted AFTER filtering, which is both the cheaper order and the only correct
    // one for the counts below: they are taken off what is on screen, and a sort that
    // ran first would reorder rows the filter is about to drop.
    const shown = sortTaskRows(filterTaskRows(allRows, filter), filter.sort)
    const count = countOpenIssues(shown)
    return {
      rows: shown,
      total: count,
      // `countTotalOpen` reports what the REPOSITORIES hold — the number behind
      // "showing 50 of 214" — and that sentence is false the moment a search is on:
      // the 214 is the whole backlog, not the part that matched. Passing the shown
      // count instead is what makes `openCountLabel` drop the second number rather
      // than print a ratio nobody asked about. The repository filter alone keeps it,
      // since a repository's own total is still its own total.
      totalOpen: filter.query.trim() ? count : countTotalOpen(shown),
    }
  }, [allRows, filter])


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
      // WORTH KNOWING: this memo drops to null the moment the ticket leaves the list,
      // and the Jira list is filtered to what is not `done` — so a Reload taken after
      // an agent has moved a ticket to Done bounces an open panel back to the backlog.
      // There is no poller on this page, so only an explicit Reload can do it.
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
    const repos = Object.values(config?.repositories ?? {})
    // `readsFrom`, the same predicate the main process filters on, so these flags
    // and the groups that arrive cannot disagree. An undecided repository counts on
    // BOTH sides — it really does have both — which is what puts a logged-out `gh`
    // behind the one-line notice rather than the full-page wall for someone whose
    // Jira sprint is on screen and perfectly readable.
    return {
      hasGitHubRepos: repos.some((repo) => readsFrom(repo, 'github')),
      hasJiraRepos: repos.some((repo) => readsFrom(repo, 'jira')),
    }
  }, [config?.repositories])

  // Stable, so the memoised cards below only re-render when their own row or
  // folded state actually changed — not on every keystroke the store sees. Takes a
  // ROW key, which is what the card passes: see `collapsed`.
  const toggle = useCallback((key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (!next.delete(key)) next.add(key)
      return next
    })
  }, [])

  // Stable for the same reason `toggle` is: it is handed to every memoised card.
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
            repos={selection.row.repos.map((repo) => ({
              ...repo,
              config: config?.repositories?.[repo.configKey],
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
                  <span className="text-xs text-text-secondary/50">{openCountLabel(total, t, totalOpen)}</span>
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

            {/* Only once there is a backlog to narrow. Two controls over an empty
                page are two things to read before finding out there is nothing
                there — and the picker would have no repositories to offer. */}
            {allRows.length > 0 && (
              <TaskFilters value={filter} repos={filterRepos} epics={filterEpics} onChange={setFilter} />
            )}

            {/* The filters matched nothing. A DIFFERENT state from the four below,
                and the distinction matters: those send the reader to a settings
                field, and doing that because they mistyped a ticket id would be the
                page blaming its configuration for their search. */}
            {allRows.length > 0 && rows.length === 0 ? (
              <div className="py-10 flex flex-col items-center justify-center text-text-secondary text-sm gap-2 bg-surface-subtle border border-line-subtle rounded-xl">
                <SearchX className="w-8 h-8 text-icon-muted" />
                <p>{t('tasks.filter.noMatch')}</p>
                <button
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
              <div className="flex flex-col gap-2">
                {rows.map((row) => (
                  <TasksRepoSection
                    key={rowKey(row)}
                    row={row}
                    // A search overrides the folded set for as long as it is on: a
                    // card that matched and stayed shut would be a result the reader
                    // is told about and cannot see. What was folded is still folded
                    // when the box is cleared, because `collapsed` is never written
                    // to here.
                    expanded={!!filter.query.trim() || !collapsed.has(rowKey(row))}
                    onToggle={toggle}
                    onSelect={select}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </SweepPane>
    </div>
  )
}
