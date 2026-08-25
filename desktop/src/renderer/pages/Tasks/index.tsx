import { useCallback, useMemo, useState } from 'react'
import { ListTodo, RefreshCw } from 'lucide-react'
import { useConfig } from '../../hooks/useConfig'
import { useTasks } from '../../hooks/useTasks'
import { buildTaskRows, countOpenIssues, countTotalOpen } from '../../utils/taskRows'
import { resolveTracker } from '../../../tracker'
import { useT } from '../../i18n'
import { WaveLoader } from '../../components/WaveLoader'
import { GitHubNotConnected } from './GitHubNotConnected'
import { openCountLabel, TasksRepoSection } from './TasksRepoSection'

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
  const t = useT()

  /**
   * Which cards are FOLDED, not which are open: the page is a backlog, so every
   * card starts expanded and collapsing is the deliberate act. Tracking the
   * opposite would collapse a repository the moment its group first appeared.
   */
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const { rows, total, totalOpen } = useMemo(() => {
    const built = buildTaskRows(snapshot?.groups ?? [], config?.repositories ?? {})
    return { rows: built, total: countOpenIssues(built), totalOpen: countTotalOpen(built) }
  }, [snapshot?.groups, config?.repositories])

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
        <GitHubNotConnected onRetry={reload} />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* The title and its chrome are rendered by the hosting modal. */}
      <div className="flex-1 overflow-auto p-6 flex flex-col gap-4">
        <div className="flex flex-col gap-3">
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
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
