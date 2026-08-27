import { GitBranch, Copy, Check, ArrowRight, X, FolderGit2 } from 'lucide-react'
import { GitHubIcon, VSCodeIcon } from './icons'
import { ScriptsDropdown } from './ScriptsDropdown'
import { PRWatchCard } from './PRWatchCard'
import { RunningScripts } from './RunningScripts'
import { formatRelativeDate } from './utils'
import { useT } from '../../i18n'
import type { RepoGitData } from './types'
import type { RepositoryMetadata } from '../../../types'
import { useStore } from '../../store'
import { getProjectColorMap } from '../../utils/projectColors'

interface RepositoryCardProps {
  repoPath: string
  repoName: string
  agentId: string
  agentName: string
  gitData: RepoGitData | undefined
  baseBranch: string | undefined
  prUrl: string | undefined
  /** GitHub address of the repo — the configured remote URL, or the one read from git. */
  repoUrl: string | undefined
  repoMetadata?: RepositoryMetadata
  copiedCommitHash: string | null
  copiedBranch: string | null
  onCopyCommitHash: (hash: string) => void
  onCopyBranchName: (branch: string) => void
  onRemove: () => void
}

export function RepositoryCard({
  repoPath,
  repoName,
  agentId,
  agentName,
  gitData,
  baseBranch,
  prUrl,
  repoUrl,
  repoMetadata,
  copiedCommitHash,
  copiedBranch,
  onCopyCommitHash,
  onCopyBranchName,
  onRemove,
}: RepositoryCardProps) {
  const t = useT()
  const openRepoReview = useStore(s => s.openRepoReview)
  const repositories = useStore(s => s.config?.repositories)
  /* The icon wears the colour the repo was given in its settings. The map is built
     over the FULL repository list, not this card alone, so a repo with no colour set
     still gets the same palette fallback the dots on Dashboard and Tasks give it. */
  const repoColor = getProjectColorMap(Object.keys(repositories ?? {}), repositories)[repoName]
  const hasChanges = gitData?.stats?.isGitRepo && gitData.stats.filesChanged > 0
  const hasCommits = gitData?.commits && gitData.commits.commits.length > 0
  const resolvedBaseBranch = baseBranch || gitData?.commits?.baseBranch

  return (
    <div className="bg-surface rounded-xl p-3">
      {/* Repo header */}
      <div className="flex items-center gap-2 mb-2">
        {/* The webapp's repository tile, at sidebar scale: the colour tints the icon
            and its backdrop rather than standing alone as a dot. */}
        <span
          className="flex items-center justify-center w-6 h-6 rounded-lg flex-shrink-0"
          style={{ backgroundColor: `${repoColor}1f`, color: repoColor }}
        >
          <FolderGit2 className="w-3.5 h-3.5" />
        </span>
        <span className="text-ink/90 font-medium text-sm truncate" title={repoPath}>
          {repoName}
        </span>
        <div className="flex items-center gap-1.5 ml-auto">
          <ScriptsDropdown repoPath={repoPath} agentId={agentId} agentName={agentName} />
          {/* Open in VSCode button */}
          <button
            onClick={() => window.electronAPI.shell.openInVSCode(repoPath)}
            className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold text-icon border border-dashed border-border/40 rounded hover:border-[#007ACC]/50 hover:text-[#007ACC] hover:bg-[#007ACC]/5 transition-colors"
          >
            <VSCodeIcon className="w-3 h-3" />
            {t('agentInfo.openInEditor')}
          </button>
          {/* Open on GitHub button — hidden when the repo has no known remote */}
          {repoUrl && (
            <button
              onClick={() => window.electronAPI.shell.openExternal(repoUrl)}
              className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold text-icon border border-dashed border-border/40 rounded hover:border-ink/50 hover:text-ink hover:bg-ink/5 transition-colors"
              title={t('agentInfo.openRepoOnGitHub')}
            >
              <GitHubIcon className="w-3 h-3" />
              {t('agentInfo.openOnGitHub')}
            </button>
          )}
          {/* Remove repository button */}
          <button
            onClick={onRemove}
            className="flex items-center justify-center p-1 text-icon rounded hover:text-red hover:bg-red/10 transition-colors"
            title={t('agentInfo.removeRepository')}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Straight under the row that launched them, and renders nothing when this
          repo/agent pair has no script running. */}
      <RunningScripts repoPath={repoPath} agentId={agentId} />

      {/* Branch block */}
      {gitData?.branch && (
        <div className="flex items-center gap-1.5 mb-2">
          {/* Base branch (left) */}
          {resolvedBaseBranch && (
            <>
              <div className="self-stretch flex items-center gap-1.5 px-2 py-1.5 bg-surface rounded-md border border-line-subtle min-w-0">
                <GitBranch className="w-3.5 h-3.5 text-text-secondary flex-shrink-0" />
                <span
                  className="text-text-secondary text-xs font-medium truncate"
                  title={resolvedBaseBranch}
                >
                  {resolvedBaseBranch}
                </span>
              </div>
              <ArrowRight className="w-3 h-3 text-icon-muted flex-shrink-0" />
            </>
          )}
          {/* Current branch (right) */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0 px-2 py-1.5 bg-surface rounded-md border border-line-subtle">
            <GitBranch className="w-3.5 h-3.5 text-green flex-shrink-0" />
            <span
              className="text-green text-xs font-medium truncate"
              title={gitData.branch}
            >
              {gitData.branch}
            </span>
            <button
              onClick={() => onCopyBranchName(gitData.branch!)}
              className="p-1 ml-auto rounded hover:bg-surface-strong transition-colors group flex-shrink-0"
              title={t('agentInfo.copyBranch')}
            >
              {copiedBranch === gitData.branch ? (
                <Check className="w-3 h-3 text-green" />
              ) : (
                <Copy className="w-3 h-3 text-icon group-hover:text-ink transition-colors" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Uncommitted changes block */}
      {hasChanges && gitData.stats && (
        <div className="bg-surface rounded-md border border-line-subtle p-2 mb-2">
          {/* Header with title, stats and gauge */}
          <div className="flex items-center gap-2 text-xs mb-2">
            <span className="text-text-secondary/70 font-medium">{t('agentInfo.uncommittedChanges')}</span>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-text-secondary/50">
                {t(gitData.stats.filesChanged > 1 ? 'agentInfo.files.other' : 'agentInfo.files.one', { count: gitData.stats.filesChanged })}
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
                  className="flex items-center gap-1.5 text-xs py-0.5 cursor-pointer hover:bg-surface-strong rounded transition-colors px-1 -mx-1"
                  /* A click opens the REPOSITORY, anchored on this file — not this file
                     on its own. The whole list is handed over so the drawer can freeze
                     it; `gitData.stats.files` is replaced wholesale by the poll a few
                     seconds from now, and the review must not follow it. */
                  onClick={() => openRepoReview(
                    { repoPath, repoName, files: gitData.stats!.files },
                    file.path,
                  )}
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
        <div className="bg-surface rounded-md border border-line-subtle p-2 mb-2">
          <div className="flex items-center text-xs mb-1.5">
            <span className="text-text-secondary/70 font-medium">{t('agentInfo.commits')}</span>
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
                  {formatRelativeDate(commit.relativeDate, t)}
                </span>
                <button
                  onClick={() => onCopyCommitHash(commit.hash)}
                  className="flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 bg-surface border border-border/30 rounded text-icon font-mono text-xs hover:bg-surface-strong hover:text-ink transition-colors"
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
                    className="flex-shrink-0 p-1 bg-surface border border-border/30 rounded text-icon hover:bg-surface-strong hover:text-ink transition-colors"
                    title={t('agentInfo.viewOnGitHub')}
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
        <div className="bg-surface rounded-md border border-line-subtle p-2 mb-2">
          <span className="text-xs text-text-secondary/40 italic">{t('agentInfo.noUncommittedChanges')}</span>
        </div>
      )}

      {/* Dedicated PR card. Keyed off `prUrl` alone, deliberately: when the watcher
          is switched off the card still shows the last snapshot, dated, instead of
          vanishing along with the polling.

          It carries the link to GitHub itself — its header is the link — so the
          accent "View pull request" button that used to sit right above it is
          gone: one PR, one card. */}
      {prUrl && <PRWatchCard prUrl={prUrl} agentId={agentId} metadata={repoMetadata} />}
    </div>
  )
}
