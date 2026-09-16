import { useState, useEffect, useMemo, useRef } from 'react'
import { Plus, ChevronRight, Folder, FolderGit2, AlertTriangle, Building2, Lock } from '@ds/desktop/icons'
// lucide v1 dropped the brand glyphs, so the GitHub mark is the app's own —
// the same one the tracker badges wear.
import { Github } from '@ds/desktop/icons'
import { RepoPage } from './RepoPage'
import { SectionHeader } from './SectionHeader'
import { SweepPane } from '../../components/SweepPane'
import { useStore } from '../../store'
import { useConfig } from '../../hooks/useConfig'
import type { RepositoryConfig } from '../../../types'
import { showToast } from '../../components/Toast'
import { getProjectColorMap } from '../../utils/projectColors'
import { useT } from '../../i18n'


/**
 * THE MODAL IS ONE PAGE NOW, and the page is the repositories.
 *
 * It had eleven tabs, then seven, then six, and this is the end of that road rather
 * than another step along it. Everything that was a PREFERENCE went to the quick
 * settings sheet under the title bar and the panel it opens — the setup, the
 * notifications, the appearance, the language, the chords. Everything that was an
 * IDENTITY went to the account sheet beside it and ITS panel — who you are, which
 * organization, which connections, which Claude Code, which version.
 *
 * A repository is neither. It is a folder on this disk with a remote behind it and a
 * detail page of its own, and a list of them does not fit in a card hanging off a menu
 * the way a roster or a version number does. So it kept the window, and the window lost
 * the rail: a vertical menu of one entry is a menu that has nothing to say. The left
 * sidebar names it directly.
 *
 * WHAT WENT WITH THE RAIL, and is not coming back as a component somewhere else: the
 * repositories and organizations that unfolded under their tabs, and the account footer
 * with its sign-out. The first two answered "which of these am I looking at", which the
 * page itself answers now that it is the only page; the footer is the account sheet's
 * first card.
 */

/**
 * Whether a switch is the hop between the repository list and one repository's
 * detail. Opening a repository is opening a page, not travelling down the rail,
 * so it sweeps sideways: in from the right on the way in, back out to the right
 * on the way out. Reaching another settings tab straight from a detail is still
 * a rail move and keeps its vertical sweep.
 */
function isRepoDetailSwitch(fromKey: string, toKey: string): boolean {
  return (
    (fromKey === 'repositories' && toKey.startsWith('repo:')) ||
    (toKey === 'repositories' && fromKey.startsWith('repo:'))
  )
}

/** Hash route within Settings. `repo` is a sub-page of the Repositories tab. */
interface SettingsRoute {
  page: string
  params: { name?: string }
}

function WelcomePage({ route }: { route: SettingsRoute }) {
  const { config, terminals } = useStore()
  const { addRepository } = useConfig()
  const orgs = useStore((s) => s.orgs)
  const t = useT()

  // Two pages and not seven: the list, and one repository's detail under `#/repo/<name>`.
  const isRepoRoute = route.page === 'repo'

  /**
   * What the content pane is currently showing. Used as its React key, so moving
   * between the list and a repository — or between two repositories — remounts the pane
   * and plays the sweep. Without the key React would reuse the same element and the new
   * page would simply appear.
   */
  const contentKey = isRepoRoute ? `repo:${route.params.name ?? ''}` : 'repositories'

  // A page opens at its top. The pane is the scroll container and it survives
  // the switch, so without this the next page inherits the previous page's
  // offset — a short one can open already scrolled past its own heading.
  const contentScrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    contentScrollRef.current?.scrollTo({ top: 0 })
  }, [contentKey])

  const [githubStatus, setGithubStatus] = useState<Record<string, boolean>>({})
  const [isAdding, setIsAdding] = useState(false)
  const repos = Object.entries(config?.repositories || {})
  const projectNames = repos.map(([name]) => name)

  // One section per organization, plus a personal one. Every org the user
  // belongs to is listed at once — there is no active org to narrow to. A team
  // repo the user has not bound to a local folder yet (needsLocalPath) stays
  // visible: that is how you discover a colleague's repo and point it at your
  // own clone.
  const personalRepos = useMemo(() => repos.filter(([, r]) => !r.orgId), [repos])
  const reposByOrg = useMemo(() => {
    const byOrg = new Map<string, typeof repos>()
    for (const org of orgs) byOrg.set(org.id, [])
    for (const entry of repos) {
      const orgId = entry[1].orgId
      if (!orgId) continue
      byOrg.set(orgId, [...(byOrg.get(orgId) ?? []), entry])
    }
    return byOrg
  }, [repos, orgs])

  const colorMap = useMemo(
    () => getProjectColorMap(projectNames, config?.repositories),
    [projectNames, config?.repositories]
  )

  // Count active agents per repo
  const agentCountByRepo = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const terminal of terminals) {
      for (const repoPath of terminal.repositories || []) {
        for (const [name, repo] of repos) {
          // Guard the empty path: ''.startsWith() matches everything, which would
          // credit every agent to every repo with no local folder bound.
          if (repo.path && repoPath.startsWith(repo.path)) {
            counts[name] = (counts[name] || 0) + 1
          }
        }
      }
    }
    return counts
  }, [terminals, repos])

  // One row of the repositories list. Shared by the Personal and Team sections —
  // a plain render function, not a component, so React keeps the same elements
  // across renders instead of remounting a freshly-declared type.
  const renderRepoRow = ([name, repo]: [string, RepositoryConfig]) => {
    const hasGithub = githubStatus[name]
    const color = colorMap[name]
    const agentCount = agentCountByRepo[name] || 0

    return (
      <a
        key={name}
        href={`#/repo/${encodeURIComponent(name)}`}
        className="group flex items-center gap-3 px-4 py-3 bg-surface hover:bg-surface-strong border border-line-strong hover:border-line-strong rounded-xl transition-all"
      >
        {/* Repository tile — the same one the webapp's repository list and the
            agent sidebar's cards use: the repo's colour tints the icon and its
            backdrop, instead of a bare dot that named nothing. */}
        <span
          className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
          style={{ backgroundColor: `${color}1f`, color }}
        >
          <FolderGit2 className="w-4 h-4" />
        </span>

        {/* Repo info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{name}</span>
            {/* GitHub status badge — only meaningful once a local folder is bound */}
            {!repo.needsLocalPath && (
              <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                hasGithub
                  ? 'bg-green/10 text-green'
                  : 'bg-red/10 text-red'
              }`}>
                <Github className="w-2.5 h-2.5" />
                {hasGithub ? t('settings.repos.connected') : t('settings.repos.noRemote')}
              </span>
            )}
          </div>
          {repo.needsLocalPath ? (
            <div className="flex items-center gap-1 text-xs text-yellow mt-0.5">
              <AlertTriangle className="w-3 h-3" />
              {t('settings.repos.noLocalFolder')}
            </div>
          ) : (
            <div className="text-xs text-text-secondary/50 truncate mt-0.5">
              {repo.path}
            </div>
          )}
        </div>

        {/* Agent count */}
        {agentCount > 0 && (
          <span className="px-2 py-0.5 bg-accent/10 text-accent text-xs font-medium rounded">
            {t(agentCount > 1 ? 'settings.repos.agents.other' : 'settings.repos.agents.one', { count: agentCount })}
          </span>
        )}

        {/* Arrow */}
        <ChevronRight className="w-4 h-4 text-icon-muted group-hover:text-icon transition-colors" />
      </a>
    )
  }

  // Check GitHub remote status for all repos
  useEffect(() => {
    const checkGitHubRemotes = async () => {
      const repoList = config?.repositories || {}
      const status: Record<string, boolean> = {}

      for (const [name, repo] of Object.entries(repoList)) {
        try {
          status[name] = await window.electronAPI.config.hasGitHubRemote(repo.path)
        } catch {
          status[name] = false
        }
      }

      setGithubStatus(status)
    }

    checkGitHubRemotes()
  }, [config?.repositories])

  const handleOpenProject = async () => {
    if (isAdding) return

    const folderPath = await window.electronAPI.dialog.openFolder()
    if (!folderPath) return

    const folderName = folderPath.split('/').pop() || ''
    const repoName = folderName.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase()

    if (!repoName) {
      showToast(t('toast.invalidFolderName'), 'error')
      return
    }

    if (config?.repositories?.[repoName]) {
      showToast(t('toast.repoExists', { name: repoName }), 'error')
      return
    }

    setIsAdding(true)
    try {
      const result = await addRepository(repoName, folderPath, [])

      if (result.warning) {
        showToast(t('toast.repoAddedWarning', { name: repoName, warning: result.warning }), 'warning')
      } else {
        showToast(t('toast.repoAdded', { name: repoName }))
      }

      window.location.hash = `#/repo/${encodeURIComponent(repoName)}`
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.repoAddFailed'), 'error')
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="h-full animate-fade-in">
      {/* THE WHOLE WINDOW, where it used to be the half beside the rail. */}
      <div ref={contentScrollRef} className="h-full overflow-y-auto p-6">
        <SweepPane
          pageKey={contentKey}
          // The rail is gone and with it the top-to-bottom order the sweep read its
          // direction from. Two keys are left — the list and a repository — and
          // `horizontal` already decides that hop, so every switch is that one. A
          // constant keeps `SweepPane`'s contract without inventing a ranking for a
          // list of one.
          order={() => 0}
          horizontal={isRepoDetailSwitch}
          scrollRef={contentScrollRef}
          // A CAP AGAIN, and centred — which reverses a decision the rail had made for
          // us. There was a `max-w-4xl` here once; it went because a form sitting against
          // a 224px rail on a full-screen modal was already off the window edge, and the
          // cap only added a band of empty panel beside it. The rail is gone, so nothing
          // holds the content in any more: a repository row would run the full width of a
          // maximised window, with its name at one end and its chevron at the other.
          // 72rem is wider than the measure prose would ask for, because these are rows
          // and not paragraphs — it is a limit on the reach of the eye, not on the line.
          className="mx-auto flex w-full max-w-6xl flex-col gap-6"
        >

      {/* One repository, under `#/repo/<name>` — the window's only sub-page. */}
      {isRepoRoute && <RepoPage repoName={route.params.name || ''} />}

      {/* The repository list — the whole of this window, the detail above excepted. */}
      {!isRepoRoute && <div>
        <SectionHeader
          icon={FolderGit2}
          title={t('settings.repos.section')}
          action={
            <button
              onClick={handleOpenProject}
              disabled={isAdding}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-text-secondary bg-surface border border-line-strong rounded-lg hover:bg-surface-strong hover:text-ink transition-all disabled:opacity-50"
            >
              <Plus className="w-3 h-3" />
              <span>{isAdding ? t('settings.repos.adding') : t('settings.repos.add')}</span>
            </button>
          }
        />

        {repos.length === 0 ? (
          <button
            onClick={handleOpenProject}
            disabled={isAdding}
            className="w-full py-8 text-center border border-dashed border-border/50 rounded-xl hover:border-text-secondary/50 hover:bg-surface transition-colors"
          >
            <Folder className="w-8 h-8 text-icon-muted mx-auto mb-3" />
            <div className="text-sm text-text-secondary/50 mb-1">{t('settings.repos.emptyTitle')}</div>
            <div className="text-xs text-text-secondary/30">{t('settings.repos.emptyHint')}</div>
          </button>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Personal */}
            <div>
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-icon mb-2">
                <Lock className="w-3 h-3" />
                <span>{t('settings.repos.personal')}</span>
                <span className="text-text-secondary/30">{personalRepos.length}</span>
              </div>
              {personalRepos.length === 0 ? (
                <div className="px-4 py-3 text-xs text-text-secondary/40 border border-dashed border-line-field rounded-xl">
                  {t('settings.repos.noPersonal')}
                </div>
              ) : (
                <div className="space-y-2">{personalRepos.map(renderRepoRow)}</div>
              )}
            </div>

            {/* One section per organization, in the order useOrg lists them */}
            {orgs.map((org) => {
              const orgRepos = reposByOrg.get(org.id) ?? []
              return (
                <div key={org.id}>
                  <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-icon mb-2">
                    <Building2 className="w-3 h-3" />
                    <span>{org.name}</span>
                    <span className="text-text-secondary/30">{orgRepos.length}</span>
                  </div>
                  {orgRepos.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-text-secondary/40 border border-dashed border-line-field rounded-xl">
                      {t('settings.repos.noTeam')}
                    </div>
                  ) : (
                    <div className="space-y-2">{orgRepos.map(renderRepoRow)}</div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>}

        </SweepPane>
      </div>
    </div>
  )
}

export function ConfigPage() {
  const [route, setRoute] = useState<{ page: string; params: { name?: string } }>({
    page: 'home',
    params: {}
  })

  useEffect(() => {
    const parseRoute = (): { page: string; params: { name?: string } } => {
      const hash = window.location.hash || '#/'

      if (hash === '#/' || hash === '#') {
        return { page: 'home', params: {} }
      }

      const repoMatch = hash.match(/^#\/repo\/(.+)$/)
      if (repoMatch) {
        return { page: 'repo', params: { name: decodeURIComponent(repoMatch[1]) } }
      }

      return { page: 'home', params: {} }
    }

    const handleHashChange = () => {
      setRoute(parseRoute())
    }

    handleHashChange()
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  return (
    <div className="h-full">
      <WelcomePage route={route} />
    </div>
  )
}
