import { useState, useEffect, useMemo } from 'react'
import { Github, Plus, ChevronRight, Folder, Sparkles } from 'lucide-react'
import { RepoPage } from './RepoPage'
import { useStore } from '../../store'
import { useConfig } from '../../hooks/useConfig'
import { showToast } from '../../components/Toast'
import { getProjectColorMap } from '../../utils/projectColors'

function WelcomePage() {
  const { config, terminals } = useStore()
  const { addRepository } = useConfig()
  const [githubStatus, setGithubStatus] = useState<Record<string, boolean>>({})
  const [isAdding, setIsAdding] = useState(false)
  const [appVersion, setAppVersion] = useState('')
  const [loadingWhatsNew, setLoadingWhatsNew] = useState(false)

  const repos = Object.entries(config?.repositories || {})
  const projectNames = repos.map(([name]) => name)

  // Generate color map for projects
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
          if (repoPath.startsWith(repo.path)) {
            counts[name] = (counts[name] || 0) + 1
          }
        }
      }
    }
    return counts
  }, [terminals, repos])

  // Fetch app version
  useEffect(() => {
    window.electronAPI.updater.getVersion().then(setAppVersion)
  }, [])

  const handleWhatsNew = async () => {
    if (loadingWhatsNew || !appVersion) return
    setLoadingWhatsNew(true)
    try {
      const html = await window.electronAPI.updater.getReleaseNotes(appVersion)
      if (!html) {
        showToast('Could not load release notes', 'error')
        return
      }
      window.dispatchEvent(new CustomEvent('show:whats-new', {
        detail: { version: appVersion, releaseNotes: html },
      }))
    } catch {
      showToast('Could not load release notes', 'error')
    } finally {
      setLoadingWhatsNew(false)
    }
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
      showToast('Invalid folder name', 'error')
      return
    }

    if (config?.repositories?.[repoName]) {
      showToast(`Repository '${repoName}' already exists`, 'error')
      return
    }

    setIsAdding(true)
    try {
      const result = await addRepository(repoName, folderPath, [])

      if (result.warning) {
        showToast(`Repository '${repoName}' added (${result.warning})`, 'warning')
      } else {
        showToast(`Repository '${repoName}' added`)
      }

      window.location.hash = `#/repo/${encodeURIComponent(repoName)}`
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to add repository', 'error')
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-2">Settings</h1>
        <p className="text-text-secondary text-sm">
          Manage your repositories and configure Magic Slash
        </p>
      </div>

      {/* Repositories Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs text-text-secondary/50 uppercase tracking-wider">Repositories</h2>
          <button
            onClick={handleOpenProject}
            disabled={isAdding}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-text-secondary bg-white/[0.06] border border-white/[0.15] rounded-lg hover:bg-white/[0.12] hover:text-white transition-all disabled:opacity-50"
          >
            <Plus className="w-3 h-3" />
            <span>{isAdding ? 'Adding...' : 'Add repository'}</span>
          </button>
        </div>

        {repos.length === 0 ? (
          <button
            onClick={handleOpenProject}
            disabled={isAdding}
            className="w-full py-8 text-center border border-dashed border-border/50 rounded-xl hover:border-text-secondary/50 hover:bg-white/5 transition-colors"
          >
            <Folder className="w-8 h-8 text-text-secondary/30 mx-auto mb-3" />
            <div className="text-sm text-text-secondary/50 mb-1">No repositories configured</div>
            <div className="text-xs text-text-secondary/30">Click to add your first project</div>
          </button>
        ) : (
          <div className="space-y-2">
            {repos.map(([name, repo]) => {
              const hasGithub = githubStatus[name]
              const color = colorMap[name]
              const agentCount = agentCountByRepo[name] || 0

              return (
                <a
                  key={name}
                  href={`#/repo/${encodeURIComponent(name)}`}
                  className="group flex items-center gap-3 px-4 py-3 bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.15] hover:border-white/[0.15] rounded-xl transition-all"
                >
                  {/* Color dot */}
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />

                  {/* Repo info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{name}</span>
                      {/* GitHub status badge */}
                      <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        hasGithub
                          ? 'bg-green/10 text-green'
                          : 'bg-red/10 text-red'
                      }`}>
                        <Github className="w-2.5 h-2.5" />
                        {hasGithub ? 'Connected' : 'No remote'}
                      </span>
                    </div>
                    <div className="text-xs text-text-secondary/50 truncate mt-0.5">
                      {repo.path}
                    </div>
                  </div>

                  {/* Agent count */}
                  {agentCount > 0 && (
                    <span className="px-2 py-0.5 bg-accent/10 text-accent text-xs font-medium rounded">
                      {agentCount} agent{agentCount > 1 ? 's' : ''}
                    </span>
                  )}

                  {/* Arrow */}
                  <ChevronRight className="w-4 h-4 text-text-secondary/30 group-hover:text-text-secondary transition-colors" />
                </a>
              )
            })}
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts Section */}
      <div className="mb-8">
        <h2 className="text-xs text-text-secondary/50 uppercase tracking-wider mb-4">Keyboard Shortcuts</h2>
        <div className="bg-white/[0.06] border border-white/[0.15] rounded-xl p-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">New agent</span>
              <kbd className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-xs text-text-secondary"><span className="text-sm">⌘</span> N</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Settings</span>
              <kbd className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-xs text-text-secondary"><span className="text-sm">⌘</span> ,</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Close agent</span>
              <kbd className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-xs text-text-secondary"><span className="text-sm">⌘</span> W</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Repositories</span>
              <kbd className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-xs text-text-secondary"><span className="text-sm">⌘</span> P</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Toggle agent info</span>
              <kbd className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-xs text-text-secondary"><span className="text-sm">⌘</span> I</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Toggle agents list</span>
              <kbd className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-xs text-text-secondary"><span className="text-sm">⌘</span> B</kbd>
            </div>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div>
        <h2 className="text-xs text-text-secondary/50 uppercase tracking-wider mb-4">About</h2>
        <div className="bg-white/[0.06] border border-white/[0.15] rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="font-medium">Magic Slash</div>
            <div className="text-xs text-text-secondary/50 mt-0.5">v{appVersion}</div>
          </div>
          <button
            onClick={handleWhatsNew}
            disabled={loadingWhatsNew}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent bg-accent/10 border border-accent/20 rounded-lg hover:bg-accent/20 transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {loadingWhatsNew ? 'Loading...' : "What's New"}
          </button>
        </div>
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

  const content = (() => {
    switch (route.page) {
      case 'repo':
        return <RepoPage repoName={route.params.name || ''} />
      default:
        return <WelcomePage />
    }
  })()

  return (
    <div className="h-full flex flex-col">
      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {content}
      </div>
    </div>
  )
}
