import { GitBranch, Copy, Check, ExternalLink, ArrowRight, CheckCircle2, AlertCircle, MessageSquare, Clock, Wrench, CheckCircle } from 'lucide-react'
import { GitHubIcon, VSCodeIcon } from './icons'
import { ScriptsDropdown } from './ScriptsDropdown'
import { formatRelativeDate } from './utils'
import { showToast } from '../Toast'
import type { RepoGitData } from './types'
import type { RepositoryMetadata } from '../../../types'
import { useStore } from '../../store'

interface RepositoryCardProps {
  repoPath: string
  repoName: string
  agentId: string
  agentName: string
  gitData: RepoGitData | undefined
  baseBranch: string | undefined
  prUrl: string | undefined
  repoMetadata?: RepositoryMetadata
  copiedCommitHash: string | null
  copiedBranch: string | null
  onCopyCommitHash: (hash: string) => void
  onCopyBranchName: (branch: string) => void
}

const REVIEW_STATUS_LABELS: Record<NonNullable<RepositoryMetadata['prReviewStatus']>, string> = {
  approved: 'Approved',
  'changes-requested': 'Changes requested',
  commented: 'Commented',
  pending: 'Pending',
}

function ReviewStatusIcon({ status }: { status: NonNullable<RepositoryMetadata['prReviewStatus']> }) {
  switch (status) {
    case 'approved':
      return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
    case 'changes-requested':
      return <AlertCircle className="w-3.5 h-3.5 text-red-500" />
    case 'commented':
      return <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
    case 'pending':
      return <Clock className="w-3.5 h-3.5 text-text-secondary" />
  }
}

async function runSlashCommand(terminalId: string, command: string) {
  try {
    const result = await window.electronAPI.prWatcher.sendCommand(terminalId, command)
    if (result.launched) {
      showToast(`Sent ${command} to the agent`, 'success')
    } else if (result.copied) {
      showToast(`Auto-launch disabled — ${command} copied to clipboard`, 'warning')
    }
  } catch (err) {
    showToast(err instanceof Error ? err.message : 'Failed to launch command', 'error')
  }
}

export function RepositoryCard({
  repoPath,
  repoName,
  agentId,
  agentName,
  gitData,
  baseBranch,
  prUrl,
  repoMetadata,
  copiedCommitHash,
  copiedBranch,
  onCopyCommitHash,
  onCopyBranchName,
}: RepositoryCardProps) {
  const setSelectedFile = useStore(s => s.setSelectedFile)
  const hasChanges = gitData?.stats?.isGitRepo && gitData.stats.filesChanged > 0
  const hasCommits = gitData?.commits && gitData.commits.commits.length > 0
  const resolvedBaseBranch = baseBranch || gitData?.commits?.baseBranch

  return (
    <div className="bg-white/[0.06] rounded-xl p-3">
      {/* Repo header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-white/90 font-medium text-sm truncate" title={repoPath}>
          {repoName}
        </span>
        <div className="flex items-center gap-1.5 ml-auto">
          <ScriptsDropdown repoPath={repoPath} agentId={agentId} agentName={agentName} />
          {/* Open in VSCode button */}
          <button
            onClick={() => window.electronAPI.shell.openInVSCode(repoPath)}
            className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold text-text-secondary/50 border border-dashed border-border/40 rounded hover:border-[#007ACC]/50 hover:text-[#007ACC] hover:bg-[#007ACC]/5 transition-colors"
          >
            <VSCodeIcon className="w-3 h-3" />
            Open
          </button>
        </div>
      </div>

      {/* Branch block */}
      {gitData?.branch && (
        <div className="flex items-center gap-1.5 mb-2">
          {/* Base branch (left) */}
          {resolvedBaseBranch && (
            <>
              <div className="flex items-center gap-1.5 px-2 py-1.5 bg-white/[0.06] rounded-md min-w-0">
                <GitBranch className="w-3 h-3 text-text-secondary/50 flex-shrink-0" />
                <span
                  className="text-text-secondary/70 text-[10px] font-medium truncate"
                  title={resolvedBaseBranch}
                >
                  {resolvedBaseBranch}
                </span>
              </div>
              <ArrowRight className="w-3 h-3 text-text-secondary/30 flex-shrink-0" />
            </>
          )}
          {/* Current branch (right) */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0 px-2 py-1.5 bg-white/[0.06] rounded-md">
            <GitBranch className="w-3.5 h-3.5 text-green/70 flex-shrink-0" />
            <span
              className="text-green text-xs font-medium truncate"
              title={gitData.branch}
            >
              {gitData.branch}
            </span>
            <button
              onClick={() => onCopyBranchName(gitData.branch!)}
              className="p-1 ml-auto rounded hover:bg-white/10 transition-colors group flex-shrink-0"
              title="Copy branch name"
            >
              {copiedBranch === gitData.branch ? (
                <Check className="w-3 h-3 text-green" />
              ) : (
                <Copy className="w-3 h-3 text-text-secondary/50 group-hover:text-white transition-colors" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Uncommitted changes block */}
      {hasChanges && gitData.stats && (
        <div className="bg-white/[0.06] rounded-md p-2 mb-2">
          {/* Header with title, stats and gauge */}
          <div className="flex items-center gap-2 text-xs mb-2">
            <span className="text-text-secondary/70 font-medium">Uncommitted changes</span>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-text-secondary/50">
                {gitData.stats.filesChanged} file{gitData.stats.filesChanged > 1 ? 's' : ''}
              </span>
              {(gitData.stats.additions > 0 || gitData.stats.deletions > 0) && (
                <>
                  <span className="flex items-center gap-1">
                    <span className="text-green">+{gitData.stats.additions}</span>
                    <span className="text-red">-{gitData.stats.deletions}</span>
                  </span>
                  {/* Gauge bar - 6 squares */}
                  <div className="flex gap-0.5">
                    {[0, 1, 2, 3, 4, 5].map((i) => {
                      const ratio = gitData.stats!.additions / (gitData.stats!.additions + gitData.stats!.deletions)
                      const threshold = (i + 1) / 6
                      const isGreen = ratio >= threshold
                      return (
                        <div
                          key={i}
                          className={`w-1.5 h-1.5 rounded-sm ${isGreen ? 'bg-green' : 'bg-red'}`}
                        />
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Files list */}
          {gitData.stats.files && gitData.stats.files.length > 0 && (
            <div className="space-y-0.5">
              {gitData.stats.files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1.5 text-xs py-0.5 cursor-pointer hover:bg-white/10 rounded transition-colors px-1 -mx-1"
                  onClick={() => setSelectedFile({ repoPath, path: file.path, status: file.status })}
                >
                  <span className="flex-1 text-text-secondary/60 font-mono truncate" title={file.path}>
                    {file.path.split('/').pop()}
                  </span>
                  {(file.additions > 0 || file.deletions > 0) && (
                    <span className="flex-shrink-0 text-[10px] text-text-secondary/40">
                      {file.additions > 0 && <span className="text-green">+{file.additions}</span>}
                      {file.additions > 0 && file.deletions > 0 && ' '}
                      {file.deletions > 0 && <span className="text-red">-{file.deletions}</span>}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Commits block */}
      {hasCommits && gitData.commits && (
        <div className="bg-white/[0.06] rounded-md p-2 mb-2">
          <div className="flex items-center text-xs mb-1.5">
            <span className="text-text-secondary/70 font-medium">Commits</span>
            <span className="text-text-secondary/50 ml-auto">
              {gitData.commits.commits.length} ahead of {gitData.commits.baseBranch}
            </span>
          </div>
          <div className="space-y-1">
            {gitData.commits.commits.slice(0, 5).map((commit) => (
              <div
                key={commit.hash}
                className="flex items-center gap-2 text-xs py-0.5"
              >
                <span className="text-text-secondary/60 truncate flex-1" title={commit.subject}>
                  {commit.subject}
                </span>
                <span className="text-text-secondary/40 text-xs flex-shrink-0" title={commit.relativeDate}>
                  {formatRelativeDate(commit.relativeDate)}
                </span>
                <button
                  onClick={() => onCopyCommitHash(commit.hash)}
                  className="flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 bg-white/5 border border-border/30 rounded text-text-secondary/70 font-mono text-xs hover:bg-white/10 hover:text-white transition-colors"
                  title={`Copy full hash: ${commit.hash}`}
                >
                  {commit.shortHash}
                  {copiedCommitHash === commit.hash ? (
                    <Check className="w-3 h-3 text-green" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
                {commit.isPushed && gitData.gitHubUrl && (
                  <button
                    onClick={() => window.electronAPI.shell.openExternal(`${gitData.gitHubUrl}/commit/${commit.hash}`)}
                    className="flex-shrink-0 p-1 bg-white/5 border border-border/30 rounded text-text-secondary/50 hover:bg-white/10 hover:text-white transition-colors"
                    title="View on GitHub"
                  >
                    <GitHubIcon className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
            {gitData.commits.commits.length > 5 && (
              <div className="text-xs text-text-secondary/40 py-0.5">
                +{gitData.commits.commits.length - 5} more commits
              </div>
            )}
          </div>
        </div>
      )}

      {/* No changes state */}
      {gitData && !gitData.error && !hasChanges && !hasCommits && gitData.branch && (
        <div className="bg-white/[0.06] rounded-md p-2 mb-2">
          <span className="text-xs text-text-secondary/40 italic">No uncommitted changes</span>
        </div>
      )}

      {/* Per-repo PR button */}
      {prUrl && (
        <button
          onClick={() => window.electronAPI.shell.openExternal(prUrl)}
          className="w-full flex items-center justify-between bg-accent/10 hover:bg-accent/20 rounded-md p-2 mt-2 border border-accent/20 transition-colors group cursor-pointer"
        >
          <div className="flex items-center gap-1.5">
            <GitHubIcon className="w-3.5 h-3.5 text-accent/70 group-hover:text-accent transition-colors" />
            <span className="text-accent text-xs font-medium group-hover:text-accent transition-colors">View Pull Request</span>
          </div>
          <ExternalLink className="w-3 h-3 text-accent/50 group-hover:text-accent transition-colors" />
        </button>
      )}

      {/* PR review status block */}
      {prUrl && repoMetadata?.prReviewStatus && (
        <div className="mt-2 bg-white/[0.06] rounded-md p-2 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs">
            <ReviewStatusIcon status={repoMetadata.prReviewStatus} />
            <span className="text-white/80 font-medium">
              {REVIEW_STATUS_LABELS[repoMetadata.prReviewStatus]}
            </span>
            {repoMetadata.prMerged && (
              <span className="ml-1 px-1.5 py-0.5 rounded bg-green-500/10 text-green-500 text-[10px] font-semibold uppercase tracking-wide">
                merged
              </span>
            )}
            {repoMetadata.prReviewCommentCount !== undefined && repoMetadata.prReviewCommentCount > 0 && (
              <span className="ml-auto flex items-center gap-1 text-text-secondary/70">
                <MessageSquare className="w-3 h-3" />
                {repoMetadata.prReviewCommentCount}
              </span>
            )}
          </div>
          {repoMetadata.prReviewers && repoMetadata.prReviewers.length > 0 && (
            <div className="text-[10px] text-text-secondary/60 truncate" title={repoMetadata.prReviewers.join(', ')}>
              by {repoMetadata.prReviewers.join(', ')}
            </div>
          )}
          {(repoMetadata.prReviewStatus === 'changes-requested' || repoMetadata.prReviewStatus === 'commented') && (
            <button
              onClick={() => runSlashCommand(agentId, '/magic:resolve')}
              className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-md text-red-500 text-xs font-medium transition-colors"
            >
              <Wrench className="w-3 h-3" />
              Launch magic-resolve
            </button>
          )}
          {repoMetadata.prMerged === true && (
            <button
              onClick={() => runSlashCommand(agentId, '/magic:done')}
              className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-md text-green-500 text-xs font-medium transition-colors"
            >
              <CheckCircle className="w-3 h-3" />
              Launch magic-done
            </button>
          )}
        </div>
      )}
    </div>
  )
}
