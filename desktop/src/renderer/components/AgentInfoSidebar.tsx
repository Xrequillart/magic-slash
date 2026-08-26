import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useStore } from '../store'
import { useTerminals } from '../hooks/useTerminals'
import { TicketHeader } from './agent-info-sidebar/TicketHeader'
import { SpecPanel } from './agent-info-sidebar/SpecPanel'
import { UsageCard } from './agent-info-sidebar/UsageCard'
import { RepositoryCard } from './agent-info-sidebar/RepositoryCard'
import { RepositorySelector } from './agent-info-sidebar/RepositorySelector'
import { buildTicketLink, detectTicketProvider, getSpecPanelMode, splitSpecPath } from './agent-info-sidebar/utils'
import { usePlanSpec } from '../hooks/usePlanSpec'
import { useT } from '../i18n'
import type { RepoGitData } from './agent-info-sidebar/types'
import type { TerminalMetadata } from '../../types'
import { resolveGitHubIssuesUrl, resolveJiraSite } from '../../tracker'

const MIN_WIDTH = 288 // w-72

/**
 * The right sidebar is fixed, and sized by the KIND of agent being inspected rather
 * than by a drag handle.
 *
 * The trade-off genuinely differs between the two. During `/magic:plan` the sidebar
 * holds long-form prose being written live and the terminal is mostly a place to
 * reply, so column width is what makes the spec readable; during implementation the
 * terminal IS the work. A single user-chosen width could not serve both, and letting
 * an agent switch move a width the user had set was worse still — so the width is
 * derived, and the handle is gone.
 */
const DEFAULT_WIDTH = 500
const PLANNING_WIDTH = 720
const MAX_WIDTH_RATIO = 0.4
const PLANNING_MAX_WIDTH_RATIO = 0.55

/** How long the panel takes to open or to close. */
const OPEN_MS = 300

/** Never wider than its share of the window, never narrower than MIN_WIDTH. */
function sidebarWidth(viewportWidth: number, planning: boolean) {
  const cap = Math.floor(viewportWidth * (planning ? PLANNING_MAX_WIDTH_RATIO : MAX_WIDTH_RATIO))
  return Math.max(MIN_WIDTH, Math.min(cap, planning ? PLANNING_WIDTH : DEFAULT_WIDTH))
}

export function AgentInfoSidebar() {
  const { rightSidebar, terminals, activeTerminalId, config, setConfig, isSplitMode, focusedPane, splitTerminalId } = useStore()
  const { updateTerminalMetadata, updateTerminalRepositories } = useTerminals()
  const t = useT()

  // Derived before the width state on purpose: the sidebar's default width depends
  // on whether the inspected agent is a planning one.
  // Named `inspected` rather than `focused` because it is what the panel DESCRIBES, which
  // is the same thing now that a script terminal is never selected.
  const inspectedTerminalId = isSplitMode && focusedPane === 'secondary'
    ? splitTerminalId
    : activeTerminalId
  const activeTerminal = terminals.find(t => t.id === inspectedTerminalId)
  const metadata = activeTerminal?.metadata
  const specMode = getSpecPanelMode(metadata?.type)
  const isPlanningAgent = specMode !== 'hidden'

  // Only the viewport is tracked: the width itself is derived, so there is no
  // resize state, no drag handle and nothing an agent switch can overwrite.
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth)
  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  const width = sidebarWidth(viewportWidth, isPlanningAgent)

  // Git data per repository
  const [repoGitData, setRepoGitData] = useState<Record<string, RepoGitData>>({})

  const sidebarRef = useRef<HTMLDivElement>(null)

  // Editing states
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const titleInputRef = useRef<HTMLInputElement>(null)
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null)
  const [isRepoModalOpen, setIsRepoModalOpen] = useState(false)
  const [copiedCommitHash, setCopiedCommitHash] = useState<string | null>(null)
  const [copiedBranch, setCopiedBranch] = useState<string | null>(null)

  // The live `/magic:plan` spec for the agent being inspected. The panel only
  // exists for a planning agent, and only while the sidebar it lives in is open —
  // `usePlanSpec` subscribes to nothing and refreshes nothing when that is false.
  const isOpen = rightSidebar === 'info'
  const { specPath, refreshToken: specRefreshToken } = usePlanSpec(
    inspectedTerminalId ?? undefined,
    metadata?.specPath,
    isOpen && specMode !== 'hidden',
  )
  // Null until there is something to read: a planning agent that has not announced
  // a path yet keeps the ordinary header rather than showing an empty frame. Kept
  // as one nullable object so the mode travels WITH the path it needs — two
  // separate variables cost the caller a non-null assertion at every use.
  const specParts = splitSpecPath(specPath)
  const spec = isOpen && specMode !== 'hidden' && specParts
    ? { ...specParts, mode: specMode }
    : null

  /**
   * Whether the width on screen is currently being animated.
   *
   * Opening and closing the panel animates. An agent switch that merely derives a
   * different width SNAPS, in one frame. Animating that width was 300ms of moving
   * layout for the terminal beside it to chase, and the chase — debounced, then
   * resolved with a SIGWINCH that repaints the whole of Claude Code — was the lag
   * every switch between a planner and an ordinary agent carried. Nothing replaces
   * it: a switch between agents is a change of subject, not travel, and the panel
   * arriving already in place is what makes it read as instant.
   *
   * Set during render rather than in an effect, React's own pattern for reacting to
   * a changed value: an effect would land the transition one commit after the width
   * it is meant to animate, i.e. one commit too late to animate anything.
   */
  const [animateWidth, setAnimateWidth] = useState(false)
  const wasOpenRef = useRef(isOpen)
  if (wasOpenRef.current !== isOpen) {
    wasOpenRef.current = isOpen
    setAnimateWidth(true)
  }
  // Dropped once the panel has arrived, so the next agent switch snaps. Keyed on
  // `isOpen` too: a close landing mid-open restarts the hold instead of letting the
  // first one strip the transition from the animation still running.
  useEffect(() => {
    if (!animateWidth) return
    const timer = window.setTimeout(() => setAnimateWidth(false), OPEN_MS)
    return () => window.clearTimeout(timer)
  }, [animateWidth, isOpen])

  // Get all configured repository paths for the dropdown
  const availableRepos = useMemo(() => {
    if (!config?.repositories) return []
    return Object.entries(config.repositories)
      // A team repo with no local folder bound on this machine has no usable path,
      // so it can't be attached to an agent until the user sets its folder in Settings.
      .filter(([, repo]) => !repo.needsLocalPath && repo.path)
      .map(([name, repo]) => ({ name, path: repo.path }))
  }, [config?.repositories])

  // Current attached repositories for this terminal
  const attachedRepos = activeTerminal?.repositories || []

  // Get the repo name from config for a given path
  const getRepoName = useCallback((repoPath: string) => {
    if (!config?.repositories) return repoPath.split('/').pop() || repoPath

    for (const [name, repo] of Object.entries(config.repositories)) {
      if (repoPath.startsWith(repo.path)) {
        return name
      }
    }
    return repoPath.split('/').pop() || repoPath
  }, [config?.repositories])

  // Get repo config for a given path
  const getRepoConfig = useCallback((repoPath: string) => {
    if (!config?.repositories) return null

    for (const [, repo] of Object.entries(config.repositories)) {
      if (repoPath.startsWith(repo.path)) {
        return repo
      }
    }
    return null
  }, [config?.repositories])

  // Check if a repository path is in the configuration
  const isRepoInConfig = useCallback((repoPath: string) => {
    if (!config?.repositories) return false

    for (const [, repo] of Object.entries(config.repositories)) {
      if (repoPath.startsWith(repo.path)) {
        return true
      }
    }
    return false
  }, [config?.repositories])

  // Filter attached repos to only show those in config
  const configuredAttachedRepos = useMemo(() => {
    return attachedRepos.filter(repoPath => isRepoInConfig(repoPath))
  }, [attachedRepos, isRepoInConfig])

  // The ± button on the session card writes the same setting the Appearance tab's
  // format select does — same path as the left sidebar's usage card.
  const setAgentContextMinimized = useCallback(async (minimized: boolean) => {
    const result = await window.electronAPI.config.setAgentContextMinimized(minimized)
    setConfig(result.config)
  }, [setConfig])

  // Get jira/github URL config from first repo (for ticket link)
  //
  // Both answers are fallback chains — the Jira site moved to its own block and is
  // still read from the legacy key, and the GitHub issues URL is an override that
  // derives from `remoteUrl` when unset — so they are resolved in tracker.ts rather
  // than here. That derivation used to live inline in this file, which is exactly
  // why a GitHub issue rendered as dead text everywhere else.
  const firstRepoConfig = attachedRepos.length > 0 ? getRepoConfig(attachedRepos[0]) : null
  const jiraUrl = resolveJiraSite(firstRepoConfig)
  const githubIssuesUrl = resolveGitHubIssuesUrl(firstRepoConfig)

  // Handle toggling a repository (add or remove)
  const handleToggleRepository = useCallback((repoPath: string) => {
    if (!inspectedTerminalId || !activeTerminal) return
    const currentRepos = activeTerminal.repositories || []

    if (currentRepos.includes(repoPath)) {
      updateTerminalRepositories(inspectedTerminalId, currentRepos.filter(r => r !== repoPath))
    } else {
      updateTerminalRepositories(inspectedTerminalId, [...currentRepos, repoPath])
    }
  }, [inspectedTerminalId, activeTerminal, updateTerminalRepositories])

  // Both live in utils.ts, where they are unit-tested: the shapes they accept are
  // the contract between this panel and what /magic:start writes, and that contract
  // was silently wrong for GitHub issues until it had tests.
  const ticketLink = useMemo(
    () => buildTicketLink(metadata?.ticketId, { jiraUrl, githubIssuesUrl }),
    [metadata?.ticketId, jiraUrl, githubIssuesUrl],
  )

  const ticketProvider = useMemo(
    () => detectTicketProvider(metadata?.ticketId),
    [metadata?.ticketId],
  )

  // Get PR URL for a specific repository
  const getRepoPrUrl = useCallback((repoPath: string): string | undefined => {
    return metadata?.repositoryMetadata?.[repoPath]?.prUrl
  }, [metadata])

  // GitHub address of a repository. The configured `remoteUrl` comes first — it is the
  // shared identity of the repo, already normalised to `https://github.com/owner/repo` —
  // and the URL read from the local git remote is the fallback for a repo configured
  // before that field existed.
  const getRepoUrl = useCallback((repoPath: string): string | undefined => {
    return getRepoConfig(repoPath)?.remoteUrl || repoGitData[repoPath]?.gitHubUrl || undefined
  }, [getRepoConfig, repoGitData])

  // Fetch git data for ALL repositories
  useEffect(() => {
    const repos = activeTerminal?.repositories || []
    if (repos.length === 0) {
      setRepoGitData({})
      return
    }

    let isMounted = true

    const fetchGitDataForRepo = async (repoPath: string): Promise<RepoGitData> => {
      const repoConfig = getRepoConfig(repoPath)
      const targetBranch = metadata?.baseBranch || repoConfig?.branches?.development

      let stats: RepoGitData['stats'] = null
      let commits: RepoGitData['commits'] = null
      let branch: string | null = null
      let error: string | null = null
      let gitHubUrl: string | null = null

      try {
        stats = await window.electronAPI.config.getGitDiffStats(repoPath)
        if (stats && !stats.isGitRepo) {
          error = t('agentInfo.notGitRepo')
        }
      } catch (e) {
        error = e instanceof Error ? e.message : t('agentInfo.unknownError')
      }

      try {
        const result = await window.electronAPI.config.getBranchCommits(repoPath, targetBranch)
        if (result.isGitRepo) {
          commits = {
            commits: result.commits,
            baseBranch: result.baseBranch,
            currentBranch: result.currentBranch,
          }
          branch = result.currentBranch
        }
      } catch {
        // Ignore branch commit errors
      }

      try {
        gitHubUrl = await window.electronAPI.config.getGitHubRepoUrl(repoPath)
      } catch {
        // Ignore GitHub URL errors
      }

      return { stats, commits, branch, error, gitHubUrl }
    }

    const fetchAllGitData = async () => {
      if (!isMounted) return

      const results: Record<string, RepoGitData> = {}

      await Promise.all(repos.map(async (repoPath) => {
        const data = await fetchGitDataForRepo(repoPath)
        results[repoPath] = data
      }))

      if (!isMounted) return

      setRepoGitData(prev => {
        const newJson = JSON.stringify(results)
        const prevJson = JSON.stringify(prev)
        if (newJson === prevJson) return prev
        return results
      })
    }

    fetchAllGitData()

    const interval = setInterval(fetchAllGitData, 5000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [activeTerminal?.repositories, getRepoConfig, metadata?.baseBranch])

  // Listen for Command+P keyboard shortcut to open repositories modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        if (rightSidebar === 'info' && activeTerminal) {
          e.preventDefault()
          setIsRepoModalOpen(true)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [rightSidebar, activeTerminal])

  // Start editing title
  const startEditingTitle = useCallback(() => {
    setEditTitle(metadata?.title || '')
    setIsEditingTitle(true)
    setTimeout(() => titleInputRef.current?.focus(), 0)
  }, [metadata?.title])

  // Save title
  const saveTitle = useCallback(() => {
    if (inspectedTerminalId && editTitle.trim() !== (metadata?.title || '')) {
      updateTerminalMetadata(inspectedTerminalId, { title: editTitle.trim() || undefined })
    }
    setIsEditingTitle(false)
  }, [inspectedTerminalId, editTitle, metadata?.title, updateTerminalMetadata])

  // Start editing description
  const startEditingDescription = useCallback(() => {
    setEditDescription(metadata?.description || '')
    setIsEditingDescription(true)
    setTimeout(() => descriptionInputRef.current?.focus(), 0)
  }, [metadata?.description])

  // Save description
  const saveDescription = useCallback(() => {
    if (inspectedTerminalId && editDescription.trim() !== (metadata?.description || '')) {
      updateTerminalMetadata(inspectedTerminalId, { description: editDescription.trim() || undefined })
    }
    setIsEditingDescription(false)
  }, [inspectedTerminalId, editDescription, metadata?.description, updateTerminalMetadata])

  // One object for both cards: TicketHeader renders it for an implementation agent,
  // SpecPanel for a planning one. Memoised so the panel does not re-render on every
  // keystroke elsewhere in the sidebar.
  const identity = useMemo(() => ({
    title: metadata?.title,
    description: metadata?.description,
    isEditingTitle,
    isEditingDescription,
    editTitle,
    editDescription,
    setEditTitle,
    setEditDescription,
    startEditingTitle,
    startEditingDescription,
    saveTitle,
    saveDescription,
    setIsEditingTitle,
    setIsEditingDescription,
    titleInputRef,
    descriptionInputRef,
  }), [
    metadata?.title, metadata?.description,
    isEditingTitle, isEditingDescription, editTitle, editDescription,
    startEditingTitle, startEditingDescription, saveTitle, saveDescription,
  ])

  // Change status
  const handleStatusChange = useCallback((status: string) => {
    if (inspectedTerminalId) {
      updateTerminalMetadata(inspectedTerminalId, { status: status as TerminalMetadata['status'] })
    }
  }, [inspectedTerminalId, updateTerminalMetadata])

  // Cancel editing when switching terminals
  useEffect(() => {
    setIsEditingTitle(false)
    setIsEditingDescription(false)
    setIsRepoModalOpen(false)
  }, [inspectedTerminalId])

  // Copy commit hash with feedback
  const copyCommitHash = useCallback((hash: string) => {
    navigator.clipboard.writeText(hash)
    setCopiedCommitHash(hash)
    setTimeout(() => setCopiedCommitHash(null), 2000)
  }, [])

  // Copy branch name with feedback
  const copyBranchName = useCallback((branch: string) => {
    navigator.clipboard.writeText(branch)
    setCopiedBranch(branch)
    setTimeout(() => setCopiedBranch(null), 2000)
  }, [])

  return (
    <div
      ref={sidebarRef}
      className={`bg-surface-sunken flex flex-col h-full relative overflow-hidden ${
        animateWidth ? 'transition-[width] duration-300 ease-in-out' : ''
      }`}
      style={{ width: isOpen ? `${width}px` : 0 }}
    >
      <div className="flex flex-col h-full" style={{ width: `${width}px` }}>
      {/* Content */}
      {/* In `replace` mode this container does NOT scroll: the spec card fills the
          column and owns the only scroll region, so there is never a scrollbar
          inside a scrollbar. Every other mode keeps the ordinary scrolling column. */}
      <div
        className={`flex-1 min-h-0 ${spec?.mode === 'replace' ? 'overflow-hidden' : 'overflow-y-auto'}`}
        style={{ fontFamily: "'Cera Pro', -apple-system, BlinkMacSystemFont, sans-serif" }}
      >
        {!activeTerminal ? (
          <div className="px-4 py-8 text-center text-text-secondary text-xs">
            {t('agentInfo.noActiveAgent')}
          </div>
        ) : (
          <div className={spec?.mode === 'replace' ? 'p-4 flex flex-col gap-4 h-full min-h-0' : 'p-4 space-y-4'}>
            {/* Usage Card (context, cost, model). Switched off from Appearance →
                Sidebars; on by default, and shown for the whole life of the agent
                once on. That second part is deliberate: the usage feed only lands
                after Claude's first response, and a bar that appears out of nowhere
                mid-session reads as a glitch. With no usage yet the card degrades to
                the gauge alone — every other row inside it is already conditional. */}
            {config?.agentContextEnabled !== false && (
              <UsageCard
                usage={metadata?.usage ?? {}}
                minimized={config?.agentContextMinimized === true}
                onMinimizedChange={setAgentContextMinimized}
              />
            )}

            {/* At `planning` the spec REPLACES the ticket header — no ticket exists
                yet, so the header would be an empty card above the only thing there
                is to read. At `planned` both are shown, header first: the ticket has
                just been created and the spec is what it came from. Anywhere else the
                header stands alone, exactly as it always has. */}
            {spec?.mode !== 'replace' && (
              <TicketHeader
                metadata={metadata}
                ticketLink={ticketLink}
                ticketProvider={ticketProvider}
                identity={identity}
                onStatusChange={handleStatusChange}
              />
            )}
            {spec && (
              <SpecPanel
                // A new file starts fresh: expanded, and pinned to its own bottom
                // rather than wherever the previous spec had been left.
                key={specPath}
                identity={identity}
                repoNames={configuredAttachedRepos.map(getRepoName)}
                status={metadata?.status ?? ''}
                repoPath={spec.repoPath}
                filePath={spec.filePath}
                refreshToken={specRefreshToken}
                ticketId={metadata?.ticketId}
                ticketLink={ticketLink}
                ticketProvider={ticketProvider}
                onStatusChange={handleStatusChange}
              />
            )}

            {/* Repository cards with git stats. Gone entirely at `planning`: a planning
                agent has no branch, no diff and no PR, so every row in these cards is
                empty — the repository NAME is all that is left to say, and the spec
                header says it. */}
            {spec?.mode !== 'replace' && configuredAttachedRepos.length > 0 && (
              <div className="space-y-3">
                {configuredAttachedRepos.map((repoPath) => (
                  <RepositoryCard
                    key={repoPath}
                    repoPath={repoPath}
                    repoName={getRepoName(repoPath)}
                    agentId={inspectedTerminalId!}
                    agentName={activeTerminal!.metadata?.title || activeTerminal!.name}
                    gitData={repoGitData[repoPath]}
                    baseBranch={metadata?.baseBranch}
                    prUrl={getRepoPrUrl(repoPath)}
                    repoUrl={getRepoUrl(repoPath)}
                    repoMetadata={metadata?.repositoryMetadata?.[repoPath]}
                    copiedCommitHash={copiedCommitHash}
                    copiedBranch={copiedBranch}
                    onCopyCommitHash={copyCommitHash}
                    onCopyBranchName={copyBranchName}
                    onRemove={() => handleToggleRepository(repoPath)}
                  />
                ))}
              </div>
            )}

            {/* Hidden at `planning` along with the cards it belongs to: it is the only
                other thing competing for the height the spec now fills, and attaching
                a repository is not a planning-time action. */}
            {spec?.mode !== 'replace' && (
            <button
              onClick={() => setIsRepoModalOpen(true)}
              className="w-full py-4 text-center border border-dashed border-border/50 rounded-lg hover:border-text-secondary/50 hover:bg-surface transition-colors"
            >
              <div className="text-xs text-text-secondary/50">
                {t('agentInfo.addRepository')}
              </div>
            </button>
            )}
          </div>
        )}
      </div>

      {/* Repository Selector Modal */}
      <RepositorySelector
        isOpen={isRepoModalOpen}
        onClose={() => setIsRepoModalOpen(false)}
        availableRepos={availableRepos}
        attachedRepos={attachedRepos}
        onToggleRepository={handleToggleRepository}
      />
      </div>
    </div>
  )
}
