import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { X, Bot, Edit2, Layers } from 'lucide-react'
import { useStore } from '../store'
import { useTerminals } from '../hooks/useTerminals'
import { TicketHeader } from './agent-info-sidebar/TicketHeader'
import { RepositoryCard } from './agent-info-sidebar/RepositoryCard'
import { RepositorySelector } from './agent-info-sidebar/RepositorySelector'
import type { RepoGitData } from './agent-info-sidebar/types'

const MIN_WIDTH = 288 // w-72
const DEFAULT_WIDTH = 500

export function AgentInfoSidebar() {
  const { rightSidebar, toggleRightSidebar, terminals, activeTerminalId, config, openCloseAgentModal } = useStore()
  const { updateTerminalMetadata, updateTerminalRepositories } = useTerminals()
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const [isResizing, setIsResizing] = useState(false)

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

  const getMaxWidth = useCallback(() => {
    return Math.floor(window.innerWidth * 0.4)
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const maxWidth = getMaxWidth()
      const newWidth = window.innerWidth - e.clientX
      setWidth(Math.min(maxWidth, Math.max(MIN_WIDTH, newWidth)))
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, getMaxWidth])

  // Update width on window resize to respect max
  useEffect(() => {
    const handleResize = () => {
      const maxWidth = getMaxWidth()
      if (width > maxWidth) {
        setWidth(maxWidth)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [width, getMaxWidth])

  const activeTerminal = terminals.find(t => t.id === activeTerminalId)
  const metadata = activeTerminal?.metadata
  const canClose = metadata?.status === 'PR created' || !metadata?.status

  // Get all configured repository paths for the dropdown
  const availableRepos = useMemo(() => {
    if (!config?.repositories) return []
    return Object.entries(config.repositories).map(([name, repo]) => ({
      name,
      path: repo.path
    }))
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

  // Get jira/github URL config from first repo (for ticket link)
  const firstRepoConfig = attachedRepos.length > 0 ? getRepoConfig(attachedRepos[0]) : null
  const jiraUrl = firstRepoConfig?.issues?.jiraUrl
  const githubIssuesUrl = firstRepoConfig?.issues?.githubIssuesUrl

  // Handle toggling a repository (add or remove)
  const handleToggleRepository = useCallback((repoPath: string) => {
    if (!activeTerminalId || !activeTerminal) return
    const currentRepos = activeTerminal.repositories || []

    if (currentRepos.includes(repoPath)) {
      updateTerminalRepositories(activeTerminalId, currentRepos.filter(r => r !== repoPath))
    } else {
      updateTerminalRepositories(activeTerminalId, [...currentRepos, repoPath])
    }
  }, [activeTerminalId, activeTerminal, updateTerminalRepositories])

  // Detect ticket type and build the full ticket URL
  const getTicketLink = useCallback(() => {
    if (!metadata?.ticketId) return null

    const ticketId = metadata.ticketId

    if (ticketId.startsWith('#') && githubIssuesUrl) {
      const cleanId = ticketId.replace(/^#/, '')
      const baseUrl = githubIssuesUrl.endsWith('/') ? githubIssuesUrl : githubIssuesUrl + '/'
      return baseUrl + cleanId
    }

    if (/^[A-Z]+-\d+$/.test(ticketId) && jiraUrl) {
      const baseUrl = jiraUrl.endsWith('/') ? jiraUrl : jiraUrl + '/'
      return baseUrl + ticketId
    }

    return null
  }, [metadata?.ticketId, jiraUrl, githubIssuesUrl])

  const ticketLink = getTicketLink()

  // Get PR URL for a specific repository
  const getRepoPrUrl = useCallback((repoPath: string): string | undefined => {
    return metadata?.repositoryMetadata?.[repoPath]?.prUrl
  }, [metadata])

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
      const targetBranch = repoConfig?.branches?.development || 'develop'

      let stats: RepoGitData['stats'] = null
      let commits: RepoGitData['commits'] = null
      let branch: string | null = null
      let error: string | null = null
      let gitHubUrl: string | null = null

      try {
        stats = await window.electronAPI.config.getGitDiffStats(repoPath)
        if (stats && !stats.isGitRepo) {
          error = 'Not a git repo'
        }
      } catch (e) {
        error = e instanceof Error ? e.message : 'Unknown error'
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
  }, [activeTerminal?.repositories, getRepoConfig])

  // Listen for Command+W keyboard shortcut to close agent
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
        if (rightSidebar === 'info' && activeTerminal && canClose) {
          e.preventDefault()
          openCloseAgentModal({
            terminalId: activeTerminal.id,
            terminalName: activeTerminal.name,
            repositoryMetadata: activeTerminal.metadata?.repositoryMetadata
          })
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [rightSidebar, activeTerminal, canClose, openCloseAgentModal])

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
    if (activeTerminalId && editTitle.trim() !== (metadata?.title || '')) {
      updateTerminalMetadata(activeTerminalId, { title: editTitle.trim() || undefined })
    }
    setIsEditingTitle(false)
  }, [activeTerminalId, editTitle, metadata?.title, updateTerminalMetadata])

  // Start editing description
  const startEditingDescription = useCallback(() => {
    setEditDescription(metadata?.description || '')
    setIsEditingDescription(true)
    setTimeout(() => descriptionInputRef.current?.focus(), 0)
  }, [metadata?.description])

  // Save description
  const saveDescription = useCallback(() => {
    if (activeTerminalId && editDescription.trim() !== (metadata?.description || '')) {
      updateTerminalMetadata(activeTerminalId, { description: editDescription.trim() || undefined })
    }
    setIsEditingDescription(false)
  }, [activeTerminalId, editDescription, metadata?.description, updateTerminalMetadata])

  // Cancel editing when switching terminals
  useEffect(() => {
    setIsEditingTitle(false)
    setIsEditingDescription(false)
    setIsRepoModalOpen(false)
  }, [activeTerminalId])

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

  const isOpen = rightSidebar === 'info'

  return (
    <div
      ref={sidebarRef}
      className={`bg-black/30 backdrop-blur-md flex flex-col h-full relative overflow-hidden ${isResizing ? '' : 'transition-all duration-300 ease-in-out'}`}
      style={{ width: isOpen ? `${width}px` : 0 }}
    >
      <div className="flex flex-col h-full" style={{ width: `${width}px` }}>
      {/* Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        className={`absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-purple/50 transition-colors ${
          isResizing ? 'bg-purple' : ''
        }`}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-purple" />
          <span className="font-semibold text-sm">{activeTerminal ? `${activeTerminal.name} Info` : 'Agent Info'}</span>
        </div>
        {activeTerminal && canClose ? (
          <button
            onClick={() => openCloseAgentModal({
              terminalId: activeTerminal.id,
              terminalName: activeTerminal.name,
              repositoryMetadata: activeTerminal.metadata?.repositoryMetadata
            })}
            className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-text-secondary bg-white/[0.06] border border-white/[0.15] rounded-lg hover:bg-white/[0.12] hover:text-white transition-all"
          >
            <X className="w-3 h-3" />
            <span>Close agent</span>
            <span className="text-[10px] opacity-50">⌘W</span>
          </button>
        ) : (
          <button
            onClick={() => toggleRightSidebar('info')}
            className="p-1.5 text-text-secondary hover:text-white hover:bg-bg-tertiary rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" style={{ fontFamily: "'Cera Pro', -apple-system, BlinkMacSystemFont, sans-serif" }}>
        {!activeTerminal ? (
          <div className="px-4 py-8 text-center text-text-secondary text-sm">
            No active agent
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Ticket Header Card */}
            <TicketHeader
              metadata={metadata}
              ticketLink={ticketLink}
              isEditingTitle={isEditingTitle}
              isEditingDescription={isEditingDescription}
              editTitle={editTitle}
              editDescription={editDescription}
              setEditTitle={setEditTitle}
              setEditDescription={setEditDescription}
              startEditingTitle={startEditingTitle}
              startEditingDescription={startEditingDescription}
              saveTitle={saveTitle}
              saveDescription={saveDescription}
              setIsEditingTitle={setIsEditingTitle}
              setIsEditingDescription={setIsEditingDescription}
              titleInputRef={titleInputRef}
              descriptionInputRef={descriptionInputRef}
            />

            {/* Repositories Section Header */}
            <div className="flex items-center justify-between">
              <div className="text-xs text-text-secondary/50 uppercase tracking-wider">Repositories</div>
              <button
                onClick={() => setIsRepoModalOpen(true)}
                className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-text-secondary bg-white/[0.06] border border-white/[0.15] rounded-lg hover:bg-white/[0.12] hover:text-white transition-all"
              >
                <Edit2 className="w-3 h-3" />
                <span>Edit</span>
                <span className="text-[10px] opacity-50">⌘P</span>
              </button>
            </div>

            {/* Repository cards with git stats */}
            {configuredAttachedRepos.length === 0 ? (
              <button
                onClick={() => setIsRepoModalOpen(true)}
                className="w-full py-4 text-center border border-dashed border-border/50 rounded-lg hover:border-text-secondary/50 hover:bg-white/5 transition-colors"
              >
                <div className="text-[13px] text-text-secondary/50">
                  Add a repository
                </div>
              </button>
            ) : (
              <div className="space-y-3">
                {configuredAttachedRepos.map((repoPath) => (
                  <RepositoryCard
                    key={repoPath}
                    repoPath={repoPath}
                    repoName={getRepoName(repoPath)}
                    agentId={activeTerminalId!}
                    agentName={activeTerminal!.metadata?.title || activeTerminal!.name}
                    gitData={repoGitData[repoPath]}
                    prUrl={getRepoPrUrl(repoPath)}
                    copiedCommitHash={copiedCommitHash}
                    copiedBranch={copiedBranch}
                    onCopyCommitHash={copyCommitHash}
                    onCopyBranchName={copyBranchName}
                  />
                ))}
              </div>
            )}

            {/* Full-Stack Task Section */}
            {metadata?.fullStackTaskId && metadata?.relatedWorktrees && metadata.relatedWorktrees.length > 1 && (
              <div className="bg-bg-tertiary/30 rounded-lg p-3 border border-orange/20">
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="w-3.5 h-3.5 text-orange" />
                  <span className="text-[10px] text-text-secondary/50 uppercase tracking-wider">
                    Full-Stack Task
                  </span>
                </div>
                <div className="space-y-1.5">
                  {metadata.relatedWorktrees.map((path) => {
                    const repoName = path.split('/').pop() || path
                    const isCurrentRepo = attachedRepos.includes(path)
                    return (
                      <div
                        key={path}
                        className={`text-xs font-mono truncate px-2 py-1 rounded ${
                          isCurrentRepo
                            ? 'bg-orange/10 text-orange border border-orange/20'
                            : 'text-text-secondary/70'
                        }`}
                        title={path}
                      >
                        {repoName}
                      </div>
                    )
                  })}
                </div>
              </div>
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
