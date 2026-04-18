import { useState, useEffect, useMemo } from 'react'
import { Github, Plus, ChevronRight, Folder, Sparkles, FolderGit, Keyboard, Info, Columns, Clock, MonitorSmartphone, Search, ChevronDown, AlertTriangle } from 'lucide-react'
import { RepoPage } from './RepoPage'
import { useStore } from '../../store'
import { useConfig } from '../../hooks/useConfig'
import type { SpotlightShortcut } from '../../../types'
import { showToast } from '../../components/Toast'
import { getProjectColorMap } from '../../utils/projectColors'

const SPOTLIGHT_OPTIONS: { label: string; value: string }[] = [
  { label: '\u2303 Space', value: 'Control+Space' },
  { label: '\u2303\u21E7 Space', value: 'Control+Shift+Space' },
  { label: '\u2325 Space', value: 'Alt+Space' },
  { label: '\u2325\u21E7 Space', value: 'Alt+Shift+Space' },
  { label: '\u2303 M', value: 'Control+M' },
  { label: '\u2303\u21E7 M', value: 'Control+Shift+M' },
  { label: '\u2325 M', value: 'Alt+M' },
  { label: '\u2325\u21E7 M', value: 'Alt+Shift+M' },
]

function WelcomePage() {
  const { config, terminals, splitEnabled, toggleSplitEnabled } = useStore()
  const { addRepository, updateSplitEnabled, updateSpotlight } = useConfig()
  const [githubStatus, setGithubStatus] = useState<Record<string, boolean>>({})
  const [isAdding, setIsAdding] = useState(false)
  const [appVersion, setAppVersion] = useState('')
  const [loadingWhatsNew, setLoadingWhatsNew] = useState(false)
  const [autoStart, setAutoStart] = useState(false)
  const [spotlightEnabled, setSpotlightEnabled] = useState(config?.spotlight?.enabled ?? true)
  const [spotlightShortcut, setSpotlightShortcut] = useState(config?.spotlight?.shortcut ?? 'Control+Space')
  const [spotlightError, setSpotlightError] = useState(false)

  const configSpotlightEnabled = config?.spotlight?.enabled
  const configSpotlightShortcut = config?.spotlight?.shortcut
  useEffect(() => {
    if (configSpotlightEnabled !== undefined) setSpotlightEnabled(configSpotlightEnabled)
    if (configSpotlightShortcut !== undefined) setSpotlightShortcut(configSpotlightShortcut)
  }, [configSpotlightEnabled, configSpotlightShortcut])

  const handleSpotlightToggle = async () => {
    const newEnabled = !spotlightEnabled
    setSpotlightEnabled(newEnabled)
    setSpotlightError(false)
    try {
      const result = await updateSpotlight({ enabled: newEnabled, shortcut: spotlightShortcut })
      if (newEnabled && !result.registered) {
        setSpotlightError(true)
      }
    } catch {
      setSpotlightEnabled(!newEnabled) // revert on error
    }
  }

  const handleSpotlightShortcutChange = async (newShortcut: SpotlightShortcut) => {
    const previousShortcut = spotlightShortcut
    setSpotlightShortcut(newShortcut)
    setSpotlightError(false)
    try {
      const result = await updateSpotlight({ enabled: spotlightEnabled, shortcut: newShortcut })
      if (spotlightEnabled && !result.registered) {
        setSpotlightError(true)
      }
    } catch {
      setSpotlightShortcut(previousShortcut)
    }
  }

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

  // Fetch app version and auto-start state
  useEffect(() => {
    window.electronAPI.updater.getVersion().then(setAppVersion)
    window.electronAPI.config.getAutoStart().then(setAutoStart)
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
    <div className="flex flex-col gap-10 animate-fade-in max-w-[62rem] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold mb-2">Settings</h1>
        <p className="text-text-secondary text-sm">
          Manage your repositories and configure Magic Slash
        </p>
      </div>

      {/* Repositories Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <FolderGit className="w-4 h-4" />
            <span>Repositories</span>
          </div>
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

      {/* Split View Section */}
      <div>
        <div className="flex items-center gap-2 text-sm text-text-secondary mb-4">
          <Columns className="w-4 h-4" />
          <span>Split View</span>
        </div>
        <div className="bg-white/[0.06] border border-white/[0.15] rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Enable split view</div>
              <div className="text-xs text-text-secondary/50 mt-0.5">Display two agents side by side on wide screens</div>
            </div>
            <button
              onClick={() => { toggleSplitEnabled(); updateSplitEnabled(!splitEnabled) }}
              className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 flex-shrink-0 ${
                splitEnabled ? 'bg-accent' : 'bg-white/20'
              }`}
            >
              <div className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                splitEnabled ? 'translate-x-[18px]' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* Spotlight Section */}
      <div>
        <div className="flex items-center gap-2 text-sm text-text-secondary mb-4">
          <Search className="w-4 h-4" />
          <span>Spotlight</span>
        </div>
        <div className="bg-white/[0.06] border border-white/[0.15] rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Enable global shortcut</div>
              <div className="text-xs text-text-secondary/50 mt-0.5">Open the Quick Launch panel from anywhere with a keyboard shortcut</div>
            </div>
            <button
              onClick={handleSpotlightToggle}
              className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 flex-shrink-0 ${
                spotlightEnabled ? 'bg-accent' : 'bg-white/20'
              }`}
            >
              <div className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                spotlightEnabled ? 'translate-x-[18px]' : 'translate-x-0'
              }`} />
            </button>
          </div>
          <div className="border-t border-white/5 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Shortcut</div>
                <div className="text-xs text-text-secondary/50 mt-0.5">Choose the keyboard shortcut to toggle Quick Launch</div>
              </div>
              <div className="relative">
                <select
                  value={spotlightShortcut}
                  onChange={(e) => handleSpotlightShortcutChange(e.target.value as SpotlightShortcut)}
                  disabled={!spotlightEnabled}
                  className="w-52 px-3 py-2 bg-bg border border-white/10 rounded-lg text-sm focus:outline-none focus:border-accent transition-colors appearance-none cursor-pointer disabled:opacity-50"
                >
                  {SPOTLIGHT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/50 pointer-events-none" />
              </div>
            </div>
          </div>
          {spotlightError && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red/10 border border-red/20 rounded-lg text-xs text-red">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Failed to register shortcut. It may be in use by another application. Try a different shortcut.</span>
            </div>
          )}
        </div>
      </div>

      {/* Background App Section */}
      <div>
        <div className="flex items-center gap-2 text-sm text-text-secondary mb-4">
          <MonitorSmartphone className="w-4 h-4" />
          <span>Background App</span>
        </div>
        <div className="bg-white/[0.06] border border-white/[0.15] rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Launch at login</div>
              <div className="text-xs text-text-secondary/50 mt-0.5">Start Magic Slash automatically when you log in</div>
            </div>
            <button
              onClick={() => {
                const newValue = !autoStart
                setAutoStart(newValue)
                window.electronAPI.config.setAutoStart(newValue)
              }}
              className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 flex-shrink-0 ${
                autoStart ? 'bg-accent' : 'bg-white/20'
              }`}
            >
              <div className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                autoStart ? 'translate-x-[18px]' : 'translate-x-0'
              }`} />
            </button>
          </div>
          <div className="border-t border-white/5 pt-4">
            <div className="text-sm font-medium mb-1">Menu bar</div>
            <div className="text-xs text-text-secondary/50">
              Magic Slash runs in the menu bar. Click the tray icon to see agent status, or right-click for quick actions. Closing the window hides it to the tray.
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Section */}
      <div>
        <div className="flex items-center gap-2 text-sm text-text-secondary mb-4">
          <Keyboard className="w-4 h-4" />
          <span>Keyboard Shortcuts</span>
        </div>
        <div className="bg-white/[0.06] border border-white/[0.15] rounded-xl p-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">New agent</span>
              <kbd className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-xs text-text-secondary"><span className="text-sm">⌘</span> N</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Duplicate agent</span>
              <kbd className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-xs text-text-secondary"><span className="text-sm">⌘</span> D</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Close agent</span>
              <kbd className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-xs text-text-secondary"><span className="text-sm">⌘</span> W</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Previous agent</span>
              <kbd className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-xs text-text-secondary"><span className="text-sm">⌘</span> ↑</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Next agent</span>
              <kbd className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-xs text-text-secondary"><span className="text-sm">⌘</span> ↓</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Toggle agent info</span>
              <kbd className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-xs text-text-secondary"><span className="text-sm">⌘</span> I</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Toggle agents list</span>
              <kbd className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-xs text-text-secondary"><span className="text-sm">⌘</span> B</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Skills</span>
              <kbd className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-xs text-text-secondary"><span className="text-sm">⌘</span> ;</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Repositories</span>
              <kbd className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-xs text-text-secondary"><span className="text-sm">⌘</span> P</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Settings</span>
              <kbd className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-xs text-text-secondary"><span className="text-sm">⌘</span> ,</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Toggle Split View</span>
              <kbd className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-xs text-text-secondary"><span className="text-sm">⌘</span> /</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Quick Launch</span>
              {spotlightEnabled ? (
                <kbd className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-xs text-text-secondary">
                  {SPOTLIGHT_OPTIONS.find(o => o.value === spotlightShortcut)?.label ?? spotlightShortcut}
                </kbd>
              ) : (
                <span className="px-2 py-0.5 text-xs text-text-secondary/40">Disabled</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div>
        <div className="flex items-center gap-2 text-sm text-text-secondary mb-4">
          <Info className="w-4 h-4" />
          <span>About</span>
        </div>
        <div className="bg-white/[0.06] border border-white/[0.15] rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="font-medium">Magic Slash</div>
            <div className="text-xs text-text-secondary/50 mt-0.5">v{appVersion}</div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://xrequillart.github.io/magic-slash/documentation.html#changelog"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-white/10 rounded-lg hover:bg-white/5 hover:text-white transition-colors"
            >
              <Clock className="w-3.5 h-3.5" />
              Changelog
            </a>
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
