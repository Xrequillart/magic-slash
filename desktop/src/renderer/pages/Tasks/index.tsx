import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ListTodo, RefreshCw } from 'lucide-react'
import { useConfig } from '../../hooks/useConfig'
import { useOrgAgents } from '../../hooks/useOrgAgents'
import { useTasks } from '../../hooks/useTasks'
import { useStore } from '../../store'
import { buildTaskRows, countOpenIssues, countTotalOpen } from '../../utils/taskRows'
import { buildAgentedIssues, taskAgentRefs, terminalAgentSignature } from '../../utils/taskAgents'
import { resolveTracker } from '../../../tracker'
import { useT } from '../../i18n'
import { WaveLoader } from '../../components/WaveLoader'
import { SweepPane } from '../../components/SweepPane'
import { GitHubNotConnected } from './GitHubNotConnected'
import { TaskDetailPage } from './TaskDetailPage'
import { openCountLabel, TasksRepoSection } from './TasksRepoSection'

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
 * PageModal, whose title and chrome the modal renders. What it lists is the OPEN
 * GitHub issues of every configured repository whose RESOLVED tracker is GitHub —
 * a repo tracked in Jira gets no group at all, because "nothing open" and "tracked
 * elsewhere" must not read the same.
 *
 * The read happens in the main process (`tasks:listOpenIssues`) and arrives over
 * IPC: nothing here touches the network, and the GitHub token never crosses the
 * bridge.
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
   */
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  /**
   * The selected issue as a (repository, number) PAIR, not as the issue object.
   *
   * Issue numbers are per repository, so the key is half the identity. Holding the
   * pair rather than the object also means a reload re-derives what the issue page
   * shows from the fresh snapshot — and an issue that has been closed in the
   * meantime sends the page back to the list instead of leaving a stale copy open.
   *
   * Null is the list; anything else is that issue's page. One piece of state for
   * both, so the two views cannot both believe they are on screen.
   */
  const [selected, setSelected] = useState<{ configKey: string; number: number } | null>(null)

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

  const { rows, total, totalOpen } = useMemo(() => {
    const built = buildTaskRows(snapshot?.groups ?? [], config?.repositories ?? {})
    return { rows: built, total: countOpenIssues(built), totalOpen: countTotalOpen(built) }
  }, [snapshot?.groups, config?.repositories])

  /**
   * Which issues already have an agent, per repository, built once for the page.
   *
   * A map rather than a predicate called per row: the alternative walks the whole
   * roster again for each of up to fifty issues per repository.
   */
  const agentedIssues = useMemo(
    () => buildAgentedIssues(
      rows.map((row) => row.configKey),
      config?.repositories ?? {},
      // Read non-reactively: `terminalsKey` above is this page's subscription to
      // the terminals, and it is in the dependency list in this read's stead.
      taskAgentRefs(agents, useStore.getState().terminals),
    ),
    [rows, config?.repositories, agents, terminalsKey],
  )

  /**
   * The selected issue AND the repository row it belongs to, derived from the
   * rows and never stored: see `selected`. Null the moment either half stops
   * existing — a repository dropped from the config, or an issue closed since
   * the last read — which is what takes the detail page down instead of leaving
   * a stale copy of it open.
   */
  const selection = useMemo(() => {
    if (!selected) return null
    const row = rows.find((candidate) => candidate.configKey === selected.configKey)
    const issue = row?.issues.find((candidate) => candidate.number === selected.number)
    return row && issue ? { row, issue } : null
  }, [selected, rows])

  /** Which of the two views is on screen. A change is what plays the sweep. */
  const pageKey = selection ? `issue:${selection.row.configKey}#${selection.issue.number}` : 'list'

  useEffect(() => {
    paneRef.current?.scrollTo({ top: pageKey === 'list' ? listOffsetRef.current : 0 })
  }, [pageKey])

  /**
   * Whether any configured repository resolves to GitHub AT ALL.
   *
   * Read from the config rather than from the groups, because it is the one thing
   * the groups cannot say: the main process drops a GitHub-tracked repository whose
   * issues address does not parse into an owner and a repo, so "no groups" covers
   * two different situations — nothing is tracked on GitHub, or something is and
   * none of it has a usable address. Telling a person the first when the second is
   * true sends them to change a setting that is already right.
   */
  const hasGitHubRepos = useMemo(
    () => Object.values(config?.repositories ?? {}).some((repo) => resolveTracker(repo) === 'github'),
    [config?.repositories],
  )

  // Stable, so the memoised cards below only re-render when their own row or
  // folded state actually changed — not on every keystroke the store sees.
  const toggle = useCallback((configKey: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (!next.delete(configKey)) next.add(configKey)
      return next
    })
  }, [])

  // Stable for the same reason `toggle` is: it is handed to every memoised card.
  const select = useCallback((configKey: string, number: number) => {
    // Read here rather than in the effect above: by the time that runs, the pane
    // has already been scrolled to the top of the issue.
    listOffsetRef.current = paneRef.current?.scrollTop ?? 0
    setSelected({ configKey, number })
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
  if (snapshot && !snapshot.githubConnected) {
    return (
      <div className="h-full flex flex-col">
        <GitHubNotConnected onRetry={reload} busy={loading} />
      </div>
    )
  }

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
            issue={selection.issue}
            configKey={selection.row.configKey}
            repoName={selection.row.name}
            repo={config?.repositories?.[selection.row.configKey]}
            // Read out of the same index the list's dot reads, so the page and the
            // row it was opened from can never disagree about this issue.
            hasAgent={agentedIssues[selection.row.configKey]?.has(String(selection.issue.number)) ?? false}
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

            {rows.length === 0 ? (
              <div className="py-10 flex flex-col items-center justify-center text-text-secondary text-sm gap-2 bg-surface-subtle border border-line-subtle rounded-xl">
                <ListTodo className="w-8 h-8 opacity-30" />
                {/* Not "no issues": either no repository asked the question, or the
                    ones that did have no readable address. Both fixes are a
                    per-repository setting, so each hint names its own. */}
                <p>{t(hasGitHubRepos ? 'tasks.noAddress' : 'tasks.noRepos')}</p>
                <p className="text-xs text-text-secondary/60 max-w-sm text-center">
                  {t(hasGitHubRepos ? 'tasks.noAddressHint' : 'tasks.noReposHint')}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {rows.map((row) => (
                  <TasksRepoSection
                    key={row.configKey}
                    row={row}
                    expanded={!collapsed.has(row.configKey)}
                    onToggle={toggle}
                    onSelect={select}
                    agentedIssues={agentedIssues[row.configKey]}
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
