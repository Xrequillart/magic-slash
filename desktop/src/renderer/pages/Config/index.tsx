import { useState, useEffect, useMemo, Fragment } from 'react'
import { Github, Plus, ChevronRight, Folder, Sparkles, FolderGit, Keyboard, Info, Columns, Clock, MonitorSmartphone, Search, ChevronDown, AlertTriangle, Shield, GitPullRequest, History, Gauge, User, Coins, BarChart3, Bell } from 'lucide-react'
import { ProfileSection } from './ProfileSection'
import { RepoPage } from './RepoPage'
import { OrgPage } from './OrgPage'
import { LimitGauge } from '../../components/agent-info-sidebar/LimitGauge'
import { useStore } from '../../store'
import { useConfig } from '../../hooks/useConfig'
import type { SpotlightShortcut, LaunchMode, ClaudeAccount, SpendSummary, SettingsTab } from '../../../types'
import { showToast } from '../../components/Toast'
import { getProjectColorMap } from '../../utils/projectColors'
import { formatUsd } from '../../utils/usageStats'

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

const LAUNCH_MODE_OPTIONS: { value: LaunchMode; label: string; description: string }[] = [
  { value: 'plan', label: 'Plan', description: 'Read-only — Claude explores and analyzes but never modifies anything' },
  { value: 'default', label: 'Standard', description: 'Claude asks permission for every sensitive action' },
  { value: 'acceptEdits', label: 'Accept Edits', description: 'Auto-accepts file edits, still asks for bash commands' },
  { value: 'auto', label: 'Auto', description: 'Auto-approves most actions based on configured allowlists' },
  { value: 'bypassPermissions', label: 'Bypass', description: 'No permission checks — for sandboxed environments only' },
]

const SETTINGS_TABS: { id: SettingsTab; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'repositories', label: 'Repositories' },
  { id: 'organization', label: 'Organization' },
  { id: 'launch-mode', label: 'Launch Mode' },
  { id: 'features', label: 'Features' },
  { id: 'shortcuts', label: 'Shortcuts' },
  { id: 'usage', label: 'Usage' },
  { id: 'about', label: 'About' },
]

function formatTokensCompact(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return `${n}`
}

// Human-readable label for a Claude seat tier / billing type.
const SEAT_TIER_LABELS: Record<string, string> = {
  team_standard: 'Team',
  team_premium: 'Team Premium',
  enterprise: 'Enterprise',
  max: 'Max',
  pro: 'Pro',
}

function WelcomePage() {
  const { config, terminals, splitEnabled, toggleSplitEnabled, currentPage, setCurrentPage, setConfig, settingsInitialTab, setSettingsInitialTab } = useStore()
  const { addRepository, updateSplitEnabled, updateSpotlight, updateLaunchMode } = useConfig()
  // Deep-link support: another view can request a specific settings tab via the
  // store (e.g. the sidebar account menu → Organization). Initialise straight
  // from it so the requested tab paints on first render (no Profile → target
  // flash), then clear the store value once so later visits start on the default.
  const [activeTab, setActiveTab] = useState<SettingsTab>(settingsInitialTab ?? 'profile')

  useEffect(() => {
    if (!settingsInitialTab) return
    setActiveTab(settingsInitialTab)
    setSettingsInitialTab(null)
  }, [settingsInitialTab, setSettingsInitialTab])
  const [githubStatus, setGithubStatus] = useState<Record<string, boolean>>({})
  const [isAdding, setIsAdding] = useState(false)
  const [appVersion, setAppVersion] = useState('')
  const [loadingWhatsNew, setLoadingWhatsNew] = useState(false)
  const [autoStart, setAutoStart] = useState(false)
  const [spotlightEnabled, setSpotlightEnabled] = useState(config?.spotlight?.enabled ?? true)
  const [spotlightShortcut, setSpotlightShortcut] = useState(config?.spotlight?.shortcut ?? 'Control+Space')
  const [spotlightError, setSpotlightError] = useState(false)
  const [launchMode, setLaunchMode] = useState<LaunchMode>(config?.launchMode ?? 'default')
  const [showBypassWarning, setShowBypassWarning] = useState(false)
  const [historyEnabled, setHistoryEnabled] = useState(config?.historyEnabled ?? true)
  const [usageCardEnabled, setUsageCardEnabled] = useState(config?.usageCardEnabled ?? false)
  const [usageLogsEnabled, setUsageLogsEnabled] = useState(config?.usageLogsEnabled ?? false)
  const [dailyDigestEnabled, setDailyDigestEnabled] = useState(config?.dailyDigest?.enabled ?? false)
  const [prWatcherEnabled, setPrWatcherEnabled] = useState(config?.prReviews?.enabled ?? true)
  const [prWatcherInterval, setPrWatcherInterval] = useState(config?.prReviews?.pollIntervalMs ?? 60_000)
  const [prWatcherAutoLaunch, setPrWatcherAutoLaunch] = useState(config?.prReviews?.autoLaunchSkills ?? false)

  const configSpotlightEnabled = config?.spotlight?.enabled
  const configSpotlightShortcut = config?.spotlight?.shortcut
  useEffect(() => {
    if (configSpotlightEnabled !== undefined) setSpotlightEnabled(configSpotlightEnabled)
    if (configSpotlightShortcut !== undefined) setSpotlightShortcut(configSpotlightShortcut)
  }, [configSpotlightEnabled, configSpotlightShortcut])

  const configLaunchMode = config?.launchMode
  useEffect(() => {
    if (configLaunchMode !== undefined) setLaunchMode(configLaunchMode)
  }, [configLaunchMode])

  const configHistoryEnabled = config?.historyEnabled
  useEffect(() => {
    if (configHistoryEnabled !== undefined) setHistoryEnabled(configHistoryEnabled)
  }, [configHistoryEnabled])

  const configUsageCardEnabled = config?.usageCardEnabled
  useEffect(() => {
    if (configUsageCardEnabled !== undefined) setUsageCardEnabled(configUsageCardEnabled)
  }, [configUsageCardEnabled])

  const configUsageLogsEnabled = config?.usageLogsEnabled
  useEffect(() => {
    if (configUsageLogsEnabled !== undefined) setUsageLogsEnabled(configUsageLogsEnabled)
  }, [configUsageLogsEnabled])

  const configDailyDigestEnabled = config?.dailyDigest?.enabled
  useEffect(() => {
    if (configDailyDigestEnabled !== undefined) setDailyDigestEnabled(configDailyDigestEnabled)
  }, [configDailyDigestEnabled])

  const configPrWatcherEnabled = config?.prReviews?.enabled
  const configPrWatcherInterval = config?.prReviews?.pollIntervalMs
  const configPrWatcherAutoLaunch = config?.prReviews?.autoLaunchSkills
  useEffect(() => {
    if (configPrWatcherEnabled !== undefined) setPrWatcherEnabled(configPrWatcherEnabled)
    if (configPrWatcherInterval !== undefined) setPrWatcherInterval(configPrWatcherInterval)
    if (configPrWatcherAutoLaunch !== undefined) setPrWatcherAutoLaunch(configPrWatcherAutoLaunch)
  }, [configPrWatcherEnabled, configPrWatcherInterval, configPrWatcherAutoLaunch])

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

  const applyLaunchMode = async (mode: LaunchMode) => {
    const previous = launchMode
    setLaunchMode(mode)
    setShowBypassWarning(false)
    try {
      await updateLaunchMode(mode)
      showToast('Launch mode updated', 'success')
    } catch {
      setLaunchMode(previous)
    }
  }

  const handleLaunchModeChange = (mode: LaunchMode) => {
    if (mode === 'bypassPermissions') {
      setShowBypassWarning(true)
      return
    }
    applyLaunchMode(mode)
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

  // Latest known Claude account usage (plan rate limits). These are account-global,
  // so they're identical across agents — pick the most recently reported one that
  // actually carries plan limits (Claude.ai Pro/Max only).
  const accountUsage = useMemo(() => {
    let latest: NonNullable<typeof terminals[number]['metadata']>['usage'] | undefined
    for (const terminal of terminals) {
      const usage = terminal.metadata?.usage
      if (!usage) continue
      if (typeof usage.fiveHourPercent !== 'number' && typeof usage.sevenDayPercent !== 'number') continue
      if (!latest || (usage.updatedAt ?? 0) > (latest.updatedAt ?? 0)) {
        latest = usage
      }
    }
    return latest
  }, [terminals])

  // Re-render every 30s so the "resets in …" countdowns stay fresh.
  const [usageNow, setUsageNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setUsageNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  // Claude account identity + estimated spend, sourced from ~/.claude on disk.
  const [claudeAccount, setClaudeAccount] = useState<ClaudeAccount | null>(null)
  const [spend, setSpend] = useState<SpendSummary | null>(null)
  useEffect(() => {
    if (activeTab !== 'usage') return
    let cancelled = false
    window.electronAPI.usage.getAccount().then((a) => { if (!cancelled) setClaudeAccount(a) })
    window.electronAPI.usage.getSpend().then((s) => { if (!cancelled) setSpend(s) })
    return () => { cancelled = true }
  }, [activeTab])

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
    <div className="flex flex-col gap-6 animate-fade-in max-w-[62rem] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold mb-2">Settings</h1>
        <p className="text-text-secondary text-sm">
          Manage your repositories and configure Magic Slash
        </p>
      </div>

      {/* Tab navigation */}
      <div className="flex items-center gap-1 border-b border-white/[0.08]">
        {SETTINGS_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-all border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-accent text-white'
                : 'border-transparent text-text-secondary hover:text-white hover:border-white/20'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {activeTab === 'profile' && (
        <ProfileSection />
      )}

      {/* Organization tab */}
      {activeTab === 'organization' && (
        <OrgPage />
      )}

      {/* Repositories tab */}
      {activeTab === 'repositories' && <div>
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
      </div>}

      {/* Launch Mode tab */}
      {activeTab === 'launch-mode' && <div>
        <div className="flex items-center gap-2 text-sm text-text-secondary mb-4">
          <Shield className="w-4 h-4" />
          <span>Launch Mode</span>
        </div>
        <div className="bg-white/[0.06] border border-white/[0.15] rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Permission mode</div>
              <div className="text-xs text-text-secondary/50 mt-0.5">Controls the level of autonomy for all Claude Code agents</div>
            </div>
            <div className="relative">
              <select
                value={launchMode}
                onChange={(e) => handleLaunchModeChange(e.target.value as LaunchMode)}
                className="w-52 px-3 py-2 bg-white/[0.06] backdrop-blur-md border border-white/[0.08] rounded-lg text-sm focus:outline-none focus:border-accent transition-colors appearance-none cursor-pointer"
              >
                {LAUNCH_MODE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/50 pointer-events-none" />
            </div>
          </div>
          <div className="text-xs text-text-secondary/50">
            {LAUNCH_MODE_OPTIONS.find(o => o.value === launchMode)?.description}
          </div>
          {showBypassWarning && (
            <div className="flex flex-col gap-3 px-3 py-3 bg-red/10 border border-red/20 rounded-lg">
              <div className="flex items-center gap-2 text-xs text-red">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="font-medium">Security warning: Bypass mode disables all permission checks. Only use in sandboxed environments with no internet access.</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => applyLaunchMode('bypassPermissions')}
                  className="px-3 py-1.5 bg-red/20 hover:bg-red/30 text-red text-xs rounded-lg transition-colors"
                >
                  I understand, enable Bypass
                </button>
                <button
                  onClick={() => setShowBypassWarning(false)}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-text-secondary text-xs rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>}

      {/* Features tab */}
      {activeTab === 'features' && <div className="flex flex-col gap-8">

      {/* History Section */}
      <div>
        <div className="flex items-center gap-2 text-sm text-text-secondary mb-4">
          <History className="w-4 h-4" />
          <span>History</span>
        </div>
        <div className="bg-white/[0.06] border border-white/[0.15] rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Enable history</div>
              <div className="text-xs text-text-secondary/50 mt-0.5">Show activity history in the sidebar</div>
            </div>
            <button
              onClick={() => {
                const newValue = !historyEnabled
                setHistoryEnabled(newValue)
                window.electronAPI.config.setHistoryEnabled(newValue)
                if (!newValue && currentPage === 'history') {
                  setCurrentPage('terminals')
                }
              }}
              className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 flex-shrink-0 ${
                historyEnabled ? 'bg-accent' : 'bg-white/20'
              }`}
            >
              <div className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                historyEnabled ? 'translate-x-[18px]' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* Usage Card Section */}
      <div>
        <div className="flex items-center gap-2 text-sm text-text-secondary mb-4">
          <Gauge className="w-4 h-4" />
          <span>Usage card</span>
        </div>
        <div className="bg-white/[0.06] border border-white/[0.15] rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Show usage card in sidebar</div>
              <div className="text-xs text-text-secondary/50 mt-0.5">Display the connected account and the Session (5h) / Weekly (7d) gauges at the bottom of the sidebar</div>
            </div>
            <button
              onClick={async () => {
                const newValue = !usageCardEnabled
                setUsageCardEnabled(newValue)
                const result = await window.electronAPI.config.setUsageCardEnabled(newValue)
                setConfig(result.config)
              }}
              className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 flex-shrink-0 ${
                usageCardEnabled ? 'bg-accent' : 'bg-white/20'
              }`}
            >
              <div className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                usageCardEnabled ? 'translate-x-[18px]' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* Usage Logs Section (GDPR opt-in — off by default) */}
      <div>
        <div className="flex items-center gap-2 text-sm text-text-secondary mb-4">
          <BarChart3 className="w-4 h-4" />
          <span>Usage logs</span>
        </div>
        <div className="bg-white/[0.06] border border-white/[0.15] rounded-xl p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium">Share my usage with my organization</div>
              <div className="text-xs text-text-secondary/50 mt-0.5">
                Off by default (GDPR opt-in). When enabled, an aggregated summary (estimated cost, lines added/removed, duration, model) is recorded for your organization at the end of each session, so admins can track team usage. No prompts or code are ever sent. You can turn it off at any time.
              </div>
            </div>
            <button
              onClick={async () => {
                const newValue = !usageLogsEnabled
                setUsageLogsEnabled(newValue)
                const result = await window.electronAPI.config.setUsageLogsEnabled(newValue)
                setConfig(result.config)
              }}
              className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 flex-shrink-0 ${
                usageLogsEnabled ? 'bg-accent' : 'bg-white/20'
              }`}
            >
              <div className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                usageLogsEnabled ? 'translate-x-[18px]' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* Daily Digest Section (opt-in — off by default) */}
      <div>
        <div className="flex items-center gap-2 text-sm text-text-secondary mb-4">
          <Bell className="w-4 h-4" />
          <span>Daily digest</span>
        </div>
        <div className="bg-white/[0.06] border border-white/[0.15] rounded-xl p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium">Daily team digest</div>
              <div className="text-xs text-text-secondary/50 mt-0.5">
                Off by default. When enabled, you get one notification at 9:00 AM summarizing your team's activity from the last 24 hours (PRs shipped, tickets moved to Done). Nothing is sent when there was no activity.
              </div>
            </div>
            <button
              onClick={async () => {
                const newValue = !dailyDigestEnabled
                setDailyDigestEnabled(newValue)
                const result = await window.electronAPI.config.setDailyDigestEnabled(newValue)
                setConfig(result.config)
              }}
              className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 flex-shrink-0 ${
                dailyDigestEnabled ? 'bg-accent' : 'bg-white/20'
              }`}
            >
              <div className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                dailyDigestEnabled ? 'translate-x-[18px]' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>
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

      {/* PR Review Watcher Section */}
      <div>
        <div className="flex items-center gap-2 text-sm text-text-secondary mb-4">
          <GitPullRequest className="w-4 h-4" />
          <span>PR Review Watcher</span>
        </div>
        <div className="bg-white/[0.06] border border-white/[0.15] rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Watch PR reviews</div>
              <div className="text-xs text-text-secondary/50 mt-0.5">Poll GitHub to track review status on agents' pull requests</div>
            </div>
            <button
              onClick={() => {
                const newValue = !prWatcherEnabled
                setPrWatcherEnabled(newValue)
                window.electronAPI.prWatcher.setEnabled(newValue)
              }}
              className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 flex-shrink-0 ${
                prWatcherEnabled ? 'bg-accent' : 'bg-white/20'
              }`}
            >
              <div className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                prWatcherEnabled ? 'translate-x-[18px]' : 'translate-x-0'
              }`} />
            </button>
          </div>
          {prWatcherEnabled && (
            <>
              <div className="border-t border-white/5 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Polling interval</div>
                    <div className="text-xs text-text-secondary/50 mt-0.5">How often the GitHub API is polled</div>
                  </div>
                  <div className="relative">
                    <select
                      value={prWatcherInterval}
                      onChange={(e) => {
                        const newInterval = parseInt(e.target.value, 10)
                        setPrWatcherInterval(newInterval)
                        window.electronAPI.prWatcher.setInterval(newInterval)
                      }}
                      className="w-52 px-3 py-2 bg-white/[0.06] backdrop-blur-md border border-white/[0.08] rounded-lg text-sm focus:outline-none focus:border-accent transition-colors appearance-none cursor-pointer"
                    >
                      <option value={30_000}>30 seconds</option>
                      <option value={60_000}>1 minute</option>
                      <option value={120_000}>2 minutes</option>
                      <option value={300_000}>5 minutes</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/50 pointer-events-none" />
                  </div>
                </div>
              </div>
              <div className="border-t border-white/5 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Auto-launch skills</div>
                    <div className="text-xs text-text-secondary/50 mt-0.5">Send /magic:resolve or /magic:done directly to the agent's terminal. Disabled by default for safety.</div>
                  </div>
                  <button
                    onClick={() => {
                      const newValue = !prWatcherAutoLaunch
                      setPrWatcherAutoLaunch(newValue)
                      window.electronAPI.prWatcher.setAutoLaunchSkills(newValue)
                    }}
                    className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 flex-shrink-0 ${
                      prWatcherAutoLaunch ? 'bg-accent' : 'bg-white/20'
                    }`}
                  >
                    <div className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                      prWatcherAutoLaunch ? 'translate-x-[18px]' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>
            </>
          )}
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
                  className="w-52 px-3 py-2 bg-white/[0.06] backdrop-blur-md border border-white/[0.08] rounded-lg text-sm focus:outline-none focus:border-accent transition-colors appearance-none cursor-pointer disabled:opacity-50"
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

      </div>}

      {/* Shortcuts tab */}
      {activeTab === 'shortcuts' && <div>
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
      </div>}

      {/* Usage tab */}
      {activeTab === 'usage' && <div className="flex flex-col lg:flex-row gap-6">

        {/* Left column: account + estimated spend */}
        <div className="flex-1 min-w-0 flex flex-col gap-6">
          {/* Current account */}
          <div>
            <div className="flex items-center gap-2 text-sm text-text-secondary mb-4">
              <User className="w-4 h-4" />
              <span>Current account</span>
            </div>
            <div className="bg-white/[0.06] border border-white/[0.15] rounded-xl p-4">
              {claudeAccount ? (
                <div className="space-y-2 text-sm">
                  {claudeAccount.displayName && (
                    <div className="flex items-center justify-between">
                      <span className="text-text-secondary/60">Name</span>
                      <span className="font-medium">{claudeAccount.displayName}</span>
                    </div>
                  )}
                  {claudeAccount.emailAddress && (
                    <div className="flex items-center justify-between">
                      <span className="text-text-secondary/60">Email</span>
                      <span className="font-mono text-xs">{claudeAccount.emailAddress}</span>
                    </div>
                  )}
                  {claudeAccount.organizationName && (
                    <div className="flex items-center justify-between">
                      <span className="text-text-secondary/60">Organization</span>
                      <span className="font-medium">{claudeAccount.organizationName}</span>
                    </div>
                  )}
                  {claudeAccount.seatTier && (
                    <div className="flex items-center justify-between">
                      <span className="text-text-secondary/60">Plan</span>
                      <span className="px-1.5 py-0.5 rounded-md bg-accent/15 text-accent text-xs font-medium">
                        {SEAT_TIER_LABELS[claudeAccount.seatTier] ?? claudeAccount.seatTier}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-text-secondary/50 text-center py-2">
                  No Claude account detected.
                </div>
              )}
            </div>
          </div>

          {/* Estimated spend & tokens */}
          <div>
            <div className="flex items-center gap-2 text-sm text-text-secondary mb-4">
              <Coins className="w-4 h-4" />
              <span>Spend &amp; tokens</span>
            </div>
            <div className="bg-white/[0.06] border border-white/[0.15] rounded-xl p-4">
              {spend?.hasData ? (
                <>
                  <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-2 text-sm items-baseline">
                    <span className="text-text-secondary/50 text-xs uppercase tracking-wider"></span>
                    <span className="text-text-secondary/50 text-xs uppercase tracking-wider text-right">Tokens</span>
                    <span className="text-text-secondary/50 text-xs uppercase tracking-wider text-right">Est. cost</span>

                    {([
                      { label: 'Today', b: spend.today },
                      { label: 'This week', b: spend.week },
                      { label: 'All time', b: spend.allTime },
                    ]).map(({ label, b }) => (
                      <Fragment key={label}>
                        <span className="text-text-secondary">{label}</span>
                        <span className="font-mono text-right">{formatTokensCompact(b.tokens)}</span>
                        <span className="font-mono text-right text-white">~{formatUsd(b.costUsd)}</span>
                      </Fragment>
                    ))}
                  </div>
                  <div className="text-[11px] text-text-secondary/40 mt-3 leading-snug">
                    Cost is an estimate (tokens × public API pricing), not billed spend — your plan is a subscription.
                  </div>
                </>
              ) : (
                <div className="text-sm text-text-secondary/50 text-center py-2">
                  No usage history found in ~/.claude yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column: account rate-limit gauges */}
        <div className="lg:w-[280px] shrink-0">
          <div className="flex items-center gap-2 text-sm text-text-secondary mb-4">
            <Gauge className="w-4 h-4" />
            <span>Rate limits</span>
          </div>
          <div className="bg-white/[0.06] border border-white/[0.15] rounded-xl p-4">
            {accountUsage ? (
              <div className="flex items-start justify-center gap-8 py-2">
                {typeof accountUsage.fiveHourPercent === 'number' && (
                  <LimitGauge
                    label="Session (5h)"
                    percent={accountUsage.fiveHourPercent}
                    resetsAt={accountUsage.fiveHourResetsAt}
                    now={usageNow}
                  />
                )}
                {typeof accountUsage.sevenDayPercent === 'number' && (
                  <LimitGauge
                    label="Weekly (7d)"
                    percent={accountUsage.sevenDayPercent}
                    resetsAt={accountUsage.sevenDayResetsAt}
                    now={usageNow}
                  />
                )}
              </div>
            ) : (
              <div className="text-sm text-text-secondary/50 text-center py-4">
                No live rate-limit data yet — available for Claude.ai Pro/Max after the first agent activity.
              </div>
            )}
          </div>
        </div>
      </div>}

      {/* About tab */}
      {activeTab === 'about' && <div>
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
      </div>}
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
