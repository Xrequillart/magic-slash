import { BranchCard, Card, CommitCard, HeaderRepoCard } from '@ds/desktop'
import { Github, VSCode } from '@ds/desktop/icons'
import { useRepoColor } from './RepoMark'
import { useScriptsMenu } from './useScriptsMenu'
import { PRWatchCard } from './PRWatchCard'
import { RunningScripts } from './RunningScripts'
import { formatRelativeDate } from './utils'
import { useT } from '../../i18n'
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
  /** GitHub address of the repo — the configured remote URL, or the one read from git. */
  repoUrl: string | undefined
  repoMetadata?: RepositoryMetadata
  copiedCommitHash: string | null
  copiedBranch: string | null
  onCopyCommitHash: (hash: string) => void
  onCopyBranchName: (branch: string) => void
  onRemove: () => void
}


/**
 * How many commits the card draws before it stops counting and starts summarising.
 *
 * IT LIVES HERE AND NOT IN `CommitCard`, which is the point of the split: the panel
 * arranges what it is handed, and how much of a branch is worth showing in a 288px
 * sidebar is this card's judgement rather than the design system's. It is named
 * because two places need it — the slice and the "+N more" line — and those two
 * disagreeing is exactly the bug the literal five used to invite.
 */
const SHOWN_COMMITS = 5
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
  // The two things the header needs that only the app can answer: which of the
  // sixteen hues this repository was given, and where its settings live.
  const repoColor = useRepoColor(repoName)
  const openRepoSettings = useStore(s => s.openRepoSettings)
  const scripts = useScriptsMenu({ repoPath, repoName, agentId, agentName })
  const openRepoReview = useStore(s => s.openRepoReview)
  const hasChanges = gitData?.stats?.isGitRepo && gitData.stats.filesChanged > 0
  const hasCommits = gitData?.commits && gitData.commits.commits.length > 0
  /* The parent branch is only worth a card of its own when it is somewhere else:
     on the base branch itself, `base -> current` would just say the same name
     twice, so both the card and the arrow drop out. */
  const rawBaseBranch = baseBranch || gitData?.commits?.baseBranch
  const resolvedBaseBranch = rawBaseBranch === gitData?.branch ? undefined : rawBaseBranch

  return (
    /* `flex flex-col gap-2` and NOT a `mb-2` per block, which is what this was: the
       bottom margin of whichever block happened to be last stacked on top of the card's
       own padding, so the card had 12px of padding above its header and 20px under its
       last row. A gap sits BETWEEN children only — and it also skips the blocks that
       render nothing (no branch, no changes, no scripts), which margins could not.

       `p-4` is the sidebar column's card padding, not this card's own choice: the usage
       card, the ticket card and the spec panel all state it, and at `p-3` this one sat
       4px narrower than the cards above it — a stepped left edge running down the
       column, the kind of thing that reads as sloppiness without the reader being able
       to name it. */
    <Card className="flex flex-col gap-2">
      {/* The header row. The order, the gaps and every tone are `HeaderRepoCard`'s;
          what stays here is which repository it is and what each control does to it.
          `remote` is simply absent when the repo has no known one — a dead chip would
          be worse than no chip. */}
      <HeaderRepoCard
        name={repoName}
        title={repoPath}
        color={repoColor}
        onNameClick={() => openRepoSettings(repoName)}
        scripts={scripts}
        editor={{
          icon: VSCode,
          title: t('agentInfo.openRepoInEditor'),
          onClick: () => window.electronAPI.shell.openInVSCode(repoPath),
        }}
        remote={
          repoUrl
            ? {
                icon: Github,
                title: t('agentInfo.openRepoOnGitHub'),
                onClick: () => window.electronAPI.shell.openExternal(repoUrl),
              }
            : undefined
        }
        remove={{ title: t('agentInfo.removeRepository'), onClick: onRemove }}
      />

      {/* Straight under the row that launched them, and renders nothing when this
          repo/agent pair has no script running. */}
      <RunningScripts repoPath={repoPath} agentId={agentId} />

      {/* Branch block. `resolvedBaseBranch` is already undefined when the base is this
          very branch, so `BranchCard` never has to decide whether `main -> main` is
          worth a row — it draws what it is handed. */}
      {gitData?.branch && (
        <BranchCard
          branch={gitData.branch}
          base={resolvedBaseBranch}
          copy={{
            label: t('agentInfo.copyBranch'),
            copied: copiedBranch === gitData.branch,
            onCopy: () => onCopyBranchName(gitData.branch!),
          }}
        />
      )}

      {/* EVERY BLOCK IN THIS CARD IS THE HEADER CHIP, GROWN. `bg-ink/5` and `rounded-lg`
         are `ACTION_CHIP`'s own two values, so the branch chips, the two blocks
         below, the empty state and the PR card are all one material at one radius —
         the row of buttons at the top states the vocabulary, and the card repeats it
         at every size.

         `bg-ink/5` rather than the `bg-surface` these were: both land near 5% on every
         theme, but ink is an OVERLAY — it composes with the `bg-surface` card beneath
         to a visible step up, where surface-on-surface painted the same value twice
         and needed a rule around it to be seen at all. That rule is what is gone. */}
      {hasChanges && gitData.stats && (
        <div className="bg-ink/5 rounded-lg p-3">
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
                  /* `rounded-lg` and a real hit area. These rows OPEN something, and they
                     were 4px-radius strips one pixel taller than their own text — the
                     hover ground came up as a hairline sliver, at a radius nothing else
                     in the card uses. `-mx-2` against the block's `p-3` lets that ground
                     run wider than the text without touching the plate's edge. */
                  className="flex items-center gap-1.5 text-xs px-2 py-1 -mx-2 cursor-pointer hover:bg-ink/10 rounded-lg transition-colors"
                  /* A click opens the REPOSITORY, anchored on this file — not this file
                     on its own. The whole list is handed over so the drawer can freeze
                     it; `gitData.stats.files` is replaced wholesale by the poll a few
                     seconds from now, and the review must not follow it. */
                  onClick={() => openRepoReview(
                    { repoPath, repoName, files: gitData.stats!.files },
                    file.path,
                  )}
                >
                  <span className="flex-1 text-text-secondary/60 truncate" title={file.path}>
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

      {/* Commits block. The panel, the rail, the hash chip and the "+N more" line are
          `CommitCard`'s now. What stays here is the three things only the app knows:
          how many commits there really are, what a relative date reads like in this
          language, and how to open a URL from inside Electron. */}
      {hasCommits && gitData.commits && (
        <CommitCard
          label={t('agentInfo.commits')}
          summary={`${gitData.commits.commits.length} ahead of ${gitData.commits.baseBranch}`}
          commits={gitData.commits.commits.slice(0, SHOWN_COMMITS).map((commit) => ({
            hash: commit.hash,
            shortHash: commit.shortHash,
            subject: commit.subject,
            relativeDate: formatRelativeDate(commit.relativeDate, t),
            copyLabel: `Copy full hash: ${commit.hash}`,
            openable: commit.isPushed && Boolean(gitData.gitHubUrl),
          }))}
          moreLabel={
            gitData.commits.commits.length > SHOWN_COMMITS
              ? `+${gitData.commits.commits.length - SHOWN_COMMITS} more commits`
              : undefined
          }
          copiedHash={copiedCommitHash}
          onCopyHash={onCopyCommitHash}
          open={{
            label: t('agentInfo.viewOnGitHub'),
            icon: Github,
            onOpen: (hash) =>
              window.electronAPI.shell.openExternal(`${gitData.gitHubUrl}/commit/${hash}`),
          }}
        />
      )}

      {/* No changes state */}
      {gitData && !gitData.error && !hasChanges && !hasCommits && gitData.branch && (
        <div className="bg-ink/5 rounded-lg p-2">
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
    </Card>
  )
}
