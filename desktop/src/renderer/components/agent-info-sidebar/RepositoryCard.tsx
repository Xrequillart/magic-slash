import { GitBranch, Copy, Check, ExternalLink, ArrowRight } from 'lucide-react'
import { GitHubIcon, VSCodeIcon } from './icons'
import { ScriptsDropdown } from './ScriptsDropdown'
import { formatRelativeDate } from './utils'
import type { RepoGitData } from './types'

interface RepositoryCardProps {
  repoPath: string
  repoName: string
  agentId: string
  agentName: string
  gitData: RepoGitData | undefined
  baseBranch: string | undefined
  prUrl: string | undefined
  copiedCommitHash: string | null
  copiedBranch: string | null
  onCopyCommitHash: (hash: string) => void
  onCopyBranchName: (branch: string) => void
}

export function RepositoryCard({
  repoPath,
  repoName,
  agentId,
  agentName,
  gitData,
  baseBranch,
  prUrl,
  copiedCommitHash,
  copiedBranch,
  onCopyCommitHash,
  onCopyBranchName,
}: RepositoryCardProps) {
  const hasChanges = gitData?.stats?.isGitRepo && gitData.stats.filesChanged > 0
  const hasCommits = gitData?.commits && gitData.commits.commits.length > 0
  const resolvedBaseBranch = baseBranch || gitData?.commits?.baseBranch

  return (
    <div className="bg-white/[0.06] rounded-xl p-3">
      {/* Repo header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-white/90 font-medium text-base truncate" title={repoPath}>
          {repoName}
        </span>
        <div className="flex items-center gap-1.5 ml-auto">
          <ScriptsDropdown repoPath={repoPath} agentId={agentId} agentName={agentName} />
          {/* Open in VSCode button */}
          <button
            onClick={() => window.electronAPI.shell.openInVSCode(repoPath)}
            className="flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-semibold text-text-secondary/50 border border-dashed border-border/40 rounded hover:border-[#007ACC]/50 hover:text-[#007ACC] hover:bg-[#007ACC]/5 transition-colors"
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
                  className="text-text-secondary/70 text-[12px] font-medium truncate"
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
              className="text-green text-[13px] font-medium truncate"
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
                  className="flex items-center gap-1.5 text-xs py-0.5"
                >
                  <span className="flex-1 text-text-secondary/60 font-mono truncate" title={file.path}>
                    {file.path.split('/').pop()}
                  </span>
                  {(file.additions > 0 || file.deletions > 0) && (
                    <span className="flex-shrink-0 text-[11px] text-text-secondary/40">
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
                className="flex items-center gap-2 text-sm py-0.5"
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
    </div>
  )
}
