import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { SidebarAgentCoderInfo, SidebarAgentPlannerInfo, type CoderRepository } from '@ds/desktop'
import { useStore } from '../store'
import { useTerminals } from '../hooks/useTerminals'
import { useTicketCard } from './agent-info-sidebar/ticketCard'
import { useSpecCard } from './agent-info-sidebar/specCard'
import { useUsageCard } from './agent-info-sidebar/usageCard'
import { toCoderRepository } from './agent-info-sidebar/coderRepository'
import { useRepoColors } from './agent-info-sidebar/RepoMark'
import { useScriptsMenus } from './agent-info-sidebar/useScriptsMenu'
import { useRepositorySelector } from './agent-info-sidebar/repositorySelector'
import { getSpecPanelMode, splitSpecPath } from './agent-info-sidebar/utils'
import { usePlanSpec } from '../hooks/usePlanSpec'
import { useT } from '../i18n'
import type { RepoGitData } from './agent-info-sidebar/types'
import type { TerminalMetadata } from '../../types'
import { withoutShadowedCheckouts } from '../../repoMatch'
import { resolveTaskSelection } from '../utils/taskSelection'

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


  // Editing states
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
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

  // Filter attached repos to only show those in config — and, when an agent has both a
  // repository and one of its own worktrees attached, only the worktree: the main
  // checkout's card repeats the same repo's name over a branch, a diff, a PR and a
  // script list that belong somewhere else (see `withoutShadowedCheckouts`). Detaching
  // the hidden one is still possible from the repositories modal.
  const configuredAttachedRepos = useMemo(() => {
    return withoutShadowedCheckouts(attachedRepos.filter(repoPath => isRepoInConfig(repoPath)))
  }, [attachedRepos, isRepoInConfig])

  // The ± button on the session card writes the same setting the Appearance tab's
  // format select does — same path as the left sidebar's usage card.
  const setAgentContextMinimized = useCallback(async (minimized: boolean) => {
    const result = await window.electronAPI.config.setAgentContextMinimized(minimized)
    setConfig(result.config)
  }, [setConfig])

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

  /**
   * The row the Tasks modal opens on when the ticket id is clicked. Null when the
   * ticket cannot be placed — an unrecognised id, or paths belonging to no configured
   * repository — which is not a dead click: see `TicketIdLink`.
   *
   * Resolved HERE rather than in the card, because this is the level that has both
   * halves of the question: the agent's working directories (worktrees included, which
   * is why `pathBelongsToRepo` is what answers it) and the repository config.
   */
  const taskSelection = useMemo(
    () => resolveTaskSelection(metadata?.ticketId, attachedRepos, config?.repositories ?? {}),
    [metadata?.ticketId, attachedRepos, config?.repositories],
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

  // ⌘P USED TO OPEN THIS PANEL'S REPOSITORY PICKER, and only while the info sidebar
  // happened to be out — which meant the chord silently did nothing most of the time,
  // and did two different things depending on a panel the reader may have collapsed
  // and forgotten. It is the global repositories window's now (`Sidebar`), and the
  // picker keeps its button, which was always the way people actually reached it.

  // Start editing title. The FOCUS is `EditableText`'s own — it holds the input, so it
  // is the only thing that can focus it on the frame the input first exists. This had a
  // ref and a `setTimeout(…, 0)` here for exactly that reason, and both are gone.
  const startEditingTitle = useCallback(() => {
    setEditTitle(metadata?.title || '')
    setIsEditingTitle(true)
  }, [metadata?.title])

  // Save title
  const saveTitle = useCallback(() => {
    if (inspectedTerminalId && editTitle.trim() !== (metadata?.title || '')) {
      updateTerminalMetadata(inspectedTerminalId, { title: editTitle.trim() || undefined })
    }
    setIsEditingTitle(false)
  }, [inspectedTerminalId, editTitle, metadata?.title, updateTerminalMetadata])

  // Start editing description — same as the title above, focus included.
  const startEditingDescription = useCallback(() => {
    setEditDescription(metadata?.description || '')
    setIsEditingDescription(true)
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

  /**
   * THE CARDS, AS DATA. Every hook below answers one region of the column, and every one
   * of them runs UNCONDITIONALLY — React's rule, and the reason each returns props rather
   * than a decision. Whether a region is shown at all is decided at the call site a few
   * lines down, where it is a condition and not a hook.
   */
  const usageCard = useUsageCard({
    usage: metadata?.usage ?? {},
    minimized: config?.agentContextMinimized === true,
    onMinimizedChange: setAgentContextMinimized,
  })
  const ticketCard = useTicketCard({
    metadata,
    // '' when nothing is inspected, which no card ever sees: the region is dropped below.
    agentId: inspectedTerminalId ?? '',
    taskSelection,
    identity,
    onStatusChange: handleStatusChange,
  })

  /* `repoPath`/`filePath` are '' when there is no spec, which no card ever sees: the
     planner column below is only rendered when `spec` is there. */
  const specCard = useSpecCard({
    agentId: inspectedTerminalId ?? '',
    identity,
    repoNames: configuredAttachedRepos.map(getRepoName),
    status: metadata?.status ?? '',
    ticketId: metadata?.ticketId,
    taskSelection,
    repoPath: spec?.repoPath ?? '',
    filePath: spec?.filePath ?? '',
    refreshToken: specRefreshToken,
    onStatusChange: handleStatusChange,
  })

  const repositorySelector = useRepositorySelector({
    isOpen: isRepoModalOpen,
    onClose: () => setIsRepoModalOpen(false),
    availableRepos,
    attachedRepos,
    onToggleRepository: handleToggleRepository,
  })

  // The two things a repository row needs that only the app can answer, both resolved for
  // the WHOLE list at once — a hook cannot run inside the `.map()` that builds the cards.
  const repoColors = useRepoColors()
  const scriptsRepos = useMemo(
    () => configuredAttachedRepos.map(path => ({ path, name: getRepoName(path) })),
    [configuredAttachedRepos, getRepoName],
  )
  const scriptsMenus = useScriptsMenus({
    repos: scriptsRepos,
    agentId: inspectedTerminalId ?? '',
    agentName: activeTerminal?.metadata?.title || activeTerminal?.name || '',
  })
  const openRepoSettings = useStore(s => s.openRepoSettings)
  const openRepoReview = useStore(s => s.openRepoReview)

  /* Gone entirely at `planning`: a planning agent has no branch, no diff and no PR, so
     every row in these cards is empty — the repository NAME is all that is left to say,
     and the spec header says it. */
  const repositories: CoderRepository[] = useMemo(() => {
    // Not for a planner: the planner column below has no repository cards at all.
    if (!activeTerminal || spec) return []
    return configuredAttachedRepos.map(repoPath => {
      const repoName = getRepoName(repoPath)
      const gitData = repoGitData[repoPath]
      return toCoderRepository({
        repoPath,
        repoName,
        agentId: inspectedTerminalId!,
        gitData,
        baseBranch: metadata?.baseBranch,
        prUrl: getRepoPrUrl(repoPath),
        repoUrl: getRepoUrl(repoPath),
        repoMetadata: metadata?.repositoryMetadata?.[repoPath],
        copiedCommitHash,
        copiedBranch,
        repoColor: repoColors[repoName],
        scripts: scriptsMenus[repoPath],
        onCopyCommitHash: copyCommitHash,
        onCopyBranchName: copyBranchName,
        onRemove: () => handleToggleRepository(repoPath),
        onOpenSettings: openRepoSettings,
        onOpenReview: file =>
          openRepoReview({ repoPath, repoName, files: gitData!.stats!.files }, file),
        t,
      })
    })
  }, [
    activeTerminal, spec, configuredAttachedRepos, getRepoName, repoGitData,
    inspectedTerminalId, metadata, getRepoPrUrl, getRepoUrl, copiedCommitHash, copiedBranch,
    repoColors, scriptsMenus, copyCommitHash, copyBranchName, handleToggleRepository,
    openRepoSettings, openRepoReview, t,
  ])

  /**
   * WHICH COLUMN, and it is a choice between two components rather than a mode inside one.
   *
   * A planner that has announced a spec file gets the planner column: no ticket card, no
   * repository cards, no add-repository box — it has no branch, no diff and no PR, so those
   * would be four empty cards above the one thing worth reading.
   *
   * A planner that has NOT announced one yet keeps the ordinary column, which is why this
   * is keyed on `spec` and not on the agent's type: an empty frame where the document will
   * be is worse than the header the agent already has.
   */
  const planning = Boolean(activeTerminal && spec)
  /* THE COLUMN AND EVERY CARD IN IT are the design system's — the ground, the fold, the face,
     the order of the regions, the cards themselves, and the repository picker the column's
     own box opens. What is left in this file is which agent this is and what each region
     SAYS. */
  return planning ? (
    <SidebarAgentPlannerInfo
      // A new file starts fresh: at the top of the NEW spec rather than wherever the
      // previous one had been left.
      key={specPath}
      width={width}
      collapsed={!isOpen}
      animate={animateWidth}
      usage={config?.agentContextEnabled !== false ? usageCard : undefined}
      spec={specCard}
    />
  ) : (
    <SidebarAgentCoderInfo
      width={width}
      collapsed={!isOpen}
      animate={animateWidth}
      emptyLabel={activeTerminal ? undefined : t('agentInfo.noActiveAgent')}
      /* Switched off from Appearance → Sidebars; on by default, and shown for the whole life
         of the agent once on. That second part is deliberate: the usage feed only lands after
         Claude's first response, and a bar that appears out of nowhere mid-session reads as a
         glitch. */
      usage={activeTerminal && config?.agentContextEnabled !== false ? usageCard : undefined}
      ticket={activeTerminal ? ticketCard : undefined}
      repositories={repositories}
      addRepository={
        activeTerminal
          ? { label: t('agentInfo.addRepository'), onClick: () => setIsRepoModalOpen(true) }
          : undefined
      }
      /* The dialog the box above opens. The column renders it — it is the column's own
         dialog, and it portals out regardless of where it is declared. */
      repositorySelector={repositorySelector}
    />
  )
}
