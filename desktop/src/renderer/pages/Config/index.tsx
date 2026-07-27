import { useState, useEffect, useMemo, useRef, Fragment } from 'react'
import { Github, Plus, ChevronRight, Folder, Sparkles, FolderGit, Keyboard, Info, Columns, Clock, MonitorSmartphone, Search, ChevronDown, AlertTriangle, Shield, GitPullRequest, History, Gauge, User, Coins, BarChart3, Bell, LogOut, Building2, Lock, CircleUserRound, SquareTerminal, Palette, Languages, type LucideIcon } from 'lucide-react'
import { AccountPage } from './AccountPage'
import { RepoPage } from './RepoPage'
import { OrgPage } from './OrgPage'
import { AppearancePage } from './AppearancePage'
import { LanguagePage } from './LanguagePage'
import { SectionHeader } from './SectionHeader'
import { RateLimitBar } from '../../components/agent-info-sidebar/LimitGauge'
import { useStore } from '../../store'
import { useConfig } from '../../hooks/useConfig'
import { useAuth } from '../../hooks/useAuth'
import type { SpotlightShortcut, LaunchMode, ClaudeAccount, SpendSummary, SettingsTab, RepositoryConfig } from '../../../types'
import { showToast } from '../../components/Toast'
import { getProjectColorMap } from '../../utils/projectColors'
import { formatUsd } from '../../utils/usageStats'
import { useLocale, useT, type MessageKey, type Translate } from '../../i18n'

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

// Message keys rather than labels, for the same reason as SETTINGS_TABS below:
// module scope is evaluated once at import, so a literal here would pin the
// select to the boot language.
const LAUNCH_MODE_OPTIONS: { value: LaunchMode; labelKey: MessageKey; descriptionKey: MessageKey }[] = [
  { value: 'plan', labelKey: 'settings.launchMode.plan', descriptionKey: 'settings.launchMode.plan.help' },
  { value: 'default', labelKey: 'settings.launchMode.default', descriptionKey: 'settings.launchMode.default.help' },
  { value: 'acceptEdits', labelKey: 'settings.launchMode.acceptEdits', descriptionKey: 'settings.launchMode.acceptEdits.help' },
  { value: 'auto', labelKey: 'settings.launchMode.auto', descriptionKey: 'settings.launchMode.auto.help' },
  { value: 'bypassPermissions', labelKey: 'settings.launchMode.bypass', descriptionKey: 'settings.launchMode.bypass.help' },
]

// Icons mirror each tab's own section header, so the rail and the content agree.
// Claude Code is the exception: it holds four sections (account, launch mode,
// rate usage, spend) and gets the CLI's own icon rather than any one of theirs.
//
// Message KEYS, not labels: this list is module scope, so a `t()` call here would
// be evaluated once at import and pin the rail to whatever language the app
// booted in. The labels are resolved in the render path instead.
const SETTINGS_TABS: { id: SettingsTab; labelKey: MessageKey; icon: LucideIcon }[] = [
  { id: 'account', labelKey: 'settings.tab.account', icon: CircleUserRound },
  { id: 'organization', labelKey: 'settings.tab.organization', icon: Building2 },
  { id: 'repositories', labelKey: 'settings.tab.repositories', icon: FolderGit },
  { id: 'claude-code', labelKey: 'settings.tab.claudeCode', icon: SquareTerminal },
  { id: 'appearance', labelKey: 'settings.tab.appearance', icon: Palette },
  { id: 'language', labelKey: 'settings.tab.language', icon: Languages },
  { id: 'features', labelKey: 'settings.tab.features', icon: Sparkles },
  { id: 'shortcuts', labelKey: 'settings.tab.shortcuts', icon: Keyboard },
  { id: 'about', labelKey: 'settings.tab.about', icon: Info },
]

// toFixed would pin the decimal separator to a point, so the mantissa goes
// through toLocaleString: French wants "12,5 M", not "12.5M". The unit itself is
// a catalogue entry — French abbreviates a billion "Md" and spaces it.
function formatTokensCompact(n: number, locale: string, t: Translate): string {
  const scaled = (value: number, digits: number, unit: string) =>
    `${value.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits })}${unit}`
  if (n >= 1_000_000_000) return scaled(n / 1_000_000_000, 2, t('usage.unit.billion'))
  if (n >= 1_000_000) return scaled(n / 1_000_000, 1, t('usage.unit.million'))
  if (n >= 1_000) return scaled(n / 1_000, 1, t('usage.unit.thousand'))
  return n.toLocaleString(locale)
}

// Human-readable label for a Claude seat tier / billing type. Not translated:
// these are Anthropic's own plan names, identical in every language.
const SEAT_TIER_LABELS: Record<string, string> = {
  team_standard: 'Team',
  team_premium: 'Team Premium',
  enterprise: 'Enterprise',
  max: 'Max',
  pro: 'Pro',
}

/** Local-part of an email → capitalized first name. "xavier@x" → "Xavier". */
function displayNameFromEmail(email: string | undefined, fallback: string): string {
  if (!email) return fallback
  const first = email.split('@')[0].split(/[._+-]/)[0]
  if (!first) return fallback
  return first.charAt(0).toUpperCase() + first.slice(1)
}

/**
 * Footer pinned to the bottom of the settings tab rail. Shows the signed-in
 * account, an organization switcher (when the user belongs to more than one),
 * and a Sign out action. Moved here from the sidebar account dropdown. There is
 * no organization switcher: every org's repositories are visible at once.
 */
function SettingsAccountFooter() {
  const { status, logout } = useAuth()
  const t = useT()

  if (!status.enabled || !status.loggedIn) return null

  const name = displayNameFromEmail(status.user?.email, t('sidebar.accountFallback'))
  const initial = name.charAt(0).toUpperCase()

  const handleLogout = async () => {
    try {
      await logout()
    } catch {
      // best-effort; the hook's statusChanged subscription reconciles state.
    }
  }

  return (
    <div className="mt-auto border-t border-line-field p-2 space-y-1">
      {/* Account identity */}
      <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-text-secondary">
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-accent/20 text-accent text-[10px] font-semibold shrink-0">
          {initial}
        </span>
        <span className="truncate">{name}</span>
      </div>

      {/* Sign out */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-text-secondary rounded-lg hover:bg-surface-strong hover:text-ink transition-colors"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span>{t('settings.footer.signOut')}</span>
      </button>
    </div>
  )
}

/** Hash route within Settings. `repo` is a sub-page of the Repositories tab. */
interface SettingsRoute {
  page: string
  params: { name?: string }
}

function WelcomePage({ route }: { route: SettingsRoute }) {
  const { config, terminals, splitEnabled, toggleSplitEnabled, setConfig, settingsInitialTab, setSettingsInitialTab } = useStore()
  const { addRepository, updateSplitEnabled, updateSpotlight, updateLaunchMode } = useConfig()
  const orgs = useStore((s) => s.orgs)
  const t = useT()
  const locale = useLocale()
  // Deep-link support: another view can request a specific settings tab via the
  // store (e.g. the sidebar account menu → Organization). Initialise straight
  // from it so the requested tab paints on first render (no Profile → target
  // flash), then clear the store value once so later visits start on the default.
  const [activeTab, setActiveTab] = useState<SettingsTab>(settingsInitialTab ?? 'account')

  useEffect(() => {
    if (!settingsInitialTab) return
    setActiveTab(settingsInitialTab)
    setSettingsInitialTab(null)
  }, [settingsInitialTab, setSettingsInitialTab])

  // A repository detail page replaces the tab content but keeps the rail, so the
  // menu never disappears. Repositories stays lit — the detail is its sub-page.
  const isRepoRoute = route.page === 'repo'
  const railActiveTab = isRepoRoute ? 'repositories' : activeTab
  const contentTab = isRepoRoute ? null : activeTab

  /**
   * What the content pane is currently showing. Used as its React key, so
   * moving between tabs — or between two repository pages — remounts the pane
   * and replays its entrance animation. Without the key React would reuse the
   * same element and the new page would simply appear.
   */
  const contentKey = isRepoRoute ? `repo:${route.params.name ?? ''}` : activeTab

  // A page opens at its top. The pane is the scroll container and it survives
  // the switch, so without this the next page inherits the previous page's
  // offset — a short one can open already scrolled past its own heading.
  const contentScrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    contentScrollRef.current?.scrollTo({ top: 0 })
  }, [contentKey])

  const handleSelectTab = (tab: SettingsTab) => {
    setActiveTab(tab)
    // Picking a tab from a repo detail page must also leave that hash route,
    // otherwise the detail would keep covering the content pane.
    if (window.location.hash && window.location.hash !== '#/') {
      window.location.hash = '#/'
    }
  }
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
  const [usageCardEnabled, setUsageCardEnabled] = useState(config?.usageCardEnabled ?? true)
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
      showToast(t('toast.launchModeUpdated'), 'success')
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
        {/* Color dot */}
        <span
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />

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
        <ChevronRight className="w-4 h-4 text-text-secondary/30 group-hover:text-text-secondary transition-colors" />
      </a>
    )
  }

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

  // accountUsage can exist while carrying neither percentage, so gate the bars on
  // the values actually rendered rather than on the object itself.
  const hasRateLimits =
    typeof accountUsage?.fiveHourPercent === 'number' ||
    typeof accountUsage?.sevenDayPercent === 'number'

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
    if (activeTab !== 'claude-code') return
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
        showToast(t('toast.releaseNotesFailed'), 'error')
        return
      }
      window.dispatchEvent(new CustomEvent('show:whats-new', {
        detail: { version: appVersion, releaseNotes: html },
      }))
    } catch {
      showToast(t('toast.releaseNotesFailed'), 'error')
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
    <div className="flex h-full animate-fade-in">
      {/* Left rail: vertical tabs, account footer */}
      <div className="w-56 shrink-0 flex flex-col border-r border-line-field bg-surface-sunken-soft">
        <nav className="flex-1 overflow-y-auto px-2 pt-3 space-y-0.5">
          {SETTINGS_TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => handleSelectTab(tab.id)}
                className={`w-full flex items-center gap-2.5 text-left px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                  railActiveTab === tab.id
                    ? 'bg-accent/15 text-ink'
                    : 'text-text-secondary hover:text-ink hover:bg-surface'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{t(tab.labelKey)}</span>
              </button>
            )
          })}
        </nav>
        <SettingsAccountFooter />
      </div>

      {/* Content */}
      <div ref={contentScrollRef} className="flex-1 overflow-y-auto p-6">
        <div key={contentKey} className="max-w-4xl flex flex-col gap-6 animate-page-in">

      {/* Repository detail — sub-page of the Repositories tab */}
      {isRepoRoute && <RepoPage repoName={route.params.name || ''} />}

      {/* Account tab — cloud identity + Claude profile */}
      {contentTab === 'account' && (
        <AccountPage />
      )}

      {/* Organization tab */}
      {contentTab === 'organization' && (
        <OrgPage />
      )}

      {/* Repositories tab */}
      {contentTab === 'repositories' && <div>
        <SectionHeader
          icon={FolderGit}
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
            <Folder className="w-8 h-8 text-text-secondary/30 mx-auto mb-3" />
            <div className="text-sm text-text-secondary/50 mb-1">{t('settings.repos.emptyTitle')}</div>
            <div className="text-xs text-text-secondary/30">{t('settings.repos.emptyHint')}</div>
          </button>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Personal */}
            <div>
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-text-secondary/50 mb-2">
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
                  <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-text-secondary/50 mb-2">
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

      {/* Claude Code tab — everything about the CLI itself: the account it runs
          as, how it launches, and how much of the plan it is consuming. */}
      {contentTab === 'claude-code' && <div className="flex flex-col gap-8">

      {/* Account — the Claude identity read from ~/.claude, not the cloud account */}
      <div>
        <SectionHeader icon={User} title={t('settings.claude.account')} />
        <div className="bg-surface border border-line-strong rounded-xl p-4">
          {claudeAccount ? (
            <div className="space-y-2 text-sm">
              {claudeAccount.displayName && (
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary/60">{t('settings.claude.name')}</span>
                  <span className="font-medium">{claudeAccount.displayName}</span>
                </div>
              )}
              {claudeAccount.emailAddress && (
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary/60">{t('settings.claude.email')}</span>
                  <span className="text-xs">{claudeAccount.emailAddress}</span>
                </div>
              )}
              {claudeAccount.organizationName && (
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary/60">{t('settings.claude.organization')}</span>
                  <span className="font-medium">{claudeAccount.organizationName}</span>
                </div>
              )}
              {claudeAccount.seatTier && (
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary/60">{t('settings.claude.plan')}</span>
                  <span className="px-1.5 py-0.5 rounded-md bg-accent/15 text-accent text-xs font-medium">
                    {SEAT_TIER_LABELS[claudeAccount.seatTier] ?? claudeAccount.seatTier}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-text-secondary/50 text-center py-2">
              {t('settings.claude.noAccount')}
            </div>
          )}
        </div>
      </div>

      {/* Launch mode */}
      <div>
        <SectionHeader icon={Shield} title={t('settings.launchMode.section')} />
        <div className="bg-surface border border-line-strong rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{t('settings.launchMode.label')}</div>
              <div className="text-xs text-text-secondary/50 mt-0.5">{t('settings.launchMode.help')}</div>
            </div>
            <div className="relative">
              <select
                value={launchMode}
                onChange={(e) => handleLaunchModeChange(e.target.value as LaunchMode)}
                className="w-52 px-3 py-2 bg-surface border border-line-field rounded-lg text-sm focus:outline-none focus:border-accent transition-colors appearance-none cursor-pointer"
              >
                {LAUNCH_MODE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/50 pointer-events-none" />
            </div>
          </div>
          <div className="text-xs text-text-secondary/50">
            {(() => {
              const active = LAUNCH_MODE_OPTIONS.find(o => o.value === launchMode)
              return active ? t(active.descriptionKey) : null
            })()}
          </div>
          {showBypassWarning && (
            <div className="flex flex-col gap-3 px-3 py-3 bg-red/10 border border-red/20 rounded-lg">
              <div className="flex items-center gap-2 text-xs text-red">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="font-medium">{t('settings.launchMode.bypassWarning')}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => applyLaunchMode('bypassPermissions')}
                  className="px-3 py-1.5 bg-red/20 hover:bg-red/30 text-red text-xs rounded-lg transition-colors"
                >
                  {t('settings.launchMode.bypassConfirm')}
                </button>
                <button
                  onClick={() => setShowBypassWarning(false)}
                  className="px-3 py-1.5 bg-surface-strong hover:bg-ink/15 text-text-secondary text-xs rounded-lg transition-colors"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rate usage — plan limits reported by the running agents */}
      <div>
        <SectionHeader icon={Gauge} title={t('settings.rate.section')} />
        <div className="bg-surface border border-line-strong rounded-xl p-4">
          {hasRateLimits ? (
            <div className="space-y-4">
              {typeof accountUsage?.fiveHourPercent === 'number' && (
                <RateLimitBar
                  label={t('usage.session')}
                  percent={accountUsage.fiveHourPercent}
                  resetsAt={accountUsage.fiveHourResetsAt}
                  now={usageNow}
                />
              )}
              {typeof accountUsage?.sevenDayPercent === 'number' && (
                <RateLimitBar
                  label={t('usage.weekly')}
                  percent={accountUsage.sevenDayPercent}
                  resetsAt={accountUsage.sevenDayResetsAt}
                  now={usageNow}
                />
              )}
            </div>
          ) : (
            <div className="text-sm text-text-secondary/50 text-center py-2">
              {t('settings.rate.empty')}
            </div>
          )}
        </div>
      </div>

      {/* Spend & tokens */}
      <div>
        <SectionHeader icon={Coins} title={t('settings.spend.section')} />
        <div className="bg-surface border border-line-strong rounded-xl p-4">
          {spend?.hasData ? (
            <>
              <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-2 text-sm items-baseline">
                <span className="text-text-secondary/50 text-xs uppercase tracking-wider"></span>
                <span className="text-text-secondary/50 text-xs uppercase tracking-wider text-right">{t('settings.spend.tokens')}</span>
                <span className="text-text-secondary/50 text-xs uppercase tracking-wider text-right">{t('settings.spend.estCost')}</span>

                {([
                  { key: 'settings.spend.today', b: spend.today },
                  { key: 'settings.spend.week', b: spend.week },
                  { key: 'settings.spend.allTime', b: spend.allTime },
                ] as const).map(({ key, b }) => (
                  <Fragment key={key}>
                    <span className="text-text-secondary">{t(key)}</span>
                    <span className="font-mono text-right">{formatTokensCompact(b.tokens, locale, t)}</span>
                    <span className="font-mono text-right text-ink">~{formatUsd(b.costUsd, locale)}</span>
                  </Fragment>
                ))}
              </div>
              <div className="text-[11px] text-text-secondary/40 mt-3 leading-snug">
                {t('settings.spend.disclaimer')}
              </div>
            </>
          ) : (
            <div className="text-sm text-text-secondary/50 text-center py-2">
              {t('settings.spend.empty')}
            </div>
          )}
        </div>
      </div>
      </div>}

      {/* Features tab */}
      {contentTab === 'features' && <div className="flex flex-col gap-8">

      {/* History Section */}
      <div>
        <SectionHeader icon={History} title={t('settings.features.history.section')} />
        <div className="bg-surface border border-line-strong rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{t('settings.features.history.label')}</div>
              <div className="text-xs text-text-secondary/50 mt-0.5">{t('settings.features.history.help')}</div>
            </div>
            <button
              onClick={async () => {
                const newValue = !historyEnabled
                setHistoryEnabled(newValue)
                const result = await window.electronAPI.config.setHistoryEnabled(newValue)
                setConfig(result.config)
              }}
              className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 flex-shrink-0 ${
                historyEnabled ? 'bg-accent' : 'bg-ink/20'
              }`}
            >
              <div className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-on-brand transition-transform duration-200 ${
                historyEnabled ? 'translate-x-[18px]' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* Usage Card Section */}
      <div>
        <SectionHeader icon={Gauge} title={t('settings.features.usageCard.section')} />
        <div className="bg-surface border border-line-strong rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{t('settings.features.usageCard.label')}</div>
              <div className="text-xs text-text-secondary/50 mt-0.5">{t('settings.features.usageCard.help')}</div>
            </div>
            <button
              onClick={async () => {
                const newValue = !usageCardEnabled
                setUsageCardEnabled(newValue)
                const result = await window.electronAPI.config.setUsageCardEnabled(newValue)
                setConfig(result.config)
              }}
              className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 flex-shrink-0 ${
                usageCardEnabled ? 'bg-accent' : 'bg-ink/20'
              }`}
            >
              <div className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-on-brand transition-transform duration-200 ${
                usageCardEnabled ? 'translate-x-[18px]' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* Usage Logs Section (GDPR opt-in — off by default) */}
      <div>
        <SectionHeader icon={BarChart3} title={t('settings.features.usageLogs.section')} />
        <div className="bg-surface border border-line-strong rounded-xl p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium">{t('settings.features.usageLogs.label')}</div>
              <div className="text-xs text-text-secondary/50 mt-0.5">
                {t('settings.features.usageLogs.help')}
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
                usageLogsEnabled ? 'bg-accent' : 'bg-ink/20'
              }`}
            >
              <div className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-on-brand transition-transform duration-200 ${
                usageLogsEnabled ? 'translate-x-[18px]' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* Daily Digest Section (opt-in — off by default) */}
      <div>
        <SectionHeader icon={Bell} title={t('settings.features.digest.section')} />
        <div className="bg-surface border border-line-strong rounded-xl p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium">{t('settings.features.digest.label')}</div>
              <div className="text-xs text-text-secondary/50 mt-0.5">
                {t('settings.features.digest.help')}
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
                dailyDigestEnabled ? 'bg-accent' : 'bg-ink/20'
              }`}
            >
              <div className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-on-brand transition-transform duration-200 ${
                dailyDigestEnabled ? 'translate-x-[18px]' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* Split View Section */}
      <div>
        <SectionHeader icon={Columns} title={t('settings.features.split.section')} />
        <div className="bg-surface border border-line-strong rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{t('settings.features.split.label')}</div>
              <div className="text-xs text-text-secondary/50 mt-0.5">{t('settings.features.split.help')}</div>
            </div>
            <button
              onClick={() => { toggleSplitEnabled(); updateSplitEnabled(!splitEnabled) }}
              className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 flex-shrink-0 ${
                splitEnabled ? 'bg-accent' : 'bg-ink/20'
              }`}
            >
              <div className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-on-brand transition-transform duration-200 ${
                splitEnabled ? 'translate-x-[18px]' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* PR Review Watcher Section */}
      <div>
        <SectionHeader icon={GitPullRequest} title={t('settings.features.prWatcher.section')} />
        <div className="bg-surface border border-line-strong rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{t('settings.features.prWatcher.label')}</div>
              <div className="text-xs text-text-secondary/50 mt-0.5">{t('settings.features.prWatcher.help')}</div>
            </div>
            <button
              onClick={() => {
                const newValue = !prWatcherEnabled
                setPrWatcherEnabled(newValue)
                window.electronAPI.prWatcher.setEnabled(newValue)
              }}
              className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 flex-shrink-0 ${
                prWatcherEnabled ? 'bg-accent' : 'bg-ink/20'
              }`}
            >
              <div className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-on-brand transition-transform duration-200 ${
                prWatcherEnabled ? 'translate-x-[18px]' : 'translate-x-0'
              }`} />
            </button>
          </div>
          {prWatcherEnabled && (
            <>
              <div className="border-t border-line-subtle pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{t('settings.features.prWatcher.intervalLabel')}</div>
                    <div className="text-xs text-text-secondary/50 mt-0.5">{t('settings.features.prWatcher.intervalHelp')}</div>
                  </div>
                  <div className="relative">
                    <select
                      value={prWatcherInterval}
                      onChange={(e) => {
                        const newInterval = parseInt(e.target.value, 10)
                        setPrWatcherInterval(newInterval)
                        window.electronAPI.prWatcher.setInterval(newInterval)
                      }}
                      className="w-52 px-3 py-2 bg-surface border border-line-field rounded-lg text-sm focus:outline-none focus:border-accent transition-colors appearance-none cursor-pointer"
                    >
                      <option value={30_000}>{t('settings.features.prWatcher.interval30s')}</option>
                      <option value={60_000}>{t('settings.features.prWatcher.interval1m')}</option>
                      <option value={120_000}>{t('settings.features.prWatcher.interval2m')}</option>
                      <option value={300_000}>{t('settings.features.prWatcher.interval5m')}</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/50 pointer-events-none" />
                  </div>
                </div>
              </div>
              <div className="border-t border-line-subtle pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{t('settings.features.prWatcher.autoLaunchLabel')}</div>
                    <div className="text-xs text-text-secondary/50 mt-0.5">{t('settings.features.prWatcher.autoLaunchHelp')}</div>
                  </div>
                  <button
                    onClick={() => {
                      const newValue = !prWatcherAutoLaunch
                      setPrWatcherAutoLaunch(newValue)
                      window.electronAPI.prWatcher.setAutoLaunchSkills(newValue)
                    }}
                    className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 flex-shrink-0 ${
                      prWatcherAutoLaunch ? 'bg-accent' : 'bg-ink/20'
                    }`}
                  >
                    <div className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-on-brand transition-transform duration-200 ${
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
        <SectionHeader icon={Search} title={t('settings.features.spotlight.section')} />
        <div className="bg-surface border border-line-strong rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{t('settings.features.spotlight.label')}</div>
              <div className="text-xs text-text-secondary/50 mt-0.5">{t('settings.features.spotlight.help')}</div>
            </div>
            <button
              onClick={handleSpotlightToggle}
              className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 flex-shrink-0 ${
                spotlightEnabled ? 'bg-accent' : 'bg-ink/20'
              }`}
            >
              <div className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-on-brand transition-transform duration-200 ${
                spotlightEnabled ? 'translate-x-[18px]' : 'translate-x-0'
              }`} />
            </button>
          </div>
          <div className="border-t border-line-subtle pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{t('settings.features.spotlight.shortcutLabel')}</div>
                <div className="text-xs text-text-secondary/50 mt-0.5">{t('settings.features.spotlight.shortcutHelp')}</div>
              </div>
              <div className="relative">
                <select
                  value={spotlightShortcut}
                  onChange={(e) => handleSpotlightShortcutChange(e.target.value as SpotlightShortcut)}
                  disabled={!spotlightEnabled}
                  className="w-52 px-3 py-2 bg-surface border border-line-field rounded-lg text-sm focus:outline-none focus:border-accent transition-colors appearance-none cursor-pointer disabled:opacity-50"
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
              <span>{t('settings.features.spotlight.error')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Background App Section */}
      <div>
        <SectionHeader icon={MonitorSmartphone} title={t('settings.features.background.section')} />
        <div className="bg-surface border border-line-strong rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{t('settings.features.background.autoStartLabel')}</div>
              <div className="text-xs text-text-secondary/50 mt-0.5">{t('settings.features.background.autoStartHelp')}</div>
            </div>
            <button
              onClick={() => {
                const newValue = !autoStart
                setAutoStart(newValue)
                window.electronAPI.config.setAutoStart(newValue)
              }}
              className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 flex-shrink-0 ${
                autoStart ? 'bg-accent' : 'bg-ink/20'
              }`}
            >
              <div className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-on-brand transition-transform duration-200 ${
                autoStart ? 'translate-x-[18px]' : 'translate-x-0'
              }`} />
            </button>
          </div>
          <div className="border-t border-line-subtle pt-4">
            <div className="text-sm font-medium mb-1">{t('settings.features.background.menuBarLabel')}</div>
            <div className="text-xs text-text-secondary/50">
              {t('settings.features.background.menuBarHelp')}
            </div>
          </div>
        </div>
      </div>

      </div>}

      {/* Appearance tab */}
      {contentTab === 'appearance' && <AppearancePage />}

      {/* Language & Region tab */}
      {contentTab === 'language' && <LanguagePage />}

      {/* Shortcuts tab */}
      {contentTab === 'shortcuts' && <div>
        <SectionHeader icon={Keyboard} title={t('settings.shortcuts.section')} />
        <div className="bg-surface border border-line-strong rounded-xl p-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            {([
              ['sidebar.newAgent', 'N'],
              ['settings.shortcuts.duplicateAgent', 'D'],
              ['settings.shortcuts.closeAgent', 'W'],
              ['settings.shortcuts.previousAgent', '↑'],
              ['settings.shortcuts.nextAgent', '↓'],
              ['settings.shortcuts.toggleAgentInfo', 'I'],
              ['settings.shortcuts.toggleAgentsList', 'B'],
              ['sidebar.skills', ';'],
              ['settings.tab.repositories', 'P'],
              ['sidebar.settings', ','],
              ['settings.shortcuts.toggleSplit', '/'],
            ] as const).map(([labelKey, key]) => (
              <div key={labelKey} className="flex items-center justify-between">
                <span className="text-text-secondary">{t(labelKey)}</span>
                <kbd className="px-2 py-0.5 bg-surface border border-line rounded text-xs text-text-secondary"><span className="text-sm">⌘</span> {key}</kbd>
              </div>
            ))}
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">{t('settings.shortcuts.quickLaunch')}</span>
              {spotlightEnabled ? (
                <kbd className="px-2 py-0.5 bg-surface border border-line rounded text-xs text-text-secondary">
                  {SPOTLIGHT_OPTIONS.find(o => o.value === spotlightShortcut)?.label ?? spotlightShortcut}
                </kbd>
              ) : (
                <span className="px-2 py-0.5 text-xs text-text-secondary/40">{t('settings.shortcuts.disabled')}</span>
              )}
            </div>
          </div>
        </div>
      </div>}

      {/* About tab */}
      {contentTab === 'about' && <div>
        <SectionHeader icon={Info} title={t('settings.about.section')} />
        <div className="bg-surface border border-line-strong rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="font-medium">Magic Slash</div>
            <div className="text-xs text-text-secondary/50 mt-0.5">v{appVersion}</div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://xrequillart.github.io/magic-slash/documentation.html#changelog"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-line rounded-lg hover:bg-surface hover:text-ink transition-colors"
            >
              <Clock className="w-3.5 h-3.5" />
              {t('settings.about.changelog')}
            </a>
            <button
              onClick={handleWhatsNew}
              disabled={loadingWhatsNew}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent bg-accent/10 border border-accent/20 rounded-lg hover:bg-accent/20 transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {loadingWhatsNew ? t('common.loading') : t('settings.about.whatsNew')}
            </button>
          </div>
        </div>
      </div>}
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

  return (
    <div className="h-full">
      <WelcomePage route={route} />
    </div>
  )
}
